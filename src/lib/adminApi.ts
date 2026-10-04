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
  docsUsedLifetime: number
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

export interface AdminDocumentRow {
  id: string
  docType: string
  status: string
  orgId: string | null
  orgName: string | null
  userEmail: string | null
  createdAt: string
  downloadCountedAt: string | null
  eventCount: number
}

export interface AdminOverview {
  generatedAt: string
  month: string
  users: AdminUserRow[]
  organizations: AdminOrgRow[]
  repeats: AdminRepeatRow[]
  documents: AdminDocumentRow[]
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

/** Opens a document's PDF in a new tab for backoffice inspection. */
export async function openAdminDocumentPdf(documentId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión')

  const res = await fetch(`/v1/admin/documents/${documentId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || body.error || `Error ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
