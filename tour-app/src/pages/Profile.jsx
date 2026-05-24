import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './Profile.css'

const INTERESTS = ['Beaches', 'History', 'Food', 'Adventure', 'Nature', 'Shopping', 'Nightlife', 'Culture', 'Temples', 'Trekking']
const STYLES    = ['Budget 🎒', 'Mid-range 🏨', 'Luxury 💎']
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Spanish', 'French', 'Arabic']

export default function Profile() {
  const { user, profile, updateProfile } = useAuth()
  const [form, setForm]     = useState({ name: '', phone: '', city: '', travel_style: '', interests: [], languages: 'English' })
  const [trips, setTrips]   = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [tab, setTab]       = useState('profile')

  useEffect(() => {
    if (profile) {
      setForm({
        name:         profile.name || '',
        phone:        profile.phone || '',
        city:         profile.city || '',
        travel_style: profile.travel_style || '',
        interests:    profile.interests || [],
        languages:    profile.languages || 'English'
      })
    }
    fetchTrips()
  }, [profile])

  async function fetchTrips() {
    const { data } = await supabase
      .from('trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTrips(data || [])
  }

  function toggleInterest(i) {
    setForm(p => ({
      ...p,
      interests: p.interests.includes(i) ? p.interests.filter(x => x !== i) : [...p.interests, i]
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="profile-page container">
      <div className="profile-header">
        <div className="profile-avatar">{form.name?.charAt(0)?.toUpperCase() || '?'}</div>
        <div>
          <h2 className="profile-name">{form.name || 'Traveler'}</h2>
          <p className="profile-email">{user?.email}</p>
          <p className="profile-trips-count">{trips.length} trips planned</p>
        </div>
      </div>

      <div className="profile-tabs">
        {['profile', 'preferences'].map(t => (
          <button key={t} className={`profile-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'profile' ? '👤 Profile' : '⚙️ Preferences'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="profile-section">
          <div className="profile-grid">
            <div className="profile-field">
              <label>Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div className="profile-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="profile-field">
              <label>Home City</label>
              <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Hyderabad" />
            </div>
            <div className="profile-field">
              <label>Preferred Language</label>
              <select value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
          </button>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="profile-section">
          <div className="pref-group">
            <label className="pref-label">Travel Style</label>
            <div className="pref-chips">
              {STYLES.map(s => (
                <button
                  key={s}
                  className={`pref-chip ${form.travel_style === s ? 'selected' : ''}`}
                  onClick={() => setForm(p => ({ ...p, travel_style: s }))}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="pref-group">
            <label className="pref-label">Interests (pick all that apply)</label>
            <div className="pref-chips">
              {INTERESTS.map(i => (
                <button
                  key={i}
                  className={`pref-chip ${form.interests?.includes(i) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(i)}
                >{i}</button>
              ))}
            </div>
          </div>

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Preferences'}
          </button>

          {form.interests?.length > 0 && form.travel_style && (
            <div className="pref-summary">
              <span>🧠 AI will now use your preferences to personalize all trip suggestions.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
