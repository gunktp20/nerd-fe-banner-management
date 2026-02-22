const API_BASE = '/api/v1'

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 404) return null
  return res.json()
}

export async function fetchDraft(token: string) {
  return request(`${API_BASE}/business/cms/draft`, { headers: authHeaders(token) })
}

export async function saveDraft(token: string, formData: FormData) {
  return request(`${API_BASE}/business/cms/draft`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: formData,
  })
}

export async function fetchBrandingOptions() {
  return request(`${API_BASE}/business/branding/options`)
}

export async function publishCMS(token: string) {
  return request(`${API_BASE}/business/cms/publish`, {
    method: 'POST',
    headers: authHeaders(token),
  })
}

export async function fetchPublishStatus(token: string) {
  return request(`${API_BASE}/business/cms/status`, { headers: authHeaders(token) })
}

export async function checkSubdomainAvailability(token: string, subdomain: string) {
  return request(`${API_BASE}/business/subdomain/check/${encodeURIComponent(subdomain)}`, {
    headers: authHeaders(token),
  })
}
