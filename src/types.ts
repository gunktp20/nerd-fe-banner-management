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

export interface BusinessLogoResponse {
  id: string
  business_profile_id: string
  file_name: string
  url: string
  created_at: string
  updated_at: string
}

export interface SEOResponse {
  id: string
  business_profile_id: string
  title: string
  description: string | null
  image_url: string
  created_at: string
  updated_at: string
}

export interface LineContactResponse {
  enabled: boolean
  line_url: string
  add_friend_url: string
  qr_code_url: string
}

export interface FacebookPageResponse {
  enabled: boolean
  page_url: string
}

export interface SubdomainResponse {
  is_configured: boolean
  base_domain: string
  subdomain: string
  full_url: string
}

export interface DomainResponse {
  id: string
  business_profile_id: string
  domain_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DraftResponse {
  logo: BusinessLogoResponse | null
  branding: BrandingData | null
  info: BusinessInfoResponse | null
  banners: BannerResponse[]
  banner_footers: BannerFooterResponse[]
  seo: SEOResponse | null
  line_contact: LineContactResponse | null
  facebook_page: FacebookPageResponse | null
  subdomain: SubdomainResponse | null
  domains: DomainResponse[]
}
