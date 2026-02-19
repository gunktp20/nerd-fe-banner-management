import { useState, useEffect, useRef } from 'react'
import { fetchBannerFooters, bulkUpdateBannerFooters } from './api'
import type { BannerFooterItem, BannerFooterResponse } from './types'

interface Props {
  token: string
  onLogout: () => void
}

export default function BannerFooterPage({ token, onLogout }: Props) {
  const [bannerFooter, setBannerFooter] = useState<BannerFooterItem | null>(null)
  const [deletedId, setDeletedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  })

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBannerFooter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadBannerFooter = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await fetchBannerFooters(token)
      if (Array.isArray(data.data) && data.data.length > 0) {
        const bf: BannerFooterResponse = data.data[0]
        setBannerFooter({
          _clientId: crypto.randomUUID(),
          id: bf.id,
          desktopPreview: bf.url || null,
          mobilePreview: bf.mobile_url || null,
          desktopFile: null,
          mobileFile: null,
          title: bf.title || '',
          description: bf.description || '',
          linkUrl: bf.link_url || '',
          isActive: bf.is_active,
          removeMobileImage: false,
          hasExistingMobile: !!bf.mobile_url,
        })
        setDeletedId(null)
      } else {
        setBannerFooter(null)
        setDeletedId(null)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        setMessage({ type: 'error', text: 'Token expired or invalid.' })
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'Network error - is the backend running?' })
    }
    setLoading(false)
  }

  const createNew = () => {
    setBannerFooter({
      _clientId: crypto.randomUUID(),
      desktopPreview: null,
      mobilePreview: null,
      desktopFile: null,
      mobileFile: null,
      title: '',
      description: '',
      linkUrl: '',
      isActive: true,
      removeMobileImage: false,
      hasExistingMobile: false,
    })
  }

  const remove = () => {
    if (!bannerFooter) return
    if (bannerFooter.id) {
      setDeletedId(bannerFooter.id)
    }
    if (bannerFooter.desktopPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerFooter.desktopPreview)
    }
    if (bannerFooter.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerFooter.mobilePreview)
    }
    setBannerFooter(null)
  }

  const update = (updates: Partial<BannerFooterItem>) => {
    setBannerFooter(prev => (prev ? { ...prev, ...updates } : prev))
  }

  const handleDesktopFile = (file: File | null) => {
    if (!file || !bannerFooter) return
    if (bannerFooter.desktopPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerFooter.desktopPreview)
    }
    update({
      desktopFile: file,
      desktopPreview: URL.createObjectURL(file),
    })
  }

  const handleMobileFile = (file: File | null) => {
    if (!file || !bannerFooter) return
    if (bannerFooter.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerFooter.mobilePreview)
    }
    update({
      mobileFile: file,
      mobilePreview: URL.createObjectURL(file),
      removeMobileImage: false,
    })
  }

  const handleRemoveMobile = () => {
    if (!bannerFooter) return
    if (bannerFooter.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerFooter.mobilePreview)
    }
    update({
      mobileFile: null,
      mobilePreview: null,
      removeMobileImage: !!bannerFooter.id && bannerFooter.hasExistingMobile,
    })
  }

  const save = async () => {
    if (!bannerFooter && !deletedId) {
      setMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    if (bannerFooter && !bannerFooter.id && !bannerFooter.desktopFile) {
      setMessage({ type: 'error', text: 'Desktop image is required' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    const formData = new FormData()
    const operations: Record<string, unknown>[] = []

    if (bannerFooter) {
      const opIndex = operations.length

      if (!bannerFooter.id) {
        const op: Record<string, unknown> = {
          action: 'create',
          is_active: bannerFooter.isActive,
        }
        if (bannerFooter.title) op.title = bannerFooter.title
        if (bannerFooter.description) op.description = bannerFooter.description
        if (bannerFooter.linkUrl) op.link_url = bannerFooter.linkUrl
        operations.push(op)
        formData.append(`desktop_${opIndex}`, bannerFooter.desktopFile!)
        if (bannerFooter.mobileFile) {
          formData.append(`mobile_${opIndex}`, bannerFooter.mobileFile)
        }
      } else {
        const op: Record<string, unknown> = {
          action: 'update',
          id: bannerFooter.id,
          title: bannerFooter.title,
          description: bannerFooter.description,
          link_url: bannerFooter.linkUrl,
          is_active: bannerFooter.isActive,
        }
        if (bannerFooter.removeMobileImage) op.remove_mobile_image = true
        operations.push(op)
        if (bannerFooter.desktopFile) {
          formData.append(`desktop_${opIndex}`, bannerFooter.desktopFile)
        }
        if (bannerFooter.mobileFile) {
          formData.append(`mobile_${opIndex}`, bannerFooter.mobileFile)
        }
      }
    }

    if (deletedId) {
      operations.push({ action: 'delete', id: deletedId })
    }

    formData.append('banner_footers', JSON.stringify(operations))

    try {
      const data = await bulkUpdateBannerFooters(token, formData)
      if (data.data !== undefined) {
        setMessage({ type: 'success', text: 'Banner footer saved successfully!' })
        await loadBannerFooter()
      } else {
        setMessage({ type: 'error', text: data.message || 'Save failed' })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        setMessage({ type: 'error', text: 'Token expired. Please re-enter.' })
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'Network error' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="banner-page">
        <div className="loading">Loading banner footer...</div>
      </div>
    )
  }

  return (
    <div className="banner-page">
      <div className="banner-header">
        <h1>Banner Footer</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={loadBannerFooter} disabled={saving}>
            Refresh
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {!bannerFooter && !deletedId ? (
        <div className="empty-state">
          <p>No banner footer yet. Add one!</p>
          <button className="btn btn-primary" onClick={createNew}>
            + Add Banner Footer
          </button>
        </div>
      ) : bannerFooter ? (
        <div className="banner-card">
          <div className="banner-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="banner-number">Banner Footer</span>
              {!bannerFooter.id && <span className="badge-new">NEW</span>}
              {bannerFooter.removeMobileImage && (
                <span className="badge-warning">Mobile will be removed</span>
              )}
            </div>
            <div className="banner-actions">
              <button className="btn btn-danger btn-sm" onClick={remove}>
                Delete
              </button>
            </div>
          </div>

          <div className="banner-images">
            <div className="image-section">
              <label>
                Desktop Image{' '}
                {!bannerFooter.id && <span style={{ color: '#EF4444' }}>*</span>}
              </label>
              <div className="image-preview" onClick={() => desktopInputRef.current?.click()}>
                {bannerFooter.desktopPreview ? (
                  <img src={bannerFooter.desktopPreview} alt="Desktop" />
                ) : (
                  <span className="placeholder">
                    Click to upload
                    <br />
                    desktop image
                  </span>
                )}
              </div>
              <input
                ref={desktopInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  handleDesktopFile(e.target.files?.[0] || null)
                  e.target.value = ''
                }}
              />
              <div className="image-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => desktopInputRef.current?.click()}
                >
                  {bannerFooter.desktopPreview ? 'Change' : 'Upload'}
                </button>
              </div>
            </div>

            <div className="image-section">
              <label>
                Mobile Image <span style={{ color: '#9CA3AF' }}>(optional)</span>
              </label>
              <div className="image-preview" onClick={() => mobileInputRef.current?.click()}>
                {bannerFooter.mobilePreview ? (
                  <img src={bannerFooter.mobilePreview} alt="Mobile" />
                ) : (
                  <span className="placeholder">
                    Click to upload
                    <br />
                    mobile image
                  </span>
                )}
              </div>
              <input
                ref={mobileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  handleMobileFile(e.target.files?.[0] || null)
                  e.target.value = ''
                }}
              />
              <div className="image-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => mobileInputRef.current?.click()}
                >
                  {bannerFooter.mobilePreview ? 'Change' : 'Upload'}
                </button>
                {bannerFooter.mobilePreview && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleRemoveMobile}
                    style={{ color: '#EF4444' }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="banner-fields" style={{ flexDirection: 'column', gap: 12 }}>
            <div className="field-group">
              <label>Title</label>
              <input
                type="text"
                placeholder="Banner footer title"
                value={bannerFooter.title}
                onChange={e => update({ title: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="Banner footer description"
                value={bannerFooter.description}
                onChange={e => update({ description: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <div className="field-group">
                <label>Link URL</label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={bannerFooter.linkUrl}
                  onChange={e => update({ linkUrl: e.target.value })}
                />
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id={`active-${bannerFooter._clientId}`}
                  checked={bannerFooter.isActive}
                  onChange={e => update({ isActive: e.target.checked })}
                />
                <label htmlFor={`active-${bannerFooter._clientId}`}>Active</label>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deletedId && (
        <div className="message warning">Banner footer will be deleted when you save</div>
      )}
    </div>
  )
}
