import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usePostHog } from '@posthog/react'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  orgName: string | null
  signup: (input: { companyName: string; email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (input: { email: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>
  loginWithProvider: (provider: 'google' | 'github', options?: ProviderLoginOptions) => Promise<void>
  logout: () => Promise<void>
}

type ProviderLoginOptions = {
  flow?: 'login' | 'signup'
  source?: string
  intent?: string
  redirectTo?: string
}

type PendingSignupProvider = {
  provider: 'google' | 'github'
  source: string
  intent: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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
        const pendingSignup = readPendingSignupProvider()
        if (pendingSignup) {
          posthog?.capture('signup_oauth_completed', {
            method: pendingSignup.provider,
            source: pendingSignup.source,
            intent: pendingSignup.intent,
          })
          posthog?.capture('user_signed_up', {
            method: pendingSignup.provider,
            source: pendingSignup.source,
            intent: pendingSignup.intent,
            auth_flow: 'oauth',
          })
          return
        }
        const pendingProvider = sessionStorage.getItem('posthog_pending_login')
        if (pendingProvider) {
          sessionStorage.removeItem('posthog_pending_login')
          posthog?.capture('user_logged_in', { method: pendingProvider })
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
      if (options?.flow === 'signup') {
        const pendingSignup: PendingSignupProvider = {
          provider,
          source: options.source ?? 'direct',
          intent: options.intent ?? 'create_account',
        }
        sessionStorage.setItem('posthog_pending_signup', JSON.stringify(pendingSignup))
        sessionStorage.removeItem('posthog_pending_login')
      } else {
        sessionStorage.setItem('posthog_pending_login', provider)
      }
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + (options?.redirectTo ?? '/editor') },
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

function readPendingSignupProvider(): PendingSignupProvider | null {
  const raw = sessionStorage.getItem('posthog_pending_signup')
  if (!raw) return null
  sessionStorage.removeItem('posthog_pending_signup')

  try {
    const parsed = JSON.parse(raw) as Partial<PendingSignupProvider>
    if (parsed.provider !== 'google' && parsed.provider !== 'github') return null
    return {
      provider: parsed.provider,
      source: parsed.source ?? 'direct',
      intent: parsed.intent ?? 'create_account',
    }
  } catch {
    return null
  }
}
