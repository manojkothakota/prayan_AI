import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import PhotoUpload from './PhotoUpload.jsx'
import './TripTracker.css'

export default function TripTracker({ spots, place, lang, tripId }) {
  const [spotRows, setSpotRows]       = useState([])   // from supabase
  const [editingComment, setEditing]  = useState(null)
  const [commentVal, setCommentVal]   = useState('')
  const [suggestion, setSuggestion]   = useState('')
  const [loadingSug, setLoadingSug]   = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)

  // Local fallback state (used when tripId not yet available)
  const [localChecked, setLocalChecked] = useState({})

  // Load spots from supabase for this trip
  useEffect(() => {
    if (!tripId) return
    supabase.from('trip_spots').select('*').eq('trip_id', tripId)
      .then(({ data }) => setSpotRows(data || []))
  }, [tripId])

  // Helper: get row — supabase row OR local fallback
  function getRow(spot) {
    if (tripId) return spotRows.find(r => r.spot_name === spot) || {}
    return { spot_name: spot, visited: localChecked[spot] || false, photo_url: null, comment: null, id: null }
  }

  const completed = tripId
    ? spotRows.filter(r => r.visited).length
    : Object.values(localChecked).filter(Boolean).length
  const total   = spots.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  // Tick a spot
  async function handleTick(spot) {
    const row = getRow(spot)

    // No tripId yet — use local state only
    if (!tripId || !row.id) {
      setLocalChecked(p => ({ ...p, [spot]: !p[spot] }))
      return
    }

    const newVal = !row.visited
    await supabase.from('trip_spots')
      .update({ visited: newVal, visited_at: newVal ? new Date().toISOString() : null })
      .eq('id', row.id)
    setSpotRows(p => p.map(r => r.id === row.id ? { ...r, visited: newVal } : r))

    // AI suggestion
    if (newVal) {
      const done      = spots.filter(s => getRow(s).visited || s === spot)
      const remaining = spots.filter(s => !getRow(s).visited && s !== spot)
      if (remaining.length === 0) return
      setLoadingSug(true); setSuggestion('')
      try {
        const res  = await fetch('/api/spots-suggestion', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place, completed: done, remaining, lang })
        })
        const data = await res.json()
        setSuggestion(data.suggestion || '')
      } catch {}
      finally { setLoadingSug(false) }
    }
  }

  // Save photo → Supabase trip_spots + also insert into memories
  async function handlePhoto(spot, url) {
    const row = getRow(spot)
    if (!row.id) return

    // 1. Save to trip_spots
    await supabase.from('trip_spots').update({ photo_url: url }).eq('id', row.id)
    setSpotRows(p => p.map(r => r.id === row.id ? { ...r, photo_url: url } : r))

    // 2. Also auto-add to memories table so Memories page shows it
    const { data: tripData } = await supabase
      .from('trips').select('user_id').eq('id', tripId).single()
    if (tripData) {
      await supabase.from('memories').insert({
        user_id:     tripData.user_id,
        trip_id:     tripId,
        title:       `${spot} — ${place}`,
        description: `Photo taken during trip to ${place}`,
        photo_url:   url
      })
    }
  }

  // Save comment
  async function saveComment(spot) {
    const row = getRow(spot)
    if (!row.id) return
    await supabase.from('trip_spots').update({ comment: commentVal }).eq('id', row.id)
    setSpotRows(p => p.map(r => r.id === row.id ? { ...r, comment: commentVal } : r))
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
          <div className="tracker__bar" style={{ width: `${percent}%` }} />
        </div>
        <span className="tracker__percent">{percent}% complete</span>
      </div>

      {/* Soft note when trip not yet saved */}
      {!tripId && (
        <div className="tracker__note">
          💡 Tick spots below to track progress. Photos save once trip is confirmed.
        </div>
      )}

      {/* Spots */}
      <div className="tracker__list">
        {spots.map((spot, i) => {
          const row = getRow(spot)
          return (
            <div key={spot} className={`tracker__item ${row.visited ? 'done' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}>

              {/* Top row */}
              <div className="tracker__item-top">
                <button
                  className={`tracker__checkbox ${row.visited ? 'checked' : ''}`}
                  onClick={() => handleTick(spot)}
                >{row.visited ? '✓' : ''}</button>
                <span className="tracker__spot-name">{spot}</span>
                {row.visited && <span className="tracker__badge">Visited ✨</span>}
              </div>

              {/* After tick extras */}
              {row.visited && (
                <div className="tracker__spot-extras">

                  {/* Photo */}
                  {row.photo_url
                    ? <div className="tracker__photo-wrap">
                        <img src={row.photo_url} alt={spot} className="tracker__photo" />
                        <span className="tracker__photo-saved">✅ Saved to Memories</span>
                      </div>
                    : <PhotoUpload
                        label={`📷 Add photo of ${spot}`}
                        onUpload={url => handlePhoto(spot, url)}
                      />
                  }

                  {/* Comment */}
                  {editingComment === spot
                    ? <div className="tracker__comment-box">
                        <textarea
                          rows={2}
                          placeholder="How was it? Any tips for others?"
                          value={commentVal}
                          onChange={e => setCommentVal(e.target.value)}
                          autoFocus
                        />
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button className="tracker__comment-save"
                            onClick={() => saveComment(spot)}>Save</button>
                          <button className="tracker__comment-save"
                            style={{ background:'var(--sand-2)', color:'var(--ink)' }}
                            onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </div>
                    : <button className="tracker__comment-btn"
                        onClick={() => { setEditing(spot); setCommentVal(row.comment || '') }}>
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
          <span className="tracker__dots"><span/><span/><span/></span> Getting next tip...
        </div>
      )}
      {suggestion && !loadingSug && (
        <div className="tracker__suggestion">
          <span>💡</span><p>{suggestion}</p>
        </div>
      )}

      {completed === total && total > 0 && (
        <div className="tracker__complete">🎉 You visited all spots in {place}!</div>
      )}

      <button className="tracker__emergency-btn"
        onClick={() => setShowEmergency(s => !s)}>
        🚨 {showEmergency ? 'Hide' : 'Show'} Emergency Info
      </button>

      {showEmergency && <EmergencyPanel place={place} lang={lang} />}
    </div>
  )
}

// ── Emergency ─────────────────────────────────────────────────────────────────
function EmergencyPanel({ place, lang }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('numbers')

  useEffect(() => {
    fetch('/api/emergency', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, lang })
    }).then(r => r.json()).then(d => { setData(d.emergency); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const tabs = [
    { key:'numbers',   icon:'📞', label:'Numbers'  },
    { key:'hospitals', icon:'🏥', label:'Hospitals' },
    { key:'police',    icon:'👮', label:'Police'    },
    { key:'hotels',    icon:'🏨', label:'Hotels'    },
  ]

  if (loading) return <div className="emergency loading">Loading...</div>
  if (!data)   return <div className="emergency error">Could not load.</div>

  return (
    <div className="emergency">
      <div className="emergency__tabs">
        {tabs.map(t => (
          <button key={t.key}
            className={`emergency__tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="emergency__content">
        {tab === 'numbers' && data.emergency_numbers && (
          <div className="emergency__numbers">
            {Object.entries(data.emergency_numbers).map(([k, v]) => (
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
                  <strong>{h.name}</strong><span>{h.address}</span>
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
                  <strong>{p.name}</strong><span>{p.address}</span>
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
                  <strong>{h.name}</strong><span>{h.address}</span>
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