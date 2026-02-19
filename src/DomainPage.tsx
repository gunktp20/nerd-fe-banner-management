import { useState, useEffect, useCallback } from 'react'
import {
  fetchSubdomain,
  updateSubdomain,
  checkSubdomainAvailability,
  fetchDomains,
  createDomain,
  updateDomain,
  deleteDomain,
} from './api'
import type { SubdomainResponse, DomainResponse } from './types'

interface Props {
  token: string
  onLogout: () => void
}

export default function DomainPage({ token, onLogout }: Props) {
  // Subdomain state
  const [subdomainData, setSubdomainData] = useState<SubdomainResponse | null>(null)
  const [subdomainInput, setSubdomainInput] = useState('')
  const [availability, setAvailability] = useState<{ checked: boolean; available: boolean } | null>(null)
  const [checkingAvail, setCheckingAvail] = useState(false)
  const [savingSubdomain, setSavingSubdomain] = useState(false)

  // Domain state
  const [domains, setDomains] = useState<DomainResponse[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ domain_name: string; is_active: boolean }>({ domain_name: '', is_active: true })
  const [savingEdit, setSavingEdit] = useState(false)

  // Shared state
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [subRes, domRes] = await Promise.all([
        fetchSubdomain(token),
        fetchDomains(token),
      ])
      setSubdomainData(subRes.data ?? subRes)
      const domData = domRes.data?.data ?? domRes.data ?? []
      setDomains(Array.isArray(domData) ? domData : [])
      // Pre-fill input with current subdomain
      const sub = subRes.data ?? subRes
      if (sub?.subdomain) {
        setSubdomainInput(sub.subdomain)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [token, onLogout])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subdomain availability check
  const handleCheckAvailability = async () => {
    const val = subdomainInput.trim().toLowerCase()
    if (!val || val.length < 3) {
      showMessage('error', 'Subdomain must be at least 3 characters')
      return
    }
    // Skip check if same as current
    if (subdomainData?.subdomain === val) {
      setAvailability({ checked: true, available: true })
      return
    }
    try {
      setCheckingAvail(true)
      const res = await checkSubdomainAvailability(token, val)
      const data = res.data ?? res
      setAvailability({ checked: true, available: data.available })
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to check availability')
    } finally {
      setCheckingAvail(false)
    }
  }

  // Save subdomain
  const handleSaveSubdomain = async () => {
    const val = subdomainInput.trim().toLowerCase()
    if (!val || val.length < 3) {
      showMessage('error', 'Subdomain must be at least 3 characters')
      return
    }
    try {
      setSavingSubdomain(true)
      const res = await updateSubdomain(token, val)
      const data = res.data ?? res
      setSubdomainData(data)
      setAvailability(null)
      showMessage('success', 'Subdomain saved successfully')
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to save subdomain')
    } finally {
      setSavingSubdomain(false)
    }
  }

  // Add custom domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = newDomain.trim().toLowerCase()
    if (!val) return
    try {
      setAddingDomain(true)
      await createDomain(token, val)
      setNewDomain('')
      showMessage('success', `Domain "${val}" added`)
      // Reload domains
      const domRes = await fetchDomains(token)
      const domData = domRes.data?.data ?? domRes.data ?? []
      setDomains(Array.isArray(domData) ? domData : [])
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to add domain')
    } finally {
      setAddingDomain(false)
    }
  }

  // Delete domain
  const handleDeleteDomain = async (id: string, name: string) => {
    if (!confirm(`Delete domain "${name}"?`)) return
    try {
      setDeletingId(id)
      await deleteDomain(token, id)
      setDomains(prev => prev.filter(d => d.id !== id))
      showMessage('success', `Domain "${name}" deleted`)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to delete domain')
    } finally {
      setDeletingId(null)
    }
  }

  // Toggle domain is_active
  const handleToggleDomain = async (d: DomainResponse) => {
    try {
      setTogglingId(d.id)
      await updateDomain(token, d.id, { is_active: !d.is_active })
      setDomains(prev => prev.map(item => item.id === d.id ? { ...item, is_active: !d.is_active } : item))
      showMessage('success', `Domain "${d.domain_name}" ${!d.is_active ? 'activated' : 'deactivated'}`)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to update domain')
    } finally {
      setTogglingId(null)
    }
  }

  // Edit domain (domain_name + is_active)
  const handleStartEdit = (d: DomainResponse) => {
    setEditingId(d.id)
    setEditForm({ domain_name: d.domain_name, is_active: d.is_active })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveEdit = async (d: DomainResponse) => {
    const trimmed = editForm.domain_name.trim().toLowerCase()
    if (!trimmed) return
    // Build only changed fields
    const data: { domain_name?: string; is_active?: boolean } = {}
    if (trimmed !== d.domain_name) data.domain_name = trimmed
    if (editForm.is_active !== d.is_active) data.is_active = editForm.is_active
    if (Object.keys(data).length === 0) {
      setEditingId(null)
      return
    }
    try {
      setSavingEdit(true)
      const res = await updateDomain(token, d.id, data)
      const updated = res.data ?? res
      setDomains(prev => prev.map(item => item.id === d.id ? { ...item, ...updated } : item))
      setEditingId(null)
      showMessage('success', 'Domain updated')
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'Failed to update domain')
    } finally {
      setSavingEdit(false)
    }
  }

  // Reset availability when input changes
  const handleSubdomainInputChange = (val: string) => {
    setSubdomainInput(val.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setAvailability(null)
  }

  if (loading) {
    return <div className="domain-page"><div className="loading">Loading...</div></div>
  }

  const baseDomain = subdomainData?.base_domain || 'nerdplatform.com'
  const isSubdomainChanged = subdomainInput.trim() !== (subdomainData?.subdomain || '')
  const maxDomains = 3
  const domainLimitReached = domains.length >= maxDomains

  return (
    <div className="domain-page">
      <h1 className="domain-page-title">Domain Settings</h1>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {/* ===== SUBDOMAIN SECTION ===== */}
      <div className="dm-card">
        <div className="dm-card-header">
          <h2>Subdomain</h2>
          {subdomainData?.is_configured ? (
            <span className="dm-badge dm-badge-active">Configured</span>
          ) : (
            <span className="dm-badge dm-badge-pending">Not configured</span>
          )}
        </div>

        <p className="dm-desc">
          Your storefront URL on the platform. Customers visit this to see your website.
        </p>

        <div className="dm-subdomain-input-row">
          <div className="dm-subdomain-field">
            <input
              type="text"
              placeholder="myshop"
              value={subdomainInput}
              onChange={e => handleSubdomainInputChange(e.target.value)}
              maxLength={63}
              className="dm-input"
            />
            <span className="dm-subdomain-suffix">.{baseDomain}</span>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleCheckAvailability}
            disabled={checkingAvail || !subdomainInput.trim() || subdomainInput.trim().length < 3}
          >
            {checkingAvail ? 'Checking...' : 'Check'}
          </button>
        </div>

        {availability?.checked && (
          <div className={`dm-avail ${availability.available ? 'available' : 'taken'}`}>
            {availability.available
              ? `"${subdomainInput}" is available`
              : `"${subdomainInput}" is already taken`}
          </div>
        )}

        {subdomainData?.is_configured && subdomainData.full_url && (
          <div className="dm-current-url">
            Current URL: <a href={subdomainData.full_url} target="_blank" rel="noopener noreferrer">{subdomainData.full_url}</a>
          </div>
        )}

        <div className="dm-card-actions">
          <button
            className="btn btn-primary"
            onClick={handleSaveSubdomain}
            disabled={savingSubdomain || !isSubdomainChanged || subdomainInput.trim().length < 3}
          >
            {savingSubdomain ? 'Saving...' : 'Save Subdomain'}
          </button>
        </div>
      </div>

      {/* ===== CUSTOM DOMAIN SECTION ===== */}
      <div className="dm-card">
        <div className="dm-card-header">
          <h2>Custom Domains</h2>
          <span className="dm-badge dm-badge-count">{domains.length} / {maxDomains}</span>
        </div>

        <p className="dm-desc">
          Point your own domain to your storefront. Add a CNAME record pointing to <strong>{subdomainData?.subdomain ? `${subdomainData.subdomain}.${baseDomain}` : baseDomain}</strong> in your DNS settings.
        </p>

        {/* Add domain form */}
        {domainLimitReached ? (
          <div className="dm-avail taken">Maximum {maxDomains} custom domains reached.</div>
        ) : (
          <form className="dm-add-form" onSubmit={handleAddDomain}>
            <input
              type="text"
              placeholder="www.example.com"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              className="dm-input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addingDomain || !newDomain.trim()}
            >
              {addingDomain ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
        )}

        {/* Domain list */}
        {domains.length === 0 ? (
          <div className="dm-empty">No custom domains added yet.</div>
        ) : (
          <div className="dm-domain-list">
            {domains.map(d => (
              <div key={d.id} className="dm-domain-item">
                {editingId === d.id ? (
                  /* ---- Edit Mode ---- */
                  <div className="dm-edit-form">
                    <div className="dm-edit-row">
                      <input
                        type="text"
                        value={editForm.domain_name}
                        onChange={e => setEditForm(f => ({ ...f, domain_name: e.target.value }))}
                        className="dm-input dm-input-sm"
                      />
                      <label className="dm-toggle-label">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                        />
                        Active
                      </label>
                    </div>
                    <div className="dm-domain-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSaveEdit(d)}
                        disabled={savingEdit || !editForm.domain_name.trim()}
                      >
                        {savingEdit ? '...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleCancelEdit}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ---- View Mode ---- */
                  <>
                    <div className="dm-domain-info">
                      <span className="dm-domain-name">{d.domain_name}</span>
                      <div className="dm-domain-meta">
                        <span className={`dm-badge ${d.is_active ? 'dm-badge-active' : 'dm-badge-pending'}`}>
                          {d.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="dm-domain-actions">
                      <button
                        className={`btn btn-sm ${d.is_active ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => handleToggleDomain(d)}
                        disabled={togglingId === d.id}
                      >
                        {togglingId === d.id ? '...' : d.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleStartEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteDomain(d.id, d.domain_name)}
                        disabled={deletingId === d.id}
                      >
                        {deletingId === d.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== DNS INSTRUCTIONS ===== */}
      {domains.length > 0 && subdomainData?.is_configured && (
        <div className="dm-card dm-card-info">
          <h3>DNS Setup Instructions</h3>
          <p className="dm-desc">For each custom domain, add the following DNS record at your domain registrar:</p>
          <table className="dm-dns-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <tr key={d.id}>
                  <td><code>CNAME</code></td>
                  <td><code>{d.domain_name}</code></td>
                  <td><code>{subdomainData.subdomain}.{baseDomain}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
