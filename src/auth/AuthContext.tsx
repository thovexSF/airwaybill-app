import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usePostHog } from '@posthog/react'

type AuthProviderName = 'google' | 'github'
type AuthFlow = 'login' | 'signup'
type AuthProviderOptions = { flow?: AuthFlow; source?: string | null; intent?: string | null }

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  orgName: string | null
  signup: (input: { companyName: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  loginWithProvider: (provider: AuthProviderName, options?: AuthProviderOptions) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PENDING_AUTH_KEY = 'posthog_pending_auth'
const LEGACY_PENDING_LOGIN_KEY = 'posthog_pending_login'

type PendingAuth = {
  provider: AuthProviderName
  flow: AuthFlow
  source?: string
  intent?: string
  startedAt: number
}

function cleanAnalyticsValue(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 80) : undefined
}

function readPendingAuth(): PendingAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PendingAuth
      if (parsed.provider && parsed.flow) return parsed
    }
    const legacyProvider = window.sessionStorage.getItem(LEGACY_PENDING_LOGIN_KEY) as AuthProviderName | null
    if (legacyProvider === 'google' || legacyProvider === 'github') {
      return { provider: legacyProvider, flow: 'login', startedAt: Date.now() }
    }
  } catch {
    return null
  }
  return null
}

function writePendingAuth(provider: AuthProviderName, options?: AuthProviderOptions) {
  if (typeof window === 'undefined') return
  const pending: PendingAuth = {
    provider,
    flow: options?.flow ?? 'login',
    source: cleanAnalyticsValue(options?.source),
    intent: cleanAnalyticsValue(options?.intent),
    startedAt: Date.now(),
  }
  window.sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(pending))
  window.sessionStorage.removeItem(LEGACY_PENDING_LOGIN_KEY)
}

function clearPendingAuth() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_AUTH_KEY)
  window.sessionStorage.removeItem(LEGACY_PENDING_LOGIN_KEY)
}

function isLikelyNewUser(user: User, pending: PendingAuth) {
  const createdAt = Date.parse(user.created_at)
  if (!Number.isFinite(createdAt)) return false

  const startedNearCreation = Math.abs(createdAt - pending.startedAt) < 10 * 60 * 1000
  const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN
  const firstSignInNearCreation = Number.isFinite(lastSignInAt) && Math.abs(lastSignInAt - createdAt) < 2 * 60 * 1000

  return startedNearCreation || firstSignInNearCreation
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)

  useEffect(() => {
    const trackAuthenticatedSession = (event: string, s: Session, options: { recordLogin: boolean }) => {
      posthog?.identify(s.user.id)

      const pendingAuth = readPendingAuth()
      if (pendingAuth) {
        clearPendingAuth()
        const props = {
          method: pendingAuth.provider,
          source: pendingAuth.source,
          intent: pendingAuth.intent,
          auth_event: event,
        }

        if (pendingAuth.flow === 'signup' && isLikelyNewUser(s.user, pendingAuth)) {
          ;(window as any).clarity?.('event', 'signup_completed')
          posthog?.capture('user_signed_up', props)
        } else {
          posthog?.capture('user_logged_in', {
            ...props,
            signup_flow: pendingAuth.flow === 'signup',
          })
        }
      }

      if (options.recordLogin) {
        supabase.rpc('record_login').then(({ error }) => {
          if (error) console.error('record_login failed:', error)
        })
      }
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error?.message?.includes('JWT issued at future')) {
        await supabase.auth.signOut({ scope: 'local' })
        setSession(null)
        setLoading(false)
        return
      }
      setSession(data.session)
      setLoading(false)
      if (data.session && readPendingAuth()) {
        trackAuthenticatedSession('INITIAL_SESSION', data.session, { recordLogin: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      setLoading(false)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s?.user) {
        trackAuthenticatedSession(event, s, { recordLogin: event === 'SIGNED_IN' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load org name whenever user changes
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) { setOrgName(null); return }

    supabase
      .from('organization_members')
      .select('organizations(name)')
      .eq('user_id', userId)
      .limit(1)
      .single()
      .then(({ data }) => {
        const name = (data as any)?.organizations?.name ?? null
        setOrgName(name)
      })
  }, [session?.user?.id])

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    orgName,

    signup: async ({ companyName, email, password }) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { company_name: companyName } },
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    },

    login: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { ok: false, error: error.message }
      posthog?.capture('user_logged_in', { method: 'email' })
      return { ok: true }
    },

    loginWithProvider: async (provider, options) => {
      writePendingAuth(provider, options)
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/my-awbs' },
      })
    },

    logout: async () => {
      await supabase.auth.signOut()
      posthog?.reset()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
