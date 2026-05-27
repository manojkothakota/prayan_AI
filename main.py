from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import os, json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

app = FastAPI(title="AI Tour Guider API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allows all origins — safe for now
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Two Groq clients — load balanced ────────────────────────────────────────
# KEY_1 → heavy endpoints (itinerary, optimize-route, emergency)
# KEY_2 → light endpoints  (spots, budget, duration, transport, suggestion, cancel)
model_heavy = ChatGroq(api_key=os.getenv("GROQ_API_KEY_1"), model="llama-3.3-70b-versatile")
model_light = ChatGroq(api_key=os.getenv("GROQ_API_KEY_2"), model="llama-3.3-70b-versatile")

def get_model(weight: str = "light"):
    return model_heavy if weight == "heavy" else model_light

LANG_NAMES = {
    'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
    'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali',
    'es': 'Spanish', 'fr': 'French',   'ar': 'Arabic'
}

def lang_instruction(lang: str) -> str:
    name = LANG_NAMES.get(lang, 'English')
    if lang == 'en':
        return ""
    return f"\n\nIMPORTANT: Respond entirely in {name} language."

def parse_json(text):
    try:
        start = text.find("{"); end = text.rfind("}") + 1
        return json.loads(text[start:end])
    except:
        return None

def ask(system: str, human: str, lang: str = 'en', weight: str = 'light') -> str:
    full_system = system + lang_instruction(lang)
    resp = get_model(weight).invoke([SystemMessage(content=full_system), HumanMessage(content=human)])
    return resp.content.strip()

# ── Route Optimizer ──────────────────────────────────────────────────────────
def build_dist(coords):
    n = len(coords)
    d = [[0.0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                dlat = coords[i][0] - coords[j][0]
                dlon = coords[i][1] - coords[j][1]
                d[i][j] = (dlat**2 + dlon**2) ** 0.5
    return d

def nearest_neighbor(dist):
    n, visited, route = len(dist), [False]*len(dist), [0]
    visited[0] = True
    for _ in range(n-1):
        last = route[-1]
        nearest = min((j for j in range(n) if not visited[j]), key=lambda j: dist[last][j])
        route.append(nearest); visited[nearest] = True
    return route

def route_cost(route, dist):
    return sum(dist[route[i]][route[i+1]] for i in range(len(route)-1))

def two_opt(route, dist):
    best, improved = route[:], True
    while improved:
        improved = False
        for i in range(1, len(best)-1):
            for j in range(i+1, len(best)):
                new = best[:i] + best[i:j+1][::-1] + best[j+1:]
                if route_cost(new, dist) < route_cost(best, dist):
                    best, improved = new, True
    return best

def optimize(names, coords):
    dist = build_dist(coords)
    return [names[i] for i in two_opt(nearest_neighbor(dist), dist)]

# ── Request Models ───────────────────────────────────────────────────────────
class PlaceRequest(BaseModel):
    place: str
    lang: Optional[str] = 'en'

class SpotsRequest(BaseModel):
    place: str
    selected_spots: List[str]
    lang: Optional[str] = 'en'

class ItineraryRequest(BaseModel):
    place: str
    optimal_route: List[str]
    budget: str
    days: int
    transport: str
    lang: Optional[str] = 'en'

class CancelRequest(BaseModel):
    place: str
    home_address: str
    lang: Optional[str] = 'en'

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "AI Tour Guider API running"}

@app.get("/ping")
def ping():
    return {"ok": True}

@app.post("/spots")
def get_spots(req: PlaceRequest):
    raw = ask(
        "You are a travel guide. Reply with ONLY all famous tourist spots in the given place. One name per line. No numbers, no descriptions, just names.",
        req.place, req.lang
    )
    spots = [s.strip() for s in raw.split("\n") if s.strip()][:6]
    return {"place": req.place, "spots": spots}

@app.post("/optimize-route")
def optimize_route(req: SpotsRequest):
    raw = ask(
        "You are a geography expert. Return only valid JSON, no extra text.",
        f"""Give approximate GPS coordinates for these tourist spots in {req.place}.
Reply ONLY with this JSON:
{{
  "spots": [
    {{"name": "Spot Name", "lat": 00.0000, "lon": 00.0000}}
  ]
}}
Spots: {json.dumps(req.selected_spots)}""", 'en', 'heavy'  # coords always in English
    )
    data = parse_json(raw)
    if data and "spots" in data:
        names  = [s["name"] for s in data["spots"]]
        coords = [(s["lat"], s["lon"]) for s in data["spots"]]
    else:
        names  = req.selected_spots
        coords = [(i*0.1, i*0.1) for i in range(len(req.selected_spots))]
    return {
        "original_order": req.selected_spots,
        "optimal_route":  optimize(names, coords),
        "algorithm":      "Nearest Neighbor + 2-opt (TSP hybrid)"
    }

@app.post("/budget")
def get_budget(req: SpotsRequest):
    raw = ask(
        """Travel budget planner. Give exactly 3 budget tiers. Reply ONLY in this format:
1. Budget    - <description> - Est. XX/day in indian rupees in reasonable way
2. Mid-range - <description> - Est. XX/day in indian rupees in reasonable way
3. Luxury    - <description> - Est. XX/day in indian rupees in reasonable way""",
        f"Destination: {req.place}. Spots: {', '.join(req.selected_spots)}", req.lang
    )
    budgets = [b.strip() for b in raw.split("\n") if b.strip()]
    return {"budgets": budgets}

@app.post("/duration")
def get_duration(req: PlaceRequest):
    raw = ask(
        """Travel planner. Reply ONLY in this format:
Suggested stay : X to Y days
Popular choices: X days, Y days, Z days
Tip            : <one sentence>""",
        req.place, req.lang
    )
    return {"suggestion": raw}

@app.post("/transport")
def get_transport(req: PlaceRequest):
    raw = ask(
        "Travel logistics expert. Return only valid JSON, no extra text.",
        f"""Transport options for visiting {req.place}.
Reply ONLY with this JSON:
{{
  "to_destination": {{
    "bus":  {{"available": true, "duration": "X hrs", "cost": "XX in indian rupees in reasonable way", "frequency": "every X hrs", "tip": "..."}},
    "rail": {{"available": true, "duration": "X hrs", "cost": "XX in indian rupees in reasonable way", "frequency": "X trains/day", "tip": "..."}},
    "air":  {{"available": true, "duration": "X hrs", "cost": "XX in indian rupees in reasonable way", "frequency": "X flights/day", "tip": "..."}}
  }},
  "within_destination": {{
    "bus":       {{"available": true, "cost_per_day": "XX in indian rupees in reasonable way", "tip": "..."}},
    "rail":      {{"available": true, "cost_per_day": "XX in indian rupees in reasonable way", "tip": "..."}},
    "auto_taxi": {{"available": true, "cost_per_day": "XX in indian rupees in reasonable way", "tip": "..."}}
  }}
}}""", req.lang
    )
    data = parse_json(raw)
    return {"transport": data or {}}

@app.post("/itinerary")
def get_itinerary(req: ItineraryRequest):
    raw = ask(
        "Professional travel itinerary planner.",
        f"""Create a {req.days}-day itinerary.
Destination : {req.place}
Visit ORDER : {' → '.join(req.optimal_route)}
Budget      : {req.budget}
Transport   : {req.transport} to reach, auto/taxi within

Rules:
- Day 1: Arrival by {req.transport} + first spot
- Day {req.days}: Last spot + departure
- Distribute spots evenly across days
- Time slots: 09:00 AM / 01:00 PM / 05:00 PM
- Include meals

Format:
DAY 1
  09:00 AM — ...
  01:00 PM — ...
  05:00 PM — ...
""", req.lang, 'heavy'
    )
    return {"itinerary": raw}

@app.post("/emergency")
def get_emergency(req: PlaceRequest):
    raw = ask(
        "Travel safety expert. Return only valid JSON, no extra text.",
        f"""List emergency contacts and nearest hospitals, police stations, and hotels in {req.place}.
Reply ONLY with this JSON:
{{
  "emergency_numbers": {{
    "police": "...",
    "ambulance": "...",
    "fire": "...",
    "tourist_helpline": "..."
  }},
  "hospitals": [
    {{"name": "...", "address": "...", "phone": "...", "distance": "X km", "open_24h": true}}
  ],
  "police_stations": [
    {{"name": "...", "address": "...", "phone": "...", "distance": "X km"}}
  ],
  "nearby_hotels": [
    {{"name": "...", "address": "...", "price_range": "...", "rating": 4.2, "distance": "X km"}}
  ]
}}""", req.lang, 'heavy'
    )
    data = parse_json(raw)
    return {"emergency": data or {}}

@app.post("/nearest-station")
def get_nearest_station(req: CancelRequest):
    raw = ask(
        "Travel logistics expert. Help users get home safely.",
        f"""The user is currently in {req.place} and wants to cancel their trip and go home.
Their home address: {req.home_address}

Give them the best route home. Reply ONLY with this JSON:
{{
  "nearest_stations": {{
    "bus_stand":    {{"name": "...", "address": "...", "distance": "X km", "how_to_reach": "..."}},
    "railway":      {{"name": "...", "address": "...", "distance": "X km", "how_to_reach": "..."}},
    "airport":      {{"name": "...", "address": "...", "distance": "X km", "how_to_reach": "..."}}
  }},
  "recommended_route": "...",
  "estimated_travel_time": "...",
  "estimated_cost": "...",
  "tip": "..."
}}""", req.lang
    )
    data = parse_json(raw)
    return {"cancel_trip": data or {}}

# ── New: Spot suggestion after tick ─────────────────────────────────────────
class SuggestionRequest(BaseModel):
    place: str
    completed: List[str]
    remaining: List[str]
    lang: Optional[str] = 'en'

@app.post("/spots-suggestion")
def get_spots_suggestion(req: SuggestionRequest):
    raw = ask(
        "You are a helpful travel guide. Give a short 1-2 sentence suggestion.",
        f"""The traveler is visiting {req.place}.
They have completed: {', '.join(req.completed)}.
Remaining spots: {', '.join(req.remaining)}.
Suggest what they should do next or any tip for their next spot. Keep it short and friendly.""",
        req.lang
    )
    return {"suggestion": raw}

# ── Supabase client (backend) ────────────────────────────────────────────────
from supabase import create_client
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class SaveTripRequest(BaseModel):
    user_id: str
    place: str
    optimal_route: List[str]
    budget: str
    days: int
    transport: str
    lang: Optional[str] = 'en'

class PastProblemsRequest(BaseModel):
    user_id: str
    place: str
    lang: Optional[str] = 'en'

@app.post("/save-trip")
def save_trip(req: SaveTripRequest):
    try:
        # Save trip
        trip = sb.table("trips").insert({
            "user_id":       req.user_id,
            "place":         req.place,
            "optimal_route": req.optimal_route,
            "budget":        req.budget,
            "days":          req.days,
            "transport":     req.transport,
            "lang":          req.lang,
        }).execute()

        if not trip.data:
            return {"error": "Failed to save trip", "detail": str(trip)}

        trip_id = trip.data[0]["id"]

        # Save each spot
        spots = [{"trip_id": trip_id, "spot_name": s, "visited": False} for s in req.optimal_route]
        sb.table("trip_spots").insert(spots).execute()

        return {"trip_id": trip_id, "status": "saved"}

    except Exception as e:
        return {"error": str(e), "status": "failed"}

@app.post("/trip-suggestions")
def trip_suggestions(req: PastProblemsRequest):
    # Fetch past problems for this user
    problems = sb.table("past_problems").select("problem_text")\
        .eq("user_id", req.user_id).execute()

    problem_texts = [p["problem_text"] for p in (problems.data or [])]

    if not problem_texts:
        return {"suggestion": ""}

    raw = ask(
        "You are a helpful travel advisor. Based on past trip problems, give 2-3 short tips.",
        f"""Traveler is planning a trip to {req.place}.
Their past trip problems:
{chr(10).join(f'- {p}' for p in problem_texts[-5:])}

Give 2-3 specific tips to avoid these issues in {req.place}. Keep it brief.""",
        req.lang, 'light'
    )
    return {"suggestion": raw}

# ── RAG: missed places suggestion ───────────────────────────────────────────
class MissedRequest(BaseModel):
    user_id: str
    place: str
    lang: Optional[str] = 'en'

@app.post("/missed-places")
def missed_places(req: MissedRequest):
    # Fetch all unvisited spots for this user at this place
    trips = sb.table("trips").select("id").eq("user_id", req.user_id)\
        .eq("place", req.place).execute()
    trip_ids = [t["id"] for t in (trips.data or [])]
    if not trip_ids:
        return {"missed": [], "suggestion": ""}

    missed = sb.table("trip_spots").select("spot_name")\
        .in_("trip_id", trip_ids).eq("visited", False).execute()
    missed_names = list(set([s["spot_name"] for s in (missed.data or [])]))

    if not missed_names:
        return {"missed": [], "suggestion": "You visited everything last time! Try new spots."}

    suggestion = ask(
        "You are a helpful travel advisor.",
        f"""The traveler is visiting {req.place} again.
Last time they missed these spots: {', '.join(missed_names)}.
Give a short friendly suggestion (2-3 sentences) encouraging them to visit these missed spots this time.""",
        req.lang, 'light'
    )
    return {"missed": missed_names, "suggestion": suggestion}

# ── Frontend Supabase proxy endpoints (bypass RLS issues) ────────────────────
from fastapi import HTTPException

class UpdateSpotRequest(BaseModel):
    trip_id: str
    spot_name: str
    visited: Optional[bool] = None
    comment: Optional[str] = None
    photo_url: Optional[str] = None

class SaveMemoryRequest(BaseModel):
    user_id: str
    trip_id: Optional[str] = None
    title: str
    description: Optional[str] = ''
    photo_url: str

@app.post("/update-spot")
def update_spot(req: UpdateSpotRequest):
    try:
        # Find spot row
        row = sb.table("trip_spots").select("id")\
            .eq("trip_id", req.trip_id).eq("spot_name", req.spot_name).execute()

        if not row.data:
            return {"error": "Spot not found"}

        spot_id = row.data[0]["id"]
        updates = {}
        if req.visited is not None:
            updates["visited"] = req.visited
            if req.visited:
                updates["visited_at"] = "now()"
        if req.comment is not None:
            updates["comment"] = req.comment
        if req.photo_url is not None:
            updates["photo_url"] = req.photo_url

        sb.table("trip_spots").update(updates).eq("id", spot_id).execute()
        return {"status": "updated", "spot_id": spot_id}
    except Exception as e:
        return {"error": str(e)}

@app.post("/save-memory")
def save_memory(req: SaveMemoryRequest):
    try:
        result = sb.table("memories").insert({
            "user_id":     req.user_id,
            "trip_id":     req.trip_id,
            "title":       req.title,
            "description": req.description,
            "photo_url":   req.photo_url,
        }).execute()
        return {"status": "saved", "memory": result.data[0] if result.data else {}}
    except Exception as e:
        return {"error": str(e)}

@app.get("/get-trips/{user_id}")
def get_trips(user_id: str):
    try:
        trips = sb.table("trips").select("*")\
            .eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"trips": trips.data or []}
    except Exception as e:
        return {"error": str(e), "trips": []}

@app.get("/get-spots/{trip_id}")
def get_spots_for_trip(trip_id: str):
    try:
        spots = sb.table("trip_spots").select("*").eq("trip_id", trip_id).execute()
        return {"spots": spots.data or []}
    except Exception as e:
        return {"error": str(e), "spots": []}

@app.get("/get-memories/{user_id}")
def get_memories(user_id: str):
    try:
        # Manual memories
        memories = sb.table("memories").select("*")\
            .eq("user_id", user_id).order("created_at", desc=True).execute()
        # Trip spot photos
        trips = sb.table("trips").select("id, place")\
            .eq("user_id", user_id).execute()
        trip_ids = [t["id"] for t in (trips.data or [])]
        trip_place_map = {t["id"]: t["place"] for t in (trips.data or [])}

        spot_photos = []
        if trip_ids:
            spots = sb.table("trip_spots").select("*")\
                .in_("trip_id", trip_ids)\
                .not_.is_("photo_url", "null").execute()
            spot_photos = [{
                "id":          f"spot-{s['id']}",
                "title":       s["spot_name"],
                "description": s.get("comment") or f"Visited during trip to {trip_place_map.get(s['trip_id'],'')}",
                "photo_url":   s["photo_url"],
                "created_at":  s.get("visited_at"),
                "source":      "trip",
                "place":       trip_place_map.get(s["trip_id"], "")
            } for s in (spots.data or [])]

        manual = [{**m, "source": "manual"} for m in (memories.data or [])]
        all_memories = sorted(
            manual + spot_photos,
            key=lambda x: x.get("created_at") or "",
            reverse=True
        )
        return {"memories": all_memories}
    except Exception as e:
        return {"error": str(e), "memories": []}
