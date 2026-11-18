import { supabase } from './supabase'

export interface ExtractedProforma {
  [field: string]: unknown
  lineItems?: { description: string; quantity: string; unit: string; unitPrice: string }[]
}

/** Sends a PDF, an image or pasted text to the server, which reads it into proforma fields. */
export async function extractProforma(input: File | string): Promise<ExtractedProforma> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Inicia sesión para leer documentos.')
  const form = new FormData()
  if (typeof input === 'string') form.append('text', input)
  else form.append('file', input)
  const res = await fetch('/api/proforma/extract', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'No se pudo leer el documento.')
  return body.fields ?? {}
}
