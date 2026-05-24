import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase.js'
import PhotoUpload from '../components/PhotoUpload.jsx'
import './Memories.css'

export default function Memories() {
  const { user }          = useAuth()
  const [memories, setMemories] = useState([])
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ title: '', description: '', trip_id: '', photo_url: '' })
  const [saving, setSaving]     = useState(false)
  const [lightbox, setLightbox] = useState(null) // full screen photo

  useEffect(() => { fetchAll() }, [user])

  async function fetchAll() {
    setLoading(true)

    // 1. Fetch manual memories
    const { data: manualMemories } = await supabase
      .from('memories').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 2. Fetch photos from trip_spots (auto-saved when ticking)
    const { data: tripSpots } = await supabase
      .from('trip_spots')
      .select('id, spot_name, photo_url, comment, visited_at, trip_id')
      .not('photo_url', 'is', null)
      .order('visited_at', { ascending: false })

    // 3. Merge both into one list
    const spotMemories = (tripSpots || []).map(s => ({
      id:          `spot-${s.id}`,
      title:       s.spot_name,
      description: s.comment || 'Visited during a trip',
      photo_url:   s.photo_url,
      created_at:  s.visited_at,
      source:      'trip',
      place:       ''
    }))

    const allMemories = [
      ...(manualMemories || []).map(m => ({ ...m, source: 'manual' })),
      ...spotMemories
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setMemories(allMemories)

    // 4. Fetch trips for dropdown
    const { data: t } = await supabase
      .from('trips').select('id, place').eq('user_id', user.id)
    setTrips(t || [])
    setLoading(false)
  }

  async function saveMemory() {
    if (!form.title || !form.photo_url) return
    setSaving(true)
    await supabase.from('memories').insert({
      ...form,
      user_id:    user.id,
      created_at: new Date().toISOString()
    })
    setForm({ title: '', description: '', trip_id: '', photo_url: '' })
    setShowForm(false)
    fetchAll()
    setSaving(false)
  }

  async function deleteMemory(m) {
    if (!confirm('Delete this memory?')) return
    if (m.source === 'manual') {
      await supabase.from('memories').delete().eq('id', m.id)
    } else {
      // remove photo from trip_spot
      const spotId = m.id.replace('spot-', '')
      await supabase.from('trip_spots').update({ photo_url: null }).eq('id', spotId)
    }
    fetchAll()
  }

  return (
    <div className="memories-page container">

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <div className="lightbox__inner" onClick={e => e.stopPropagation()}>
            <img src={lightbox.photo_url} alt={lightbox.title} />
            <div className="lightbox__info">
              <h3>{lightbox.title}</h3>
              {lightbox.description && <p>{lightbox.description}</p>}
              {lightbox.place && <span>📍 {lightbox.place}</span>}
            </div>
            <button className="lightbox__close" onClick={() => setLightbox(null)}>✕</button>
          </div>
        </div>
      )}

      <div className="memories-header">
        <div>
          <h2 className="memories-title">📸 Memories</h2>
          <p className="memories-sub">{memories.length} memories · photos auto-saved when you tick a spot</p>
        </div>
        <button className="add-memory-btn" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancel' : '+ Add Memory'}
        </button>
      </div>

      {/* Add memory form */}
      {showForm && (
        <div className="memory-form">
          <h3>New Memory</h3>
          <input
            placeholder="Title (e.g. Sunset at Baga Beach)"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <textarea
            placeholder="Write about this memory..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3}
          />
          <select value={form.trip_id} onChange={e => setForm(p => ({ ...p, trip_id: e.target.value }))}>
            <option value="">Link to a trip (optional)</option>
            {trips.map(t => <option key={t.id} value={t.id}>📍 {t.place}</option>)}
          </select>
          <PhotoUpload
            label="Upload memory photo"
            onUpload={url => setForm(p => ({ ...p, photo_url: url }))}
          />
          {form.photo_url && (
            <img src={form.photo_url} alt="preview" className="memory-preview" />
          )}
          <button
            className="btn-save"
            onClick={saveMemory}
            disabled={saving || !form.title || !form.photo_url}
          >
            {saving ? 'Saving...' : 'Save Memory'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="memories-loading">
          <span className="m-dots"><span/><span/><span/></span> Loading memories...
        </div>
      ) : memories.length === 0 ? (
        <div className="memories-empty">
          <span>📷</span>
          <p>No memories yet.</p>
          <p className="memories-empty-hint">
            Tick a spot during your trip to auto-save photos here,<br/>
            or click "+ Add Memory" above.
          </p>
        </div>
      ) : (
        <>
          {/* Trip photos section */}
          {memories.filter(m => m.source === 'trip').length > 0 && (
            <div className="memories-section">
              <h3 className="memories-section-title">🗺️ Places You Visited</h3>
              <div className="memories-grid">
                {memories.filter(m => m.source === 'trip').map(m => (
                  <MemoryCard key={m.id} m={m} onDelete={deleteMemory} onOpen={setLightbox} />
                ))}
              </div>
            </div>
          )}

          {/* Manual memories section */}
          {memories.filter(m => m.source === 'manual').length > 0 && (
            <div className="memories-section">
              <h3 className="memories-section-title">💛 Personal Memories</h3>
              <div className="memories-grid">
                {memories.filter(m => m.source === 'manual').map(m => (
                  <MemoryCard key={m.id} m={m} onDelete={deleteMemory} onOpen={setLightbox} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MemoryCard({ m, onDelete, onOpen }) {
  return (
    <div className="memory-card" onClick={() => onOpen(m)}>
      <div className="memory-card__img-wrap">
        <img
          src={m.photo_url}
          alt={m.title}
          className="memory-card__img"
          onError={e => { e.target.style.display='none' }}
        />
        {m.source === 'trip' && <span className="memory-card__source-badge">✈ Trip</span>}
        <button
          className="memory-card__delete"
          onClick={e => { e.stopPropagation(); onDelete(m) }}
        >🗑</button>
      </div>
      <div className="memory-card__body">
        <h4 className="memory-card__title">{m.title}</h4>
        {m.place && <span className="memory-card__place">📍 {m.place}</span>}
        {m.description && <p className="memory-card__desc">{m.description}</p>}
        <span className="memory-card__date">
          {m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          }) : ''}
        </span>
      </div>
    </div>
  )
}
