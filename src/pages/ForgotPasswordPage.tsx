import React, { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://airwaybill.app/reset-password',
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="auth-logo">✈ AIRWAYBILL APP</div>
        </Link>
        <p className="auth-sub">Ingresa tu email y te enviaremos un link para restablecer tu contraseña.</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Revisa tu correo</p>
            <p style={{ color: '#666', fontSize: 14 }}>
              Enviamos un link a <strong>{email}</strong>.<br />
              Puede tardar unos minutos.
            </p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: '#8b0000', fontWeight: 600, fontSize: 14 }}>
              ← Volver al login
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operaciones@empresa.com"
                autoFocus
                required
              />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
            <p className="auth-switch">
              <Link to="/login">← Volver al login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
