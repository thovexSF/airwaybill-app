import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { PLANS } from '../data/plans'
import { exampleAWB } from '../data/example'
import { airlineLogoSrc } from '../lib/airlines'
import { awbCopyTheme } from '../pdf/awbCopyTheme'
import { getFieldDefs, LEADING, PAGE_HEIGHT, PAGE_WIDTH } from '../pdf/awbLayout'
import type { AWBData } from '../types/awb'
import './LandingPage.css'
import { LangSwitcher } from '../components/LangSwitcher'

const FEATURES = [
  {
    icon: '📄',
    title: 'IATA-Compliant PDFs',
    desc: 'Generate Air Waybills that meet IATA Resolution 600a standards. Accepted by airlines and freight forwarders worldwide.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Preview',
    desc: 'See your AWB update live as you type. No more blind editing — what you see is exactly what prints.',
  },
  {
    icon: '☁️',
    title: 'Cloud-Based',
    desc: 'Access your AWBs from any device, anywhere. No software to install, no updates to manage.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    desc: 'Your shipment data stays yours. Enterprise-grade encryption, SOC 2 compliant infrastructure.',
  },
  {
    icon: '📦',
    title: 'All Document Types',
    desc: 'AWB, House AWB, Dangerous Goods Declaration, Cargo Labels, and Flight Manifests — all in one place.',
  },
  {
    icon: '✅',
    title: 'IATA Check Digit Validation',
    desc: 'Automatic AWB number validation prevents costly errors before they reach the airline.',
  },
]

const STEPS = [
  { num: '01', title: 'Fill the form', desc: 'Enter shipper, consignee, routing, and cargo details in our structured form.' },
  { num: '02', title: 'Preview live', desc: 'See the AWB render in real time — exactly as it will look when printed or sent.' },
  { num: '03', title: 'Download & send', desc: 'Export a print-ready PDF. Share directly with airlines, agents, or customs.' },
]


