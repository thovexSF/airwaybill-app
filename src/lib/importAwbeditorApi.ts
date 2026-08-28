import { supabase } from './supabase'

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

async function authHeaders(): Promise<HeadersInit> {
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

export async function importAwbeditorDb(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AwbeditorImportResult> {
  const headers = await authHeaders()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/import/awbeditor', { method: 'POST', headers, body: form })
  if (!res.ok) throw new Error(await readError(res))

  const started = (await res.json()) as { jobId: string; preview: AwbeditorImportResult['preview'] }
  onProgress?.(5)
  const deadline = Date.now() + 15 * 60 * 1000

  while (Date.now() < deadline) {
    await sleep(2000)
    const poll = await fetch(`/api/import/awbeditor/${started.jobId}`, { headers: await authHeaders() })
    if (!poll.ok) throw new Error(await readError(poll))
    const job = (await poll.json()) as {
      status: string
      preview: AwbeditorImportResult['preview']
      progress?: number
      result?: AwbeditorImportResult
      error?: string
    }
    if (typeof job.progress === 'number') onProgress?.(job.progress)
    if (job.status === 'error') throw new Error(job.error || 'Error al importar')
    if (job.status === 'done' && job.result) {
      onProgress?.(100)
      return { ...job.result, preview: job.preview || started.preview }
    }
  }
  throw new Error('La importación tardó demasiado. Revisa tus documentos en unos minutos.')
}
