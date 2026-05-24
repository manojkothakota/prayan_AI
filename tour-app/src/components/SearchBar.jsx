import React, { useState, useEffect, useRef } from 'react'
import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = 'e.g. Goa, Paris, Kyoto...' }) {
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const debounceRef                   = useRef(null)
  const wrapperRef                    = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShow(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    onChange(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); setShow(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        const formatted = data.map(d => ({
          label: d.display_name.split(',').slice(0, 3).join(', '),
          full:  d.display_name,
          lat:   d.lat,
          lon:   d.lon
        }))
        setSuggestions(formatted)
        setShow(true)
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 300)
  }

  function select(item) {
    onChange(item.label)
    setSuggestions([])
    setShow(false)
  }

  return (
    <div className="searchbar" ref={wrapperRef}>
      <div className="searchbar__input-wrap">
        <span className="searchbar__icon">🔍</span>
        <input
          className="searchbar__input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setShow(true)}
          autoComplete="off"
        />
        {loading && <span className="searchbar__spinner" />}
      </div>

      {show && suggestions.length > 0 && (
        <ul className="searchbar__dropdown">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="searchbar__item"
              onMouseDown={() => select(s)}
            >
              <span className="searchbar__item-icon">📍</span>
              <span className="searchbar__item-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