export function LandingPage() {
  const { t } = useTranslation()
  const { user, orgName, logout } = useAuth()
  const tryPath = user ? '/my-awbs' : '/demo'

  return (
    <div className="lp">

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">✈ AIRWAYBILL <span>APP</span></div>
          <div className="lp-nav-links">
            <a href="#features">{t('landing.nav.features')}</a>
            <a href="#pricing">{t('landing.nav.pricing')}</a>
            <a href="#how">{t('landing.nav.howItWorks')}</a>
          </div>
          <div className="lp-nav-actions">
            {user ? (
              <>
                <Link to="/my-awbs" className="lp-btn-primary">{t('landing.nav.goToApp')}</Link>
                <span style={{ fontSize: 13, color: '#555' }}>{orgName ?? user.email}</span>
                <button onClick={logout} style={{ background: 'none', border: 'none', fontSize: 13, color: '#333', fontWeight: 700, cursor: 'pointer', padding: '6px 0' }}>{t('common.signOut')}</button>
              </>
            ) : (
              <>
                <Link to="/demo" className="lp-btn-ghost">{t('landing.hero.demo')}</Link>
                <Link to="/login" className="lp-btn-login">{t('landing.nav.signIn')}</Link>
                <Link to="/signup" className="lp-btn-primary">{t('landing.nav.getStarted')}</Link>
              </>
            )}
            <LangSwitcher variant="light" />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-badge">{t('landing.hero.badge')}</div>
          <h1 className="lp-headline">
            {t('landing.hero.title')}
          </h1>
          <p className="lp-subheadline">
            {t('landing.hero.subtitle')}
          </p>
          <div className="lp-hero-ctas">
            <Link to={tryPath} className="lp-cta-primary">
              {t('landing.hero.cta')}
            </Link>
            <a href="#how" className="lp-cta-ghost">{t('landing.steps.cta')}</a>
          </div>
          <p className="lp-hero-note">{t('landing.hero.note')}</p>
        </div>

        {/* Mockup — the public demo editor, with the example shipment on the real sheet */}
        <Link to={tryPath} className="lp-hero-mockup" aria-label={t('landing.hero.cta')}>
          <div className="lp-mockup-bar">
            <span /><span /><span />
            <div className="lp-mockup-url">airwaybill.app/demo/awb</div>
          </div>
          <LandingEditorMock />
        </Link>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="lp-proof">
        <p>Trusted by freight forwarders in</p>
        <div className="lp-proof-flags">
          {['🇨🇱 Chile', '🇺🇸 USA', '🇧🇷 Brazil', '🇪🇸 Spain', '🇩🇪 Germany', '🇨🇭 Switzerland'].map(c => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </section>

      {/* ── eAWB ── */}
      <section className="lp-eawb">
        <div className="lp-eawb-inner">
          <div>
            <h2>{t('eawbPromo.title')}</h2>
            <p>{t('eawbPromo.sub')}</p>
          </div>
          <Link to={user ? '/eawb-agreement' : '/signup'} className="lp-cta-primary">{t('eawbPromo.button')}</Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">{t('landing.features.label')}</div>
          <h2 className="lp-section-title">{t('landing.features.title')}</h2>
          <p className="lp-section-sub">{t('landing.features.sub')}</p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <Link key={f.title} to={tryPath} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how" id="how">
        <div className="lp-section-inner">
          <div className="lp-section-label">{t('landing.steps.label')}</div>
          <h2 className="lp-section-title">{t('landing.steps.title')}</h2>
          <div className="lp-steps">
            {STEPS.map(step => (
              <div key={step.num} className="lp-step">
                <div className="lp-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-how-cta">
            <Link to={tryPath} className="lp-cta-primary">{t('landing.steps.cta')}</Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-label">{t('landing.pricing.label')}</div>
          <h2 className="lp-section-title">{t('landing.pricing.title')}</h2>
          <p className="lp-section-sub">{t('landing.pricing.sub')}</p>
          <div className="lp-plans">
            {PLANS.map(plan => (
              <div key={plan.name} className={`lp-plan ${plan.highlight ? 'lp-plan-highlight' : ''}`}>
                {plan.highlight && <div className="lp-plan-badge">Most Popular</div>}
                <div className="lp-plan-name">{plan.name}</div>
                <div className="lp-plan-price">
                  {plan.priceDisplay}
                  {plan.period && <span>/{plan.period}</span>}
                </div>
                <div className="lp-plan-desc">{plan.description}</div>
                <ul className="lp-plan-features">
                  {plan.features.map(f => (
                    <li key={f}><span>✓</span> {f}</li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaLink ?? '/pricing'}
                  className={`lp-plan-cta ${plan.highlight ? 'lp-plan-cta-primary' : 'lp-plan-cta-ghost'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <h2>{t('landing.finalCta.title')}</h2>
          <p>{t('landing.finalCta.sub')}</p>
          <Link to={tryPath} className="lp-cta-primary lp-cta-lg">
            {t('landing.finalCta.cta')}
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <div className="lp-logo">✈ AIRWAYBILL <span>APP</span></div>
            <p>Professional Air Waybill generation for modern freight forwarders.</p>
          </div>
          <div className="lp-footer-links">
            <div>
              <strong>{t('landing.footer.product')}</strong>
              <a href="#features">{t('landing.nav.features')}</a>
              <a href="#pricing">{t('landing.nav.pricing')}</a>
              <Link to={tryPath}>Editor</Link>
            </div>
            <div>
              <strong>{t('landing.footer.company')}</strong>
              <Link to="/">{t('landing.footer.about')}</Link>
              <a href="mailto:support@airwaybill.app">{t('landing.footer.contact')}</a>
            </div>
            <div>
              <strong>{t('landing.footer.legal')}</strong>
              <Link to="/privacy">{t('landing.footer.privacy')}</Link>
              <Link to="/terms">{t('landing.footer.terms')}</Link>
              <Link to="/refunds">{t('landing.footer.refunds')}</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>{t('landing.footer.copyright')}</span>
          <span>Built for IATA Resolution 600a compliance</span>
        </div>
      </footer>
    </div>
  )
}

/** Same mapping the PDF uses, trimmed to what the example shipment prints. */
function mockFieldValue(data: AWBData, key: string): string {
  const rate = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rate) {
    const item = data.rateItems[Number(rate[1])]
    if (!item) return ''
    const value = String(item[rate[2] as keyof typeof item] ?? '')
    if (rate[2] === 'grossWeight' && value) return `${value} ${(item.weightUnit || 'K').charAt(0)}`
    return value
  }
  const charge = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (charge) {
    const item = data.otherCharges[Number(charge[1])]
    return item ? String(item[charge[2] as keyof typeof item] ?? '') : ''
  }
  if (key === 'awbNumberLeft') return `${data.awbPrefix} ${data.awbAirportCode} ${data.awbSerial}`
  if (key === 'awbNumberTop' || key === 'awbNumberBottom') return `${data.awbPrefix}-${data.awbSerial}`
  if (key === 'wtValPPD' || key === 'wtValCOLL' || key === 'otherPPD' || key === 'otherCOLL') {
    return data[key] ? 'X' : ''
  }
  if (key === 'ratePiecesTotal') {
    const total = data.rateItems.reduce((s, r) => s + (Number(r.pieces) || 0), 0)
    return total ? String(total) : ''
  }
  if (key === 'rateGrossTotal') {
    const total = data.rateItems.reduce((s, r) => s + (Number(String(r.grossWeight).replace(',', '.')) || 0), 0)
    return total ? `${total.toFixed(1)} K` : ''
  }
  if (key === 'rateGrandTotal') {
    const total = data.rateItems.reduce((s, r) => s + (Number(String(r.total).replace(',', '.')) || 0), 0)
    return total ? total.toFixed(2) : ''
  }
  const v = (data as unknown as Record<string, unknown>)[key]
  if (v == null || typeof v === 'object') return ''
  return String(v)
}

function LandingEditorMock() {
  const { t } = useTranslation()
  const data = exampleAWB
  const theme = awbCopyTheme(data.copyNumber)
  const logo = airlineLogoSrc(data.awbPrefix)
  const fields = getFieldDefs(data.rateItems.length, data.otherCharges.length)

  return (
    <div className="lp-mock-app">
      <div className="lp-mock-banner">
        <span>{t('demo.banner')}</span>
        <span className="lp-mock-banner-cta">{t('demo.signupCta')} →</span>
      </div>
      <div className="lp-mock-topbar">
        <span className="lp-mock-back">← All documents</span>
        <span className="lp-mock-brand">
          <span className="lp-mock-logo">✈ AIRWAYBILL APP</span>
          <span className="lp-mock-sub">{t('demo.sub')}</span>
        </span>
        <span className="lp-mock-grow" />
        <span className="lp-mock-mode">{t('demo.modeLabel')}</span>
        <span className="lp-mock-ghost">{t('landing.nav.signIn')}</span>
      </div>
      <div className="lp-mock-actions">
        <span className="lp-mock-ghost">{t('editor.example')}</span>
        <span className="lp-mock-grow" />
        <span className="lp-mock-ghost">🖨 {t('editor.copies')}</span>
        <span className="lp-mock-download">{t('demo.downloadCta')}</span>
      </div>
      <div className="lp-mock-preview">
        <div className="lp-mock-zoom">
          <span className="lp-mock-zoom-btn">−</span>
          <span className="lp-mock-zoom-pct">100%</span>
          <span className="lp-mock-zoom-btn">+</span>
          <span className="lp-mock-editing">✎ Editing on PDF</span>
        </div>
        <div className="lp-mock-canvas">
          <div className="lp-mock-sheet">
            <img className="lp-mock-sheet-bg" src={theme.bg} alt="" />
            {logo && <img className="lp-mock-airline" src={logo} alt="" />}
            <div className="lp-mock-draft" style={{ color: theme.ink }}>DRAFT</div>
            {fields.map((def) => {
              const value = mockFieldValue(data, def.key)
              if (!value) return null
              return (
                <div
                  key={def.key}
                  className="lp-mock-field"
                  style={{
                    left: `${(def.x / PAGE_WIDTH) * 100}%`,
                    top: `${(def.y / PAGE_HEIGHT) * 100}%`,
                    width: `${(def.width / PAGE_WIDTH) * 100}%`,
                    height: `${(def.height / PAGE_HEIGHT) * 100}%`,
                    fontSize: `${(def.fontSize / PAGE_WIDTH) * 100}cqi`,
                    lineHeight: `${(LEADING / PAGE_WIDTH) * 100}cqi`,
                    textAlign: def.align ?? 'left',
                  }}
                >
                  {value}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
