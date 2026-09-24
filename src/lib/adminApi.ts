import { supabase } from './supabase'

export interface AdminUserRow {
  id: string
  email: string
  createdAt: string
  lastSignInAt: string | null
  loginCount: number
  orgId: string | null
  orgName: string | null
  orgPlan: string | null
  role: string | null
}

export interface AdminOrgRow {
  id: string
  name: string
  plan: string
  planExpiresAt: string | null
  createdAt: string
  membersCount: number
  docsThisMonth: number
  docLimit: number | null
  totalDocuments: number
  totalDownloadedDocuments: number
  docTypeBreakdown: Record<string, number>
}

export interface AdminRepeatRow {
  documentId: string
  docType: string
  orgId: string | null
  orgName: string | null
  userEmail: string | null
  eventCount: number
  firstEventAt: string | null
  lastEventAt: string | null
}

export interface AdminOverview {
  generatedAt: string
  month: string
  users: AdminUserRow[]
  organizations: AdminOrgRow[]
  repeats: AdminRepeatRow[]
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión')

  const res = await fetch('/v1/admin/overview', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 403) throw new Error('No tienes acceso al backoffice')
    if (res.status === 503) throw new Error('Backoffice no configurado (falta ADMIN_EMAILS en el servidor)')
    throw new Error(body.message || body.error || `Error ${res.status}`)
  }
  return res.json()
}
