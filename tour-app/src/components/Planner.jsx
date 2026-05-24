import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api.js'
import SearchBar from './SearchBar.jsx'
import LanguagePicker from './LanguagePicker.jsx'
import TripTracker from './TripTracker.jsx'
import CancelTrip from './CancelTrip.jsx'
import PlaceCard from './PlaceCard.jsx'
import PhotoUpload from './PhotoUpload.jsx'
import './Planner.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'


const STEPS = ['Destination', 'Spots', 'Budget', 'Duration', 'Transport', 'Itinerary']

function Loader({ text }) {
  return (
    <div className="loader">
      <div className="loader__dots"><span /><span /><span /></div>
      <p className="loader__text">{text}</p>
    </div>
  )
}

function StepBar({ current }) {
  return (
    <div className="stepbar">
      {STEPS.map((s, i) => (
        <div key={s} className={`stepbar__item ${i <= current ? 'active' : ''} ${i === current ? 'current' : ''}`}>
          <div className="stepbar__dot">{i < current ? '✓' : i + 1}</div>
          <span className="stepbar__label">{s}</span>
          {i < STEPS.length - 1 && <div className="stepbar__line" />}
        </div>
      ))}
    </div>
  )
}

// ─── STEP 0 ──────────────────────────────────────────────────
function Step0({ onNext }) {
  const { user } = useAuth()
  const [place, setPlace]         = useState('')
  const [lang, setLang]           = useState('en')
  const [langLabel, setLangLabel] = useState('English')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit() {
    if (!place.trim()) return
    setLoading(true); setError('')
    try {
      const data = await api.getSpots(place.trim(), lang)
      // Check missed places from previous visits
      let missedData = { missed: [], suggestion: '' }
      if (user) {
        try {
          const mr = await fetch(`\${API_BASE}/missed-places`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ user_id: user.id, place: data.place, lang })
          })
          missedData = await mr.json()
        } catch {}
      }
      onNext({ place: data.place, spots: data.spots, lang, langLabel,
               missedPlaces: missedData.missed, missedSuggestion: missedData.suggestion })
    } catch { setError('Could not fetch spots. Is the backend running?') }
    finally { setLoading(false) }
  }

  return (
    <div className="step-card">
      <div className="step-card__icon">🌍</div>
      <h2 className="step-card__title">Where do you want to go?</h2>
      <p className="step-card__sub">Type any city, region or country</p>
      <SearchBar value={place} onChange={setPlace} />
      <LanguagePicker selected={lang} onChange={(code, label) => { setLang(code); setLangLabel(label) }} />
      <button className="btn btn--primary btn--full" onClick={handleSubmit} disabled={loading || !place.trim()}>
        {loading ? '...' : 'Search →'}
      </button>
      {loading && <Loader text="Finding top spots..." />}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// ─── STEP 1 ──────────────────────────────────────────────────
function Step1({ place, spots, lang, missedPlaces, missedSuggestion, onNext }) {
  const [selected, setSelected] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function toggle(s) {
    setSelected(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }

  async function handleNext() {
    if (selected.length < 2) { setError('Select at least 2 spots'); return }
    setLoading(true); setError('')
    try {
      const [routeData, budgetData] = await Promise.all([
        api.optimizeRoute(place, selected, lang),
        api.getBudget(place, selected, lang)
      ])
      onNext({ optimal_route: routeData.optimal_route, budgets: budgetData.budgets })
    } catch { setError('Route optimization failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="step-card">
      <div className="step-card__icon">📍</div>
      <h2 className="step-card__title">Pick your spots in {place}</h2>
      <p className="step-card__sub">Select 2 or more — we'll optimize the route</p>
      {missedSuggestion && (
        <div className="missed-banner">
          <span>🔁</span>
          <div>
            <strong>From your last visit:</strong>
            <p>{missedSuggestion}</p>
          </div>
        </div>
      )}
      <div className="spots-grid">
        {spots.map(s => (
          <PlaceCard key={s} name={s} place={place}
            selected={selected.includes(s)} onSelect={() => toggle(s)} />
        ))}
      </div>
      <p className="selected-count">{selected.length} selected</p>
      {loading && <Loader text="Optimizing route (TSP)..." />}
      {error && <p className="error">{error}</p>}
      <button className="btn btn--primary btn--full" onClick={handleNext} disabled={loading || selected.length < 2}>
        Optimize Route →
      </button>
    </div>
  )
}

// ─── STEP 2 ──────────────────────────────────────────────────
function Step2({ optimal_route, budgets, onNext }) {
  const [selected, setSelected] = useState(null)
  const icons  = ['🎒','🏨','💎']
  const colors = ['teal','amber','ink']
  return (
    <div className="step-card">
      <div className="step-card__icon">💰</div>
      <h2 className="step-card__title">Choose your budget</h2>
      <p className="step-card__sub">Route: <strong>{optimal_route.join(' → ')}</strong></p>
      <div className="budget-grid">
        {budgets.map((b, i) => (
          <button key={i}
            className={`budget-card ${selected === i ? 'selected' : ''} budget-card--${colors[i]}`}
            onClick={() => setSelected(i)}>
            <span className="budget-card__icon">{icons[i]}</span>
            <span className="budget-card__text">{b}</span>
          </button>
        ))}
      </div>
      <button className="btn btn--primary btn--full"
        onClick={() => onNext({ budget: budgets[selected] })}
        disabled={selected === null}>Continue →</button>
    </div>
  )
}

// ─── STEP 3 ──────────────────────────────────────────────────
function Step3({ place, lang, onNext }) {
  const [days, setDays]           = useState(3)
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.getDuration(place, lang).then(d => { setSuggestion(d.suggestion); setLoading(false) })
  }, [])

  return (
    <div className="step-card">
      <div className="step-card__icon">📅</div>
      <h2 className="step-card__title">How many days?</h2>
      {loading ? <Loader text="Getting suggestions..." /> : (
        <div className="suggestion-box">{suggestion}</div>
      )}
      <div className="days-row">
        {[2,3,4,5,6,7,10].map(d => (
          <button key={d} className={`day-chip ${days === d ? 'selected' : ''}`}
            onClick={() => setDays(d)}>{d}d</button>
        ))}
      </div>
      <div className="days-input-row">
        <span>Or type:</span>
        <input type="number" min={1} max={30} value={days}
          onChange={e => setDays(Number(e.target.value))} className="days-input" />
        <span>days</span>
      </div>
      <button className="btn btn--primary btn--full" onClick={() => onNext({ days })}>
        Continue →
      </button>
    </div>
  )
}

// ─── STEP 4 ──────────────────────────────────────────────────
function Step4({ place, lang, onNext }) {
  const [transport, setTransport] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const icons = { bus:'🚌', rail:'🚆', air:'✈️' }

  useEffect(() => {
    api.getTransport(place, lang).then(d => { setTransport(d.transport); setLoading(false) })
  }, [])

  return (
    <div className="step-card">
      <div className="step-card__icon">🚀</div>
      <h2 className="step-card__title">How will you travel to {place}?</h2>
      {loading ? <Loader text="Fetching transport options..." /> : (
        <>
          <div className="transport-grid">
            {transport?.to_destination && Object.entries(transport.to_destination).map(([mode, info]) => (
              <button key={mode}
                className={`transport-card ${selected === mode ? 'selected' : ''} ${!info.available ? 'unavailable' : ''}`}
                onClick={() => info.available && setSelected(mode)}>
                <span className="transport-card__icon">{icons[mode] || '🚗'}</span>
                <span className="transport-card__mode">{mode.toUpperCase()}</span>
                <span className="transport-card__duration">{info.duration}</span>
                <span className="transport-card__cost">{info.cost}</span>
                <span className="transport-card__freq">{info.frequency}</span>
                <span className="transport-card__tip">{info.tip}</span>
              </button>
            ))}
          </div>
          {transport?.within_destination && (
            <div className="local-transport">
              <h3>Local transport within {place}</h3>
              <div className="local-grid">
                {Object.entries(transport.within_destination).map(([mode, info]) => (
                  <div key={mode} className="local-chip">
                    <strong>{mode.replace('_',' ').toUpperCase()}</strong>
                    <span>{info.cost_per_day}/day</span>
                    <span className="local-chip__tip">{info.tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <button className="btn btn--primary btn--full"
        onClick={() => onNext({ transport: selected })} disabled={!selected}>
        Generate Itinerary →
      </button>
    </div>
  )
}

// ─── STEP 5: Itinerary + Todo List ───────────────────────────
function Step5({ place, optimal_route, budget, days, transport, lang, onRestart }) {
  const { user }                  = useAuth()
  const [itinerary, setItinerary] = useState('')
  const [loading, setLoading]     = useState(true)
  const [saveMsg, setSaveMsg]     = useState('')
  const [tripId, setTripId]       = useState(null)

  // Spot states
  const [spotStatus, setSpotStatus] = useState(
    () => optimal_route.reduce((acc, s) => ({ ...acc, [s]: { visited: false, photo_url: null, comment: '', editing: false } }), {})
  )
  const [missedSuggestion, setMissedSuggestion] = useState('')

  useEffect(() => {
    // 1. Generate itinerary
    api.getItinerary(place, optimal_route, budget, days, transport, lang)
      .then(async d => {
        setItinerary(d.itinerary)
        setLoading(false)
        // 2. Auto-save trip
        if (user) {
          try {
            const res  = await fetch(`\${API_BASE}/save-trip`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, place, optimal_route, budget, days, transport, lang })
            })
            const data = await res.json()
            setTripId(data.trip_id)
            setSaveMsg('✅ Trip saved to History!')
          } catch { setSaveMsg('⚠️ Could not save trip.') }
        }
      })
  }, [])

  // Save spot visit to backend
  async function toggleVisit(spot) {
    const cur = spotStatus[spot]
    const newVal = !cur.visited
    setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], visited: newVal } }))
    if (tripId) {
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, visited: newVal })
      }).catch(console.error)
    }
  }

  // Save photo via backend
  async function handlePhoto(spot, url) {
    setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], photo_url: url } }))
    if (tripId) {
      // Update spot photo
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, photo_url: url })
      }).catch(console.error)
      // Save to memories
      fetch(`${API_BASE}/save-memory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id, trip_id: tripId,
          title: `${spot} — ${place}`,
          description: spotStatus[spot].comment || `Visited during trip to ${place}`,
          photo_url: url
        })
      }).catch(console.error)
    }
  }

  // Save comment via backend
  async function saveComment(spot) {
    const comment = spotStatus[spot].comment
    setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], editing: false } }))
    if (tripId) {
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, comment })
      }).catch(console.error)
    }
  }

  // RAG: suggest missed places
  async function suggestMissed() {
    const visited = optimal_route.filter(s => spotStatus[s].visited)
    const missed  = optimal_route.filter(s => !spotStatus[s].visited)
    if (missed.length === 0) { setMissedSuggestion('🎉 You visited everything!'); return }
    const res  = await fetch(`\${API_BASE}/spots-suggestion`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, completed: visited, remaining: missed, lang })
    })
    const data = await res.json()
    setMissedSuggestion(data.suggestion)
  }

  const visitedCount = optimal_route.filter(s => spotStatus[s].visited).length
  const percent      = Math.round((visitedCount / optimal_route.length) * 100)

  return (
    <div className="step5-wrap">

      {/* ── Itinerary Card ── */}
      <div className="step-card step-card--wide">
        <div className="step-card__icon">🗺️</div>
        <h2 className="step-card__title">Your {days}-Day Itinerary</h2>

        <div className="summary-chips">
          <span className="summary-chip">📍 {place}</span>
          <span className="summary-chip">💰 {budget?.split('-')[0]?.trim()}</span>
          <span className="summary-chip">📅 {days} days</span>
          <span className="summary-chip">🚀 {transport?.toUpperCase()}</span>
        </div>

        <div className="route-banner">
          <span className="route-banner__label">Optimal Route</span>
          <div className="route-banner__stops">
            {optimal_route.map((s, i) => (
              <React.Fragment key={s}>
                <span className="route-stop">{s}</span>
                {i < optimal_route.length - 1 && <span className="route-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {saveMsg && <div className={`save-notice ${saveMsg.startsWith('✅') ? 'success' : 'warn'}`}>{saveMsg}</div>}

        {loading
          ? <Loader text="Generating your personalized itinerary..." />
          : <pre className="itinerary-text">{itinerary}</pre>
        }
      </div>

      {/* ── Todo Checklist (shown after itinerary loads) ── */}
      {!loading && (
        <div className="todo-card">
          <div className="todo-header">
            <div>
              <h3 className="todo-title">📋 Places To Visit</h3>
              <p className="todo-sub">Tick each place as you visit it. Add a photo and comment for memories.</p>
            </div>
            <div className="todo-progress-wrap">
              <span className="todo-progress-text">{visitedCount}/{optimal_route.length}</span>
              <div className="todo-bar"><div className="todo-bar__fill" style={{ width:`${percent}%` }} /></div>
              <span className="todo-percent">{percent}%</span>
            </div>
          </div>

          <div className="todo-list">
            {optimal_route.map((spot, i) => {
              const s = spotStatus[spot]
              return (
                <div key={spot} className={`todo-item ${s.visited ? 'visited' : ''}`}>

                  {/* Row: checkbox + name */}
                  <div className="todo-item__row">
                    <button className={`todo-check ${s.visited ? 'checked' : ''}`}
                      onClick={() => toggleVisit(spot)}>
                      {s.visited ? '✓' : ''}
                    </button>
                    <span className="todo-item__name">{spot}</span>
                    {s.visited && <span className="todo-item__done">Visited ✨</span>}
                  </div>

                  {/* After tick: photo + comment options */}
                  {s.visited && (
                    <div className="todo-item__extras">

                      {/* Photo upload */}
                      <div className="todo-extra-block">
                        <span className="todo-extra-label">📷 Photo</span>
                        {s.photo_url
                          ? <div className="todo-photo-wrap">
                              <img src={s.photo_url} alt={spot} className="todo-photo" />
                              <span className="todo-photo-saved">✅ Saved to Memories</span>
                            </div>
                          : <PhotoUpload
                              label={`Upload photo of ${spot}`}
                              onUpload={url => handlePhoto(spot, url)}
                              small
                            />
                        }
                      </div>

                      {/* Comment */}
                      <div className="todo-extra-block">
                        <span className="todo-extra-label">💬 Comment</span>
                        {s.editing
                          ? <div className="todo-comment-edit">
                              <textarea
                                rows={2}
                                placeholder="How was it? Any tips?"
                                value={s.comment}
                                onChange={e => setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], comment: e.target.value } }))}
                                autoFocus
                              />
                              <div className="todo-comment-btns">
                                <button className="todo-btn-save" onClick={() => saveComment(spot)}>Save</button>
                                <button className="todo-btn-cancel"
                                  onClick={() => setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], editing: false } }))}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          : <button className="todo-comment-btn"
                              onClick={() => setSpotStatus(p => ({ ...p, [spot]: { ...p[spot], editing: true } }))}>
                              {s.comment ? `"${s.comment}"` : '+ Add comment'}
                            </button>
                        }
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Completed */}
          {visitedCount === optimal_route.length && (
            <div className="todo-complete">🎉 Amazing! You visited all spots in {place}!</div>
          )}

          {/* RAG: suggest missed places */}
          {visitedCount > 0 && visitedCount < optimal_route.length && (
            <button className="todo-rag-btn" onClick={suggestMissed}>
              💡 Suggest missed places for next visit
            </button>
          )}
          {missedSuggestion && (
            <div className="todo-rag-result">
              <span>🧠</span><p>{missedSuggestion}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Cancel Trip ── */}
      {!loading && <CancelTrip place={place} lang={lang} />}

      {/* ── Restart ── */}
      <button className="btn btn--outline" style={{ width:'100%', maxWidth:800, margin:'0 auto' }}
        onClick={onRestart}>← Plan Another Trip</button>
    </div>
  )
}

// ─── MAIN PLANNER ────────────────────────────────────────────
export default function Planner({ onBack, prefillPlace }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({})

  function next(newData) { setData(p => ({ ...p, ...newData })); setStep(s => s + 1) }
  function restart()     { setData({}); setStep(0) }

  return (
    <section className="planner">
      <div className="container">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <StepBar current={step} />
        <div className="planner__content">
          {step === 0 && <Step0 onNext={next} />}
          {step === 1 && <Step1 place={data.place} spots={data.spots} lang={data.lang} missedPlaces={data.missedPlaces} missedSuggestion={data.missedSuggestion} onNext={next} />}
          {step === 2 && <Step2 optimal_route={data.optimal_route} budgets={data.budgets} lang={data.lang} onNext={next} />}
          {step === 3 && <Step3 place={data.place} lang={data.lang} onNext={next} />}
          {step === 4 && <Step4 place={data.place} lang={data.lang} onNext={next} />}
          {step === 5 && (
            <Step5
              place={data.place}
              optimal_route={data.optimal_route}
              budget={data.budget}
              days={data.days}
              transport={data.transport}
              lang={data.lang}
              onRestart={restart}
            />
          )}
        </div>
      </div>
    </section>
  )
}
