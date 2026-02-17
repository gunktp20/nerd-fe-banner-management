import { useState } from 'react'
import TokenPage from './TokenPage'
import BannerPage from './BannerPage'
import BrandingPage from './BrandingPage'
import StorefrontPage from './StorefrontPage'

type Page = 'banners' | 'branding' | 'storefront'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cms_token') || '')
  const [page, setPage] = useState<Page>('banners')

  const handleSetToken = (t: string) => {
    localStorage.setItem('cms_token', t)
    setToken(t)
  }

  const handleLogout = () => {
    localStorage.removeItem('cms_token')
    setToken('')
  }

  if (!token) {
    return <TokenPage onSubmit={handleSetToken} />
  }

  return (
    <div>
      <nav className="top-nav">
        <div className="nav-inner">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${page === 'banners' ? 'active' : ''}`}
              onClick={() => setPage('banners')}
            >
              Banner Management
            </button>
            <button
              className={`nav-tab ${page === 'branding' ? 'active' : ''}`}
              onClick={() => setPage('branding')}
            >
              Branding
            </button>
            <button
              className={`nav-tab ${page === 'storefront' ? 'active' : ''}`}
              onClick={() => setPage('storefront')}
            >
              Storefront Preview
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <div className="page-content">
        {page === 'banners' && <BannerPage token={token} onLogout={handleLogout} />}
        {page === 'branding' && <BrandingPage token={token} onLogout={handleLogout} />}
        {page === 'storefront' && <StorefrontPage />}
      </div>
    </div>
  )
}
