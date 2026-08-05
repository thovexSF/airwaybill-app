import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usePostHog } from '@posthog/react'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  orgName: string | null
  signup: (input: { companyName: string; email: string; password: string }) => Promise<{ ok: true; requiresEmailConfirmation: boolean } | { ok: false; error: string }>
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  loginWithProvider: (provider: 'google' | 'github', options?: OAuthTrackingOptions) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type OAuthTrackingOptions = {
  flow?: 'login' | 'signup'
  source?: string
  intent?: string
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const posthog = usePostHog()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setLoading(false)
      if (event === 'SIGNED_IN' && s?.user) {
        posthog?.identify(s.user.id, { email: s.user.email })
        const pendingProvider = sessionStorage.getItem('posthog_pending_provider') ?? sessionStorage.getItem('posthog_pending_login')
        if (pendingProvider) {
          const pendingFlow = sessionStorage.getItem('posthog_pending_auth_flow') ?? 'login'
          const pendingSource = sessionStorage.getItem('posthog_pending_signup_source')
          const pendingIntent = sessionStorage.getItem('posthog_pending_signup_intent')
          sessionStorage.removeItem('posthog_pending_login')
          sessionStorage.removeItem('posthog_pending_provider')
          sessionStorage.removeItem('posthog_pending_auth_flow')
          sessionStorage.removeItem('posthog_pending_signup_source')
          sessionStorage.removeItem('posthog_pending_signup_intent')

          const authEventProps = {
            method: pendingProvider,
            ...(pendingSource ? { source: pendingSource } : {}),
            ...(pendingIntent ? { intent: pendingIntent } : {}),
          }

          if (pendingFlow === 'signup') {
            posthog?.capture('signup_oauth_completed', authEventProps)
            if (isLikelyNewUser(s.user)) {
              posthog?.capture('user_signed_up', {
                ...authEventProps,
                auth_flow: 'oauth',
              })
            }
          } else {
            posthog?.capture('user_logged_in', authEventProps)
          }
        }
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { company_name: companyName } },
      })
      if (error) return { ok: false, error: error.message }
      return { ok: true, requiresEmailConfirmation: !data.session }
    },

    login: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { ok: false, error: error.message }
      posthog?.capture('user_logged_in', { method: 'email' })
      return { ok: true }
    },

    loginWithProvider: async (provider, options = {}) => {
      sessionStorage.setItem('posthog_pending_provider', provider)
      sessionStorage.setItem('posthog_pending_auth_flow', options.flow ?? 'login')
      if (options.source) sessionStorage.setItem('posthog_pending_signup_source', options.source)
      else sessionStorage.removeItem('posthog_pending_signup_source')
      if (options.intent) sessionStorage.setItem('posthog_pending_signup_intent', options.intent)
      else sessionStorage.removeItem('posthog_pending_signup_intent')
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/editor' },
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

function isLikelyNewUser(user: User) {
  const createdAt = Date.parse(user.created_at)
  const lastSignInAt = Date.parse(user.last_sign_in_at ?? '')
  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return false
  return Math.abs(lastSignInAt - createdAt) < 5 * 60 * 1000
}
