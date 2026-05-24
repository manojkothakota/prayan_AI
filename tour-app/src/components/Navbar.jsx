import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar({ page, setPage, onLogout }) {
  const { profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { key: 'home',     label: 'Home',     icon: '🏠' },
    { key: 'places',   label: 'Places',   icon: '🌍' },
    { key: 'history',  label: 'History',  icon: '🗺️' },
    { key: 'memories', label: 'Memories', icon: '📸' },
    { key: 'contact',  label: 'Contact',  icon: '📬' },
  ]

  async function handleLogout() {
    await signOut()
    onLogout()
    setMenuOpen(false)
  }

  function nav(key) { setPage(key); setMenuOpen(false) }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        {/* Logo */}
        <div className="navbar__logo" onClick={() => nav('home')}>
          <span className="navbar__logo-icon">✈</span>
          <span className="navbar__logo-text"><strong>Prayan</strong>AI</span>
        </div>

        {/* Desktop links */}
        <nav className="navbar__links">
          {links.map(l => (
            <button
              key={l.key}
              className={`navbar__link ${page === l.key ? 'active' : ''}`}
              onClick={() => nav(l.key)}
            >{l.label}</button>
          ))}
        </nav>

        {/* Right side */}
        <div className="navbar__right">
          <button className="navbar__avatar" onClick={() => nav('profile')}>
            <span>{profile?.name?.charAt(0)?.toUpperCase() || '?'}</span>
          </button>
          <button className="navbar__logout" onClick={handleLogout}>Sign Out</button>

          {/* Hamburger */}
          <button className="navbar__burger" onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile">
          {links.map(l => (
            <button
              key={l.key}
              className={`navbar__mobile-link ${page === l.key ? 'active' : ''}`}
              onClick={() => nav(l.key)}
            >
              <span>{l.icon}</span> {l.label}
            </button>
          ))}
          <button className="navbar__mobile-link" onClick={() => nav('profile')}>👤 Profile</button>
          <button className="navbar__mobile-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      )}
    </header>
  )
}
