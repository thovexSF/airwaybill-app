/**
 * B2B mounts this app inside its own page and talks to the Partner API
 * through B2B's backend. There is no Supabase user per person.
 */

export type PartnerHostConfig = {
  /** B2B proxy, same origin as the page. e.g. `/api/airwaybill-partner` */
  apiBase: string
  /** Where blank forms, fonts and logos live. e.g. `https://airwaybill.app` */
  assetBase: string
}

let config: PartnerHostConfig | null = null

export function setPartnerHost(next: PartnerHostConfig) {
  config = {
    apiBase: next.apiBase.replace(/\/$/, ''),
    assetBase: next.assetBase.replace(/\/$/, ''),
  }
}

export function getPartnerHost(): PartnerHostConfig | null {
  return config
}

export function isPartnerHost(): boolean {
  return config !== null
}

let shadow: ShadowRoot | null = null

export function setPartnerShadow(next: ShadowRoot) {
  shadow = next
}

export function getPartnerShadow(): ShadowRoot | null {
  return shadow
}

/** Root-relative public file. Absolute when the UI is hosted on another origin. */
export function publicAsset(path: string): string {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const base = config?.assetBase
  if (!base) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

async function partnerRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!config) throw new Error('partner_host_not_configured')
  const headers: Record<string, string> = { Accept: 'application/json' }
  try {
    const token = localStorage.getItem('token')
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    /* ignore */
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${config.apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { error: text }
  }
  if (!res.ok) throw new Error(json?.error || json?.message || `Airwaybill API ${res.status}`)
  return json as T
}

function normalizeDoc<T>(row: any): T {
  return {
    ...row,
    user_id: row.user_id || '',
    download_counted_at: row.download_counted_at ?? null,
    organization_id: row.organization_id ?? null,
  } as T
}

export async function partnerList<T>(docType?: string): Promise<T[]> {
  const json = await partnerRequest<{ documents: any[] }>('GET', docType ? `/documents?docType=${encodeURIComponent(docType)}` : '/documents')
  const rows = (json.documents || []).map(row => normalizeDoc<any>(row))
  const filtered = docType ? rows.filter(d => d.data?.docType === docType) : rows
  return filtered as T[]
}

export async function partnerGet<T>(id: string): Promise<T> {
  const json = await partnerRequest<{ document: any }>('GET', `/documents/${id}`)
  return normalizeDoc<T>(json.document)
}

export async function partnerSave<T>(docData: { isDraft?: boolean }, id?: string): Promise<T> {
  const status = docData.isDraft ? 'draft' : 'final'
  if (id) {
    const json = await partnerRequest<{ document: any }>('PATCH', `/documents/${id}`, { data: docData, status })
    return normalizeDoc<T>(json.document)
  }
  const json = await partnerRequest<{ document: any }>('POST', '/documents', { data: docData, status })
  return normalizeDoc<T>(json.document)
}

export async function partnerDelete(id: string): Promise<void> {
  await partnerRequest<void>('DELETE', `/documents/${id}`)
}
