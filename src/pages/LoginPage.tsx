import React, { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import './AuthPage.css'
import { LangSwitcher } from '../components/LangSwitcher'

const MailIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
)

const LockIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2M6.2 6.2A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.85" />
    <path d="m2 2 20 20" />
  </svg>
)

export function LoginPage() {
  const { t } = useTranslation()
  const { login, loginWithProvider, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const destination = (location.state as { from?: string } | undefined)?.from ?? '/my-awbs'
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login({ email: email.toLowerCase().trim(), password })
    setLoading(false)
    if (!result.ok) { setError(result.error); return }
    navigate(destination, { replace: true })
  }

  async function handleProvider(provider: 'google' | 'github') {
    setError('')
    await loginWithProvider(provider)
  }

  return (
    <div className="auth-page">
      <LangSwitcher style={{ position: 'fixed', top: 16, right: 16, zIndex: 2 }} />

      <div className="auth-card">
        <div className="auth-brand">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="auth-logo">✈ AIRWAYBILL APP</div>
          </Link>
        </div>

        <h1 className="auth-title">{t('auth.login.submit')}</h1>
        <p className="auth-sub">{t('auth.login.sub')}</p>

        {error && <div className="auth-error" style={{ marginTop: 16 }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">{t('auth.login.email')}</label>
            <div className="auth-input-wrap">
              <span className="auth-adornment"><MailIcon /></span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operaciones@empresa.com"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">{t('auth.login.password')}</label>
            <div className="auth-input-wrap">
              <span className="auth-adornment"><LockIcon /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
                style={{ paddingRight: 38 }}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>

          <p style={{ textAlign: 'right', margin: '4px 0 0' }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: '#8b0000' }}>
              {t('auth.login.forgotPassword')}
            </Link>
          </p>
        </form>

        <div className="auth-divider"><span>{t('auth.login.orSocial')}</span></div>

        <div className="auth-social">
          <button className="auth-social-btn google" onClick={() => handleProvider('google')}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.8 6C12.4 13.2 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/><path fill="#FBBC05" d="M10.5 28.5c-.5-1.5-.8-3.2-.8-4.9s.3-3.4.8-4.9l-7.8-6C1 15.9 0 19.8 0 24s1 8.1 2.7 11.3l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.5 14.6 48 24 48z"/></svg>
            {t('auth.login.google')}
          </button>
          <button className="auth-social-btn github" onClick={() => handleProvider('github')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            {t('auth.login.github')}
          </button>
        </div>

        <p className="auth-switch" style={{ textAlign: 'center' }}>
          {t('auth.login.noAccount')} <Link to="/signup">{t('auth.login.createAccount')}</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: 10 }}>
          <Link to="/demo" style={{ fontSize: 13, color: '#777' }}>{t('auth.login.tryFree')}</Link>
        </p>
      </div>
    </div>
  )
}
