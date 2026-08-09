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
  loginWithProvider: (provider: 'google' | 'github', options?: AuthRedirectOptions) => Promise<void>
  logout: () => Promise<void>
}

type AuthRedirectOptions = {
  flow?: 'login' | 'signup'
  source?: string
  intent?: string
}

type PendingAuthRedirect = AuthRedirectOptions & {
  provider: 'google' | 'github'
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readPendingAuthRedirect(): PendingAuthRedirect | null {
  const raw = sessionStorage.getItem('posthog_pending_auth')
  if (raw) {
    try {
      return JSON.parse(raw) as PendingAuthRedirect
    } catch {
      return null
    }
  }

  const legacyProvider = sessionStorage.getItem('posthog_pending_login') as 'google' | 'github' | null
  return legacyProvider ? { provider: legacyProvider, flow: 'login' } : null
}

function clearPendingAuthRedirect() {
  sessionStorage.removeItem('posthog_pending_auth')
  sessionStorage.removeItem('posthog_pending_login')
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
        const pendingAuth = readPendingAuthRedirect()
        if (pendingAuth) {
          clearPendingAuthRedirect()
          const eventName = pendingAuth.flow === 'signup' ? 'user_signed_up' : 'user_logged_in'
          posthog?.capture(eventName, {
            method: pendingAuth.provider,
            source: pendingAuth.source,
            intent: pendingAuth.intent,
            auth_redirect: true,
          })
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

    loginWithProvider: async (provider, options = {}) => {
      sessionStorage.setItem('posthog_pending_auth', JSON.stringify({
        provider,
        flow: options.flow ?? 'login',
        source: options.source,
        intent: options.intent,
      }))
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
