import React from 'react'
import './LanguagePicker.css'

const LANGUAGES = [
  { code: 'en',  label: 'English',    flag: '🇬🇧' },
  { code: 'hi',  label: 'Hindi',      flag: '🇮🇳' },
  { code: 'te',  label: 'Telugu',     flag: '🇮🇳' },
  { code: 'ta',  label: 'Tamil',      flag: '🇮🇳' },
  { code: 'kn',  label: 'Kannada',    flag: '🇮🇳' },
  { code: 'ml',  label: 'Malayalam',  flag: '🇮🇳' },
  { code: 'bn',  label: 'Bengali',    flag: '🇮🇳' },
  { code: 'es',  label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr',  label: 'French',     flag: '🇫🇷' },
  { code: 'ar',  label: 'Arabic',     flag: '🇸🇦' },
]

export default function LanguagePicker({ selected, onChange }) {
  return (
    <div className="lang-picker">
      <p className="lang-picker__label">🌐 Select your language</p>
      <div className="lang-picker__grid">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            className={`lang-chip ${selected === lang.code ? 'selected' : ''}`}
            onClick={() => onChange(lang.code, lang.label)}
          >
            <span className="lang-chip__flag">{lang.flag}</span>
            <span className="lang-chip__label">{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
