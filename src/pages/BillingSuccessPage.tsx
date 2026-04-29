import React, { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function BillingSuccessPage() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', gap: 16, background: '#f4f4f4' }}>
      <div style={{ fontSize: 52 }}>✅</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#222' }}>¡Pago exitoso!</h1>
      <p style={{ color: '#666', maxWidth: 360, textAlign: 'center' }}>
        Tu plan ha sido activado. Puede tomar unos segundos en reflejarse.
      </p>
      <Link to="/editor" style={{ marginTop: 8, background: '#8b0000', color: '#fff', padding: '11px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
        Ir al Editor →
      </Link>
    </div>
  )
}
