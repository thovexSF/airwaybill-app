import React, { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import './AuthPage.css'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
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
        <p className="auth-sub">{t('auth.forgotPassword.sub')}</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('auth.forgotPassword.sent')}</p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 20, color: '#8b0000', fontWeight: 600, fontSize: 14 }}>
              {t('auth.forgotPassword.backToLogin')}
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>{t('auth.forgotPassword.email')}</label>
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
              {loading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
            </button>
            <p className="auth-switch">
              <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
