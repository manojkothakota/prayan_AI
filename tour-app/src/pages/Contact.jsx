import React, { useState } from 'react'
import './Contact.css'

export default function Contact() {
  const [form, setForm]   = useState({ name: '', email: '', message: '' })
  const [sent, setSent]   = useState(false)
  const [loading, setLoading] = useState(false)

  function update(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.message) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000)) // simulate send
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="contact-page container">
      <div className="contact-header">
        <h2 className="contact-title">📬 Contact Us</h2>
        <p className="contact-sub">Have a question or feedback? We'd love to hear from you.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-info">
          {[
             { icon: '👨‍💻', label: 'Founder', val: 'Manoj' },
  { icon: '⚡', label: 'Powered by', val: 'Groq AI' },
  { icon: '🚀', label: 'Platform', val: 'Prayan.ai' },
  { icon: '✉️', label: 'Email', val: 'support.prayanai@gmail.com' },
  { icon: '🌐', label: 'Website', val: 'prayan-ai.vercel.app' },
  { icon: '📍', label: 'Based in', val: 'Andhra Pradesh, India 🇮🇳' }
            

          ].map(i => (
            <div key={i.label} className="contact-info-card">
              <span className="contact-info-icon">{i.icon}</span>
              <div>
                <span className="contact-info-label">{i.label}</span>
                <span className="contact-info-val">{i.val}</span>
              </div>
            </div>
          ))}
        </div>

        {sent ? (
          <div className="contact-success">
            <span>🎉</span>
            <h3>Message sent!</h3>
            <p>We'll get back to you within 24 hours.</p>
            <button onClick={() => { setSent(false); setForm({ name:'', email:'', message:'' }) }}>
              Send another
            </button>
          </div>
        ) : (
          <div className="contact-form">
            <div className="contact-field">
              <label>Name</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" />
            </div>
            <div className="contact-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="contact-field">
              <label>Message</label>
              <textarea value={form.message} onChange={e => update('message', e.target.value)} placeholder="Write your message..." rows={5} />
            </div>
            <button className="contact-btn" onClick={handleSubmit} disabled={loading || !form.name || !form.email || !form.message}>
              {loading ? 'Sending...' : 'Send Message →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
