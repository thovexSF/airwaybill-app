import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { PLANS } from '../data/plans'
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
  const { user, orgName } = useAuth()

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
                <span style={{ fontSize: 13, color: '#666' }}>{orgName ?? user.email}</span>
                <LangSwitcher />
                <Link to="/my-awbs" className="lp-btn-primary">{t('landing.nav.goToApp')}</Link>
              </>
            ) : (
              <>
                <Link to="/editor" className="lp-btn-ghost">{t('landing.hero.demo')}</Link>
                <LangSwitcher />
                <Link to="/signup" className="lp-btn-primary">{t('landing.nav.getStarted')}</Link>
              </>
            )}
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
            <Link to="/editor" className="lp-cta-primary">
              {t('landing.hero.cta')}
            </Link>
            <a href="#how" className="lp-cta-ghost">{t('landing.steps.cta')}</a>
          </div>
          <p className="lp-hero-note">No credit card required · 10 free AWBs/month</p>
        </div>

        {/* Mockup */}
        <div className="lp-hero-mockup">
          <div className="lp-mockup-bar">
            <span /><span /><span />
            <div className="lp-mockup-url">airwaybill.app/editor</div>
          </div>
          <div className="lp-mockup-body">
            <div className="lp-mockup-sidebar">
              {['AWB Number', 'Shipper', 'Consignee', 'Routing', 'Charges', 'Rate Items'].map(s => (
                <div key={s} className="lp-mockup-section">{s}</div>
              ))}
            </div>
            <div className="lp-mockup-preview">
              <div className="lp-mockup-pdf">
                <div className="lp-mockup-awb-header">
                  <div className="lp-mockup-awb-num">014 <span>57318306</span></div>
                  <div className="lp-mockup-awb-title">Air Waybill</div>
                </div>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="lp-mockup-awb-row" style={{ width: `${100 - i * 5}%`, opacity: 1 - i * 0.08 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
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

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-label">{t('landing.features.label')}</div>
          <h2 className="lp-section-title">{t('landing.features.title')}</h2>
          <p className="lp-section-sub">{t('landing.features.sub')}</p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
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
            <Link to="/editor" className="lp-cta-primary">{t('landing.steps.cta')}</Link>
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
          <Link to="/editor" className="lp-cta-primary lp-cta-lg">
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
              <Link to="/editor">Editor</Link>
            </div>
            <div>
              <strong>{t('landing.footer.company')}</strong>
              <a href="#">{t('landing.footer.about')}</a>
              <a href="#">{t('landing.footer.contact')}</a>
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
