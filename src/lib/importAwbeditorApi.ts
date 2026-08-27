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

export async function importAwbeditorDb(file: File): Promise<AwbeditorImportResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Debes iniciar sesión para importar')

  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/import/awbeditor', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || json?.message || `Error ${res.status}`)
  return json as AwbeditorImportResult
}
