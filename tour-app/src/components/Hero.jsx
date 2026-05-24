import React from 'react'
import './Hero.css'

export default function Hero({ onStart }) {
  return (
    <section className="hero">
      <div className="hero__bg">
        <div className="hero__blob hero__blob--1" />
        <div className="hero__blob hero__blob--2" />
        <div className="hero__grain" />
      </div>

      <div className="container hero__inner">
        <div className="hero__badge">✦ AI-Powered Travel Planning</div>

        <h1 className="hero__title">
          Your Journey,<br />
          <span className="hero__title--accent">Planned Intelligently</span>
        </h1>

        <p className="hero__subtitle">
          Tell us where you want to go. We'll craft a personalized itinerary —
          optimal routes, budget plans, transport & day-by-day schedules.
        </p>

        <div className="hero__stats">
          <div className="hero__stat">
            <span className="hero__stat-num">6+</span>
            <span className="hero__stat-label">Spot Suggestions</span>
          </div>
          <div className="hero__divider" />
          <div className="hero__stat">
            <span className="hero__stat-num">TSP</span>
            <span className="hero__stat-label">Route Optimizer</span>
          </div>
          <div className="hero__divider" />
          <div className="hero__stat">
            <span className="hero__stat-num">3</span>
            <span className="hero__stat-label">Transport Modes</span>
          </div>
        </div>

        <button className="hero__cta" onClick={onStart}>
          Start Planning  <span className="hero__cta-arrow">→</span>
        </button>

        <div className="hero__scroll-hint">
          <span>Scroll to explore</span>
          <div className="hero__scroll-line" />
        </div>
      </div>

      <div className="hero__cards">
        {['Goa', 'Paris', 'Kyoto', 'Bali', 'Rome'].map((city, i) => (
          <div key={city} className="hero__card" style={{ animationDelay: `${i * 0.15}s` }}>
            <span className="hero__card-icon">✈</span>
            <span>{city}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
