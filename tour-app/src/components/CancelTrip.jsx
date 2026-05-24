import React, { useState } from 'react'
import SearchBar from './SearchBar.jsx'
import './CancelTrip.css'

export default function CancelTrip({ place, lang }) {
  const [open, setOpen]             = useState(false)
  const [homeAddress, setHomeAddress] = useState('')
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleFind() {
    if (!homeAddress.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/nearest-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place, home_address: homeAddress, lang })
      })
      const data = await res.json()
      setResult(data.cancel_trip)
    } catch { setError('Could not fetch station data.') }
    finally { setLoading(false) }
  }

  const stationIcons = { bus_stand: '🚌', railway: '🚆', airport: '✈️' }

  return (
    <div className="cancel-wrap">
      <button
        className={`cancel-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>❌ Need to Cancel Trip?</span>
        <span className="cancel-toggle__arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="cancel-panel">
          <div className="cancel-panel__header">
            <h3>🏠 Get back home from {place}</h3>
            <p>Enter your home address and we'll find the nearest stations for you.</p>
          </div>

          <div className="cancel-panel__input">
            <label>Your home address</label>
            <SearchBar
              value={homeAddress}
              onChange={setHomeAddress}
              placeholder="e.g. Hyderabad, Telangana or full address..."
            />
          </div>

          <button
            className="btn btn--primary"
            onClick={handleFind}
            disabled={loading || !homeAddress.trim()}
          >
            {loading ? 'Finding...' : 'Find Nearest Stations →'}
          </button>

          {loading && (
            <div className="cancel-loading">
              <span className="cancel-dots"><span/><span/><span/></span>
              Finding best route home...
            </div>
          )}

          {error && <p className="error">{error}</p>}

          {result && (
            <div className="cancel-result">
              {/* Recommended route banner */}
              <div className="cancel-recommended">
                <span className="cancel-recommended__label">✅ Recommended Route</span>
                <p>{result.recommended_route}</p>
                <div className="cancel-meta">
                  <span>🕐 {result.estimated_travel_time}</span>
                  <span>💰 {result.estimated_cost}</span>
                </div>
                {result.tip && (
                  <div className="cancel-tip">💡 {result.tip}</div>
                )}
              </div>

              {/* Station cards */}
              {result.nearest_stations && (
                <div className="cancel-stations">
                  <h4>Nearest Stations</h4>
                  <div className="cancel-stations__grid">
                    {Object.entries(result.nearest_stations).map(([type, info]) => (
                      <div key={type} className="cancel-station-card">
                        <div className="cancel-station-card__icon">{stationIcons[type] || '📍'}</div>
                        <div className="cancel-station-card__info">
                          <strong>{info.name}</strong>
                          <span>{info.address}</span>
                          <span className="cancel-station-card__dist">📍 {info.distance}</span>
                          <span className="cancel-station-card__how">{info.how_to_reach}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
