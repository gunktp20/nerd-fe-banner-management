export interface BannerResponse {
  id: string
  business_profile_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  original_name: string
  mobile_file_name: string | null
  mobile_file_path: string | null
  mobile_file_size: number | null
  mobile_mime_type: string | null
  mobile_original_name: string | null
  sequence: number
  is_active: boolean
  title: string | null
  description: string | null
  link_url: string | null
  url: string
  mobile_url: string | null
  created_at: string
  updated_at: string
}

export interface BannerItem {
  _clientId: string
  id?: string
  desktopPreview: string | null
  mobilePreview: string | null
  desktopFile: File | null
  mobileFile: File | null
  linkUrl: string
  isActive: boolean
  removeMobileImage: boolean
  hasExistingMobile: boolean
}

// Banner Footer
export interface BannerFooterResponse {
  id: string
  business_profile_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  original_name: string
  mobile_file_name: string | null
  mobile_file_path: string | null
  mobile_file_size: number | null
  mobile_mime_type: string | null
  mobile_original_name: string | null
  sequence: number
  is_active: boolean
  title: string | null
  description: string | null
  link_url: string | null
  url: string
  mobile_url: string | null
  created_at: string
  updated_at: string
}

export interface BannerFooterItem {
  _clientId: string
  id?: string
  desktopPreview: string | null
  mobilePreview: string | null
  desktopFile: File | null
  mobileFile: File | null
  title: string
  description: string
  linkUrl: string
  isActive: boolean
  removeMobileImage: boolean
  hasExistingMobile: boolean
}

// Branding
export interface ColorPreset {
  name: string
  hex: string
}

export interface FontPreset {
  name: string
  value: string
}

export interface BrandingOptions {
  primary_colors: ColorPreset[]
  secondary_colors: ColorPreset[]
  fonts: FontPreset[]
}

export interface BrandingTheme {
  id: string
  business_profile_id: string
  title: string | null
  primary_color: string | null
  secondary_color: string | null
  font_family: string | null
  created_at: string
  updated_at: string
}

export interface BrandingFavicon {
  id: string
  business_profile_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  original_name: string
  url: string
  created_at: string
  updated_at: string
}

export interface BrandingData {
  theme: BrandingTheme | null
  favicon: BrandingFavicon | null
}

// Business Info
export interface BusinessInfoResponse {
  id: string
  business_profile_id: string
  company_name: string | null
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
}

// Business Logo
export interface BusinessLogoResponse {
  id: string
  business_profile_id: string
  file_name: string
  url: string
  created_at: string
  updated_at: string
}

// Subdomain
export interface SubdomainResponse {
  is_configured: boolean
  base_domain: string
  subdomain: string
  full_url: string
}

export interface SubdomainAvailability {
  subdomain: string
  available: boolean
}

// Custom Domain
export interface DomainResponse {
  id: string
  business_profile_id: string
  domain_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DomainListResponse {
  data: DomainResponse[]
  total: number
  limit: number
  page: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}
