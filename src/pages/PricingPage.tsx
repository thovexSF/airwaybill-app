import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { openCheckout } from '../lib/paddleService'
import { PLANS, PRICE_IDS } from '../data/plans'
import { LangSwitcher } from '../components/LangSwitcher'

export function PricingPage() {
  const { t } = useTranslation()
  const { user, logout, orgName } = useAuth()
  const { plan: currentPlan, orgId } = usePlan()
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(planId: string, priceId: string) {
    if (!user || !orgId) { navigate('/signup'); return }
    setLoading(planId)
    setError(null)
    try {
      await openCheckout({ priceId, email: user.email!, orgId })
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(null)
  }

  const planOrder = ['free', 'starter', 'pro', 'enterprise']
  const currentIndex = planOrder.indexOf(currentPlan)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{orgName ?? user.email}</span>}
          {user && <Link to="/editor" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>Editor</Link>}
          {user && <Link to="/settings" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>{t('common.settings')}</Link>}
          <LangSwitcher />
          {user
            ? <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>{t('common.signOut')}</button>
            : <Link to="/login" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>{t('auth.login.submit')}</Link>
          }
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '48px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>{t('pricing.title')}</h1>
        {user ? (
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40 }}>
            {t('pricing.currentPlan')}: <strong style={{ textTransform: 'capitalize', color: '#8b0000' }}>{currentPlan}</strong>
            {currentPlan !== 'free' && (
              <> · <Link to="/settings" style={{ color: '#8b0000', fontSize: 13 }}>{t('pricing.manage')}</Link></>
            )}
          </p>
        ) : (
          <p style={{ textAlign: 'center', color: '#666', marginBottom: 40 }}>{t('pricing.sub')}</p>
        )}

        {error && (
          <div style={{ background: '#ffe8e8', border: '1px solid #f5b6b6', borderRadius: 8, padding: '10px 16px', marginBottom: 24, color: '#8b0000', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
          {PLANS.map((p, i) => {
            const isCurrent = user && currentPlan === p.id
            const isLower = user && i < currentIndex
            const priceId = PRICE_IDS[p.id]

            return (
              <div key={p.id} style={{
                background: '#fff',
                border: p.highlight ? '2px solid #8b0000' : '1px solid #e8dcdc',
                borderRadius: 12, padding: 28, position: 'relative',
                boxShadow: p.highlight ? '0 4px 16px rgba(139,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#8b0000', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#e8f5e9', color: '#2a7a2a', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    CURRENT
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 1 }}>{p.name}</div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0 2px' }}>{p.priceDisplay}</div>
                {p.period && <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>/{p.period}</div>}
                <div style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>{p.description}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                      <span style={{ color: '#8b0000', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div style={{ textAlign: 'center', padding: '9px 0', fontSize: 13, fontWeight: 700, color: '#2a7a2a' }}>✓ {t('pricing.current')}</div>
                ) : isLower ? (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa' }}>{t('pricing.included')}</div>
                ) : p.ctaLink ? (
                  <Link
                    to={p.ctaLink}
                    style={{
                      display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 8,
                      background: p.highlight ? '#8b0000' : '#f4f0f0',
                      color: p.highlight ? '#fff' : '#333',
                      fontWeight: 700, fontSize: 14, textDecoration: 'none',
                    }}
                  >
                    {p.cta}
                  </Link>
                ) : priceId ? (
                  <button
                    onClick={() => handleUpgrade(p.id, priceId)}
                    disabled={loading === p.id}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: p.highlight ? '#8b0000' : '#f4f0f0',
                      color: p.highlight ? '#fff' : '#333',
                      fontWeight: 700, fontSize: 14,
                    }}
                  >
                    {loading === p.id ? t('pricing.opening') : user ? `${t('pricing.upgrade')} ${p.name}` : p.cta}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#888' }}>
          {t('pricing.trial')}{' '}
          <a href="https://paddle.com" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>Paddle</a>
        </p>
      </div>
    </div>
  )
}
