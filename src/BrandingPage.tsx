import { useState, useEffect, useRef } from 'react'
import { fetchBrandingOptions, fetchBranding, updateBranding } from './api'
import type { BrandingOptions, BrandingData } from './types'

interface Props {
  token: string
  onLogout: () => void
}

export default function BrandingPage({ token, onLogout }: Props) {
  const [options, setOptions] = useState<BrandingOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  })

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    primary: true,
    secondary: true,
    font: true,
    favicon: true,
  })

  // Form state
  const [title, setTitle] = useState('')
  const [primaryColor, setPrimaryColor] = useState<string | null>(null)
  const [secondaryColor, setSecondaryColor] = useState<string | null>(null)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [removeFavicon, setRemoveFavicon] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const [optRes, brandRes] = await Promise.all([
        fetchBrandingOptions(),
        fetchBranding(token),
      ])

      // Options: response is { primary_colors, secondary_colors, fonts } directly
      if (optRes.primary_colors) {
        setOptions(optRes)
      }

      // Branding: response is { theme, favicon } directly
      const d = brandRes as BrandingData
      if (d.theme !== undefined) {
        setTitle(d.theme?.title || '')
        setPrimaryColor(d.theme?.primary_color || null)
        setSecondaryColor(d.theme?.secondary_color || null)
        setFontFamily(d.theme?.font_family || null)
      }
      setFaviconPreview(d.favicon?.url || null)
      setFaviconFile(null)
      setRemoveFavicon(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'Failed to load branding data' })
    }
    setLoading(false)
  }

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleFaviconFile = (file: File | null) => {
    if (!file) return
    if (faviconPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(faviconPreview)
    }
    setFaviconFile(file)
    setFaviconPreview(URL.createObjectURL(file))
    setRemoveFavicon(false)
  }

  const handleRemoveFavicon = () => {
    if (faviconPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(faviconPreview)
    }
    setFaviconFile(null)
    setFaviconPreview(null)
    setRemoveFavicon(true)
  }

  const save = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    const formData = new FormData()
    if (title) formData.append('title', title)
    if (primaryColor) formData.append('primary_color', primaryColor)
    if (secondaryColor) formData.append('secondary_color', secondaryColor)
    if (fontFamily) formData.append('font_family', fontFamily)
    if (faviconFile) formData.append('favicon', faviconFile)
    if (removeFavicon) formData.append('remove_favicon', 'true')

    try {
      const res = await updateBranding(token, formData)
      if (res.theme !== undefined || res.favicon !== undefined) {
        setMessage({ type: 'success', text: 'Branding saved successfully!' })
        await loadAll()
      } else {
        setMessage({ type: 'error', text: res.message || 'Save failed' })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'Network error' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="branding-page">
        <div className="loading">Loading branding...</div>
      </div>
    )
  }

  return (
    <div className="branding-page">
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {/* Primary Color */}
      {options && (
        <div className="br-section">
          <button className="br-section-toggle" onClick={() => toggleSection('primary')}>
            <span className={`br-arrow ${openSections.primary ? 'open' : ''}`}>&#9662;</span>
            <span className="br-section-title">Primary Color</span>
            {primaryColor && (
              <span className="br-section-badge" style={{ backgroundColor: primaryColor }} />
            )}
          </button>
          {openSections.primary && (
            <div className="br-section-body">
              <div className="br-color-list">
                {options.primary_colors.map(c => (
                  <label
                    key={c.hex}
                    className={`br-color-item ${primaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                    onClick={() => setPrimaryColor(primaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                  >
                    <span className="br-color-circle" style={{ backgroundColor: c.hex }} />
                    <span className="br-color-meta">
                      <span className="br-color-name">{c.name}</span>
                      <span className="br-color-hex">{c.hex}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Secondary Color */}
      {options && (
        <div className="br-section">
          <button className="br-section-toggle" onClick={() => toggleSection('secondary')}>
            <span className={`br-arrow ${openSections.secondary ? 'open' : ''}`}>&#9662;</span>
            <span className="br-section-title">Secondary Color</span>
            {secondaryColor && (
              <span className="br-section-badge" style={{ backgroundColor: secondaryColor }} />
            )}
          </button>
          {openSections.secondary && (
            <div className="br-section-body">
              <div className="br-color-list">
                {options.secondary_colors.map(c => (
                  <label
                    key={c.hex}
                    className={`br-color-item ${secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                    onClick={() => setSecondaryColor(secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                  >
                    <span className="br-color-circle" style={{ backgroundColor: c.hex }} />
                    <span className="br-color-meta">
                      <span className="br-color-name">{c.name}</span>
                      <span className="br-color-hex">{c.hex}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Font */}
      {options && (
        <div className="br-section">
          <button className="br-section-toggle" onClick={() => toggleSection('font')}>
            <span className={`br-arrow ${openSections.font ? 'open' : ''}`}>&#9662;</span>
            <span className="br-section-title">Font</span>
          </button>
          {openSections.font && (
            <div className="br-section-body">
              <div className="br-font-list">
                {options.fonts.map(f => (
                  <label
                    key={f.value}
                    className={`br-font-item ${fontFamily === f.value ? 'selected' : ''}`}
                    onClick={() => setFontFamily(fontFamily === f.value ? null : f.value)}
                  >
                    <span className="br-font-name" style={{ fontFamily: `'${f.value}', sans-serif` }}>
                      {f.name}
                    </span>
                    <span className="br-font-sample" style={{ fontFamily: `'${f.value}', sans-serif` }}>
                      ตัวอย่างฟอนต์ภาษาไทย
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favicon */}
      <div className="br-section">
        <button className="br-section-toggle" onClick={() => toggleSection('favicon')}>
          <span className={`br-arrow ${openSections.favicon ? 'open' : ''}`}>&#9662;</span>
          <span className="br-section-title">Favicon</span>
        </button>
        {openSections.favicon && (
          <div className="br-section-body">
            <div className="br-field">
              <label className="br-label">Title</label>
              <input
                type="text"
                className="br-input"
                placeholder="Enter your store name"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="br-field" style={{ marginTop: 16 }}>
              <label className="br-label">Upload favicon</label>
              <div className="br-favicon-row">
                <div
                  className="br-favicon-box"
                  onClick={() => faviconInputRef.current?.click()}
                >
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" />
                  ) : (
                    <span className="br-favicon-placeholder">+</span>
                  )}
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => {
                    handleFaviconFile(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                />
                {faviconPreview && (
                  <div className="br-favicon-btns">
                    <button
                      className="btn-tag btn-tag-primary"
                      onClick={() => faviconInputRef.current?.click()}
                    >
                      Change
                    </button>
                    <button
                      className="btn-tag btn-tag-danger"
                      onClick={handleRemoveFavicon}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <p className="br-hint">Accepted: ICO/PNG only. Recommended: 16x16 px or 32x32 px</p>
              {removeFavicon && (
                <div className="message warning" style={{ marginTop: 8 }}>
                  Favicon will be removed when you save
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="br-actions">
        <button className="btn btn-outline" onClick={loadAll} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
