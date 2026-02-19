import { useState } from 'react'
import TokenPage from './TokenPage'
import BannerPage from './BannerPage'
import BannerFooterPage from './BannerFooterPage'
import BrandingPage from './BrandingPage'
import DomainPage from './DomainPage'
import CustomDomainPage from './CustomDomainPage'
import StorefrontPage from './StorefrontPage'
import CmsEditorPage from './CmsEditorPage'

type Page = 'cms-editor' | 'banners' | 'banner-footer' | 'branding' | 'domains' | 'custom-domains' | 'storefront'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cms_token') || '')
  const [page, setPage] = useState<Page>('cms-editor')

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
              className={`nav-tab ${page === 'cms-editor' ? 'active' : ''}`}
              onClick={() => setPage('cms-editor')}
            >
              CMS Editor
            </button>
            <button
              className={`nav-tab ${page === 'banners' ? 'active' : ''}`}
              onClick={() => setPage('banners')}
            >
              Banner Management
            </button>
            <button
              className={`nav-tab ${page === 'banner-footer' ? 'active' : ''}`}
              onClick={() => setPage('banner-footer')}
            >
              Banner Footer
            </button>
            <button
              className={`nav-tab ${page === 'branding' ? 'active' : ''}`}
              onClick={() => setPage('branding')}
            >
              Branding
            </button>
            <button
              className={`nav-tab ${page === 'domains' ? 'active' : ''}`}
              onClick={() => setPage('domains')}
            >
              Domains
            </button>
            <button
              className={`nav-tab ${page === 'custom-domains' ? 'active' : ''}`}
              onClick={() => setPage('custom-domains')}
            >
              Custom Domain
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
        {page === 'cms-editor' && <CmsEditorPage token={token} onLogout={handleLogout} />}
        {page === 'banners' && <BannerPage token={token} onLogout={handleLogout} />}
        {page === 'banner-footer' && <BannerFooterPage token={token} onLogout={handleLogout} />}
        {page === 'branding' && <BrandingPage token={token} onLogout={handleLogout} />}
        {page === 'domains' && <DomainPage token={token} onLogout={handleLogout} />}
        {page === 'custom-domains' && <CustomDomainPage token={token} onLogout={handleLogout} />}
        {page === 'storefront' && <StorefrontPage />}
      </div>
    </div>
  )
}
