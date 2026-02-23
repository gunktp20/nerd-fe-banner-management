import type { DraftResponse, SaveDraftResponse, BrandingOptions } from './types'

const API_BASE = '/api/v1'

export class ApiError extends Error {
  status: number
  details?: Record<string, string>
  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message)
    this.status = status
    this.details = details
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Accept-Language': 'th' }
}

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  if (res.status === 401) throw new Error('unauthorized')
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.message || 'request failed', body?.details)
  }
  return res.json()
}

export async function fetchDraft(token: string): Promise<DraftResponse> {
  return request(`${API_BASE}/business/cms/draft`, { headers: authHeaders(token) }) as Promise<DraftResponse>
}

export async function saveDraft(token: string, formData: FormData): Promise<SaveDraftResponse> {
  return request(`${API_BASE}/business/cms/draft`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: formData,
  }) as Promise<SaveDraftResponse>
}

export async function fetchBrandingOptions(): Promise<BrandingOptions | null> {
  return request(`${API_BASE}/business/branding/options`) as Promise<BrandingOptions | null>
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

export async function saveSubdomain(token: string, subdomain: string) {
  return request(`${API_BASE}/business/subdomain`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain }),
  })
}

export async function createDomain(token: string, domainName: string) {
  return request(`${API_BASE}/business/domains`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain_name: domainName }),
  })
}

export async function updateDomain(token: string, id: string, data: { domain_name?: string; is_active?: boolean }) {
  return request(`${API_BASE}/business/domains/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteDomain(token: string, id: string) {
  const res = await fetch(`${API_BASE}/business/domains/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token) as Record<string, string>,
  })
  if (res.status === 401) throw new Error('unauthorized')
  return res.ok
}
