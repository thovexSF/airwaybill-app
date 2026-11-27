import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isPartnerHost } from '../lib/partnerHost'
import { usePostHog } from '@posthog/react'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  orgName: string | null
  signup: (input: { companyName: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  sendLoginCode: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>
  verifyLoginCode: (input: { email: string; code: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  loginWithProvider: (provider: AuthProviderName, options?: ProviderAuthOptions) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderName = 'google' | 'github' | 'apple'
type AuthFlow = 'login' | 'signup'
type AuthAttribution = Partial<Record<'source' | 'intent' | 'doc_type' | 'from', string>>
type ProviderAuthOptions = {
  flow?: AuthFlow
  attribution?: AuthAttribution
}

const AUTH_PROVIDER_KEY = 'posthog_pending_auth_provider'
const AUTH_FLOW_KEY = 'posthog_pending_auth_flow'
const AUTH_ATTRIBUTION_KEY = 'posthog_pending_auth_attribution'
const OAUTH_NEW_USER_WINDOW_MS = 10 * 60 * 1000

function readPendingAttribution(): AuthAttribution {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AUTH_ATTRIBUTION_KEY) || '{}') as AuthAttribution
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string' && value.length > 0),
    ) as AuthAttribution
  } catch {
    return {}
  }
}

const HOST_SESSION = {
  user: {
    id: 'b2b-partner',
    email: '',
    created_at: '2020-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated',
  },
  access_token: '',
  refresh_token: '',
  expires_in: 0,
  token_type: 'bearer',
  expires_at: 0,
} as Session

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog()
  const hosted = isPartnerHost()
  const [session, setSession] = useState<Session | null>(hosted ? HOST_SESSION : null)
  const [loading, setLoading] = useState(!hosted)
  const [orgName, setOrgName] = useState<string | null>(hosted ? 'B2B' : null)

  useEffect(() => {
    if (hosted) return
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error?.message?.includes('JWT issued at future')) {
        await supabase.auth.signOut({ scope: 'local' })
        setSession(null)
        setLoading(false)
        return
      }
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      setLoading(false)
      if (event === 'SIGNED_IN' && s?.user) {
        posthog?.identify(s.user.id, { email: s.user.email })
        const pendingProvider = sessionStorage.getItem(AUTH_PROVIDER_KEY) || sessionStorage.getItem('posthog_pending_login')
        if (pendingProvider) {
          const pendingFlow = sessionStorage.getItem(AUTH_FLOW_KEY) as AuthFlow | null
          const attribution = readPendingAttribution()
          sessionStorage.removeItem(AUTH_PROVIDER_KEY)
          sessionStorage.removeItem(AUTH_FLOW_KEY)
          sessionStorage.removeItem(AUTH_ATTRIBUTION_KEY)
          sessionStorage.removeItem('posthog_pending_login')
          if (pendingFlow === 'signup') {
            const createdAtMs = Date.parse(s.user.created_at || '')
            const likelyNewUser = Number.isFinite(createdAtMs) && Date.now() - createdAtMs < OAUTH_NEW_USER_WINDOW_MS
            if (likelyNewUser) {
              ;(window as any).clarity?.('event', 'signup_completed')
              posthog?.capture('user_signed_up', {
                method: pendingProvider,
                provider: pendingProvider,
                auth_flow: 'oauth',
                ...attribution,
              })
            } else {
              posthog?.capture('user_logged_in', {
                method: pendingProvider,
                signup_flow: true,
                ...attribution,
              })
            }
          } else {
            posthog?.capture('user_logged_in', { method: pendingProvider })
          }
        }
        supabase.rpc('record_login').then(({ error }) => {
          if (error) console.error('record_login failed:', error)
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load org name whenever user changes
  useEffect(() => {
    if (hosted) return
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

    // Solo para cuentas existentes: crear cuenta pide el nombre de la empresa en /signup.
    sendLoginCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    },

    verifyLoginCode: async ({ email, code }) => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (error) return { ok: false, error: error.message }
      posthog?.capture('user_logged_in', { method: 'email_code' })
      return { ok: true }
    },

    loginWithProvider: async (provider, options) => {
      sessionStorage.setItem(AUTH_PROVIDER_KEY, provider)
      sessionStorage.setItem(AUTH_FLOW_KEY, options?.flow ?? 'login')
      sessionStorage.setItem('posthog_pending_login', provider)
      if (options?.attribution) {
        sessionStorage.setItem(AUTH_ATTRIBUTION_KEY, JSON.stringify(options.attribution))
      } else {
        sessionStorage.removeItem(AUTH_ATTRIBUTION_KEY)
      }
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
