import React, { createContext, useContext, useMemo, useState } from 'react'

type TenantUser = {
  id: string
  companyName: string
  email: string
  password: string
}

type Session = {
  userId: string
}

type AuthContextValue = {
  currentUser: TenantUser | null
  signup: (input: { companyName: string; email: string; password: string }) => { ok: true } | { ok: false; error: string }
  login: (input: { email: string; password: string }) => { ok: true } | { ok: false; error: string }
  logout: () => void
}

const USERS_KEY = 'awb-saas-users'
const SESSION_KEY = 'awb-saas-session'
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development'
const USERS_KEY_BY_ENV = `${USERS_KEY}-${APP_ENV}`
const SESSION_KEY_BY_ENV = `${SESSION_KEY}-${APP_ENV}`

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readUsers(): TenantUser[] {
  const raw = localStorage.getItem(USERS_KEY_BY_ENV)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as TenantUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users: TenantUser[]) {
  localStorage.setItem(USERS_KEY_BY_ENV, JSON.stringify(users))
}

function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY_BY_ENV)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Session
    return parsed?.userId ? parsed : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY_BY_ENV)
    return
  }
  localStorage.setItem(SESSION_KEY_BY_ENV, JSON.stringify(session))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<TenantUser[]>(() => readUsers())
  const [session, setSession] = useState<Session | null>(() => readSession())

  const currentUser = useMemo(() => {
    if (!session) return null
    return users.find((u) => u.id === session.userId) || null
  }, [session, users])

  const value: AuthContextValue = useMemo(
    () => ({
      currentUser,
      signup: ({ companyName, email, password }) => {
        const normalizedEmail = email.trim().toLowerCase()
        if (!companyName.trim() || !normalizedEmail || !password.trim()) {
          return { ok: false, error: 'Completa empresa, email y password.' }
        }
        if (users.some((u) => u.email === normalizedEmail)) {
          return { ok: false, error: 'Ya existe una cuenta con este email.' }
        }
        const newUser: TenantUser = {
          id: crypto.randomUUID(),
          companyName: companyName.trim(),
          email: normalizedEmail,
          password,
        }
        const updatedUsers = [...users, newUser]
        setUsers(updatedUsers)
        writeUsers(updatedUsers)
        const nextSession = { userId: newUser.id }
        setSession(nextSession)
        writeSession(nextSession)
        return { ok: true }
      },
      login: ({ email, password }) => {
        const normalizedEmail = email.trim().toLowerCase()
        const user = users.find((u) => u.email === normalizedEmail && u.password === password)
        if (!user) {
          return { ok: false, error: 'Credenciales inválidas.' }
        }
        const nextSession = { userId: user.id }
        setSession(nextSession)
        writeSession(nextSession)
        return { ok: true }
      },
      logout: () => {
        setSession(null)
        writeSession(null)
      },
    }),
    [currentUser, users],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
