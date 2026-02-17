const API_BASE = '/api/v1'

export async function fetchBanners(token: string) {
  const res = await fetch(`${API_BASE}/business/banners?limit=0`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

export async function bulkUpdateBanners(token: string, formData: FormData) {
  const res = await fetch(`${API_BASE}/business/banners/bulk`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

export async function fetchStorefront(domain: string) {
  const res = await fetch(`${API_BASE}/public/storefront?domain=${encodeURIComponent(domain)}`)
  return res.json()
}

export async function fetchPublishStatus(token: string) {
  const res = await fetch(`${API_BASE}/business/cms/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

export async function publishCMS(token: string) {
  const res = await fetch(`${API_BASE}/business/cms/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

// Branding
export async function fetchBrandingOptions() {
  const res = await fetch(`${API_BASE}/business/branding/options`)
  return res.json()
}

export async function fetchBranding(token: string) {
  const res = await fetch(`${API_BASE}/business/branding/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

export async function updateBranding(token: string, formData: FormData) {
  const res = await fetch(`${API_BASE}/business/branding/`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}
