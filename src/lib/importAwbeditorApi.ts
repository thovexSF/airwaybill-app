import { supabase } from './supabase'
import { getPartnerHost } from './partnerHost'

export type AwbeditorImportResult = {
  mawbCreated: number
  mawbUpdated: number
  hawbCreated: number
  hawbUpdated: number
  dgdCreated: number
  dgdUpdated: number
  skipped: number
  errors: string[]
  preview: { mawb: number; hawb: number; dgd: number }
}

/**
 * In the B2B-embedded hub there is no Supabase session; the import goes through
 * B2B's partner proxy with the B2B user token. Standalone uses Supabase auth.
 */
function importBase(): string {
  const ph = getPartnerHost()
  return ph ? `${ph.apiBase}/import/awbeditor` : '/api/import/awbeditor'
}

async function authHeaders(): Promise<HeadersInit> {
  if (getPartnerHost()) {
    let token: string | null = null
    try { token = localStorage.getItem('token') } catch { /* ignore */ }
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión para importar')
  return { Authorization: `Bearer ${token}` }
}

async function readError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    return json.message || json.error || text || `Error ${res.status}`
  } catch {
    return text || `Error ${res.status}`
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export type ImportKind = 'mawb' | 'hawb' | 'dgd'

export async function importAwbeditorDb(
  file: File,
  onProgress?: (pct: number) => void,
  types?: ImportKind[],
): Promise<AwbeditorImportResult> {
  let lastPct = 0
  const bump = (pct: number) => {
    if (pct > lastPct) {
      lastPct = pct
      onProgress?.(pct)
    }
  }

  bump(1)
  const headers = await authHeaders()
  const form = new FormData()
  form.append('file', file)
  if (types && types.length) form.append('types', JSON.stringify(types))
  const base = importBase()
  const res = await fetch(base, { method: 'POST', headers, body: form })
  if (!res.ok) throw new Error(await readError(res))

  const started = (await res.json()) as { jobId: string; preview: AwbeditorImportResult['preview'] }
  bump(2)
  const deadline = Date.now() + 15 * 60 * 1000

  while (Date.now() < deadline) {
    const poll = await fetch(`${base}/${started.jobId}`, { headers: await authHeaders() })
    if (!poll.ok) throw new Error(await readError(poll))
    const job = (await poll.json()) as {
      status: string
      preview: AwbeditorImportResult['preview']
      progress?: number
      result?: AwbeditorImportResult
      error?: string
    }
    if (typeof job.progress === 'number' && job.progress > 0) bump(job.progress)
    if (job.status === 'error') throw new Error(job.error || 'Error al importar')
    if (job.status === 'done' && job.result) {
      bump(100)
      return { ...job.result, preview: job.preview || started.preview }
    }
    await sleep(1500)
  }
  throw new Error('La importación tardó demasiado. Revisa tus documentos en unos minutos.')
}
