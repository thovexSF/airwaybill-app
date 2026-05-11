import React, { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import './AuthPage.css'
import { LangSwitcher } from '../components/LangSwitcher'

export function SignupPage() {
  const { t } = useTranslation()
  const { signup, loginWithProvider, user } = useAuth()
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/editor" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signup({ companyName, email, password })
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    navigate('/editor', { replace: true })
  }

  return (
    <div className="auth-page">
      <LangSwitcher style={{ position: 'fixed', top: 16, right: 16 }} />
      <div className="auth-card">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="auth-logo">✈ AIRWAYBILL APP</div>
        </Link>
        <p className="auth-sub">{t('auth.signup.sub')}</p>

        {/* Social buttons */}
        <div className="auth-social">
          <button className="auth-social-btn google" onClick={() => loginWithProvider('google')}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.8 6C12.4 13.2 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/><path fill="#FBBC05" d="M10.5 28.5c-.5-1.5-.8-3.2-.8-4.9s.3-3.4.8-4.9l-7.8-6C1 15.9 0 19.8 0 24s1 8.1 2.7 11.3l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.5 14.6 48 24 48z"/></svg>
            {t('auth.signup.google')}
          </button>
          <button className="auth-social-btn github" onClick={() => loginWithProvider('github')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            {t('auth.signup.github')}
          </button>
        </div>

        <div className="auth-divider"><span>{t('auth.signup.orEmail')}</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>{t('auth.signup.company')}</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t('auth.signup.companyPlaceholder')} />
          </div>
          <div className="auth-field">
            <label>{t('auth.signup.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="operaciones@empresa.com" />
          </div>
          <div className="auth-field">
            <label>{t('auth.signup.password')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.signup.hasAccount')} <Link to="/login">{t('auth.signup.signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
