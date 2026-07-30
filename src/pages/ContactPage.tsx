import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { LangSwitcher } from '../components/LangSwitcher'

export function ContactPage() {
  const { t, i18n } = useTranslation()
  const posthog = usePostHog()

  const mailHref = React.useMemo(() => {
    const subject = encodeURIComponent(String(t('contact.subject')))
    const body = encodeURIComponent(String(t('contact.body')))
    return `mailto:support@airwaybill.app?subject=${subject}&body=${body}`
  }, [t, i18n.language])

  React.useEffect(() => {
    posthog?.capture('contact_page_viewed', { language: i18n.language })
  }, [posthog, i18n.language])

  function trackEmailClick() {
    posthog?.capture('contact_email_clicked', { language: i18n.language })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a1a' }}>
      <header style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <Link to="/" style={{ color: '#8b0000', fontWeight: 800, textDecoration: 'none', letterSpacing: '-0.4px' }}>
          AIRWAYBILL <span style={{ color: '#1a1a1a' }}>APP</span>
        </Link>
        <LangSwitcher variant="light" />
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px 80px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', color: '#8b0000', fontSize: 12, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 16 }}>
              {t('contact.label')}
            </div>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 54px)', lineHeight: 1.05, margin: '0 0 18px', letterSpacing: '-1.4px' }}>
              {t('contact.title')}
            </h1>
            <p style={{ fontSize: 18, color: '#555', lineHeight: 1.6, margin: '0 0 28px' }}>
              {t('contact.sub')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <a
                href={mailHref}
                onClick={trackEmailClick}
                style={{ background: '#8b0000', color: '#fff', borderRadius: 8, padding: '12px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}
              >
                {t('contact.emailCta')}
              </a>
              <Link to="/demo" style={{ background: '#fff', color: '#8b0000', border: '1px solid #e2e2e2', borderRadius: 8, padding: '12px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                {t('contact.demoCta')}
              </Link>
            </div>
          </div>

          <aside style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 16, padding: 28, boxShadow: '0 16px 40px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 22, lineHeight: 1.2, margin: '0 0 12px' }}>{t('contact.salesTitle')}</h2>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 18px' }}>{t('contact.salesSub')}</p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.55, margin: '0 0 22px', background: '#f8f6f2', borderRadius: 10, padding: 14 }}>
              {t('contact.responseNote')}
            </p>
            <Link to="/signup" style={{ display: 'block', textAlign: 'center', background: '#1a1a1a', color: '#fff', borderRadius: 8, padding: '12px 18px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              {t('contact.signupCta')}
            </Link>
          </aside>
        </section>
      </main>
    </div>
  )
}
