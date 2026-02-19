import { useState, useEffect, useCallback } from 'react'
import {
  fetchSubdomain,
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

const MAX_DOMAINS = 3

type View = 'list' | 'add' | 'edit'

export default function CustomDomainPage({ token, onLogout }: Props) {
  const [view, setView] = useState<View>('list')
  const [subdomainData, setSubdomainData] = useState<SubdomainResponse | null>(null)
  const [domains, setDomains] = useState<DomainResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Edit state
  const [editingDomain, setEditingDomain] = useState<DomainResponse | null>(null)
  const [editForm, setEditForm] = useState({ domain_name: '', is_active: true })
  const [saving, setSaving] = useState(false)

  // Add state
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)

  // Action state
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const loadDomains = useCallback(async () => {
    try {
      setLoading(true)
      const [subRes, domRes] = await Promise.all([
        fetchSubdomain(token),
        fetchDomains(token),
      ])
      setSubdomainData(subRes.data ?? subRes)
      const data = domRes.data?.data ?? domRes.data ?? []
      setDomains(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'ไม่สามารถโหลดข้อมูลโดเมนได้')
    } finally {
      setLoading(false)
    }
  }, [token, onLogout])

  useEffect(() => {
    loadDomains()
  }, [loadDomains])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const baseDomain = subdomainData?.base_domain || 'nerdplatform.com'

  // ========== Handlers ==========

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = newDomain.trim().toLowerCase()
    if (!val) return
    try {
      setAdding(true)
      await createDomain(token, val)
      setNewDomain('')
      showMessage('success', `เพิ่มโดเมน "${val}" สำเร็จ`)
      await loadDomains()
      setView('list')
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'ไม่สามารถเพิ่มโดเมนได้')
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (d: DomainResponse) => {
    try {
      setTogglingId(d.id)
      await updateDomain(token, d.id, { is_active: !d.is_active })
      setDomains(prev => prev.map(item => item.id === d.id ? { ...item, is_active: !d.is_active } : item))
      showMessage('success', `${d.domain_name} ${!d.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}แล้ว`)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'ไม่สามารถอัพเดทสถานะได้')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (d: DomainResponse) => {
    if (!confirm(`ต้องการลบโดเมน "${d.domain_name}" ใช่หรือไม่?`)) return
    try {
      setDeletingId(d.id)
      await deleteDomain(token, d.id)
      setDomains(prev => prev.filter(item => item.id !== d.id))
      showMessage('success', `ลบโดเมน "${d.domain_name}" แล้ว`)
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'ไม่สามารถลบโดเมนได้')
    } finally {
      setDeletingId(null)
    }
  }

  const handleGoEdit = (d: DomainResponse) => {
    setEditingDomain(d)
    setEditForm({ domain_name: d.domain_name, is_active: d.is_active })
    setView('edit')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDomain) return
    const trimmed = editForm.domain_name.trim().toLowerCase()
    if (!trimmed) return
    const data: { domain_name?: string; is_active?: boolean } = {}
    if (trimmed !== editingDomain.domain_name) data.domain_name = trimmed
    if (editForm.is_active !== editingDomain.is_active) data.is_active = editForm.is_active
    if (Object.keys(data).length === 0) {
      setView('list')
      return
    }
    try {
      setSaving(true)
      const res = await updateDomain(token, editingDomain.id, data)
      const updated = res.data ?? res
      setDomains(prev => prev.map(item => item.id === editingDomain.id ? { ...item, ...updated } : item))
      showMessage('success', 'แก้ไขโดเมนสำเร็จ')
      setView('list')
    } catch (err) {
      if (err instanceof Error && err.message === 'unauthorized') {
        onLogout()
        return
      }
      showMessage('error', 'ไม่สามารถแก้ไขโดเมนได้')
    } finally {
      setSaving(false)
    }
  }

  // ========== DNS Note Component ==========
  const DnsNote = () => {
    if (subdomainData?.is_configured) {
      return (
        <div className="cdm-note cdm-note-info">
          <strong>วิธีเชื่อมต่อ:</strong> เข้าไปที่เว็บไซต์ผู้ให้บริการโดเมนของคุณ (เช่น GoDaddy, Namecheap) แล้วเพิ่ม CNAME record ให้ชี้มาที่ <code>{subdomainData.subdomain}.{baseDomain}</code>
        </div>
      )
    }
    if (domains.length > 0) {
      return (
        <div className="cdm-note cdm-note-warn">
          <strong>Custom Domain ใช้งานไม่ได้ชั่วคราว:</strong> คุณยังไม่มีที่อยู่ร้านค้า (Subdomain) — Custom Domain ที่เพิ่มไว้จะยังเชื่อมต่อไม่ได้จนกว่าจะไปตั้งค่าที่หน้า <strong>"Domains"</strong> ก่อน
        </div>
      )
    }
    return (
      <div className="cdm-note cdm-note-warn">
        <strong>ยังใช้งานไม่ได้:</strong> คุณต้องตั้งค่าที่อยู่ร้านค้า (Subdomain) ก่อน — ไปที่หน้า <strong>"Domains"</strong> เพื่อตั้งค่า จากนั้นค่อยกลับมาเพิ่ม Custom Domain ที่นี่
      </div>
    )
  }

  // ========== Loading ==========
  if (loading) {
    return <div className="cdm-page"><div className="loading">กำลังโหลด...</div></div>
  }

  const limitReached = domains.length >= MAX_DOMAINS
  const activeCount = domains.filter(d => d.is_active).length
  const inactiveCount = domains.filter(d => !d.is_active).length

  // ========== VIEW: ADD ==========
  if (view === 'add') {
    return (
      <div className="cdm-page">
        <div className="cdm-view-header">
          <button className="btn btn-outline btn-sm" onClick={() => { setView('list'); setNewDomain('') }}>
            &larr; กลับ
          </button>
          <h1 className="cdm-title">เพิ่ม Custom Domain</h1>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <DnsNote />

        <div className="cdm-form-card">
          <form onSubmit={handleAdd}>
            <label className="cdm-form-label">ชื่อโดเมน</label>
            <input
              type="text"
              placeholder="เช่น www.myshop.com"
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              className="dm-input cdm-form-input"
              autoFocus
            />
            <p className="cdm-form-hint">กรอกโดเมนที่คุณต้องการเชื่อมต่อกับหน้าร้านค้า</p>
            <div className="cdm-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={adding || !newDomain.trim()}
              >
                {adding ? 'กำลังเพิ่ม...' : 'เพิ่มโดเมน'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setView('list'); setNewDomain('') }}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ========== VIEW: EDIT ==========
  if (view === 'edit' && editingDomain) {
    return (
      <div className="cdm-page">
        <div className="cdm-view-header">
          <button className="btn btn-outline btn-sm" onClick={() => setView('list')}>
            &larr; กลับ
          </button>
          <h1 className="cdm-title">แก้ไข Custom Domain</h1>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <div className="cdm-form-card">
          <form onSubmit={handleSaveEdit}>
            <label className="cdm-form-label">ชื่อโดเมน</label>
            <input
              type="text"
              value={editForm.domain_name}
              onChange={e => setEditForm(f => ({ ...f, domain_name: e.target.value }))}
              className="dm-input cdm-form-input"
              autoFocus
            />

            <label className="cdm-form-label cdm-form-label-gap">สถานะ</label>
            <label className="cdm-checkbox-label">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <span>{editForm.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
            </label>

            <div className="cdm-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !editForm.domain_name.trim()}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setView('list')}
                disabled={saving}
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ========== VIEW: LIST (default) ==========
  return (
    <div className="cdm-page">
      <div className="cdm-header">
        <div>
          <h1 className="cdm-title">จัดการ Custom Domain</h1>
          <p className="cdm-subtitle">เพิ่มโดเมนของคุณเองเพื่อเชื่อมต่อกับหน้าร้านค้า (สูงสุด {MAX_DOMAINS} โดเมน)</p>
        </div>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {/* Stats — ด้านบน */}
      <div className="cdm-summary-grid cdm-summary-top">
        <div className="cdm-summary-item">
          <span className="cdm-summary-label">ทั้งหมด</span>
          <span className="cdm-summary-value">{domains.length} / {MAX_DOMAINS}</span>
        </div>
        <div className="cdm-summary-item">
          <span className="cdm-summary-label">เปิดใช้งาน</span>
          <span className="cdm-summary-value cdm-text-green">{activeCount}</span>
        </div>
        <div className="cdm-summary-item">
          <span className="cdm-summary-label">ปิดใช้งาน</span>
          <span className="cdm-summary-value cdm-text-gray">{inactiveCount}</span>
        </div>
        <div className="cdm-summary-item">
          <span className="cdm-summary-label">เหลือ</span>
          <span className="cdm-summary-value">{MAX_DOMAINS - domains.length}</span>
        </div>
      </div>

      <DnsNote />

      {/* Add button */}
      <div className="cdm-toolbar">
        {limitReached ? (
          <span className="cdm-limit-msg">ถึงจำนวนสูงสุด {MAX_DOMAINS} โดเมนแล้ว</span>
        ) : (
          <button className="btn btn-primary" onClick={() => setView('add')}>
            + เพิ่มโดเมน
          </button>
        )}
      </div>

      {/* Table */}
      {domains.length === 0 ? (
        <div className="cdm-empty">
          <p>ยังไม่มี Custom Domain</p>
          <p className="cdm-empty-sub">กด "เพิ่มโดเมน" เพื่อเริ่มต้นใช้งาน</p>
        </div>
      ) : (
        <div className="cdm-table-wrap">
          <table className="cdm-table">
            <thead>
              <tr>
                <th>โดเมน</th>
                <th>สถานะ</th>
                <th>วันที่เพิ่ม</th>
                <th>อัพเดทล่าสุด</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {domains.map(d => (
                <tr key={d.id} className={!d.is_active ? 'cdm-row-inactive' : ''}>
                  <td>
                    <span className="cdm-domain-text">{d.domain_name}</span>
                  </td>
                  <td>
                    <span className={`dm-badge ${d.is_active ? 'dm-badge-active' : 'dm-badge-pending'}`}>
                      {d.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="cdm-date">{formatDate(d.created_at)}</td>
                  <td className="cdm-date">{formatDate(d.updated_at)}</td>
                  <td>
                    <div className="cdm-actions">
                      <button
                        className={`btn btn-sm ${d.is_active ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => handleToggle(d)}
                        disabled={togglingId === d.id}
                      >
                        {togglingId === d.id ? '...' : d.is_active ? 'ปิด' : 'เปิด'}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleGoEdit(d)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(d)}
                        disabled={deletingId === d.id}
                      >
                        {deletingId === d.id ? '...' : 'ลบ'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
