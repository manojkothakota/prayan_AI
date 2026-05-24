import React, { useState, useEffect } from 'react'
import './PlaceCard.css'

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_KEY

export default function PlaceCard({ name, place, selected, onSelect }) {
  const [photo, setPhoto] = useState(null)
  const [imgErr, setImgErr] = useState(false)

  useEffect(() => {
    if (!UNSPLASH_KEY) return
    const query = encodeURIComponent(`${name} ${place} tourism`)
    fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.results && d.results[0]) {
          setPhoto(d.results[0].urls.small)
        }
      })
      .catch(() => {})
  }, [name, place])

  return (
    <button
      className={`place-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Photo or fallback */}
      <div className="place-card__img-wrap">
        {photo && !imgErr
          ? <img src={photo} alt={name} className="place-card__img" onError={() => setImgErr(true)} />
          : <div className="place-card__img-fallback">
              <span>{name.charAt(0)}</span>
            </div>
        }
        {selected && (
          <div className="place-card__overlay">
            <span className="place-card__check">✓</span>
          </div>
        )}
      </div>

      <div className="place-card__body">
        <span className="place-card__name">{name}</span>
        <span className="place-card__sub">{place}</span>
      </div>
    </button>
  )
}
