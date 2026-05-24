import React, { useState } from 'react'
import './Places.css'

const FEATURED = [
  { name: 'Goa', country: 'India', tag: 'Beaches', emoji: '🏖️' },
  { name: 'Rajasthan', country: 'India', tag: 'Heritage', emoji: '🏰' },
  { name: 'Kerala', country: 'India', tag: 'Nature', emoji: '🌿' },
  { name: 'Himachal Pradesh', country: 'India', tag: 'Mountains', emoji: '🏔️' },
  { name: 'Paris', country: 'France', tag: 'Romance', emoji: '🗼' },
  { name: 'Kyoto', country: 'Japan', tag: 'Culture', emoji: '⛩️' },
  { name: 'Bali', country: 'Indonesia', tag: 'Tropical', emoji: '🌺' },
  { name: 'Istanbul', country: 'Turkey', tag: 'History', emoji: '🕌' },
  { name: 'New York', country: 'USA', tag: 'Urban', emoji: '🗽' },
  { name: 'Santorini', country: 'Greece', tag: 'Islands', emoji: '🌊' },
  { name: 'Dubai', country: 'UAE', tag: 'Luxury', emoji: '🌆' },
  { name: 'Varanasi', country: 'India', tag: 'Spiritual', emoji: '🪔' },
]

const TAGS = ['All', 'Beaches', 'Heritage', 'Nature', 'Mountains', 'Romance', 'Culture', 'Tropical', 'History', 'Urban', 'Luxury', 'Spiritual']

export default function Places({ onPlanTrip }) {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = FEATURED.filter(p =>
    (filter === 'All' || p.tag === filter) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="places-page container">
      <div className="places-header">
        <h2 className="places-title">🌍 Explore Destinations</h2>
        <p className="places-sub">Find your next adventure</p>
      </div>

      <input
        className="places-search"
        placeholder="Search destinations..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="places-tags">
        {TAGS.map(t => (
          <button
            key={t}
            className={`places-tag ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >{t}</button>
        ))}
      </div>

      <div className="places-grid">
        {filtered.map((p, i) => (
          <div key={p.name} className="place-dest-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="place-dest-card__emoji">{p.emoji}</div>
            <div className="place-dest-card__info">
              <h4>{p.name}</h4>
              <span>{p.country}</span>
            </div>
            <span className="place-dest-card__tag">{p.tag}</span>
            <button
              className="place-dest-card__btn"
              onClick={() => onPlanTrip(p.name)}
            >Plan Trip →</button>
          </div>
        ))}
      </div>
    </div>
  )
}
