import React, { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'
import { DOC_TYPES } from '../lib/docTypes'
import { LangSwitcher } from '../components/LangSwitcher'
import '../pages/LandingPage.css'

/** Short pitch per document, shown on the demo picker cards. */
const BLURBS: Record<string, string> = {
  awb:         'The IATA Resolution 600a air waybill, drawn as a real vector form.',
  hawb:        'House air waybill for consolidated shipments.',
  dgd:         'IATA dangerous goods declaration for air shipments.',
  manifest:    'Flight cargo manifest listing every AWB on board.',
  label:       '4×5″ air cargo label with Code 128 barcode and Zebra ZPL output.',
  proforma:    'Proforma invoice with line items and totals.',
  bl:          'House bill of lading for sea freight.',
  bl_manifest: 'Consolidation manifest for house bills of lading.',
  imo_dgd:     'IMO / IMDG multimodal dangerous goods form.',
  neppex:      'SERNAPESCA F15 export notification (Chile).',
  fwb:         'Cargo-IMP FWB freight waybill message.',
  fhl:         'Cargo-IMP FHL house waybill message.',
  ffr:         'Cargo-IMP FFR space allocation request.',
}

export function DemoPickerPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const width = typeof window === 'undefined' ? undefined : window.innerWidth
    posthog?.capture('demo_viewed', {
      demo_step: 'picker',
      path: location.pathname,
      source: searchParams.get('source') ?? 'direct',
      intent: searchParams.get('intent') ?? undefined,
      viewport_width: width,
      is_mobile: width === undefined ? undefined : width < 768,
      doc_count: DOC_TYPES.length,
    })
  }, [posthog, location.pathname, location.search])

  function docDemoPath(docType: string) {
    const params = new URLSearchParams(location.search)
    if (!params.get('source')) params.set('source', 'demo_picker')
    params.set('doc_type', docType)
    const search = params.toString()
    return { pathname: `/demo/${docType}`, search: search ? `?${search}` : '' }
  }

  function trackDocSelected(docType: string) {
    posthog?.capture('demo_doc_selected', {
      doc_type: docType,
      source: searchParams.get('source') ?? 'demo_picker',
      intent: searchParams.get('intent') ?? undefined,
      path: location.pathname,
    })
  }

  return (
    <div className="lp" style={{ minHeight: '100vh', background: '#f7f7f8' }}>
      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="lp-logo">✈ AIRWAYBILL <span>APP</span></div>
          </Link>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-login">{t('landing.nav.signIn')}</Link>
            <Link to="/signup" className="lp-btn-primary">{t('landing.nav.getStarted')}</Link>
            <LangSwitcher variant="light" />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: '#fbeaea', color: '#8b0000', fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, marginBottom: 14 }}>
            {t('demo.modeLabel')}
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>
            {t('demo.pickTitle')}
          </h1>
          <p style={{ fontSize: 15, color: '#666', margin: 0 }}>
            {t('demo.pickSub')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {DOC_TYPES.map(type => (
            <Link
              key={type.type}
              to={docDemoPath(type.type)}
              onClick={() => trackDocSelected(type.type)}
              style={{
                display: 'block', background: '#fff', border: '1px solid #e6e6e6', borderRadius: 10,
                padding: '16px 18px', textDecoration: 'none', transition: 'border-color .15s, transform .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = type.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e6e6e6'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ background: type.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                {type.badge}
              </span>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '10px 0 4px' }}>{type.name}</div>
              <div style={{ fontSize: 13, color: '#777', lineHeight: 1.45 }}>{BLURBS[type.type]}</div>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 34 }}>
          {t('demo.banner')}
        </p>
      </div>
    </div>
  )
}
