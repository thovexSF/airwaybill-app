import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './LandingPage.css'

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

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Get started at no cost',
    features: ['10 AWBs per month', 'PDF download', 'DRAFT watermark', 'Basic AWB form', '1 user'],
    cta: 'Get Started Free',
    ctaLink: '/signup',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$15',
    period: 'per month',
    desc: 'For small freight forwarders',
    features: ['Unlimited AWBs', 'No watermark', 'Custom carrier logo', 'AWB check digit validation', '2 users', 'Email support'],
    cta: 'Start 14-day Trial',
    ctaLink: '/signup?plan=starter',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    desc: 'For active freight forwarders',
    features: ['Everything in Starter', 'HAWB + DGD + Manifest', 'Flight manifest export', '5 users', 'Priority support'],
    cta: 'Start 14-day Trial',
    ctaLink: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For airlines & large agencies',
    features: ['Everything in Pro', 'Unlimited users', 'API access', 'Cargo-IMP / CUSCAR export', 'Custom domain', 'SSO / SAML', 'Dedicated support'],
    cta: 'Contact Sales',
    ctaLink: '/contact',
    highlight: false,
  },
]

export function LandingPage() {
  const { user, orgName } = useAuth()

  return (
    <div className="lp">

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">✈ AIRWAYBILL <span>APP</span></div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#how">How it works</a>
          </div>
          <div className="lp-nav-actions">
            {user ? (
              <>
                <span style={{ fontSize: 13, color: '#666' }}>{orgName ?? user.email}</span>
                <Link to="/editor" className="lp-btn-primary">Ir al Editor →</Link>
              </>
            ) : (
              <>
                <Link to="/editor" className="lp-btn-ghost">Try Demo</Link>
                <Link to="/signup" className="lp-btn-primary">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-badge">✦ IATA-Compliant · Cloud-Based · Instant PDF</div>
          <h1 className="lp-headline">
            The Air Waybill Editor<br />
            <span>Built for Modern Freight</span>
          </h1>
          <p className="lp-subheadline">
            Create, edit, and download professional AWBs in seconds — directly in your browser.
            No software. No per-copy fees. Just fast, accurate air freight documentation.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/editor" className="lp-cta-primary">
              Try it free →
            </Link>
            <a href="#how" className="lp-cta-ghost">See how it works</a>
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
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-title">Everything your AWB workflow needs</h2>
          <p className="lp-section-sub">Modern tools for a document that's been stuck in the 1990s.</p>
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
          <div className="lp-section-label">How it works</div>
          <h2 className="lp-section-title">From blank form to PDF in under 2 minutes</h2>
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
            <Link to="/editor" className="lp-cta-primary">Try it now — it's free →</Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-inner">
          <div className="lp-section-label">Pricing</div>
          <h2 className="lp-section-title">Simple, transparent pricing</h2>
          <p className="lp-section-sub">Start free. Upgrade when you're ready.</p>
          <div className="lp-plans">
            {PLANS.map(plan => (
              <div key={plan.name} className={`lp-plan ${plan.highlight ? 'lp-plan-highlight' : ''}`}>
                {plan.highlight && <div className="lp-plan-badge">Most Popular</div>}
                <div className="lp-plan-name">{plan.name}</div>
                <div className="lp-plan-price">
                  {plan.price}
                  {plan.period && <span>/{plan.period}</span>}
                </div>
                <div className="lp-plan-desc">{plan.desc}</div>
                <ul className="lp-plan-features">
                  {plan.features.map(f => (
                    <li key={f}><span>✓</span> {f}</li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaLink}
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
          <h2>Ready to modernize your air freight documentation?</h2>
          <p>Join freight forwarders worldwide who've switched from desktop software to Airwaybill App.</p>
          <Link to="/editor" className="lp-cta-primary lp-cta-lg">
            Start for free — no credit card →
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
              <strong>Product</strong>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/editor">Editor</Link>
            </div>
            <div>
              <strong>Company</strong>
              <a href="#">About</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <strong>Legal</strong>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/refunds">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2025 Airwaybill App · All rights reserved</span>
          <span>Built for IATA Resolution 600a compliance</span>
        </div>
      </footer>
    </div>
  )
}
