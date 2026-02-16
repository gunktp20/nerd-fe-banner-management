import { useState, useEffect, useCallback } from 'react'
import { fetchStorefront } from './api'

interface StorefrontBanner {
  desktop_image_url: string
  mobile_image_url: string | null
  title: string | null
  description: string | null
  link_url: string | null
}

interface StorefrontSection {
  image_url: string
  title: string | null
  description: string | null
  link_url: string | null
}

interface StorefrontData {
  business_profile_id: string
  logo: { image_url: string; company_name: string | null } | null
  favicon: { image_url: string } | null
  banners: StorefrontBanner[]
  sections: StorefrontSection[]
  footer: {
    description: string | null
    phone: string | null
    email: string | null
    address: string | null
    facebook_url: string | null
    line_url: string | null
    instagram_url: string | null
    twitter_url: string | null
    tiktok_url: string | null
    youtube_url: string | null
    website_url: string | null
  } | null
  theme: {
    primary_color: string | null
    secondary_color: string | null
    font_family: string | null
  } | null
  seo: {
    title: string
    description: string | null
    image_url: string
  } | null
}

export default function StorefrontPage() {
  const [inputDomain, setInputDomain] = useState(() => localStorage.getItem('cms_domain') || '')
  const [domain, setDomain] = useState('')
  const [data, setData] = useState<StorefrontData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentBanner, setCurrentBanner] = useState(0)

  const resolveDomain = (input: string): string => {
    const d = input.trim()
    if (!d) return ''
    return d.includes('.') ? d : `${d}.nerdplatform.com`
  }

  const load = useCallback(async (d: string) => {
    if (!d) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetchStorefront(d)
      if (res.business_profile_id) {
        setData(res)
      } else {
        setError(res.message || 'Storefront not found for this domain')
      }
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (domain) {
      load(domain)
    }
  }, [domain, load])

  // Auto-load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('cms_domain')
    if (saved) {
      setDomain(resolveDomain(saved))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-rotate banners
  useEffect(() => {
    if (!data?.banners.length || data.banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % data.banners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [data?.banners.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const d = inputDomain.trim()
    if (d) {
      localStorage.setItem('cms_domain', d)
      setDomain(resolveDomain(d))
      setCurrentBanner(0)
    }
  }

  const themeStyle = data?.theme
    ? ({
        '--sf-primary': data.theme.primary_color || '#4F46E5',
        '--sf-secondary': data.theme.secondary_color || '#6B7280',
        '--sf-font': data.theme.font_family || 'inherit',
      } as React.CSSProperties)
    : ({
        '--sf-primary': '#4F46E5',
        '--sf-secondary': '#6B7280',
        '--sf-font': 'inherit',
      } as React.CSSProperties)

  return (
    <div className="storefront-page">
      {/* Domain input */}
      <form className="domain-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter subdomain name (e.g. myshop) or full domain"
          value={inputDomain}
          onChange={e => setInputDomain(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !inputDomain.trim()}>
          {loading ? 'Loading...' : 'Load'}
        </button>
      </form>

      {error && <div className="message error">{error}</div>}

      {!data && !loading && !error && (
        <div className="empty-state">
          <p>Enter a domain or subdomain to preview the storefront</p>
        </div>
      )}

      {data && (
        <div className="sf-preview" style={themeStyle}>
          {/* Header */}
          <header className="sf-header">
            <div className="sf-header-inner">
              {data.logo ? (
                <div className="sf-logo">
                  {data.logo.image_url && <img src={data.logo.image_url} alt="Logo" />}
                  {data.logo.company_name && <span>{data.logo.company_name}</span>}
                </div>
              ) : (
                <div className="sf-logo">
                  <span>Storefront</span>
                </div>
              )}
            </div>
          </header>

          {/* Banners */}
          {data.banners.length > 0 && (
            <section className="sf-banners">
              <div className="sf-banner-slide">
                {data.banners[currentBanner]?.link_url ? (
                  <a
                    href={data.banners[currentBanner].link_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={data.banners[currentBanner].desktop_image_url}
                      alt={data.banners[currentBanner].title || `Banner ${currentBanner + 1}`}
                    />
                  </a>
                ) : (
                  <img
                    src={data.banners[currentBanner].desktop_image_url}
                    alt={data.banners[currentBanner].title || `Banner ${currentBanner + 1}`}
                  />
                )}
              </div>
              {data.banners.length > 1 && (
                <div className="sf-banner-dots">
                  {data.banners.map((_, i) => (
                    <button
                      key={i}
                      className={`sf-dot ${i === currentBanner ? 'active' : ''}`}
                      onClick={() => setCurrentBanner(i)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Sections */}
          {data.sections.length > 0 && (
            <section className="sf-sections">
              {data.sections.map((section, i) => (
                <div key={i} className="sf-section-card">
                  <img src={section.image_url} alt={section.title || `Section ${i + 1}`} />
                  {(section.title || section.description) && (
                    <div className="sf-section-info">
                      {section.title && <h3>{section.title}</h3>}
                      {section.description && <p>{section.description}</p>}
                      {section.link_url && (
                        <a href={section.link_url} target="_blank" rel="noopener noreferrer">
                          Learn more
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Footer */}
          {data.footer && (
            <footer className="sf-footer">
              <div className="sf-footer-inner">
                {data.footer.description && (
                  <p className="sf-footer-desc">{data.footer.description}</p>
                )}
                <div className="sf-footer-contact">
                  {data.footer.phone && <span>Tel: {data.footer.phone}</span>}
                  {data.footer.email && <span>Email: {data.footer.email}</span>}
                  {data.footer.address && <span>{data.footer.address}</span>}
                </div>
                <div className="sf-footer-social">
                  {data.footer.facebook_url && (
                    <a href={data.footer.facebook_url} target="_blank" rel="noopener noreferrer">
                      Facebook
                    </a>
                  )}
                  {data.footer.instagram_url && (
                    <a href={data.footer.instagram_url} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  )}
                  {data.footer.line_url && (
                    <a href={data.footer.line_url} target="_blank" rel="noopener noreferrer">
                      LINE
                    </a>
                  )}
                  {data.footer.twitter_url && (
                    <a href={data.footer.twitter_url} target="_blank" rel="noopener noreferrer">
                      Twitter
                    </a>
                  )}
                  {data.footer.tiktok_url && (
                    <a href={data.footer.tiktok_url} target="_blank" rel="noopener noreferrer">
                      TikTok
                    </a>
                  )}
                  {data.footer.youtube_url && (
                    <a href={data.footer.youtube_url} target="_blank" rel="noopener noreferrer">
                      YouTube
                    </a>
                  )}
                  {data.footer.website_url && (
                    <a href={data.footer.website_url} target="_blank" rel="noopener noreferrer">
                      Website
                    </a>
                  )}
                </div>
              </div>
            </footer>
          )}
        </div>
      )}
    </div>
  )
}
