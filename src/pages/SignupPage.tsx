import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import './AuthPage.css'
import { LangSwitcher } from '../components/LangSwitcher'
import { usePostHog } from '@posthog/react'

type SignupProvider = 'google' | 'github'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function signupFailureReason(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('already') || lower.includes('registered')) return 'account_exists'
  if (lower.includes('password')) return 'password'
  if (lower.includes('email')) return 'email'
  if (lower.includes('rate') || lower.includes('too many')) return 'rate_limited'
  return 'supabase_error'
}

export function SignupPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { signup, loginWithProvider, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const startedAtRef = useRef(Date.now())
  const formStartedRef = useRef(false)
  const signupAttemptedRef = useRef(false)
  const signupCompletedRef = useRef(false)
  const exitTrackedRef = useRef(false)
  const formSnapshotRef = useRef({
    company_entered: false,
    email_entered: false,
    password_entered: false,
  })

  const source = searchParams.get('source') || 'direct'
  const intent = searchParams.get('intent') || 'create_account'
  const docType = searchParams.get('doc_type') || undefined
  const trackingProps = useMemo(() => ({
    source,
    intent,
    ...(docType ? { doc_type: docType } : {}),
  }), [docType, intent, source])

  useEffect(() => {
    startedAtRef.current = Date.now()
    ;(window as any).clarity?.('event', 'signup_page_viewed')
    posthog?.capture('signup_page_viewed', trackingProps)

    const trackExitWithoutAttempt = () => {
      if (exitTrackedRef.current || signupAttemptedRef.current || signupCompletedRef.current) return
      exitTrackedRef.current = true
      posthog?.capture('signup_left_without_attempt', {
        ...trackingProps,
        ...formSnapshotRef.current,
        form_started: formStartedRef.current,
        time_on_page_ms: Date.now() - startedAtRef.current,
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') trackExitWithoutAttempt()
    }

    window.addEventListener('pagehide', trackExitWithoutAttempt)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', trackExitWithoutAttempt)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [posthog, trackingProps])

  if (user) return <Navigate to="/my-awbs" replace />

  function trackFormStarted(firstField: 'email' | 'password' | 'company') {
    if (formStartedRef.current) return
    formStartedRef.current = true
    posthog?.capture('signup_form_started', {
      ...trackingProps,
      first_field: firstField,
      time_on_page_ms: Date.now() - startedAtRef.current,
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalizedEmail = email.toLowerCase().trim()
    signupAttemptedRef.current = true
    setError('')

    if (!normalizedEmail || !password) {
      setError(t('auth.signup.errors.missingFields'))
      posthog?.capture('signup_failed', { ...trackingProps, method: 'email', reason: 'missing_fields' })
      return
    }
    if (!EMAIL_RE.test(normalizedEmail)) {
      setError(t('auth.signup.errors.invalidEmail'))
      posthog?.capture('signup_failed', { ...trackingProps, method: 'email', reason: 'invalid_email' })
      return
    }
    if (password.length < 6) {
      setError(t('auth.signup.errors.shortPassword'))
      posthog?.capture('signup_failed', { ...trackingProps, method: 'email', reason: 'short_password' })
      return
    }

    ;(window as any).clarity?.('event', 'signup_attempted')
    posthog?.capture('signup_attempted', {
      ...trackingProps,
      method: 'email',
      company_provided: Boolean(companyName.trim()),
    })
    setLoading(true)
    const result = await signup({ companyName: companyName.trim(), email: normalizedEmail, password })
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      posthog?.capture('signup_failed', {
        ...trackingProps,
        method: 'email',
        reason: signupFailureReason(result.error),
      })
      return
    }
    signupCompletedRef.current = true
    ;(window as any).clarity?.('event', 'signup_completed')
    posthog?.capture('user_signed_up', {
      ...trackingProps,
      method: 'email',
      company_provided: Boolean(companyName.trim()),
    })
    navigate('/my-awbs', { replace: true })
  }

  async function handleProvider(provider: SignupProvider) {
    signupAttemptedRef.current = true
    setError('')
    ;(window as any).clarity?.('event', `signup_with_${provider}`)
    posthog?.capture('signup_provider_clicked', { ...trackingProps, provider })
    await loginWithProvider(provider)
  }

  return (
    <div className="auth-page">
      <LangSwitcher style={{ position: 'fixed', top: 16, right: 16 }} />
      <div className="auth-card">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="auth-logo">✈ AIRWAYBILL APP</div>
        </Link>
        <h1 className="auth-title">{t('auth.signup.title')}</h1>
        <p className="auth-sub">{t('auth.signup.sub')}</p>

        <ul className="auth-benefits" aria-label={t('auth.signup.benefitsLabel')}>
          <li>{t('auth.signup.benefits.noCard')}</li>
          <li>{t('auth.signup.benefits.freeDocs')}</li>
          <li>{t('auth.signup.benefits.quick')}</li>
        </ul>

        {/* Social buttons */}
        <div className="auth-social">
          <button className="auth-social-btn google" onClick={() => handleProvider('google')}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.6 5.5 2.7 13.5l7.8 6C12.4 13.2 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17z"/><path fill="#FBBC05" d="M10.5 28.5c-.5-1.5-.8-3.2-.8-4.9s.3-3.4.8-4.9l-7.8-6C1 15.9 0 19.8 0 24s1 8.1 2.7 11.3l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.5 14.6 48 24 48z"/></svg>
            {t('auth.signup.google')}
          </button>
          <button className="auth-social-btn github" onClick={() => handleProvider('github')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            {t('auth.signup.github')}
          </button>
        </div>

        <div className="auth-divider"><span>{t('auth.signup.orEmail')}</span></div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="signup-email">{t('auth.signup.email')}</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onFocus={() => trackFormStarted('email')}
              onChange={e => {
                const value = e.target.value
                formSnapshotRef.current.email_entered = Boolean(value.trim())
                setEmail(value)
              }}
              placeholder="operaciones@empresa.com"
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">{t('auth.signup.password')}</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onFocus={() => trackFormStarted('password')}
              onChange={e => {
                const value = e.target.value
                formSnapshotRef.current.password_entered = Boolean(value)
                setPassword(value)
              }}
              placeholder="••••••"
            />
            <span className="auth-field-hint">{t('auth.signup.passwordHint')}</span>
          </div>
          <div className="auth-field">
            <label htmlFor="signup-company">
              {t('auth.signup.company')} <span className="auth-optional">{t('auth.signup.optional')}</span>
            </label>
            <input
              id="signup-company"
              autoComplete="organization"
              value={companyName}
              onFocus={() => trackFormStarted('company')}
              onChange={e => {
                const value = e.target.value
                formSnapshotRef.current.company_entered = Boolean(value.trim())
                setCompanyName(value)
              }}
              placeholder={t('auth.signup.companyPlaceholder')}
            />
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
