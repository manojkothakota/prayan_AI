import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login({ onSuccess }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode]     = useState('login') // 'login' | 'signup'
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (form.password !== form.confirm) throw new Error('Passwords do not match')
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters')
        await signUp(form.email, form.password, form.name)
        setMode('login')
        setError('')
        alert('Account created! Please check your email to confirm, then login.')
      } else {
        await signIn(form.email, form.password)
        onSuccess()
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob login-blob--1" />
        <div className="login-blob login-blob--2" />
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <span className="login-logo__icon">✈</span>
          <span className="login-logo__text">AI<strong>Tour</strong></span>
        </div>

        <h2 className="login-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="login-sub">
          {mode === 'login' ? 'Sign in to access your trips' : 'Start planning your dream trips'}
        </p>

        <div className="login-form">
          {mode === 'signup' && (
            <div className="login-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => update('name', e.target.value)}
              />
            </div>
          )}

          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {mode === 'signup' && (
            <div className="login-field">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => update('confirm', e.target.value)}
              />
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="login-spinner" /> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </div>

        <p className="login-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
