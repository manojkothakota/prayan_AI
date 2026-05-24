import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar    from './components/Navbar'
import Hero      from './components/Hero'
import Planner   from './components/Planner'
import Login     from './pages/Login'
import Profile   from './pages/Profile'
import History   from './pages/History'
import Memories  from './pages/Memories'
import Places    from './pages/Places'
import Contact   from './pages/Contact'
import './App.css'

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage]         = useState('home')
  const [planning, setPlanning] = useState(false)
  const [prefillPlace, setPrefillPlace] = useState('')

  // Wake up Render backend on page load (free tier sleeps after inactivity)
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API}/ping`).catch(() => {})
  }, [])

  // If not logged in show login
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ display:'flex', gap:'6px' }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:10, height:10, borderRadius:'50%',
            background:'var(--amber)', display:'inline-block',
            animation:`dotBounce 1.2s ease-in-out ${i*0.2}s infinite`
          }}/>
        ))}
      </div>
    </div>
  )

  if (!user) return <Login onSuccess={() => setPage('home')} />

  // Handle plan trip from Places page
  function handlePlanTrip(place) {
    setPrefillPlace(place)
    setPlanning(true)
    setPage('home')
  }

  // Landing page sections
  function LandingPage() {
    return (
      <>
        <Hero onStart={() => setPlanning(true)} />

        <section className="how" id="how">
          <div className="container">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">4 simple steps to your perfect trip</p>
            <div className="how__grid">
              {[
                { icon:'🌍', step:'01', title:'Enter Destination', desc:'Type any place and get AI-curated tourist spots instantly.' },
                { icon:'🗺️', step:'02', title:'Pick Your Spots',   desc:'Select places to visit. TSP algorithm optimizes the route.' },
                { icon:'💰', step:'03', title:'Set Your Budget',   desc:'Choose Budget, Mid-range or Luxury plans.' },
                { icon:'📅', step:'04', title:'Get Itinerary',     desc:'Receive a detailed day-by-day plan with transport & tips.' },
              ].map((item, i) => (
                <div key={i} className="how__card" style={{ animationDelay:`${i*0.1}s` }}>
                  <div className="how__card-step">{item.step}</div>
                  <div className="how__card-icon">{item.icon}</div>
                  <h3 className="how__card-title">{item.title}</h3>
                  <p className="how__card-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="container">
            <h2 className="section-title">Why AI Tour Guider?</h2>
            <div className="features__grid">
              {[
                { icon:'🧠', title:'AI-Powered',       desc:'Groq LLaMA generates personalized suggestions.' },
                { icon:'⚡', title:'TSP Optimizer',    desc:'Nearest Neighbor + 2-opt finds shortest route.' },
                { icon:'🌐', title:'10 Languages',     desc:'Full guidance in your preferred language.' },
                { icon:'📸', title:'Trip Memories',    desc:'Save photos and comments for every spot visited.' },
                { icon:'🚨', title:'Emergency Info',   desc:'Hospitals, police and hotels always one tap away.' },
                { icon:'📱', title:'Fully Responsive', desc:'Works on any screen — mobile, tablet or desktop.' },
              ].map((f, i) => (
                <div key={i} className="feature-card">
                  <span className="feature-card__icon">{f.icon}</span>
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="container cta-banner__inner">
            <h2>Ready to explore the world?</h2>
            <p>Your personalized AI trip plan is one click away.</p>
            <button className="btn-cta" onClick={() => setPlanning(true)}>
              Start Planning Free →
            </button>
          </div>
        </section>

        <footer className="footer">
          <div className="container footer__inner">
            <span>© 2026 PRAYAN AI. Powered by Groq · Kothakota Manoj</span>
          </div>
        </footer>
      </>
    )
  }

  return (
    <div className="app">
      <Navbar page={page} setPage={setPage} onLogout={() => setPage('home')} />

      {page === 'home' && !planning && <LandingPage />}
      {page === 'home' &&  planning && (
        <Planner
          onBack={() => { setPlanning(false); setPrefillPlace('') }}
          prefillPlace={prefillPlace}
        />
      )}
      {page === 'places'   && <Places   onPlanTrip={handlePlanTrip} />}
      {page === 'history'  && <History  />}
      {page === 'memories' && <Memories />}
      {page === 'contact'  && <Contact  />}
      {page === 'profile'  && <Profile  />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
