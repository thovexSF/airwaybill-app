import { supabase } from './supabase'

export interface EawbChannel {
  airline_prefix: string
  airline_name: string
  destination_email: string
  type_b_address: string | null
  active: boolean
}

export interface EawbMessage {
  id: string
  direction: 'out' | 'in'
  message_type: string
  status_code: string | null
  counterpart: string | null
  body: string
  error: string | null
  created_at: string
}

export async function getEawbChannel(prefix: string): Promise<EawbChannel | null> {
  const { data } = await supabase
    .from('eawb_channels').select('*').eq('airline_prefix', prefix).eq('active', true).maybeSingle()
  return (data as EawbChannel | null) ?? null
}

export async function listEawbMessages(documentId: string): Promise<EawbMessage[]> {
  const { data } = await supabase
    .from('eawb_messages').select('id, direction, message_type, status_code, counterpart, body, error, created_at')
    .eq('document_id', documentId).order('created_at', { ascending: false })
  return (data as EawbMessage[] | null) ?? []
}

export async function sendEawb(documentId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Inicia sesión para enviar la eAWB.')
  const res = await fetch('/api/eawb/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ documentId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || 'No se pudo enviar la eAWB.')
}

/** Where a document stands, from its last message: the airline's reply wins over our send. */
export function eawbState(messages: EawbMessage[]): { label: string; color: string; bg: string } | null {
  // Mail that is not a Cargo-IMP reply (a bounce, a person writing back) says nothing about acceptance.
  const last = messages.find(m => m.direction === 'out' || ['FMA', 'FNA', 'FSU'].includes(m.message_type))
  if (!last) return null
  if (last.direction === 'out') {
    return last.error
      ? { label: 'Error al enviar', color: '#a00', bg: '#fdecea' }
      : { label: 'Enviada — esperando respuesta', color: '#8a5a00', bg: '#fff4dc' }
  }
  if (last.message_type === 'FNA') return { label: 'Rechazada por la aerolínea', color: '#a00', bg: '#fdecea' }
  if (last.message_type === 'FSU') return { label: `Estado ${last.status_code ?? ''}`.trim(), color: '#1f5f99', bg: '#e8f1fb' }
  return { label: 'Aceptada por la aerolínea (FMA)', color: '#2f7d32', bg: '#eaf6ea' }
}
