const BASE = '/api'

async function post(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  getSpots:      (place, lang = 'en')                                    => post('/spots',          { place, lang }),
  optimizeRoute: (place, selected_spots, lang = 'en')                    => post('/optimize-route', { place, selected_spots, lang }),
  getBudget:     (place, selected_spots, lang = 'en')                    => post('/budget',         { place, selected_spots, lang }),
  getDuration:   (place, lang = 'en')                                    => post('/duration',       { place, lang }),
  getTransport:  (place, lang = 'en')                                    => post('/transport',      { place, lang }),
  getItinerary:  (place, optimal_route, budget, days, transport, lang = 'en') =>
                   post('/itinerary', { place, optimal_route, budget, days, transport, lang }),
  getEmergency:  (place, lang = 'en')                                    => post('/emergency',      { place, lang }),
  getNearestStation: (place, home_address, lang = 'en')                  => post('/nearest-station',{ place, home_address, lang }),
}