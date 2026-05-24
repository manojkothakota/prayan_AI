import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import './History.css'

export default function History() {
  const { user } = useAuth()
  const [trips, setTrips]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)
  const [spots, setSpots]         = useState({})
  const [comment, setComment]     = useState('')
  const [problem, setProblem]     = useState('')
  const [activeSpot, setActiveSpot] = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchTrips() }, [user])

  async function fetchTrips() {
    setLoading(true)
    const { data } = await supabase
      .from('trips').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTrips(data || [])
    setLoading(false)
  }

  async function fetchSpots(tripId) {
    const { data } = await supabase
      .from('trip_spots').select('*').eq('trip_id', tripId)
    setSpots(prev => ({ ...prev, [tripId]: data || [] }))
  }

  async function toggleExpand(tripId) {
    if (expanded === tripId) { setExpanded(null); return }
    setExpanded(tripId)
    if (!spots[tripId]) await fetchSpots(tripId)
  }

  async function saveComment(spot) {
    setSaving(true)
    await supabase.from('trip_spots')
      .update({ comment, visited: true, visited_at: new Date().toISOString() })
      .eq('id', spot.id)
    await fetchSpots(spot.trip_id)
    setComment(''); setActiveSpot(null)
    setSaving(false)
  }

  async function savePhoto(spot, url) {
    await supabase.from('trip_spots').update({ photo_url: url }).eq('id', spot.id)
    await fetchSpots(spot.trip_id)
  }

  async function saveProblem(tripId) {
    if (!problem.trim()) return
    setSaving(true)
    await supabase.from('past_problems').insert({
      user_id: user.id, trip_id: tripId, problem_text: problem
    })
    setProblem(''); setSaving(false)
    alert('Problem saved! AI will use this to improve your next trip.')
  }

  async function deleteTrip(tripId) {
    if (!confirm('Delete this trip?')) return
    await supabase.from('trip_spots').delete().eq('trip_id', tripId)
    await supabase.from('trips').delete().eq('id', tripId)
    fetchTrips()
  }

  if (loading) return (
    <div className="history-page container">
      <div className="history-loading">
        <span className="h-dots"><span/><span/><span/></span>
        Loading your trips...
      </div>
    </div>
  )

  return (
    <div className="history-page container">
      <div className="history-header">
        <h2 className="history-title">🗺️ Your Trip History</h2>
        <p className="history-sub">{trips.length} trips planned</p>
      </div>

      {trips.length === 0 ? (
        <div className="history-empty">
          <span>🌍</span>
          <p>No trips yet. Start planning your first adventure!</p>
        </div>
      ) : (
        <div className="history-list">
          {trips.map(trip => (
            <div key={trip.id} className={`trip-card ${expanded === trip.id ? 'expanded' : ''}`}>

              {/* Trip header */}
              <div className="trip-card__header" onClick={() => toggleExpand(trip.id)}>
                <div className="trip-card__info">
                  <span className="trip-card__place">📍 {trip.place}</span>
                  <div className="trip-card__meta">
                    <span>📅 {trip.days} days</span>
                    <span>🚀 {trip.transport?.toUpperCase()}</span>
                    <span>💰 {trip.budget?.split('-')[0]?.trim()}</span>
                    <span className="trip-card__date">
                      {new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {trip.optimal_route && (
                    <div className="trip-card__route">
                      {trip.optimal_route.map((s, i) => (
                        <React.Fragment key={s}>
                          <span>{s}</span>
                          {i < trip.optimal_route.length - 1 && <span className="trip-arrow">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
                <div className="trip-card__actions">
                  <button className="trip-delete" onClick={e => { e.stopPropagation(); deleteTrip(trip.id) }}>🗑</button>
                  <span className="trip-expand-icon">{expanded === trip.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded content */}
              {expanded === trip.id && (
                <div className="trip-card__body">

                  {/* Spots checklist */}
                  <h4 className="trip-section-title">📋 Spots</h4>
                  <div className="trip-spots">
                    {/* Summary row */}
                  <div className="trip-spots-summary">
                    <span className="tss-visited">✅ Visited: {(spots[trip.id]||[]).filter(s=>s.visited).length}</span>
                    <span className="tss-missed">⏭ Missed: {(spots[trip.id]||[]).filter(s=>!s.visited).length}</span>
                  </div>

                  {(spots[trip.id] || []).map(spot => (
                    <div key={spot.id} className={`trip-spot ${spot.visited ? 'visited' : 'not-visited'}`}>
                      <div className="trip-spot__top">
                        <span className={`trip-spot__check ${spot.visited ? 'done' : ''}`}>
                          {spot.visited ? '✓' : '○'}
                        </span>
                        <span className="trip-spot__name">{spot.spot_name}</span>
                        <span className={`trip-spot__status-badge ${spot.visited ? 'green' : 'grey'}`}>
                          {spot.visited ? 'Visited' : 'Not visited'}
                        </span>
                        <button className="trip-spot__edit"
                          onClick={() => { setActiveSpot(spot); setComment(spot.comment || '') }}>✏️</button>
                      </div>

                      {spot.comment && (
                        <div className="trip-spot__comment">💬 {spot.comment}</div>
                      )}
                      {spot.photo_url && (
                        <img src={spot.photo_url} alt={spot.spot_name} className="trip-spot__photo" />
                      )}
                      {!spot.photo_url && spot.visited && (
                        <PhotoUpload label="Add photo" onUpload={url => savePhoto(spot, url)} small />
                      )}
                      {activeSpot?.id === spot.id && (
                        <div className="trip-spot__editor">
                          <textarea placeholder="Write your experience..." value={comment}
                            onChange={e => setComment(e.target.value)} rows={3} />
                          <div className="trip-spot__editor-btns">
                            <button className="btn-save" onClick={() => saveComment(spot)} disabled={saving}>
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button className="btn-cancel" onClick={() => setActiveSpot(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>

                  {/* Report a problem */}
                  <h4 className="trip-section-title">⚠️ Report a Problem</h4>
                  <div className="trip-problem">
                    <textarea
                      placeholder="Any issues you faced? (bad roads, closed attractions, safety concerns...) AI will use this for your next trip."
                      value={problem}
                      onChange={e => setProblem(e.target.value)}
                      rows={3}
                    />
                    <button className="btn-save" onClick={() => saveProblem(trip.id)} disabled={saving || !problem.trim()}>
                      {saving ? 'Saving...' : 'Save Problem'}
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}