import { useState, useEffect, useRef } from 'react'
import { fetchBrandingOptions, fetchDraft, saveDraft, publishCMS, saveSubdomain, createDomain, updateDomain, deleteDomain, ApiError } from './api'
import type {
  BannerItem, BannerResponse, BannerFooterItem, BannerFooterResponse,
  BrandingOptions, SaveDraftResponse,
} from './types'

interface Props {
  token: string
  onLogout: () => void
}

type SectionKey =
  | 'banners' | 'footer' | 'logo' | 'favicon'
  | 'colors' | 'font' | 'seo' | 'contact' | 'info'
  | 'subdomain' | 'domains'

// Maps each SaveDraftResponse field → sidebar sections it affects + Thai label for toast
const SAVE_RESULT_SECTIONS: Array<{
  key: keyof SaveDraftResponse
  sections: SectionKey[]
  label: string
}> = [
  { key: 'logo',          sections: ['logo'],                        label: 'โลโก้' },
  { key: 'branding',      sections: ['favicon', 'colors', 'font'],   label: 'สี/Font/Favicon' },
  { key: 'info',          sections: ['info'],                        label: 'ข้อมูลบริษัท' },
  { key: 'banners',       sections: ['banners'],                     label: 'แบนเนอร์' },
  { key: 'banner_footers',sections: ['footer'],                      label: 'แบนเนอร์ฟุตเตอร์' },
  { key: 'seo',           sections: ['seo'],                         label: 'SEO' },
  { key: 'line_contact',  sections: ['contact'],                     label: 'LINE' },
  { key: 'facebook_page', sections: ['contact'],                     label: 'Facebook' },
]

const SECTION_LABELS: Record<SectionKey, string> = {
  banners: 'อัปโหลดแบนเนอร์',
  footer: 'อัปโหลดแบนเนอร์ฟุตเตอร์',
  logo: 'อัปโหลดโลโก้',
  favicon: 'Favicon',
  colors: 'ตั้งค่าสี',
  font: 'Font',
  seo: 'แก้ไข SEO',
  contact: 'ตั้งค่า Facebook และ Line',
  info: 'ตั้งค่าข้อมูลบริษัท',
  subdomain: 'ตั้งค่า Subdomain',
  domains: 'จัดการ Custom Domain',
}

const SECTION_ORDER: SectionKey[] = [
  'banners', 'footer', 'logo', 'favicon', 'colors', 'font',
  'seo', 'contact', 'info', 'subdomain', 'domains',
]

const REQUIRED_SECTIONS: Partial<Record<SectionKey, true>> = {
  logo: true,
  banners: true,
  info: true,
  subdomain: true,
}

