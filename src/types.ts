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
