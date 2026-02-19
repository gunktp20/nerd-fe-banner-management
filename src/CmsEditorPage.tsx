import { useState, useEffect, useRef } from 'react'
import {
  fetchLogo, fetchBusinessInfo, fetchBrandingOptions, fetchBranding,
  fetchBanners, fetchBannerFooters, saveDraft,
} from './api'
import type {
  BannerItem, BannerResponse, BannerFooterItem, BannerFooterResponse,
  BrandingOptions, BrandingData, BusinessInfoResponse,
} from './types'

interface Props {
  token: string
  onLogout: () => void
}

type SectionKey = 'logo' | 'info' | 'branding' | 'banners' | 'footer'

export default function CmsEditorPage({ token, onLogout }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    logo: true, info: true, branding: true, banners: true, footer: true,
  })

  // --- Logo ---
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // --- Info ---
  const [infoForm, setInfoForm] = useState({ company_name: '', description: '', phone: '', email: '', address: '' })
  const [infoOriginal, setInfoOriginal] = useState({ company_name: '', description: '', phone: '', email: '', address: '' })

  // --- Branding ---
  const [brandingOptions, setBrandingOptions] = useState<BrandingOptions | null>(null)
  const [title, setTitle] = useState('')
  const [primaryColor, setPrimaryColor] = useState<string | null>(null)
  const [secondaryColor, setSecondaryColor] = useState<string | null>(null)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [removeFavicon, setRemoveFavicon] = useState(false)
  const [brandingOriginal, setBrandingOriginal] = useState({
    title: '', primaryColor: null as string | null, secondaryColor: null as string | null,
    fontFamily: null as string | null, hasFavicon: false,
  })
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // --- Banners ---
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [deletedBannerIds, setDeletedBannerIds] = useState<string[]>([])
  const [bannersDirty, setBannersDirty] = useState(false)

  // --- Banner Footer ---
  const [bannerFooter, setBannerFooter] = useState<BannerFooterItem | null>(null)
  const [deletedFooterId, setDeletedFooterId] = useState<string | null>(null)
  const [footerDirty, setFooterDirty] = useState(false)

  // --- Dirty computation ---
  const logoDirty = logoFile !== null
  const infoDirty = JSON.stringify(infoForm) !== JSON.stringify(infoOriginal)
  const brandingDirty =
    title !== brandingOriginal.title ||
    primaryColor !== brandingOriginal.primaryColor ||
    secondaryColor !== brandingOriginal.secondaryColor ||
    fontFamily !== brandingOriginal.fontFamily ||
    faviconFile !== null || removeFavicon
  const anyDirty = logoDirty || infoDirty || brandingDirty || bannersDirty || footerDirty

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const [logoRes, infoRes, optRes, brandRes, bannersRes, footersRes] = await Promise.all([
        fetchLogo(token).catch(() => null),
        fetchBusinessInfo(token).catch(() => null),
        fetchBrandingOptions().catch(() => null),
        fetchBranding(token).catch(() => null),
        fetchBanners(token).catch(() => null),
        fetchBannerFooters(token).catch(() => null),
      ])

      // Logo
      setLogoPreview(logoRes?.url || null)
      setLogoFile(null)

      // Info
      const info = infoRes as BusinessInfoResponse | null
      const infoData = {
        company_name: info?.company_name || '',
        description: info?.description || '',
        phone: info?.phone || '',
        email: info?.email || '',
        address: info?.address || '',
      }
      setInfoForm(infoData)
      setInfoOriginal(infoData)

      // Branding options
      if (optRes?.primary_colors) setBrandingOptions(optRes)

      // Branding data
      const brand = brandRes as BrandingData | null
      const bTitle = brand?.theme?.title || ''
      const bPrimary = brand?.theme?.primary_color || null
      const bSecondary = brand?.theme?.secondary_color || null
      const bFont = brand?.theme?.font_family || null
      const bFavicon = brand?.favicon?.url || null
      setTitle(bTitle)
      setPrimaryColor(bPrimary)
      setSecondaryColor(bSecondary)
      setFontFamily(bFont)
      setFaviconPreview(bFavicon)
      setFaviconFile(null)
      setRemoveFavicon(false)
      setBrandingOriginal({
        title: bTitle, primaryColor: bPrimary, secondaryColor: bSecondary,
        fontFamily: bFont, hasFavicon: !!bFavicon,
      })

      // Banners
      if (bannersRes?.data && Array.isArray(bannersRes.data)) {
        setBanners(bannersRes.data.map((b: BannerResponse) => ({
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
        })))
      } else {
        setBanners([])
      }
      setDeletedBannerIds([])
      setBannersDirty(false)

      // Banner Footer
      if (footersRes?.data && Array.isArray(footersRes.data) && footersRes.data.length > 0) {
        const bf: BannerFooterResponse = footersRes.data[0]
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
      } else {
        setBannerFooter(null)
      }
      setDeletedFooterId(null)
      setFooterDirty(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลได้' })
    }
    setLoading(false)
  }

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ========== Save Draft ==========
  const handleSaveDraft = async () => {
    if (!anyDirty) {
      setMessage({ type: 'error', text: 'ไม่มีการเปลี่ยนแปลง' })
      return
    }

    // Validate banners
    if (bannersDirty) {
      for (let i = 0; i < banners.length; i++) {
        if (!banners[i].id && !banners[i].desktopFile) {
          setMessage({ type: 'error', text: `แบนเนอร์ #${i + 1}: ต้องเพิ่มรูป Desktop สำหรับแบนเนอร์ใหม่` })
          return
        }
      }
    }

    // Validate footer
    if (footerDirty && bannerFooter && !bannerFooter.id && !bannerFooter.desktopFile) {
      setMessage({ type: 'error', text: 'แบนเนอร์ท้าย: ต้องเพิ่มรูป Desktop สำหรับรายการใหม่' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    const formData = new FormData()

    // Logo
    if (logoDirty && logoFile) {
      formData.append('logo', logoFile)
    }

    // Branding
    if (brandingDirty) {
      if (title) formData.append('title', title)
      if (primaryColor) formData.append('primary_color', primaryColor)
      if (secondaryColor) formData.append('secondary_color', secondaryColor)
      if (fontFamily) formData.append('font_family', fontFamily)
      if (faviconFile) formData.append('favicon', faviconFile)
      if (removeFavicon) formData.append('remove_favicon', 'true')
    }

    // Info
    if (infoDirty) {
      formData.append('info', JSON.stringify(infoForm))
    }

    // Banners
    if (bannersDirty) {
      const operations: Record<string, unknown>[] = []
      for (let i = 0; i < banners.length; i++) {
        const banner = banners[i]
        const opIndex = operations.length
        if (!banner.id) {
          const op: Record<string, unknown> = { action: 'create', is_active: banner.isActive }
          if (banner.linkUrl) op.link_url = banner.linkUrl
          operations.push(op)
          formData.append(`desktop_banner_${opIndex}`, banner.desktopFile!)
          if (banner.mobileFile) formData.append(`mobile_banner_${opIndex}`, banner.mobileFile)
        } else {
          const op: Record<string, unknown> = {
            action: 'update', id: banner.id,
            link_url: banner.linkUrl, is_active: banner.isActive,
          }
          if (banner.removeMobileImage) op.remove_mobile_image = true
          operations.push(op)
          if (banner.desktopFile) formData.append(`desktop_banner_${opIndex}`, banner.desktopFile)
          if (banner.mobileFile) formData.append(`mobile_banner_${opIndex}`, banner.mobileFile)
        }
      }
      for (const id of deletedBannerIds) {
        operations.push({ action: 'delete', id })
      }
      formData.append('banners', JSON.stringify(operations))
    }

    // Banner Footer
    if (footerDirty) {
      const operations: Record<string, unknown>[] = []
      if (bannerFooter) {
        const opIndex = operations.length
        if (!bannerFooter.id) {
          const op: Record<string, unknown> = { action: 'create', is_active: bannerFooter.isActive }
          if (bannerFooter.title) op.title = bannerFooter.title
          if (bannerFooter.description) op.description = bannerFooter.description
          if (bannerFooter.linkUrl) op.link_url = bannerFooter.linkUrl
          operations.push(op)
          formData.append(`desktop_footer_${opIndex}`, bannerFooter.desktopFile!)
          if (bannerFooter.mobileFile) formData.append(`mobile_footer_${opIndex}`, bannerFooter.mobileFile)
        } else {
          const op: Record<string, unknown> = {
            action: 'update', id: bannerFooter.id,
            title: bannerFooter.title, description: bannerFooter.description,
            link_url: bannerFooter.linkUrl, is_active: bannerFooter.isActive,
          }
          if (bannerFooter.removeMobileImage) op.remove_mobile_image = true
          operations.push(op)
          if (bannerFooter.desktopFile) formData.append(`desktop_footer_${opIndex}`, bannerFooter.desktopFile)
          if (bannerFooter.mobileFile) formData.append(`mobile_footer_${opIndex}`, bannerFooter.mobileFile)
        }
      }
      if (deletedFooterId) {
        operations.push({ action: 'delete', id: deletedFooterId })
      }
      formData.append('banner_footers', JSON.stringify(operations))
    }

    try {
      const result = await saveDraft(token, formData)
      if (result.errors && Object.keys(result.errors).length > 0) {
        const errMsgs = Object.entries(result.errors).map(([k, v]) => `${k}: ${v}`).join(', ')
        setMessage({ type: 'error', text: `บางส่วนบันทึกไม่สำเร็จ: ${errMsgs}` })
      } else {
        setMessage({ type: 'success', text: 'บันทึกร่างสำเร็จ!' })
      }
      await loadAll()
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้' })
    }
    setSaving(false)
  }

  // ========== Logo Handlers ==========
  const handleLogoFile = (file: File | null) => {
    if (!file) return
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  // ========== Info Handlers ==========
  const updateInfo = (field: string, value: string) => {
    setInfoForm(prev => ({ ...prev, [field]: value }))
  }

  // ========== Branding Handlers ==========
  const handleFaviconFile = (file: File | null) => {
    if (!file) return
    if (faviconPreview?.startsWith('blob:')) URL.revokeObjectURL(faviconPreview)
    setFaviconFile(file)
    setFaviconPreview(URL.createObjectURL(file))
    setRemoveFavicon(false)
  }

  const handleRemoveFavicon = () => {
    if (faviconPreview?.startsWith('blob:')) URL.revokeObjectURL(faviconPreview)
    setFaviconFile(null)
    setFaviconPreview(null)
    setRemoveFavicon(true)
  }

  // ========== Banner Handlers ==========
  const addBanner = () => {
    setBanners(prev => [...prev, {
      _clientId: crypto.randomUUID(),
      desktopPreview: null, mobilePreview: null,
      desktopFile: null, mobileFile: null,
      linkUrl: '', isActive: true,
      removeMobileImage: false, hasExistingMobile: false,
    }])
    setBannersDirty(true)
  }

  const removeBanner = (index: number) => {
    const banner = banners[index]
    if (banner.id) setDeletedBannerIds(prev => [...prev, banner.id!])
    if (banner.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(banner.desktopPreview)
    if (banner.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(banner.mobilePreview)
    setBanners(prev => prev.filter((_, i) => i !== index))
    setBannersDirty(true)
  }

  const moveBanner = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= banners.length) return
    setBanners(prev => {
      const next = [...prev]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
    setBannersDirty(true)
  }

  const updateBanner = (index: number, updates: Partial<BannerItem>) => {
    setBanners(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b))
    setBannersDirty(true)
  }

  const handleBannerDesktop = (index: number, file: File | null) => {
    if (!file) return
    const banner = banners[index]
    if (banner.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(banner.desktopPreview)
    updateBanner(index, { desktopFile: file, desktopPreview: URL.createObjectURL(file) })
  }

  const handleBannerMobile = (index: number, file: File | null) => {
    if (!file) return
    const banner = banners[index]
    if (banner.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(banner.mobilePreview)
    updateBanner(index, { mobileFile: file, mobilePreview: URL.createObjectURL(file), removeMobileImage: false })
  }

  const handleBannerRemoveMobile = (index: number) => {
    const banner = banners[index]
    if (banner.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(banner.mobilePreview)
    updateBanner(index, { mobileFile: null, mobilePreview: null, removeMobileImage: !!banner.id && banner.hasExistingMobile })
  }

  // ========== Footer Handlers ==========
  const createFooter = () => {
    setBannerFooter({
      _clientId: crypto.randomUUID(),
      desktopPreview: null, mobilePreview: null,
      desktopFile: null, mobileFile: null,
      title: '', description: '', linkUrl: '',
      isActive: true, removeMobileImage: false, hasExistingMobile: false,
    })
    setFooterDirty(true)
  }

  const removeFooter = () => {
    if (!bannerFooter) return
    if (bannerFooter.id) setDeletedFooterId(bannerFooter.id)
    if (bannerFooter.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerFooter.desktopPreview)
    if (bannerFooter.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(bannerFooter.mobilePreview)
    setBannerFooter(null)
    setFooterDirty(true)
  }

  const updateFooter = (updates: Partial<BannerFooterItem>) => {
    setBannerFooter(prev => prev ? { ...prev, ...updates } : prev)
    setFooterDirty(true)
  }

  const handleFooterDesktop = (file: File | null) => {
    if (!file || !bannerFooter) return
    if (bannerFooter.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(bannerFooter.desktopPreview)
    updateFooter({ desktopFile: file, desktopPreview: URL.createObjectURL(file) })
  }

  const handleFooterMobile = (file: File | null) => {
    if (!file || !bannerFooter) return
    if (bannerFooter.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(bannerFooter.mobilePreview)
    updateFooter({ mobileFile: file, mobilePreview: URL.createObjectURL(file), removeMobileImage: false })
  }

  const handleFooterRemoveMobile = () => {
    if (!bannerFooter) return
    if (bannerFooter.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(bannerFooter.mobilePreview)
    updateFooter({ mobileFile: null, mobilePreview: null, removeMobileImage: !!bannerFooter.id && bannerFooter.hasExistingMobile })
  }

  // ========== Section Header ==========
  const SectionHeader = ({ sectionKey, label, dirty }: { sectionKey: SectionKey; label: string; dirty: boolean }) => (
    <button className="ced-section-toggle" onClick={() => toggleSection(sectionKey)}>
      <span className={`br-arrow ${openSections[sectionKey] ? 'open' : ''}`}>&#9662;</span>
      <span className="br-section-title">{label}</span>
      {dirty && <span className="ced-dirty-dot" />}
    </button>
  )

  if (loading) {
    return <div className="ced-page"><div className="loading">Loading...</div></div>
  }

  return (
    <div className="ced-page">
      {/* Header */}
      <div className="ced-header">
        <div>
          <h1 className="ced-title">CMS Editor</h1>
          <p className="ced-subtitle">Edit all sections and save as draft</p>
        </div>
        <div className="ced-header-actions">
          <button className="btn btn-outline" onClick={loadAll} disabled={saving}>Refresh</button>
          <button className="btn btn-primary" onClick={handleSaveDraft} disabled={saving || !anyDirty}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </div>

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {anyDirty && (
        <div className="ced-dirty-summary">
          Unsaved changes:
          {logoDirty && <span className="ced-dirty-tag">Logo</span>}
          {infoDirty && <span className="ced-dirty-tag">Business Info</span>}
          {brandingDirty && <span className="ced-dirty-tag">Branding</span>}
          {bannersDirty && <span className="ced-dirty-tag">Banners</span>}
          {footerDirty && <span className="ced-dirty-tag">Banner Footer</span>}
        </div>
      )}

      {/* ===== LOGO ===== */}
      <div className="ced-section">
        <SectionHeader sectionKey="logo" label="Logo" dirty={logoDirty} />
        {openSections.logo && (
          <div className="ced-section-body">
            <div className="ced-logo-area">
              <div className="ced-logo-box" onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" />
                ) : (
                  <span className="br-favicon-placeholder">+</span>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={e => { handleLogoFile(e.target.files?.[0] || null); e.target.value = '' }}
              />
              <button className="btn btn-outline btn-sm" onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? 'Change' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== BUSINESS INFO ===== */}
      <div className="ced-section">
        <SectionHeader sectionKey="info" label="Business Info" dirty={infoDirty} />
        {openSections.info && (
          <div className="ced-section-body">
            <div className="ced-form-grid">
              <div className="ced-field">
                <label className="br-label">Company Name</label>
                <input className="br-input" value={infoForm.company_name} onChange={e => updateInfo('company_name', e.target.value)} maxLength={255} />
              </div>
              <div className="ced-field">
                <label className="br-label">Description</label>
                <textarea className="br-input ced-textarea" value={infoForm.description} onChange={e => updateInfo('description', e.target.value)} maxLength={2000} rows={3} />
              </div>
              <div className="ced-field-row">
                <div className="ced-field">
                  <label className="br-label">Phone</label>
                  <input className="br-input" value={infoForm.phone} onChange={e => updateInfo('phone', e.target.value)} maxLength={50} />
                </div>
                <div className="ced-field">
                  <label className="br-label">Email</label>
                  <input className="br-input" type="email" value={infoForm.email} onChange={e => updateInfo('email', e.target.value)} maxLength={255} />
                </div>
              </div>
              <div className="ced-field">
                <label className="br-label">Address</label>
                <textarea className="br-input ced-textarea" value={infoForm.address} onChange={e => updateInfo('address', e.target.value)} maxLength={1000} rows={2} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== BRANDING ===== */}
      <div className="ced-section">
        <SectionHeader sectionKey="branding" label="Branding" dirty={brandingDirty} />
        {openSections.branding && (
          <div className="ced-section-body">
            {/* Title */}
            <div className="ced-field" style={{ marginBottom: 16 }}>
              <label className="br-label">Title (browser tab)</label>
              <input className="br-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={255} placeholder="Your store name" />
            </div>

            {/* Primary Color */}
            {brandingOptions && (
              <div style={{ marginBottom: 16 }}>
                <label className="br-label">Primary Color</label>
                <div className="ced-color-row">
                  {brandingOptions.primary_colors.map(c => (
                    <div
                      key={c.hex}
                      className={`ced-color-chip ${primaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setPrimaryColor(primaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Color */}
            {brandingOptions && (
              <div style={{ marginBottom: 16 }}>
                <label className="br-label">Secondary Color</label>
                <div className="ced-color-row">
                  {brandingOptions.secondary_colors.map(c => (
                    <div
                      key={c.hex}
                      className={`ced-color-chip ${secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => setSecondaryColor(secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Font */}
            {brandingOptions && (
              <div style={{ marginBottom: 16 }}>
                <label className="br-label">Font</label>
                <div className="ced-font-row">
                  {brandingOptions.fonts.map(f => (
                    <button
                      key={f.value}
                      className={`ced-font-chip ${fontFamily === f.value ? 'selected' : ''}`}
                      onClick={() => setFontFamily(fontFamily === f.value ? null : f.value)}
                      style={{ fontFamily: `'${f.value}', sans-serif` }}
                    >
                      <span className="ced-font-name">{f.name}</span>
                      <span className="ced-font-sample">สวัสดี ABCabc 123</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favicon */}
            <div>
              <label className="br-label">Favicon</label>
              <div className="br-favicon-row" style={{ marginTop: 6 }}>
                <div className="br-favicon-box" onClick={() => faviconInputRef.current?.click()}>
                  {faviconPreview ? <img src={faviconPreview} alt="Favicon" /> : <span className="br-favicon-placeholder">+</span>}
                </div>
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => { handleFaviconFile(e.target.files?.[0] || null); e.target.value = '' }}
                />
                {faviconPreview && (
                  <div className="br-favicon-btns">
                    <button className="btn-tag btn-tag-primary" onClick={() => faviconInputRef.current?.click()}>Change</button>
                    <button className="btn-tag btn-tag-danger" onClick={handleRemoveFavicon}>Remove</button>
                  </div>
                )}
              </div>
              <p className="br-hint">ICO/PNG only. Recommended: 16x16 or 32x32 px</p>
              {removeFavicon && (
                <div className="message warning" style={{ marginTop: 8 }}>Favicon will be removed on save</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== BANNERS ===== */}
      <div className="ced-section">
        <SectionHeader sectionKey="banners" label={`Banners (${banners.length}/10)`} dirty={bannersDirty} />
        {openSections.banners && (
          <div className="ced-section-body">
            {banners.length === 0 ? (
              <div className="ced-empty-mini">
                <p>No banners yet</p>
                <button className="btn btn-outline btn-sm" onClick={addBanner}>+ Add Banner</button>
              </div>
            ) : (
              <>
                {banners.map((banner, index) => (
                  <EditorBannerCard
                    key={banner._clientId}
                    banner={banner}
                    index={index}
                    total={banners.length}
                    onMove={dir => moveBanner(index, dir)}
                    onRemove={() => removeBanner(index)}
                    onDesktopFile={f => handleBannerDesktop(index, f)}
                    onMobileFile={f => handleBannerMobile(index, f)}
                    onRemoveMobile={() => handleBannerRemoveMobile(index)}
                    onUpdate={updates => updateBanner(index, updates)}
                  />
                ))}
                {banners.length < 10 && (
                  <button className="btn btn-outline btn-sm" onClick={addBanner} style={{ marginTop: 8 }}>
                    + Add Banner
                  </button>
                )}
              </>
            )}
            {deletedBannerIds.length > 0 && (
              <div className="message warning" style={{ marginTop: 8 }}>
                {deletedBannerIds.length} banner(s) will be deleted on save
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== BANNER FOOTER ===== */}
      <div className="ced-section">
        <SectionHeader sectionKey="footer" label="Banner Footer" dirty={footerDirty} />
        {openSections.footer && (
          <div className="ced-section-body">
            {!bannerFooter && !deletedFooterId ? (
              <div className="ced-empty-mini">
                <p>No banner footer yet</p>
                <button className="btn btn-outline btn-sm" onClick={createFooter}>+ Add Banner Footer</button>
              </div>
            ) : bannerFooter ? (
              <EditorFooterCard
                footer={bannerFooter}
                onRemove={removeFooter}
                onDesktopFile={handleFooterDesktop}
                onMobileFile={handleFooterMobile}
                onRemoveMobile={handleFooterRemoveMobile}
                onUpdate={updateFooter}
              />
            ) : null}
            {deletedFooterId && (
              <div className="message warning" style={{ marginTop: 8 }}>Banner footer will be deleted on save</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom save */}
      {anyDirty && (
        <div className="ced-bottom-actions">
          <button className="btn btn-primary" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      )}
    </div>
  )
}

// ===== EditorBannerCard =====

function EditorBannerCard({
  banner, index, total, onMove, onRemove, onDesktopFile, onMobileFile, onRemoveMobile, onUpdate,
}: {
  banner: BannerItem; index: number; total: number
  onMove: (dir: 'up' | 'down') => void; onRemove: () => void
  onDesktopFile: (file: File | null) => void; onMobileFile: (file: File | null) => void
  onRemoveMobile: () => void; onUpdate: (updates: Partial<BannerItem>) => void
}) {
  const desktopRef = useRef<HTMLInputElement>(null)
  const mobileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="ced-card">
      <div className="ced-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>#{index + 1}</span>
          {!banner.id && <span className="badge-new">NEW</span>}
          {banner.removeMobileImage && <span className="badge-warning">Mobile will be removed</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-outline btn-icon btn-sm" onClick={() => onMove('up')} disabled={index === 0} title="Move up">↑</button>
          <button className="btn btn-outline btn-icon btn-sm" onClick={() => onMove('down')} disabled={index === total - 1} title="Move down">↓</button>
          <button className="btn btn-danger btn-sm" onClick={onRemove}>Delete</button>
        </div>
      </div>
      <div className="banner-images">
        <div className="image-section">
          <label>Desktop {!banner.id && <span style={{ color: '#EF4444' }}>*</span>}</label>
          <div className="image-preview" onClick={() => desktopRef.current?.click()}>
            {banner.desktopPreview ? <img src={banner.desktopPreview} alt="Desktop" /> : <span className="placeholder">Click to upload</span>}
          </div>
          <input ref={desktopRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onDesktopFile(e.target.files?.[0] || null); e.target.value = '' }} />
        </div>
        <div className="image-section">
          <label>Mobile <span style={{ color: '#9CA3AF' }}>(optional)</span></label>
          <div className="image-preview" onClick={() => mobileRef.current?.click()}>
            {banner.mobilePreview ? <img src={banner.mobilePreview} alt="Mobile" /> : <span className="placeholder">Click to upload</span>}
          </div>
          <input ref={mobileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onMobileFile(e.target.files?.[0] || null); e.target.value = '' }} />
          {banner.mobilePreview && (
            <button className="btn btn-outline btn-sm" onClick={onRemoveMobile} style={{ color: '#EF4444', marginTop: 4 }}>Remove mobile</button>
          )}
        </div>
      </div>
      <div className="banner-fields">
        <div className="field-group">
          <label>Link URL</label>
          <input type="text" placeholder="https://example.com" value={banner.linkUrl} onChange={e => onUpdate({ linkUrl: e.target.value })} />
        </div>
        <div className="checkbox-group">
          <input type="checkbox" id={`b-active-${banner._clientId}`} checked={banner.isActive} onChange={e => onUpdate({ isActive: e.target.checked })} />
          <label htmlFor={`b-active-${banner._clientId}`}>Active</label>
        </div>
      </div>
    </div>
  )
}

// ===== EditorFooterCard =====

function EditorFooterCard({
  footer, onRemove, onDesktopFile, onMobileFile, onRemoveMobile, onUpdate,
}: {
  footer: BannerFooterItem; onRemove: () => void
  onDesktopFile: (file: File | null) => void; onMobileFile: (file: File | null) => void
  onRemoveMobile: () => void; onUpdate: (updates: Partial<BannerFooterItem>) => void
}) {
  const desktopRef = useRef<HTMLInputElement>(null)
  const mobileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="ced-card">
      <div className="ced-card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Banner Footer</span>
          {!footer.id && <span className="badge-new">NEW</span>}
          {footer.removeMobileImage && <span className="badge-warning">Mobile will be removed</span>}
        </div>
        <button className="btn btn-danger btn-sm" onClick={onRemove}>Delete</button>
      </div>
      <div className="banner-images">
        <div className="image-section">
          <label>Desktop {!footer.id && <span style={{ color: '#EF4444' }}>*</span>}</label>
          <div className="image-preview" onClick={() => desktopRef.current?.click()}>
            {footer.desktopPreview ? <img src={footer.desktopPreview} alt="Desktop" /> : <span className="placeholder">Click to upload</span>}
          </div>
          <input ref={desktopRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onDesktopFile(e.target.files?.[0] || null); e.target.value = '' }} />
        </div>
        <div className="image-section">
          <label>Mobile <span style={{ color: '#9CA3AF' }}>(optional)</span></label>
          <div className="image-preview" onClick={() => mobileRef.current?.click()}>
            {footer.mobilePreview ? <img src={footer.mobilePreview} alt="Mobile" /> : <span className="placeholder">Click to upload</span>}
          </div>
          <input ref={mobileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onMobileFile(e.target.files?.[0] || null); e.target.value = '' }} />
          {footer.mobilePreview && (
            <button className="btn btn-outline btn-sm" onClick={onRemoveMobile} style={{ color: '#EF4444', marginTop: 4 }}>Remove mobile</button>
          )}
        </div>
      </div>
      <div className="banner-fields">
        <div className="field-group">
          <label>Link URL</label>
          <input type="text" placeholder="https://example.com" value={footer.linkUrl} onChange={e => onUpdate({ linkUrl: e.target.value })} />
        </div>
        <div className="checkbox-group">
          <input type="checkbox" id={`f-active-${footer._clientId}`} checked={footer.isActive} onChange={e => onUpdate({ isActive: e.target.checked })} />
          <label htmlFor={`f-active-${footer._clientId}`}>Active</label>
        </div>
      </div>
    </div>
  )
}
