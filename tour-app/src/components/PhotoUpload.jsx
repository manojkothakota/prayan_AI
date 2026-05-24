import React, { useState } from 'react'
import './PhotoUpload.css'

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export default function PhotoUpload({ onUpload, label = 'Upload Photo', small = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [preview, setPreview] = useState(null)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    // Check config
    if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
      setError('Set VITE_CLOUDINARY_CLOUD_NAME in tour-app/.env')
      return
    }

    setLoading(true)
    setError('')
    setPreview(URL.createObjectURL(file)) // show local preview immediately

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', UPLOAD_PRESET || 'tour_memories')

      const res  = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: fd }
      )
      const data = await res.json()

      if (data.error) {
        // Preset not found — guide user exactly
        if (data.error.message?.toLowerCase().includes('preset')) {
          throw new Error(
            `Preset "${UPLOAD_PRESET || 'tour_memories'}" not found.\n` +
            `Fix: Cloudinary → Settings → Upload → Upload Presets → ` +
            `Add preset → Name: "${UPLOAD_PRESET || 'tour_memories'}" → Signing mode: Unsigned → Save`
          )
        }
        throw new Error(data.error.message)
      }

      setPreview(data.secure_url)
      onUpload(data.secure_url)
    } catch (err) {
      setError(err.message)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`photo-upload-wrap ${small ? 'small' : ''}`}>
      <label className={`photo-upload ${loading ? 'uploading' : ''} ${preview ? 'has-preview' : ''}`}>
        {loading ? (
          <><span className="photo-upload__spinner" /> Uploading...</>
        ) : preview ? (
          <img src={preview} alt="preview" className="photo-upload__preview" />
        ) : (
          <><span className="photo-upload__icon">📷</span> <span>{label}</span></>
        )}
        <input type="file" accept="image/*" onChange={handleFile} hidden disabled={loading} />
      </label>

      {preview && !loading && (
        <button className="photo-upload__change"
          onClick={() => { setPreview(null); setError('') }}>
          ✕ Change photo
        </button>
      )}

      {error && (
        <div className="photo-upload__error">
          <strong>⚠ Upload failed</strong>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  )
}