import { supabase } from './supabase'

/** Translates free-text fields through the server; returns only the keys it translated. */
export async function translateTexts(fields: Record<string, string>, target: 'en' | 'es'): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Inicia sesión para traducir el contenido.')
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields, target }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'No se pudo traducir el contenido.')
  return body.fields ?? {}
}
