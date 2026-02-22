import { useState } from 'react'
import CmsPage from './CmsPage'

export default function App() {
  const [token, setToken] = useState<string>(() => sessionStorage.getItem('cms_token') || '')
  const [inputToken, setInputToken] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const t = inputToken.trim()
    if (!t) return
    sessionStorage.setItem('cms_token', t)
    setToken(t)
    setInputToken('')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('cms_token')
    setToken('')
  }

  if (!token) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>CMS Management</h1>
          <p>กรุณาใส่ Access Token เพื่อเข้าใช้งาน</p>
          <input
            className="login-input"
            type="password"
            placeholder="Access Token"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            autoFocus
          />
          <button className="login-btn" type="submit" disabled={!inputToken.trim()}>
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    )
  }

  return <CmsPage token={token} onLogout={handleLogout} />
}
