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

// Banner Footer
export async function fetchBannerFooters(token: string) {
  const res = await fetch(`${API_BASE}/business/banner-footers?limit=0`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    throw new Error('unauthorized')
  }
  return res.json()
}

export async function bulkUpdateBannerFooters(token: string, formData: FormData) {
  const res = await fetch(`${API_BASE}/business/banner-footers/bulk`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
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

// Subdomain
export async function fetchSubdomain(token: string) {
  const res = await fetch(`${API_BASE}/business/subdomain/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function updateSubdomain(token: string, subdomain: string) {
  const res = await fetch(`${API_BASE}/business/subdomain/`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subdomain }),
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function checkSubdomainAvailability(token: string, subdomain: string) {
  const res = await fetch(`${API_BASE}/business/subdomain/check/${encodeURIComponent(subdomain)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

// Business Info
export async function fetchBusinessInfo(token: string) {
  const res = await fetch(`${API_BASE}/business/info/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function updateBusinessInfo(token: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/business/info/`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

// Business Logo
export async function fetchLogo(token: string) {
  const res = await fetch(`${API_BASE}/business/logo/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function uploadLogo(token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/business/logo/`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

// Custom Domains
export async function fetchDomains(token: string) {
  const res = await fetch(`${API_BASE}/business/domains/?limit=0`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function createDomain(token: string, domainName: string) {
  const res = await fetch(`${API_BASE}/business/domains/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain_name: domainName }),
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function updateDomain(token: string, domainId: string, data: { is_active?: boolean; domain_name?: string }) {
  const res = await fetch(`${API_BASE}/business/domains/${domainId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

export async function deleteDomain(token: string, domainId: string) {
  const res = await fetch(`${API_BASE}/business/domains/${domainId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}

// CMS Draft (save all at once)
export async function saveDraft(token: string, formData: FormData) {
  const res = await fetch(`${API_BASE}/business/cms/draft`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.json()
}