export default function CmsPage({ token, onLogout }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    banners: false, footer: false, logo: false, favicon: false,
    colors: false, font: false, seo: false, contact: false,
    info: false, subdomain: false, domains: false,
  })
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<SectionKey, string>>>({})


  // --- Logo ---
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
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

  // --- SEO ---
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoImagePreview, setSeoImagePreview] = useState<string | null>(null)
  const [seoImageFile, setSeoImageFile] = useState<File | null>(null)
  const [seoRemoveImage, setSeoRemoveImage] = useState(false)
  const [seoOriginal, setSeoOriginal] = useState({ title: '', description: '', hasImage: false })
  const seoImageRef = useRef<HTMLInputElement>(null)

  // --- Contact ---
  const [lineUrl, setLineUrl] = useState('')
  const [lineEnabled, setLineEnabled] = useState(false)
  const [lineOriginal, setLineOriginal] = useState({ url: '', enabled: false })
  const [fbUrl, setFbUrl] = useState('')
  const [fbEnabled, setFbEnabled] = useState(false)
  const [fbOriginal, setFbOriginal] = useState({ url: '', enabled: false })


  // --- Subdomain (standalone save) ---
  const [subdomainValue, setSubdomainValue] = useState('')
  const [subdomainFullUrl, setSubdomainFullUrl] = useState('')
  const [subdomainBaseDomain, setSubdomainBaseDomain] = useState('')
  const [subdomainSaving, setSubdomainSaving] = useState(false)

  // --- Custom Domains (standalone CRUD) ---
  interface DomainItem { id: string; domain_name: string; is_active: boolean }
  const [domains, setDomains] = useState<DomainItem[]>([])
  const [newDomainName, setNewDomainName] = useState('')
  const [domainActionId, setDomainActionId] = useState<string | null>(null)
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null)
  const [editingDomainName, setEditingDomainName] = useState('')

  // --- Preview banner rotation ---
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0)

  // --- Dirty computation ---
  const logoDirty = logoFile !== null || removeLogo
  const infoDirty = JSON.stringify(infoForm) !== JSON.stringify(infoOriginal)
  const brandingDirty =
    title !== brandingOriginal.title ||
    primaryColor !== brandingOriginal.primaryColor ||
    secondaryColor !== brandingOriginal.secondaryColor ||
    fontFamily !== brandingOriginal.fontFamily ||
    faviconFile !== null || removeFavicon
  const seoDirty =
    seoTitle !== seoOriginal.title ||
    seoDescription !== seoOriginal.description ||
    seoImageFile !== null || seoRemoveImage
  const contactDirty =
    lineUrl !== lineOriginal.url || lineEnabled !== lineOriginal.enabled ||
    fbUrl !== fbOriginal.url || fbEnabled !== fbOriginal.enabled
  const anyDirty = logoDirty || infoDirty || brandingDirty || bannersDirty || footerDirty || seoDirty || contactDirty

  // Map dirty state per section
  const sectionDirty: Record<SectionKey, boolean> = {
    banners: bannersDirty,
    footer: footerDirty,
    logo: logoDirty,
    favicon: faviconFile !== null || removeFavicon,
    colors: primaryColor !== brandingOriginal.primaryColor || secondaryColor !== brandingOriginal.secondaryColor,
    font: fontFamily !== brandingOriginal.fontFamily || title !== brandingOriginal.title,
    seo: seoDirty,
    contact: contactDirty,
    info: infoDirty,
    subdomain: false,
    domains: false,
  }

  // Whether a section has data (for checkmark indicator)
  const sectionComplete: Record<SectionKey, boolean> = {
    banners: banners.length > 0,
    footer: bannerFooter !== null,
    logo: logoPreview !== null,
    favicon: faviconPreview !== null && !removeFavicon,
    colors: primaryColor !== null,
    font: fontFamily !== null,
    seo: seoTitle !== '',
    contact: (lineUrl !== '' && lineEnabled) || (fbUrl !== '' && fbEnabled),
    info: infoForm.company_name !== '',
    subdomain: subdomainValue !== '',
    domains: domains.length > 0,
  }

  useEffect(() => { loadAll() }, [])

  // Banner preview rotation
  useEffect(() => {
    const activeBanners = banners.filter(b => b.isActive && b.desktopPreview)
    if (activeBanners.length <= 1) return
    const interval = setInterval(() => {
      setPreviewBannerIndex(prev => (prev + 1) % activeBanners.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [banners])

  const loadAll = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const [draft, optRes] = await Promise.all([
        fetchDraft(token),
        fetchBrandingOptions().catch(() => null),
      ])
      const d = draft

      // Logo
      setLogoPreview(d.logo?.url || null)
      setLogoFile(null)
      setRemoveLogo(false)

      // Info
      const infoData = {
        company_name: d.info?.company_name || '',
        description: d.info?.description || '',
        phone: d.info?.phone || '',
        email: d.info?.email || '',
        address: d.info?.address || '',
      }
      setInfoForm(infoData)
      setInfoOriginal(infoData)

      // Branding options
      if (optRes?.primary_colors) setBrandingOptions(optRes)

      // Branding data
      const bTitle = d.branding?.theme?.title || ''
      const bPrimary = d.branding?.theme?.primary_color || null
      const bSecondary = d.branding?.theme?.secondary_color || null
      const bFont = d.branding?.theme?.font_family || null
      const bFavicon = d.branding?.favicon?.url || null
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
      setBanners((d.banners || []).map((b: BannerResponse) => ({
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
      setDeletedBannerIds([])
      setBannersDirty(false)

      // Banner Footer
      const footerData = d.banner_footers || []
      if (footerData.length > 0) {
        const bf: BannerFooterResponse = footerData[0]
        setBannerFooter({
          _clientId: crypto.randomUUID(), id: bf.id,
          desktopPreview: bf.url || null, mobilePreview: bf.mobile_url || null,
          desktopFile: null, mobileFile: null,
          title: bf.title || '', description: bf.description || '',
          linkUrl: bf.link_url || '', isActive: bf.is_active,
          removeMobileImage: false, hasExistingMobile: !!bf.mobile_url,
        })
      } else {
        setBannerFooter(null)
      }
      setDeletedFooterId(null)
      setFooterDirty(false)

      // SEO
      setSeoTitle(d.seo?.title || '')
      setSeoDescription(d.seo?.description || '')
      setSeoImagePreview(d.seo?.image_url || null)
      setSeoImageFile(null)
      setSeoRemoveImage(false)
      setSeoOriginal({ title: d.seo?.title || '', description: d.seo?.description || '', hasImage: !!d.seo?.image_url })

      // Contact
      setLineUrl(d.line_contact?.line_url || '')
      setLineEnabled(d.line_contact?.enabled ?? false)
      setLineOriginal({ url: d.line_contact?.line_url || '', enabled: d.line_contact?.enabled ?? false })
      setFbUrl(d.facebook_page?.page_url || '')
      setFbEnabled(d.facebook_page?.enabled ?? false)
      setFbOriginal({ url: d.facebook_page?.page_url || '', enabled: d.facebook_page?.enabled ?? false })

      // Subdomain
      setSubdomainValue(d.subdomain?.subdomain || '')
      setSubdomainFullUrl(d.subdomain?.full_url || '')
      setSubdomainBaseDomain(d.subdomain?.base_domain || '')

      // Custom Domains
      setDomains((d.domains || []).map((dom: { id: string; domain_name: string; is_active: boolean }) => ({
        id: dom.id,
        domain_name: dom.domain_name,
        is_active: dom.is_active,
      })))

      setPreviewBannerIndex(0)
      setSectionErrors({})
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลได้' })
    }
    setLoading(false)
  }

  const handleCancel = () => { loadAll() }

  const toggleSection = (key: SectionKey) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ========== Save Draft ==========

  // Core save logic — returns true if all sections saved ok, false if validation failed,
  // section errors occurred, or API threw. Does NOT set saving/publishing state.
  const runSaveDraft = async (): Promise<boolean> => {
    if (bannersDirty) {
      for (let i = 0; i < banners.length; i++) {
        if (!banners[i].id && !banners[i].desktopFile) {
          setMessage({ type: 'error', text: `แบนเนอร์ #${i + 1}: ต้องเพิ่มรูป Desktop สำหรับแบนเนอร์ใหม่` })
          return false
        }
      }
    }
    if (footerDirty && bannerFooter && !bannerFooter.id && !bannerFooter.desktopFile) {
      setMessage({ type: 'error', text: 'แบนเนอร์ท้าย: ต้องเพิ่มรูป Desktop สำหรับรายการใหม่' })
      return false
    }

    const formData = new FormData()

    // Logo
    if (removeLogo) {
      formData.append('remove_logo', 'true')
    } else if (logoDirty && logoFile) {
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
    if (infoDirty) formData.append('info', JSON.stringify(infoForm))

    // Banners
    if (bannersDirty) {
      const ops: Record<string, unknown>[] = []
      for (let i = 0; i < banners.length; i++) {
        const b = banners[i]
        const idx = ops.length
        if (!b.id) {
          const op: Record<string, unknown> = { action: 'create', is_active: b.isActive }
          if (b.linkUrl) op.link_url = b.linkUrl
          ops.push(op)
          formData.append(`desktop_banner_${idx}`, b.desktopFile!)
          if (b.mobileFile) formData.append(`mobile_banner_${idx}`, b.mobileFile)
        } else {
          const op: Record<string, unknown> = { action: 'update', id: b.id, link_url: b.linkUrl, is_active: b.isActive }
          if (b.removeMobileImage) op.remove_mobile_image = true
          ops.push(op)
          if (b.desktopFile) formData.append(`desktop_banner_${idx}`, b.desktopFile)
          if (b.mobileFile) formData.append(`mobile_banner_${idx}`, b.mobileFile)
        }
      }
      for (const id of deletedBannerIds) ops.push({ action: 'delete', id })
      formData.append('banners', JSON.stringify(ops))
    }

    // Banner Footer
    if (footerDirty) {
      const ops: Record<string, unknown>[] = []
      if (bannerFooter) {
        const idx = ops.length
        if (!bannerFooter.id) {
          const op: Record<string, unknown> = { action: 'create', is_active: bannerFooter.isActive }
          if (bannerFooter.title) op.title = bannerFooter.title
          if (bannerFooter.description) op.description = bannerFooter.description
          if (bannerFooter.linkUrl) op.link_url = bannerFooter.linkUrl
          ops.push(op)
          formData.append(`desktop_footer_${idx}`, bannerFooter.desktopFile!)
          if (bannerFooter.mobileFile) formData.append(`mobile_footer_${idx}`, bannerFooter.mobileFile)
        } else {
          const op: Record<string, unknown> = {
            action: 'update', id: bannerFooter.id,
            title: bannerFooter.title, description: bannerFooter.description,
            link_url: bannerFooter.linkUrl, is_active: bannerFooter.isActive,
          }
          if (bannerFooter.removeMobileImage) op.remove_mobile_image = true
          ops.push(op)
          if (bannerFooter.desktopFile) formData.append(`desktop_footer_${idx}`, bannerFooter.desktopFile)
          if (bannerFooter.mobileFile) formData.append(`mobile_footer_${idx}`, bannerFooter.mobileFile)
        }
      }
      if (deletedFooterId) ops.push({ action: 'delete', id: deletedFooterId })
      formData.append('banner_footers', JSON.stringify(ops))
    }

    // SEO
    if (seoDirty) {
      formData.append('seo_title', seoTitle)
      formData.append('seo_description', seoDescription)
      if (seoImageFile) formData.append('seo_image', seoImageFile)
      if (seoRemoveImage) formData.append('seo_remove_image', 'true')
    }

    // Contact
    if (contactDirty) {
      if (lineUrl !== lineOriginal.url || lineEnabled !== lineOriginal.enabled) {
        formData.append('line_contact', JSON.stringify({ line_url: lineUrl, enabled: lineEnabled }))
      }
      if (fbUrl !== fbOriginal.url || fbEnabled !== fbOriginal.enabled) {
        formData.append('facebook_page', JSON.stringify({ page_url: fbUrl, enabled: fbEnabled }))
      }
    }

    try {
      const result = await saveDraft(token, formData)

      const newSectionErrors: Partial<Record<SectionKey, string>> = {}
      const autoOpen: Partial<Record<SectionKey, boolean>> = {}
      const failedLabels: string[] = []
      for (const { key, sections, label } of SAVE_RESULT_SECTIONS) {
        const errMsg = result?.[key]?.error
        if (errMsg) {
          for (const sec of sections) {
            newSectionErrors[sec] = errMsg
            autoOpen[sec] = true
          }
          failedLabels.push(label)
        }
      }

      if (failedLabels.length > 0) {
        setMessage({ type: 'error', text: `บันทึกไม่สำเร็จ ${failedLabels.length} ส่วน: ${failedLabels.join(', ')}` })
        await loadAll()
        setSectionErrors(newSectionErrors)
        setOpenSections(prev => ({ ...prev, ...autoOpen }))
        return false
      }

      await loadAll()
      return true
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return false }
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด ไม่สามารถบันทึกได้' })
      return false
    }
  }

  const handleSaveDraft = async () => {
    if (!anyDirty) { setMessage({ type: 'error', text: 'ไม่มีการเปลี่ยนแปลง' }); return }
    setSaving(true)
    setMessage({ type: '', text: '' })
    const ok = await runSaveDraft()
    if (ok) setMessage({ type: 'success', text: 'บันทึกฉบับร่างสำเร็จ!' })
    setSaving(false)
  }

  // ========== Handlers ==========
  const handleLogoFile = (file: File | null) => {
    if (!file) return
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setRemoveLogo(false)
  }

  const handleRemoveLogo = () => {
    if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const updateInfo = (field: string, value: string) => setInfoForm(prev => ({ ...prev, [field]: value }))

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

  // Banner handlers
  const addBanner = () => {
    if (banners.length >= 10) return
    setBanners(prev => [...prev, {
      _clientId: crypto.randomUUID(), desktopPreview: null, mobilePreview: null,
      desktopFile: null, mobileFile: null, linkUrl: '', isActive: true,
      removeMobileImage: false, hasExistingMobile: false,
    }])
    setBannersDirty(true)
  }

  const removeBanner = (index: number) => {
    const b = banners[index]
    if (b.id) setDeletedBannerIds(prev => [...prev, b.id!])
    if (b.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(b.desktopPreview)
    if (b.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(b.mobilePreview)
    setBanners(prev => prev.filter((_, i) => i !== index))
    setBannersDirty(true)
  }

  const moveBanner = (index: number, direction: 'up' | 'down') => {
    const ni = direction === 'up' ? index - 1 : index + 1
    if (ni < 0 || ni >= banners.length) return
    setBanners(prev => {
      const next = [...prev]; [next[index], next[ni]] = [next[ni], next[index]]; return next
    })
    setBannersDirty(true)
  }

  const updateBanner = (index: number, updates: Partial<BannerItem>) => {
    setBanners(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b))
    setBannersDirty(true)
  }

  const handleBannerDesktop = (index: number, file: File | null) => {
    if (!file) return
    const b = banners[index]
    if (b.desktopPreview?.startsWith('blob:')) URL.revokeObjectURL(b.desktopPreview)
    updateBanner(index, { desktopFile: file, desktopPreview: URL.createObjectURL(file) })
  }

  const handleBannerMobile = (index: number, file: File | null) => {
    if (!file) return
    const b = banners[index]
    if (b.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(b.mobilePreview)
    updateBanner(index, { mobileFile: file, mobilePreview: URL.createObjectURL(file), removeMobileImage: false })
  }

  const handleBannerRemoveMobile = (index: number) => {
    const b = banners[index]
    if (b.mobilePreview?.startsWith('blob:')) URL.revokeObjectURL(b.mobilePreview)
    updateBanner(index, { mobileFile: null, mobilePreview: null, removeMobileImage: !!b.id && b.hasExistingMobile })
  }

  // Footer handlers
  const createFooter = () => {
    setBannerFooter({
      _clientId: crypto.randomUUID(), desktopPreview: null, mobilePreview: null,
      desktopFile: null, mobileFile: null, title: '', description: '', linkUrl: '',
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

  // SEO handlers
  const handleSeoImageFile = (file: File | null) => {
    if (!file) return
    if (seoImagePreview?.startsWith('blob:')) URL.revokeObjectURL(seoImagePreview)
    setSeoImageFile(file)
    setSeoImagePreview(URL.createObjectURL(file))
    setSeoRemoveImage(false)
  }

  const handleSeoRemoveImage = () => {
    if (seoImagePreview?.startsWith('blob:')) URL.revokeObjectURL(seoImagePreview)
    setSeoImageFile(null)
    setSeoImagePreview(null)
    setSeoRemoveImage(true)
  }

  // ========== Publish ==========
  // Option A: if there are unsaved changes, save draft first.
  // If save draft has section errors → stop (don't publish). Otherwise → publish.
  const handlePublish = async () => {
    setPublishing(true)
    setMessage({ type: '', text: '' })

    if (anyDirty) {
      setSaving(true)
      const ok = await runSaveDraft()
      setSaving(false)
      if (!ok) {
        setPublishing(false)
        return
      }
      // clear "save success" message before showing publish result
      setMessage({ type: '', text: '' })
    }

    try {
      await publishCMS(token)
      setMessage({ type: 'success', text: 'เผยแพร่เว็บไซต์สำเร็จ!' })
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      if (err instanceof ApiError && err.details) {
        const msgs = Object.values(err.details).join(' | ')
        setMessage({ type: 'error', text: msgs })
      } else {
        setMessage({ type: 'error', text: 'ไม่สามารถเผยแพร่ได้' })
      }
    }
    setPublishing(false)
  }

  // ========== Subdomain standalone handler ==========
  const handleSaveSubdomain = async () => {
    if (!subdomainValue.trim()) { setMessage({ type: 'error', text: 'กรุณากรอก Subdomain' }); return }
    setSubdomainSaving(true)
    try {
      await saveSubdomain(token, subdomainValue.trim())
      setMessage({ type: 'success', text: 'บันทึก Subdomain สำเร็จ!' })
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'ไม่สามารถบันทึก Subdomain ได้' })
    }
    setSubdomainSaving(false)
  }

  // ========== Domain standalone handlers ==========
  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return
    setDomainActionId('adding')
    try {
      const res = await createDomain(token, newDomainName.trim())
      if (res) {
        setDomains(prev => [...prev, { id: res.id, domain_name: res.domain_name, is_active: res.is_active }])
        setNewDomainName('')
        setMessage({ type: 'success', text: 'เพิ่ม Domain สำเร็จ!' })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'ไม่สามารถเพิ่ม Domain ได้' })
    }
    setDomainActionId(null)
  }

  const handleToggleDomain = async (id: string, isActive: boolean) => {
    setDomainActionId(id)
    try {
      const res = await updateDomain(token, id, { is_active: isActive })
      if (res) {
        setDomains(prev => prev.map(d => d.id === id ? { ...d, is_active: isActive } : d))
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'ไม่สามารถอัปเดต Domain ได้' })
    }
    setDomainActionId(null)
  }

  const handleDeleteDomain = async (id: string) => {
    setDomainActionId(id)
    try {
      const ok = await deleteDomain(token, id)
      if (ok) {
        setDomains(prev => prev.filter(d => d.id !== id))
        setMessage({ type: 'success', text: 'ลบ Domain สำเร็จ!' })
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'ไม่สามารถลบ Domain ได้' })
    }
    setDomainActionId(null)
  }

  const handleSaveEditDomain = async () => {
    if (!editingDomainId || !editingDomainName.trim()) return
    setDomainActionId(editingDomainId)
    try {
      const res = await updateDomain(token, editingDomainId, { domain_name: editingDomainName.trim() })
      if (res) {
        setDomains(prev => prev.map(d => d.id === editingDomainId ? { ...d, domain_name: editingDomainName.trim() } : d))
        setEditingDomainId(null)
        setEditingDomainName('')
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') { onLogout(); return }
      setMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'ไม่สามารถแก้ไข Domain ได้' })
    }
    setDomainActionId(null)
  }

  // ========== Preview ==========
  const activeBanners = banners.filter(b => b.isActive && b.desktopPreview)
  const currentBanner = activeBanners[previewBannerIndex % Math.max(activeBanners.length, 1)]

  const renderPreview = () => (
    <>
    <div
      className="preview-phone"
      style={{ fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }}
    >
      {/* Navbar */}
      <div className="preview-navbar" style={{ backgroundColor: primaryColor || '#4F46E5' }}>
        {logoPreview ? (
          <img src={logoPreview} alt="Logo" className="preview-logo" />
        ) : (
          <span className="preview-logo-text">{title || infoForm.company_name || 'My Store'}</span>
        )}
      </div>

      {/* Banner */}
      <div className="preview-banner">
        {currentBanner?.desktopPreview ? (
          <img src={currentBanner.desktopPreview} alt="Banner" />
        ) : (
          <div className="preview-banner-empty">ไม่มีแบนเนอร์</div>
        )}
        {activeBanners.length > 1 && (
          <div className="preview-dots">
            {activeBanners.map((_, i) => (
              <span key={i} className={`preview-dot ${i === previewBannerIndex % activeBanners.length ? 'active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* Content placeholder */}
      <div className="preview-content">
        <div className="preview-section-label">สินค้า</div>
        <div className="preview-products">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="preview-product-card">
              <div className="preview-product-img" />
              <div className="preview-product-name" />
              <div className="preview-product-price" style={{ backgroundColor: primaryColor || '#4F46E5' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer banner */}
      {bannerFooter?.desktopPreview && bannerFooter.isActive && (
        <div className="preview-footer-banner">
          <img src={bannerFooter.desktopPreview} alt="Footer" />
        </div>
      )}

      {/* Footer */}
      <div className="preview-footer" style={{ backgroundColor: secondaryColor || '#1F2937' }}>
        <div className="preview-footer-text">{infoForm.company_name || 'Company Name'}</div>
        {infoForm.phone && <div className="preview-footer-info">{infoForm.phone}</div>}
        {infoForm.email && <div className="preview-footer-info">{infoForm.email}</div>}
      </div>
    </div>

    </>
  )

  // ========== Section renderers ==========
  const renderBannersSection = () => (
    <div className="section-body">
      {banners.length === 0 ? (
        <div className="empty-state">
          <p>ยังไม่มีแบนเนอร์</p>
          <button className="btn-sm btn-outline" onClick={addBanner}>+ เพิ่มแบนเนอร์</button>
        </div>
      ) : (
        <>
          {banners.map((banner, index) => (
            <BannerCard
              key={banner._clientId} banner={banner} index={index} total={banners.length}
              onMove={dir => moveBanner(index, dir)} onRemove={() => removeBanner(index)}
              onDesktopFile={f => handleBannerDesktop(index, f)}
              onMobileFile={f => handleBannerMobile(index, f)}
              onRemoveMobile={() => handleBannerRemoveMobile(index)}
              onUpdate={updates => updateBanner(index, updates)}
            />
          ))}
          {banners.length < 10 && (
            <button className="btn-sm btn-outline" onClick={addBanner} style={{ marginTop: 8 }}>+ เพิ่มแบนเนอร์</button>
          )}
        </>
      )}
      {deletedBannerIds.length > 0 && (
        <div className="msg-warning">{deletedBannerIds.length} แบนเนอร์จะถูกลบเมื่อบันทึก</div>
      )}
    </div>
  )

  const renderFooterSection = () => (
    <div className="section-body">
      {!bannerFooter && !deletedFooterId ? (
        <div className="empty-state">
          <p>ยังไม่มีแบนเนอร์ฟุตเตอร์</p>
          <button className="btn-sm btn-outline" onClick={createFooter}>+ เพิ่มแบนเนอร์ฟุตเตอร์</button>
        </div>
      ) : bannerFooter ? (
        <FooterCard
          footer={bannerFooter} onRemove={removeFooter}
          onDesktopFile={handleFooterDesktop} onMobileFile={handleFooterMobile}
          onRemoveMobile={handleFooterRemoveMobile} onUpdate={updateFooter}
        />
      ) : null}
      {deletedFooterId && <div className="msg-warning">แบนเนอร์ฟุตเตอร์จะถูกลบเมื่อบันทึก</div>}
    </div>
  )

  const renderLogoSection = () => (
    <div className="section-body">
      <div className="upload-area" onClick={() => logoInputRef.current?.click()}>
        {logoPreview ? (
          <img src={logoPreview} alt="Logo" className="upload-preview-img" />
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">+</span>
            <span>คลิกเพื่ออัปโหลดโลโก้</span>
          </div>
        )}
      </div>
      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        style={{ display: 'none' }} onChange={e => { handleLogoFile(e.target.files?.[0] || null); e.target.value = '' }} />
      {logoPreview && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn-sm btn-outline" onClick={() => logoInputRef.current?.click()}>เปลี่ยนรูป</button>
          <button className="btn-sm btn-danger" onClick={handleRemoveLogo}>ลบโลโก้</button>
        </div>
      )}
      {removeLogo && <div className="msg-warning" style={{ marginTop: 8 }}>โลโก้จะถูกลบเมื่อบันทึก</div>}
    </div>
  )

  const renderFaviconSection = () => (
    <div className="section-body">
      <div className="favicon-row">
        <div className="favicon-box" onClick={() => faviconInputRef.current?.click()}>
          {faviconPreview ? <img src={faviconPreview} alt="Favicon" /> : <span className="upload-icon">+</span>}
        </div>
        {faviconPreview && (
          <div className="favicon-actions">
            <button className="btn-sm btn-outline" onClick={() => faviconInputRef.current?.click()}>เปลี่ยน</button>
            <button className="btn-sm btn-danger" onClick={handleRemoveFavicon}>ลบ</button>
          </div>
        )}
      </div>
      <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml"
        style={{ display: 'none' }} onChange={e => { handleFaviconFile(e.target.files?.[0] || null); e.target.value = '' }} />
      <p className="hint">แนะนำ: ICO/PNG ขนาด 16x16 หรือ 32x32 px</p>
      {removeFavicon && <div className="msg-warning">Favicon จะถูกลบเมื่อบันทึก</div>}
    </div>
  )

  const renderColorsSection = () => (
    <div className="section-body">
      {brandingOptions && (
        <>
          <div className="field-group">
            <label className="field-label">สีหลัก (Primary Color)</label>
            <div className="color-row">
              {brandingOptions.primary_colors.map(c => (
                <div key={c.hex}
                  className={`color-chip ${primaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setPrimaryColor(primaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">สีรอง (Secondary Color)</label>
            <div className="color-row">
              {brandingOptions.secondary_colors.map(c => (
                <div key={c.hex}
                  className={`color-chip ${secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setSecondaryColor(secondaryColor?.toUpperCase() === c.hex.toUpperCase() ? null : c.hex)}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {!brandingOptions && <p className="hint">ไม่สามารถโหลดตัวเลือกสีได้</p>}
    </div>
  )

  const renderFontSection = () => (
    <div className="section-body">
      <div className="field-group">
        <label className="field-label">ชื่อร้าน (Title)</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={255} placeholder="ชื่อร้านค้าของคุณ" />
      </div>
      {brandingOptions && (
        <div className="field-group">
          <label className="field-label">แบบอักษร</label>
          <div className="font-grid">
            {brandingOptions.fonts.map(f => (
              <button key={f.value}
                className={`font-chip ${fontFamily === f.value ? 'selected' : ''}`}
                onClick={() => setFontFamily(fontFamily === f.value ? null : f.value)}
                style={{ fontFamily: `'${f.value}', sans-serif` }}
              >
                <span className="font-name">{f.name}</span>
                <span className="font-sample">สวัสดี ABCabc 123</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderSeoSection = () => (
    <div className="section-body">
      <div className="field-group">
        <label className="field-label">SEO Title</label>
        <input className="input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={255} placeholder="หัวข้อ SEO" />
      </div>
      <div className="field-group">
        <label className="field-label">SEO Description</label>
        <textarea className="input textarea" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} maxLength={500} rows={3} placeholder="คำอธิบาย SEO" />
      </div>
      <div className="field-group">
        <label className="field-label">OG Image</label>
        <div className="seo-image-area">
          <div className="seo-image-box" onClick={() => seoImageRef.current?.click()}>
            {seoImagePreview ? <img src={seoImagePreview} alt="OG" /> : <span className="upload-icon">+</span>}
          </div>
          {seoImagePreview && (
            <div className="favicon-actions">
              <button className="btn-sm btn-outline" onClick={() => seoImageRef.current?.click()}>เปลี่ยน</button>
              <button className="btn-sm btn-danger" onClick={handleSeoRemoveImage}>ลบ</button>
            </div>
          )}
        </div>
        <input ref={seoImageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: 'none' }} onChange={e => { handleSeoImageFile(e.target.files?.[0] || null); e.target.value = '' }} />
        <p className="hint">แนะนำ: 1200x630 px</p>
        {seoRemoveImage && <div className="msg-warning">รูป OG จะถูกลบเมื่อบันทึก</div>}
      </div>
    </div>
  )

  const renderContactSection = () => (
    <div className="section-body">
      <div className="contact-group">
        <div className="contact-header">
          <span className="contact-label">Facebook</span>
          <label className="toggle-label">
            <input type="checkbox" checked={fbEnabled} onChange={e => setFbEnabled(e.target.checked)} />
            <span>เปิดใช้งาน</span>
          </label>
        </div>
        <input className="input" value={fbUrl} onChange={e => setFbUrl(e.target.value)} placeholder="https://facebook.com/..." />
      </div>
      <div className="contact-group">
        <div className="contact-header">
          <span className="contact-label">LINE</span>
          <label className="toggle-label">
            <input type="checkbox" checked={lineEnabled} onChange={e => setLineEnabled(e.target.checked)} />
            <span>เปิดใช้งาน</span>
          </label>
        </div>
        <input className="input" value={lineUrl} onChange={e => setLineUrl(e.target.value)} placeholder="https://line.me/ti/p/..." />
      </div>
    </div>
  )

  const renderInfoSection = () => (
    <div className="section-body">
      <div className="field-group">
        <label className="field-label">ชื่อบริษัท</label>
        <input className="input" value={infoForm.company_name} onChange={e => updateInfo('company_name', e.target.value)} maxLength={255} />
      </div>
      <div className="field-group">
        <label className="field-label">คำอธิบาย</label>
        <textarea className="input textarea" value={infoForm.description} onChange={e => updateInfo('description', e.target.value)} maxLength={2000} rows={3} />
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label">เบอร์โทร</label>
          <input className="input" value={infoForm.phone} onChange={e => updateInfo('phone', e.target.value)} maxLength={50} />
        </div>
        <div className="field-group">
          <label className="field-label">อีเมล</label>
          <input className="input" type="email" value={infoForm.email} onChange={e => updateInfo('email', e.target.value)} maxLength={255} />
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">ที่อยู่</label>
        <textarea className="input textarea" value={infoForm.address} onChange={e => updateInfo('address', e.target.value)} maxLength={1000} rows={2} />
      </div>
    </div>
  )

  const renderSubdomainSection = () => (
    <div className="section-body">
      {/* Warning banner */}
      <div className="sd-alert-warning">
        <span className="sd-alert-icon">💡</span>
        <div>
          <strong>สิ่งที่ควรรู้เกี่ยวกับการเปลี่ยน Subdomain</strong>
          <p>การเปลี่ยน Subdomain จะมีผลทันที - URL เดิมจะใช้งานไม่ได้แล้ว ลิงก์ที่แชร์ไว้ก่อนหน้านี้จะไม่สามารถเข้าถึงได้ หากมีผู้เข้าชมเว็บไซต์ของคุณอยู่แล้ว ควรแจ้ง URL ใหม่ให้ทราบด้วย</p>
        </div>
      </div>

      {/* Info box */}
      <div className="sd-info-box">
        <div className="sd-info-title">
          <span className="sd-info-icon">ℹ</span>
          <strong>เกี่ยวกับ Platform Subdomain</strong>
        </div>
        <ul className="sd-info-list">
          <li>ใช้งานได้ฟรีไม่ต้องตั้งค่า DNS</li>
          <li>รองรับ HTTPS อัตโนมัติ (SSL Certificate)</li>
          <li>เปลี่ยนชื่อ Subdomain ได้ตลอดเวลา</li>
        </ul>
      </div>

      {/* Current URL */}
      {subdomainFullUrl && (
        <div className="sd-url-box">
          <span className="sd-url-label">URL ปัจจุบันของเว็บไซต์</span>
          <div className="sd-url-row">
            <span className="sd-url-value">{subdomainFullUrl}</span>
            <button
              className="sd-copy-btn"
              title="คัดลอก URL"
              onClick={() => navigator.clipboard.writeText(subdomainFullUrl)}
            >
              ⧉
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="field-group">
        <label className="field-label">Subdomain <span className="required">*</span></label>
        <input
          className="input"
          value={subdomainValue}
          onChange={e => setSubdomainValue(e.target.value)}
          maxLength={100}
          placeholder="my-shop"
        />
        <ul className="sd-hint-list">
          <li>อนุญาตเฉพาะตัวอักษรภาษาอังกฤษ a-z, A-Z, ตัวเลข 0-9, ขีดกลาง (-) และจุด (.) เท่านั้น</li>
          <li>ความยาวสูงสุด 100 ตัวอักษร</li>
          <li>ต้องขึ้นต้นและลงท้ายด้วยตัวอักษรหรือตัวเลข (ห้ามขึ้นต้น/ลงท้ายด้วย - หรือ .)</li>
          <li>ห้ามใส่ space อย่างเดียว ต้องมีตัวอักษรผสมเสมอ</li>
        </ul>
      </div>

      <button
        className="btn-sm btn-primary"
        onClick={handleSaveSubdomain}
        disabled={subdomainSaving || !subdomainValue.trim()}
      >
        {subdomainSaving ? 'กำลังบันทึก...' : 'บันทึก Subdomain'}
      </button>
    </div>
  )

  const MAX_DOMAINS = 3

  const renderDomainsSection = () => (
    <div className="section-body">
      {/* How-to info box */}
      <div className="sd-info-box">
        <div className="sd-info-title">
          <span className="sd-info-icon">💡</span>
          <strong>วิธีเชื่อมต่อ</strong>
        </div>
        <p className="sd-info-text">
          เข้าไปที่เว็บไซต์ผู้ให้บริการโดเมนของคุณ (เช่น GoDaddy หรือ Namecheap) จากนั้นเพิ่ม CNAME Record
          โดยกำหนดค่าให้ชี้ไปที่ <strong>{subdomainBaseDomain || 'platform.example.com'}</strong>
        </p>
      </div>

      {/* Add domain input */}
      <div className="field-group">
        <label className="field-label">Custom Domain</label>
        <div className="domain-add-row">
          <input
            className="input"
            value={newDomainName}
            onChange={e => setNewDomainName(e.target.value)}
            placeholder="example.com"
            maxLength={253}
            disabled={domains.length >= MAX_DOMAINS}
            onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
          />
        </div>
        {domains.length >= MAX_DOMAINS && (
          <div className="sd-limit-notice">
            <span>ⓘ</span> จำกัดการเพิ่มโดเมนสูงสุด {MAX_DOMAINS} โดเมน
          </div>
        )}
      </div>

      {/* Domains table */}
      {domains.length > 0 && (
        <table className="domains-table">
          <thead>
            <tr>
              <th>โดเมน</th>
              <th>สถานะ (เปิด/ปิด)</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {domains.map(dom => (
              <tr key={dom.id}>
                <td>
                  {editingDomainId === dom.id ? (
                    <input
                      className="input input-sm"
                      value={editingDomainName}
                      onChange={e => setEditingDomainName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEditDomain(); if (e.key === 'Escape') { setEditingDomainId(null); setEditingDomainName('') } }}
                      autoFocus
                    />
                  ) : (
                    <span className="domain-name">{dom.domain_name}</span>
                  )}
                </td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={dom.is_active}
                      disabled={domainActionId === dom.id}
                      onChange={e => handleToggleDomain(dom.id, e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </td>
                <td>
                  <div className="domain-actions">
                    {editingDomainId === dom.id ? (
                      <>
                        <button className="icon-btn icon-btn-save" title="บันทึก" onClick={handleSaveEditDomain} disabled={domainActionId === dom.id}>✓</button>
                        <button className="icon-btn" title="ยกเลิก" onClick={() => { setEditingDomainId(null); setEditingDomainName('') }}>✕</button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn" title="แก้ไข" onClick={() => { setEditingDomainId(dom.id); setEditingDomainName(dom.domain_name) }} disabled={domainActionId === dom.id}>✎</button>
                        <button className="icon-btn icon-btn-danger" title="ลบ" onClick={() => handleDeleteDomain(dom.id)} disabled={domainActionId === dom.id}>🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add button */}
      <div className="domain-add-actions">
        <button
          className="btn-sm btn-primary"
          onClick={handleAddDomain}
          disabled={domainActionId === 'adding' || !newDomainName.trim() || domains.length >= MAX_DOMAINS}
        >
          {domainActionId === 'adding' ? 'กำลังเพิ่ม...' : 'เพิ่มโดเมน'}
        </button>
      </div>
    </div>
  )

  const sectionRenderers: Record<SectionKey, () => React.ReactNode> = {
    banners: renderBannersSection,
    footer: renderFooterSection,
    logo: renderLogoSection,
    favicon: renderFaviconSection,
    colors: renderColorsSection,
    font: renderFontSection,
    seo: renderSeoSection,
    contact: renderContactSection,
    info: renderInfoSection,
    subdomain: renderSubdomainSection,
    domains: renderDomainsSection,
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="cms-layout">
      {/* Header */}
      <header className="cms-header">
        <h1 className="cms-title">ตั้งค่า</h1>
        <div className="cms-header-actions">
          <button className="btn-header btn-logout" onClick={onLogout}>ออกจากระบบ</button>
          <button className="btn-header btn-cancel" onClick={handleCancel} disabled={saving || !anyDirty}>ยกเลิก</button>
          <button className="btn-header btn-save" onClick={handleSaveDraft} disabled={saving || !anyDirty}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
          </button>
          <button className="btn-header btn-publish" onClick={handlePublish} disabled={publishing || saving}>
            {publishing ? 'กำลังเผยแพร่...' : 'เผยแพร่'}
          </button>
        </div>
      </header>

      {/* Message */}
      {message.text && (
        <div className={`toast ${message.type}`}>
          {message.text}
          <button className="toast-close" onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Body */}
      <div className="cms-body">
        {/* Preview (Center) */}
        <div className="cms-preview">
          <div className="preview-container">
            <div className="preview-label">ตัวอย่าง</div>
            {renderPreview()}
          </div>
        </div>

        {/* Sidebar (Right) */}
        <div className="cms-sidebar">
          {SECTION_ORDER.map(key => (
            <div key={key} className={`sidebar-section ${openSections[key] ? 'open' : ''}`}>
              <button className="sidebar-section-toggle" onClick={() => toggleSection(key)}>
                <span className={`arrow ${openSections[key] ? 'open' : ''}`}>&#9656;</span>
                <span className="sidebar-section-label">{SECTION_LABELS[key]}</span>
                {REQUIRED_SECTIONS[key] && !sectionComplete[key] && (
                  <span className="section-required" title="จำเป็นต้องกรอก">!</span>
                )}
                {REQUIRED_SECTIONS[key] && sectionComplete[key] && !sectionErrors[key] && (
                  <span className="section-complete" title="กรอกข้อมูลแล้ว">✓</span>
                )}
                {sectionDirty[key] && <span className="dirty-dot" />}
                {sectionErrors[key] && <span className="error-dot" title={sectionErrors[key]} />}
              </button>
              {openSections[key] && (
                <>
                  {sectionErrors[key] && (
                    <div className="section-error-banner">
                      <span className="section-error-icon">⚠</span>
                      {sectionErrors[key]}
                    </div>
                  )}
                  {sectionRenderers[key]()}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== BannerCard =====
function BannerCard({
  banner, index, total, onMove, onRemove, onDesktopFile, onMobileFile, onRemoveMobile, onUpdate,
}: {
  banner: BannerItem; index: number; total: number
  onMove: (dir: 'up' | 'down') => void; onRemove: () => void
  onDesktopFile: (f: File | null) => void; onMobileFile: (f: File | null) => void
  onRemoveMobile: () => void; onUpdate: (u: Partial<BannerItem>) => void
}) {
  const dRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">#{index + 1} {!banner.id && <span className="badge-new">ใหม่</span>}</span>
        <div className="card-actions">
          <button className="btn-icon" onClick={() => onMove('up')} disabled={index === 0} title="ขึ้น">↑</button>
          <button className="btn-icon" onClick={() => onMove('down')} disabled={index === total - 1} title="ลง">↓</button>
          <button className="btn-sm btn-danger" onClick={onRemove}>ลบ</button>
        </div>
      </div>
      <div className="card-images">
        <div className="image-slot">
          <label>Desktop {!banner.id && <span className="required">*</span>}</label>
          <div className="image-box" onClick={() => dRef.current?.click()}>
            {banner.desktopPreview ? <img src={banner.desktopPreview} alt="Desktop" /> : <span className="upload-icon">+</span>}
          </div>
          <input ref={dRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onDesktopFile(e.target.files?.[0] || null); e.target.value = '' }} />
        </div>
        <div className="image-slot">
          <label>Mobile <span className="optional">(ไม่บังคับ)</span></label>
          <div className="image-box" onClick={() => mRef.current?.click()}>
            {banner.mobilePreview ? <img src={banner.mobilePreview} alt="Mobile" /> : <span className="upload-icon">+</span>}
          </div>
          <input ref={mRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onMobileFile(e.target.files?.[0] || null); e.target.value = '' }} />
          {banner.mobilePreview && (
            <button className="btn-sm btn-danger" onClick={onRemoveMobile} style={{ marginTop: 4 }}>ลบรูป Mobile</button>
          )}
        </div>
      </div>
      <div className="card-fields">
        <div className="field-group">
          <label className="field-label">Link URL</label>
          <input className="input" placeholder="https://example.com" value={banner.linkUrl}
            onChange={e => onUpdate({ linkUrl: e.target.value })} />
        </div>
        <label className="toggle-label">
          <input type="checkbox" checked={banner.isActive} onChange={e => onUpdate({ isActive: e.target.checked })} />
          <span>เปิดใช้งาน</span>
        </label>
      </div>
    </div>
  )
}

// ===== FooterCard =====
function FooterCard({
  footer, onRemove, onDesktopFile, onMobileFile, onRemoveMobile, onUpdate,
}: {
  footer: BannerFooterItem; onRemove: () => void
  onDesktopFile: (f: File | null) => void; onMobileFile: (f: File | null) => void
  onRemoveMobile: () => void; onUpdate: (u: Partial<BannerFooterItem>) => void
}) {
  const dRef = useRef<HTMLInputElement>(null)
  const mRef = useRef<HTMLInputElement>(null)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">แบนเนอร์ฟุตเตอร์ {!footer.id && <span className="badge-new">ใหม่</span>}</span>
        <button className="btn-sm btn-danger" onClick={onRemove}>ลบ</button>
      </div>
      <div className="card-images">
        <div className="image-slot">
          <label>Desktop {!footer.id && <span className="required">*</span>}</label>
          <div className="image-box" onClick={() => dRef.current?.click()}>
            {footer.desktopPreview ? <img src={footer.desktopPreview} alt="Desktop" /> : <span className="upload-icon">+</span>}
          </div>
          <input ref={dRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onDesktopFile(e.target.files?.[0] || null); e.target.value = '' }} />
        </div>
        <div className="image-slot">
          <label>Mobile <span className="optional">(ไม่บังคับ)</span></label>
          <div className="image-box" onClick={() => mRef.current?.click()}>
            {footer.mobilePreview ? <img src={footer.mobilePreview} alt="Mobile" /> : <span className="upload-icon">+</span>}
          </div>
          <input ref={mRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
            onChange={e => { onMobileFile(e.target.files?.[0] || null); e.target.value = '' }} />
          {footer.mobilePreview && (
            <button className="btn-sm btn-danger" onClick={onRemoveMobile} style={{ marginTop: 4 }}>ลบรูป Mobile</button>
          )}
        </div>
      </div>
      <div className="card-fields">
        <div className="field-group">
          <label className="field-label">Link URL</label>
          <input className="input" placeholder="https://example.com" value={footer.linkUrl}
            onChange={e => onUpdate({ linkUrl: e.target.value })} />
        </div>
        <label className="toggle-label">
          <input type="checkbox" checked={footer.isActive} onChange={e => onUpdate({ isActive: e.target.checked })} />
          <span>เปิดใช้งาน</span>
        </label>
      </div>
    </div>
  )
}
