# ✈️ AI Tour Guider

> An intelligent full-stack travel planning application powered by Generative AI — from destination discovery to day-by-day itinerary generation, with real-time trip tracking and memory preservation.

🔗 **Live Demo:** [ai-tour-guider.vercel.app](https://your-app.vercel.app)

---

## 📌 Overview

AI Tour Guider is a production-ready web application that transforms the way people plan and experience travel. Users describe where they want to go, and the AI handles everything — suggesting spots, optimizing the travel route, generating budgets, and creating a personalized day-by-day itinerary in the user's preferred language.

The application continues to be useful **during** the trip — tracking visited places, enabling photo memories, and providing emergency assistance nearby.

---

## 🎯 Key Highlights

- **End-to-end AI integration** — LLM handles spot discovery, route reasoning, budget planning, itinerary generation, and contextual suggestions
- **Custom route optimization** — Hybrid TSP algorithm (Nearest Neighbor + 2-opt) finds the shortest visiting order
- **Multilingual** — Full support for 10 languages including Telugu, Hindi, Tamil, and more
- **RAG-inspired personalization** — Previous trip problems and missed spots influence future trip suggestions
- **Production deployed** — Backend on Render, Frontend on Vercel, Database on Supabase

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI, routing, state management |
| Backend | FastAPI + Python | REST API, business logic |
| AI Model | Groq (LLaMA 3.3 70B) | Itinerary, suggestions, language |
| Database | Supabase (PostgreSQL) | User data, trips, memories |
| Auth | Supabase Auth | Secure email/password login |
| Media | Cloudinary | Photo storage and delivery |
| Search | OpenStreetMap Nominatim | Free real-time place autocomplete |
| Photos | Unsplash API | High-quality destination images |

---

## 🧩 Core Features

### 🗺️ Intelligent Trip Planning
A guided 5-step wizard walks users through the entire planning process — destination search with live autocomplete, multi-spot selection with real photos, budget selection, duration planning, and transport mode selection.

### ⚡ Route Optimization
Selected spots are automatically reordered using a **Nearest Neighbor + 2-opt TSP hybrid**, minimizing total travel distance while respecting visit priorities.

### 📅 AI Itinerary Generation
The LLM generates a structured day-by-day plan with time slots (morning, afternoon, evening), meal breaks, transport guidance, and local tips — all in the user's chosen language.

### ✅ Live Trip Tracking
During the trip, users tick off visited spots on an interactive checklist. Each completed spot unlocks photo upload and comment options. The AI responds with contextual tips for the next stop.

### 📸 Memory Preservation
Photos uploaded during the trip are stored in Cloudinary and automatically appear in the user's Memories gallery. Users can also add personal memories manually with descriptions and trip links.

### 🚨 Emergency Assistance
One tap reveals nearby hospitals, police stations, hotels, and emergency contact numbers for the current destination — always accessible during the trip.

### 🔁 Learning from Past Trips
When a user plans a trip to a previously visited destination, the app surfaces spots they missed last time and suggests them as priorities — a lightweight RAG-style pattern using their trip history.

### 🏠 Trip Cancellation Support
If a trip needs to be cancelled mid-way, users enter their home address and instantly receive the nearest bus stand, railway station, and airport with directions and estimated costs.

---

## 🏗️ Architecture

```
User (Browser)
     │
     ▼
React Frontend (Vercel)
     │  REST API calls
     ▼
FastAPI Backend (Render)
     ├── Groq LLaMA API     → AI generation
     ├── Supabase           → Database read/write
     └── Returns responses
          │
          ▼
     React updates UI
          │
          ▼
Cloudinary (photo uploads — direct from browser)
Supabase Auth (session management — direct from browser)
```

---

## 🧠 Algorithm Detail

### Route Optimization (TSP Hybrid)

```
Input:  List of selected tourist spots with GPS coordinates

Phase 1 — Nearest Neighbor (greedy construction)
  → Start at spot 0
  → Always move to the closest unvisited spot
  → O(n²) time complexity
  → Produces a good initial route quickly

Phase 2 — 2-opt improvement
  → Try reversing every possible sub-segment of the route
  → Keep the reversal if it reduces total distance
  → Repeat until no improvement found
  → Eliminates route crossings

Output: Near-optimal visiting order
```

This hybrid is chosen because brute-force TSP is O(n!) — infeasible for 6+ spots — while pure nearest-neighbor gets stuck in local optima. The 2-opt pass corrects those without significant compute cost.

---

## 🌐 Load Distribution

The application uses **two Groq API keys** to distribute token usage across endpoint types:

- **Key 1** handles compute-heavy endpoints: route coordinate resolution, full itinerary generation, emergency data
- **Key 2** handles lightweight endpoints: spot names, budget lines, duration hints, short suggestions

This prevents rate limiting and keeps response times consistent.

---

## 🔐 Security Design

- All secret keys (Groq, Supabase service key) live only in the backend environment — never shipped to the browser
- Supabase Row Level Security (RLS) ensures users can only access their own data
- The backend uses the Supabase **service key** (bypasses RLS intentionally for trusted writes)
- The frontend uses only the **anon key** (public, limited permissions)
- `.env` files are gitignored at both layers

---

## 📊 Database Schema

```
profiles       — user details, preferences, language
trips          — destination, route, budget, days, transport
trip_spots     — per-spot visited status, photo, comment
memories       — user photo memories linked to trips
past_problems  — issues reported per trip (feeds AI suggestions)
```

---

## 🚀 What I Built & Learned

- Integrated a production LLM API (Groq) into a real user-facing workflow
- Implemented a classical optimization algorithm (TSP) in a modern web context
- Designed a full-stack application with separate auth, storage, and compute layers
- Handled real deployment challenges — CORS, environment variables, cold starts, API rate limits
- Built a feedback loop where past user data improves future AI outputs (RAG pattern)
- Deployed and maintained a live application with real users

---

## 📬 Contact

**[Your Name]**
[your.email@gmail.com] · [linkedin.com/in/yourprofile] · [github.com/yourusername]
