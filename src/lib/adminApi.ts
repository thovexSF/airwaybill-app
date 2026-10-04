import { supabase } from './supabase'
import type { AgreementRow } from './eawbAgreement'

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

/** Opens the document's raw stored JSON in a new tab — for telling "empty PDF" apart from "empty saved data". */
export async function openAdminDocumentJson(documentId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión')

  const res = await fetch(`/v1/admin/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || body.error || `Error ${res.status}`)

  const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export interface AdminAgreementRow extends AgreementRow {
  orgName: string | null
  signedUrl: string | null
  possibleDuplicate: boolean
  registry: { available: boolean; status: string; asOf: string | null; matches: { companyName: string; countryName: string; joiningDate: string | null }[] } | null
}

async function adminFetch(path: string, init?: RequestInit) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión')
  const res = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`)
  return body
}

export async function fetchAdminAgreements(): Promise<AdminAgreementRow[]> {
  return (await adminFetch('/v1/admin/eawb-agreements')).agreements
}

export async function advanceAgreement(id: string, opts: { reject?: boolean; note?: string; action?: 'iata_check' } = {}) {
  return adminFetch(`/v1/admin/eawb-agreements/${id}/status`, { method: 'POST', body: JSON.stringify(opts) })
}

export interface RegistryMeta { as_of: string; uploaded_at: string; row_count: number }

export async function fetchRegistryMeta(): Promise<RegistryMeta | null> {
  return (await adminFetch('/v1/admin/iata-registry')).meta
}

/** El CSV de IATA viene en Windows-1252 (UTF-8 inválido); probamos UTF-8 estricto y caemos a 1252. */
export async function uploadRegistryCsv(file: File, asOf: string): Promise<{ rows: number }> {
  const buf = await file.arrayBuffer()
  let csv: string
  try { csv = new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { csv = new TextDecoder('windows-1252').decode(buf) }
  return adminFetch('/v1/admin/iata-registry', { method: 'POST', body: JSON.stringify({ csv, asOf }) })
}
