import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { openCheckout } from '../lib/paddleService'

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'para siempre',
    features: ['10 AWBs por mes', 'Descarga PDF', 'Marca DRAFT', '1 usuario'],
    highlight: false,
  },
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$15',
    period: 'por mes',
    priceId: import.meta.env.VITE_PADDLE_PRICE_STARTER,
    features: ['AWBs ilimitados', 'Sin marca DRAFT', 'Logo de aerolínea', 'Check digit IATA', '2 usuarios', 'Soporte por email'],
    highlight: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$29',
    period: 'por mes',
    priceId: import.meta.env.VITE_PADDLE_PRICE_PRO,
    features: ['Todo en Starter', 'HAWB + DGD + Manifiesto', '5 usuarios', 'Soporte prioritario'],
    highlight: true,
  },
]

export function PricingPage() {
  const { user, logout, orgName } = useAuth()
  const { plan: currentPlan, orgId } = usePlan()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(planId: 'starter' | 'pro', priceId: string) {
    if (!user || !orgId) return
    setLoading(planId)
    setError(null)
    try {
      await openCheckout({ priceId, email: user.email!, orgId })
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{orgName ?? user?.email}</span>
          <Link to="/editor" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>Editor</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '48px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Planes y precios</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: 40 }}>
          Plan actual: <strong style={{ textTransform: 'capitalize', color: '#8b0000' }}>{currentPlan}</strong>
        </p>

        {error && (
          <div style={{ background: '#ffe8e8', border: '1px solid #f5b6b6', borderRadius: 8, padding: '10px 16px', marginBottom: 24, color: '#8b0000', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {PLANS.map(p => {
            const isCurrent = currentPlan === p.id
            const isLower = (p.id === 'free' && currentPlan !== 'free') ||
                            (p.id === 'starter' && currentPlan === 'pro')
            return (
              <div key={p.id} style={{
                background: '#fff',
                border: p.highlight ? '2px solid #8b0000' : '1px solid #e8dcdc',
                borderRadius: 12, padding: 28, position: 'relative',
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#8b0000', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
                    MÁS POPULAR
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: 1 }}>{p.name}</div>
                <div style={{ fontSize: 36, fontWeight: 800, margin: '8px 0 2px' }}>{p.price}</div>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{p.period}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                      <span style={{ color: '#8b0000', fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div style={{ textAlign: 'center', padding: '9px 0', fontSize: 13, fontWeight: 700, color: '#2a7a2a' }}>✓ Plan actual</div>
                ) : isLower ? (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa' }}>Tu plan actual es superior</div>
                ) : p.id === 'free' ? null : (
                  <button
                    onClick={() => handleUpgrade(p.id, p.priceId!)}
                    disabled={loading === p.id}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: p.highlight ? '#8b0000' : '#f4f0f0',
                      color: p.highlight ? '#fff' : '#333',
                      fontWeight: 700, fontSize: 14,
                    }}
                  >
                    {loading === p.id ? 'Abriendo checkout...' : `Actualizar a ${p.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#888' }}>
          14 días de prueba gratis · Cancela cuando quieras · Pagos procesados por Paddle
        </p>
      </div>
    </div>
  )
}
