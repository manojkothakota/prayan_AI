import React, { useState, useEffect } from 'react'
import PhotoUpload from './PhotoUpload.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './TripTracker.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TripTracker({ spots, place, lang, tripId }) {
  const { user }                      = useAuth()
  const [spotRows, setSpotRows]       = useState([])
  const [localChecked, setLocalChecked] = useState({})
  const [editingComment, setEditing]  = useState(null)
  const [commentVal, setCommentVal]   = useState('')
  const [suggestion, setSuggestion]   = useState('')
  const [loadingSug, setLoadingSug]   = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  // Load spots from backend
  useEffect(() => {
    if (!tripId) return
    fetch(`${API_BASE}/get-spots/${tripId}`)
      .then(r => r.json())
      .then(d => setSpotRows(d.spots || []))
      .catch(() => {})
  }, [tripId])

  function getRow(spot) {
    if (tripId) return spotRows.find(r => r.spot_name === spot) || {}
    return { spot_name: spot, visited: localChecked[spot] || false, photo_url: null, comment: null, id: null }
  }

  const completed = tripId
    ? spotRows.filter(r => r.visited).length
    : Object.values(localChecked).filter(Boolean).length
  const total   = spots.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  async function handleTick(spot) {
    const row    = getRow(spot)
    const newVal = tripId ? !row.visited : !localChecked[spot]

    if (!tripId) {
      setLocalChecked(p => ({ ...p, [spot]: newVal }))
    } else {
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, visited: newVal })
      }).catch(console.error)
      setSpotRows(p => p.map(r => r.spot_name === spot ? { ...r, visited: newVal } : r))
    }

    if (newVal) {
      const done      = spots.filter(s => (tripId ? spotRows.find(r=>r.spot_name===s)?.visited : localChecked[s]) || s === spot)
      const remaining = spots.filter(s => !(tripId ? spotRows.find(r=>r.spot_name===s)?.visited : localChecked[s]) && s !== spot)
      if (remaining.length === 0) return
      setLoadingSug(true); setSuggestion('')
      try {
        const res  = await fetch(`${API_BASE}/spots-suggestion`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place, completed: done, remaining, lang })
        })
        const data = await res.json()
        setSuggestion(data.suggestion || '')
      } catch {}
      finally { setLoadingSug(false) }
    }
  }

  async function handlePhoto(spot, url) {
    setSpotRows(p => p.map(r => r.spot_name === spot ? { ...r, photo_url: url } : r))
    if (tripId) {
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, photo_url: url })
      }).catch(console.error)
      if (user?.id) {
        fetch(`${API_BASE}/save-memory`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id, trip_id: tripId,
            title: `${spot} — ${place}`,
            description: `Photo taken during trip to ${place}`,
            photo_url: url
          })
        }).catch(console.error)
      }
    }
  }

  async function saveComment(spot) {
    if (tripId) {
      fetch(`${API_BASE}/update-spot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, spot_name: spot, comment: commentVal })
      }).catch(console.error)
    }
    setSpotRows(p => p.map(r => r.spot_name === spot ? { ...r, comment: commentVal } : r))
    setEditing(null); setCommentVal('')
  }

  return (
    <div className="tracker">
      {/* Header */}
      <div className="tracker__header">
        <div className="tracker__title-row">
          <h3 className="tracker__title">📋 Trip Progress</h3>
          <span className="tracker__count">{completed}/{total} visited</span>
        </div>
        <div className="tracker__bar-wrap">
          <div className="tracker__bar" style={{ width:`${percent}%` }} />
        </div>
        <span className="tracker__percent">{percent}% complete</span>
      </div>

      {!tripId && (
        <div className="tracker__note">
          💡 Tick spots below. Photos & progress save once trip is confirmed.
        </div>
      )}

      {/* Spots */}
      <div className="tracker__list">
        {spots.map((spot, i) => {
          const row = getRow(spot)
          return (
            <div key={spot} className={`tracker__item ${row.visited ? 'done' : ''}`}
              style={{ animationDelay:`${i*0.05}s` }}>

              <div className="tracker__item-top">
                <button className={`tracker__checkbox ${row.visited ? 'checked':''}`}
                  onClick={() => handleTick(spot)}>
                  {row.visited ? '✓' : ''}
                </button>
                <span className="tracker__spot-name">{spot}</span>
                {row.visited && <span className="tracker__badge">Visited ✨</span>}
              </div>

              {row.visited && (
                <div className="tracker__spot-extras">
                  {/* Photo */}
                  {row.photo_url
                    ? <div className="tracker__photo-wrap">
                        <img src={row.photo_url} alt={spot} className="tracker__photo" />
                        <span className="tracker__photo-saved">✅ Saved to Memories</span>
                      </div>
                    : <PhotoUpload label={`📷 Add photo of ${spot}`}
                        onUpload={url => handlePhoto(spot, url)} small />
                  }
                  {/* Comment */}
                  {editingComment === spot
                    ? <div className="tracker__comment-box">
                        <textarea rows={2} placeholder="How was it? Any tips?"
                          value={commentVal}
                          onChange={e => setCommentVal(e.target.value)} autoFocus />
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className="tracker__comment-save" onClick={() => saveComment(spot)}>Save</button>
                          <button className="tracker__comment-save"
                            style={{background:'var(--sand-2)',color:'var(--ink)'}}
                            onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </div>
                    : <button className="tracker__comment-btn"
                        onClick={() => { setEditing(spot); setCommentVal(row.comment||'') }}>
                        {row.comment ? `💬 ${row.comment}` : '+ Add comment'}
                      </button>
                  }
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Suggestion */}
      {loadingSug && (
        <div className="tracker__suggestion loading">
          <span className="tracker__dots"><span/><span/><span/></span> Getting tip...
        </div>
      )}
      {suggestion && !loadingSug && (
        <div className="tracker__suggestion"><span>💡</span><p>{suggestion}</p></div>
      )}

      {completed === total && total > 0 && (
        <div className="tracker__complete">🎉 You visited all spots in {place}!</div>
      )}

      {/* Emergency section */}
      <button className="tracker__emergency-btn"
        onClick={() => setShowEmergency(s => !s)}>
        🚨 {showEmergency ? 'Hide' : 'Show'} Emergency Info
      </button>

      {showEmergency && <EmergencyPanel place={place} lang={lang} />}
    </div>
  )
}

// ── Emergency Panel ───────────────────────────────────────────────────────────
function EmergencyPanel({ place, lang }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('numbers')

  useEffect(() => {
    fetch(`${API_BASE}/emergency`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, lang })
    }).then(r => r.json())
      .then(d => { setData(d.emergency); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const tabs = [
    { key:'numbers',   icon:'📞', label:'Numbers'  },
    { key:'hospitals', icon:'🏥', label:'Hospitals' },
    { key:'police',    icon:'👮', label:'Police'    },
    { key:'hotels',    icon:'🏨', label:'Hotels'    },
  ]

  if (loading) return <div className="emergency loading">Loading emergency info...</div>
  if (!data)   return <div className="emergency error">Could not load emergency data.</div>

  return (
    <div className="emergency">
      <div className="emergency__tabs">
        {tabs.map(t => (
          <button key={t.key}
            className={`emergency__tab ${tab===t.key?'active':''}`}
            onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="emergency__content">
        {tab === 'numbers' && data.emergency_numbers && (
          <div className="emergency__numbers">
            {Object.entries(data.emergency_numbers).map(([k,v]) => (
              <div key={k} className="emergency__num-card">
                <span className="emergency__num-label">{k.replace(/_/g,' ').toUpperCase()}</span>
                <a className="emergency__num-val" href={`tel:${v}`}>{v}</a>
              </div>
            ))}
          </div>
        )}
        {tab === 'hospitals' && (
          <div className="emergency__cards">
            {(data.hospitals||[]).map((h,i) => (
              <div key={i} className="emergency__card red">
                <span className="emergency__card-icon">🏥</span>
                <div className="emergency__card-info">
                  <strong>{h.name}</strong>
                  <span>{h.address}</span>
                  <span>📞 {h.phone} · 📍 {h.distance}</span>
                  {h.open_24h && <span className="emergency__badge green">24/7</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'police' && (
          <div className="emergency__cards">
            {(data.police_stations||[]).map((p,i) => (
              <div key={i} className="emergency__card blue">
                <span className="emergency__card-icon">👮</span>
                <div className="emergency__card-info">
                  <strong>{p.name}</strong>
                  <span>{p.address}</span>
                  <span>📞 {p.phone} · 📍 {p.distance}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'hotels' && (
          <div className="emergency__cards">
            {(data.nearby_hotels||[]).map((h,i) => (
              <div key={i} className="emergency__card amber">
                <span className="emergency__card-icon">🏨</span>
                <div className="emergency__card-info">
                  <strong>{h.name}</strong>
                  <span>{h.address}</span>
                  <span>💰 {h.price_range} · ⭐ {h.rating} · 📍 {h.distance}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
