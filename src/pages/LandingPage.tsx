import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { PLANS } from '../data/plans'
import './LandingPage.css'
import { LangSwitcher } from '../components/LangSwitcher'

const FEATURE_KEYS = [
  { key: 'iataPdf', icon: '📄' },
  { key: 'preview', icon: '⚡' },
  { key: 'cloud', icon: '☁️' },
  { key: 'security', icon: '🔒' },
  { key: 'documents', icon: '📦' },
  { key: 'validation', icon: '✅' },
] as const

const STEP_KEYS = ['fill', 'preview', 'download'] as const
const MOCKUP_SECTION_KEYS = ['awbNumber', 'shipper', 'consignee', 'routing', 'charges', 'rateItems'] as const
const PROOF_COUNTRY_KEYS = ['chile', 'usa', 'brazil', 'spain', 'germany', 'switzerland'] as const


export function LandingPage() {
  const { t } = useTranslation()
  const { user, orgName, logout } = useAuth()
  const tryPath = user ? '/editor' : '/demo'

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
                <Link to={tryPath} className="lp-btn-ghost">{t('landing.hero.demo')}</Link>
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

        {/* Mockup — clickable, opens demo editor */}
        <Link to={tryPath} className="lp-hero-mockup" aria-label={t('landing.hero.cta')}>
          <div className="lp-mockup-bar">
            <span /><span /><span />
            <div className="lp-mockup-url">airwaybill.app/demo</div>
          </div>
          <div className="lp-mockup-body">
            <div className="lp-mockup-sidebar">
              {MOCKUP_SECTION_KEYS.map(key => (
                <div key={key} className="lp-mockup-section">{t(`landing.mockup.sections.${key}`)}</div>
              ))}
            </div>
            <div className="lp-mockup-preview">
              <div className="lp-mockup-pdf">
                <div className="lp-mockup-awb-header">
                  <div className="lp-mockup-awb-num">999 <span>12345675</span></div>
                  <div className="lp-mockup-awb-title">Air Waybill</div>
                </div>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="lp-mockup-awb-row" style={{ width: `${100 - i * 5}%`, opacity: 1 - i * 0.08 }} />
                ))}
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="lp-proof">
        <p>{t('landing.proof.label')}</p>
        <div className="lp-proof-flags">
          {PROOF_COUNTRY_KEYS.map(key => (
            <span key={key}>{t(`landing.proof.countries.${key}`)}</span>
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
            {FEATURE_KEYS.map(f => (
              <Link key={f.key} to={tryPath} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{t(`landing.featureCards.${f.key}.title`)}</h3>
                <p>{t(`landing.featureCards.${f.key}.desc`)}</p>
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
            {STEP_KEYS.map((step, index) => (
              <div key={step} className="lp-step">
                <div className="lp-step-num">{String(index + 1).padStart(2, '0')}</div>
                <h3>{t(`landing.stepCards.${step}.title`)}</h3>
                <p>{t(`landing.stepCards.${step}.desc`)}</p>
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
                {plan.highlight && <div className="lp-plan-badge">{t('landing.pricing.mostPopular')}</div>}
                <div className="lp-plan-name">{t(`plans.${plan.id}.name`)}</div>
                <div className="lp-plan-price">
                  {plan.priceDisplay}
                  {plan.period && <span>/{t(`plans.${plan.id}.period`)}</span>}
                </div>
                <div className="lp-plan-desc">{t(`plans.${plan.id}.description`)}</div>
                <ul className="lp-plan-features">
                  {plan.features.map((_, index) => (
                    <li key={`${plan.id}-${index}`}><span>✓</span> {t(`plans.${plan.id}.features.${index}`)}</li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaLink ?? '/pricing'}
                  className={`lp-plan-cta ${plan.highlight ? 'lp-plan-cta-primary' : 'lp-plan-cta-ghost'}`}
                >
                  {t(`plans.${plan.id}.cta`)}
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
            <p>{t('landing.footer.tagline')}</p>
          </div>
          <div className="lp-footer-links">
            <div>
              <strong>{t('landing.footer.product')}</strong>
              <a href="#features">{t('landing.nav.features')}</a>
              <a href="#pricing">{t('landing.nav.pricing')}</a>
              <Link to={tryPath}>{t('landing.footer.editor')}</Link>
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
          <span>{t('landing.footer.compliance')}</span>
        </div>
      </footer>
    </div>
  )
}
