import { useState, useEffect, useRef } from 'react'
import { fetchBanners, bulkUpdateBanners, publishCMS, fetchPublishStatus } from './api'
import type { BannerItem, BannerResponse } from './types'

interface Props {
  token: string
  onLogout: () => void
}

export default function BannerPage({ token, onLogout }: Props) {
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({
    type: '',
    text: '',
  })
  const [publishStatus, setPublishStatus] = useState<{
    has_unpublished_changes: boolean
    last_published_at: string | null
    last_published_version: number | null
  } | null>(null)

  useEffect(() => {
    loadBanners()
    loadPublishStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPublishStatus = async () => {
    try {
      const data = await fetchPublishStatus(token)
      if (data.has_unpublished_changes !== undefined) {
        setPublishStatus(data)
      }
    } catch {
      // silently ignore
    }
  }

  const loadBanners = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await fetchBanners(token)
      if (Array.isArray(data.data)) {
        const items: BannerItem[] = data.data.map((b: BannerResponse) => ({
          _clientId: crypto.randomUUID(),
          id: b.id,
          desktopPreview: b.url || null,
          mobilePreview: b.mobile_url || null,
          desktopFile: null,
          mobileFile: null,
          linkUrl: b.link_url || '',
          isActive: b.is_active,
          removeMobileImage: false,
          hasExistingMobile: !!b.mobile_url,
        }))
        setBanners(items)
        setDeletedIds([])
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to load banners' })
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

  const addBanner = () => {
    setBanners(prev => [
      ...prev,
      {
        _clientId: crypto.randomUUID(),
        desktopPreview: null,
        mobilePreview: null,
        desktopFile: null,
        mobileFile: null,
        linkUrl: '',
        isActive: true,
        removeMobileImage: false,
        hasExistingMobile: false,
      },
    ])
  }

  const removeBanner = (index: number) => {
    const banner = banners[index]
    if (banner.id) {
      setDeletedIds(prev => [...prev, banner.id!])
    }
    if (banner.desktopPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(banner.desktopPreview)
    }
    if (banner.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(banner.mobilePreview)
    }
    setBanners(prev => prev.filter((_, i) => i !== index))
  }

  const moveBanner = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= banners.length) return
    setBanners(prev => {
      const next = [...prev]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  const updateBanner = (index: number, updates: Partial<BannerItem>) => {
    setBanners(prev => prev.map((b, i) => (i === index ? { ...b, ...updates } : b)))
  }

  const handleDesktopFile = (index: number, file: File | null) => {
    if (!file) return
    const banner = banners[index]
    if (banner.desktopPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(banner.desktopPreview)
    }
    updateBanner(index, {
      desktopFile: file,
      desktopPreview: URL.createObjectURL(file),
    })
  }

  const handleMobileFile = (index: number, file: File | null) => {
    if (!file) return
    const banner = banners[index]
    if (banner.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(banner.mobilePreview)
    }
    updateBanner(index, {
      mobileFile: file,
      mobilePreview: URL.createObjectURL(file),
      removeMobileImage: false,
    })
  }

  const handleRemoveMobile = (index: number) => {
    const banner = banners[index]
    if (banner.mobilePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(banner.mobilePreview)
    }
    updateBanner(index, {
      mobileFile: null,
      mobilePreview: null,
      removeMobileImage: !!banner.id && banner.hasExistingMobile,
    })
  }

  const save = async () => {
    // Validate new banners must have desktop image
    for (let i = 0; i < banners.length; i++) {
      if (!banners[i].id && !banners[i].desktopFile) {
        setMessage({
          type: 'error',
          text: `Banner #${i + 1}: Desktop image is required for new banners`,
        })
        return
      }
    }

    if (banners.length === 0 && deletedIds.length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    const formData = new FormData()
    const operations: Record<string, unknown>[] = []

    // Creates and updates in display order
    for (let i = 0; i < banners.length; i++) {
      const banner = banners[i]
      const opIndex = operations.length

      if (!banner.id) {
        // Create
        const op: Record<string, unknown> = {
          action: 'create',
          is_active: banner.isActive,
        }
        if (banner.linkUrl) op.link_url = banner.linkUrl
        operations.push(op)
        formData.append(`desktop_${opIndex}`, banner.desktopFile!)
        if (banner.mobileFile) {
          formData.append(`mobile_${opIndex}`, banner.mobileFile)
        }
      } else {
        // Update
        const op: Record<string, unknown> = {
          action: 'update',
          id: banner.id,
          link_url: banner.linkUrl,
          is_active: banner.isActive,
        }
        if (banner.removeMobileImage) op.remove_mobile_image = true
        operations.push(op)
        if (banner.desktopFile) {
          formData.append(`desktop_${opIndex}`, banner.desktopFile)
        }
        if (banner.mobileFile) {
          formData.append(`mobile_${opIndex}`, banner.mobileFile)
        }
      }
    }

    // Deletes at the end
    for (const id of deletedIds) {
      operations.push({ action: 'delete', id })
    }

    formData.append('banners', JSON.stringify(operations))

    try {
      const data = await bulkUpdateBanners(token, formData)
      if (Array.isArray(data.data)) {
        setMessage({ type: 'success', text: 'Banners saved successfully!' })
        await loadBanners()
        await loadPublishStatus()
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

  const publish = async () => {
    if (!window.confirm('Publish all CMS content? This will create a new published version.')) return
    setPublishing(true)
    setMessage({ type: '', text: '' })
    try {
      const data = await publishCMS(token)
      if (data.version) {
        setMessage({ type: 'success', text: `Published successfully! Version ${data.version}` })
        await loadPublishStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Publish failed' })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        setMessage({ type: 'error', text: 'Token expired. Please re-enter.' })
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'Network error' })
    }
    setPublishing(false)
  }

  if (loading) {
    return (
      <div className="banner-page">
        <div className="loading">Loading banners...</div>
      </div>
    )
  }

  return (
    <div className="banner-page">
      <div className="banner-header">
        <h1>Banner Management</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={loadBanners} disabled={saving}>
            Refresh
          </button>
          <button className="btn btn-success" onClick={save} disabled={saving || publishing}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
          <button className="btn btn-primary" onClick={publish} disabled={saving || publishing}>
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {publishStatus && (
        <div className={`publish-status ${publishStatus.has_unpublished_changes ? 'unpublished' : 'published'}`}>
          {publishStatus.has_unpublished_changes ? (
            <span>Unpublished changes — save and publish to make them live</span>
          ) : (
            <span>
              All changes published
              {publishStatus.last_published_version && ` (v${publishStatus.last_published_version})`}
            </span>
          )}
          {publishStatus.last_published_at && (
            <span className="publish-date">
              Last published: {new Date(publishStatus.last_published_at).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {banners.length === 0 && deletedIds.length === 0 ? (
        <div className="empty-state">
          <p>No banners yet. Add your first banner!</p>
          <button className="btn btn-primary" onClick={addBanner}>
            + Add Banner
          </button>
        </div>
      ) : (
        <>
          {banners.map((banner, index) => (
            <BannerCard
              key={banner._clientId}
              banner={banner}
              index={index}
              total={banners.length}
              onMove={dir => moveBanner(index, dir)}
              onRemove={() => removeBanner(index)}
              onDesktopFile={f => handleDesktopFile(index, f)}
              onMobileFile={f => handleMobileFile(index, f)}
              onRemoveMobile={() => handleRemoveMobile(index)}
              onUpdate={updates => updateBanner(index, updates)}
            />
          ))}

          {banners.length < 10 && (
            <div className="add-banner-area" onClick={addBanner}>
              + Add Banner ({banners.length}/10)
            </div>
          )}
        </>
      )}

      {deletedIds.length > 0 && (
        <div className="message warning">
          {deletedIds.length} banner(s) will be deleted when you save
        </div>
      )}
    </div>
  )
}

// --- Banner Card Component ---

interface BannerCardProps {
  banner: BannerItem
  index: number
  total: number
  onMove: (dir: 'up' | 'down') => void
  onRemove: () => void
  onDesktopFile: (file: File | null) => void
  onMobileFile: (file: File | null) => void
  onRemoveMobile: () => void
  onUpdate: (updates: Partial<BannerItem>) => void
}

function BannerCard({
  banner,
  index,
  total,
  onMove,
  onRemove,
  onDesktopFile,
  onMobileFile,
  onRemoveMobile,
  onUpdate,
}: BannerCardProps) {
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="banner-card">
      <div className="banner-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="banner-number">#{index + 1}</span>
          {!banner.id && <span className="badge-new">NEW</span>}
          {banner.removeMobileImage && <span className="badge-warning">Mobile will be removed</span>}
        </div>
        <div className="banner-actions">
          <button
            className="btn btn-outline btn-icon btn-sm"
            onClick={() => onMove('up')}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            className="btn btn-outline btn-icon btn-sm"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            title="Move down"
          >
            ↓
          </button>
          <button className="btn btn-danger btn-sm" onClick={onRemove} title="Delete banner">
            Delete
          </button>
        </div>
      </div>

      <div className="banner-images">
        <div className="image-section">
          <label>Desktop Image {!banner.id && <span style={{ color: '#EF4444' }}>*</span>}</label>
          <div className="image-preview" onClick={() => desktopInputRef.current?.click()}>
            {banner.desktopPreview ? (
              <img src={banner.desktopPreview} alt="Desktop" />
            ) : (
              <span className="placeholder">Click to upload<br />desktop image</span>
            )}
          </div>
          <input
            ref={desktopInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={e => {
              onDesktopFile(e.target.files?.[0] || null)
              e.target.value = ''
            }}
          />
          <div className="image-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => desktopInputRef.current?.click()}
            >
              {banner.desktopPreview ? 'Change' : 'Upload'}
            </button>
          </div>
        </div>

        <div className="image-section">
          <label>Mobile Image <span style={{ color: '#9CA3AF' }}>(optional)</span></label>
          <div className="image-preview" onClick={() => mobileInputRef.current?.click()}>
            {banner.mobilePreview ? (
              <img src={banner.mobilePreview} alt="Mobile" />
            ) : (
              <span className="placeholder">Click to upload<br />mobile image</span>
            )}
          </div>
          <input
            ref={mobileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={e => {
              onMobileFile(e.target.files?.[0] || null)
              e.target.value = ''
            }}
          />
          <div className="image-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => mobileInputRef.current?.click()}
            >
              {banner.mobilePreview ? 'Change' : 'Upload'}
            </button>
            {banner.mobilePreview && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onRemoveMobile}
                style={{ color: '#EF4444' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="banner-fields">
        <div className="field-group">
          <label>Link URL</label>
          <input
            type="text"
            placeholder="https://example.com"
            value={banner.linkUrl}
            onChange={e => onUpdate({ linkUrl: e.target.value })}
          />
        </div>
        <div className="checkbox-group">
          <input
            type="checkbox"
            id={`active-${banner._clientId}`}
            checked={banner.isActive}
            onChange={e => onUpdate({ isActive: e.target.checked })}
          />
          <label htmlFor={`active-${banner._clientId}`}>Active</label>
        </div>
      </div>
    </div>
  )
}
