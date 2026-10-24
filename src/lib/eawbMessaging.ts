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

/** What each Cargo-IMP message is, for people who never read one. */
export const MESSAGE_MEANING: Record<string, string> = {
  FWB: 'Guía aérea electrónica (eAWB) enviada a la aerolínea',
  FHL: 'Detalle de las guías hijas (HAWB) de la consolidación',
  FMA: 'Acuse de aceptación: la aerolínea recibió la guía y la aceptó',
  FNA: 'Rechazo: la aerolínea no aceptó la guía e indica el motivo',
  FSU: 'Actualización de estado del envío',
}

/** FSU status codes most carriers send, in plain words. */
export const FSU_MEANING: Record<string, string> = {
  BKD: 'reservada', RCS: 'recibida por la aerolínea, lista para transporte', FOH: 'carga en bodega de la aerolínea',
  PRE: 'preparada para el vuelo', MAN: 'manifestada en el vuelo', DEP: 'despegó', TFD: 'transferida a otra aerolínea',
  RCT: 'recibida de otra aerolínea', RCF: 'recibida en destino', ARR: 'llegó a destino', NFD: 'consignatario notificado',
  AWD: 'documentos entregados al consignatario', CCD: 'liberada por aduana', DLV: 'entregada al consignatario',
  DDL: 'entregada a domicilio', DIS: 'con discrepancia', CRC: 'reportada a aduana', OCI: 'información aduanera',
}

/** Where a document stands, from its last message: the airline's reply wins over our send. */
export function eawbState(messages: EawbMessage[]): { label: string; detail: string; color: string; bg: string } | null {
  // Mail that is not a Cargo-IMP reply (a bounce, a person writing back) says nothing about acceptance.
  const last = messages.find(m => m.direction === 'out' || ['FMA', 'FNA', 'FSU'].includes(m.message_type))
  if (!last) return null
  if (last.direction === 'out') {
    return last.error
      ? { label: 'Error al enviar', detail: `El correo no salió: ${last.error}`, color: '#a00', bg: '#fdecea' }
      : { label: 'Enviada — esperando respuesta', detail: 'La guía electrónica (FWB) salió hacia la aerolínea. Debe responder con un FMA (aceptada) o un FNA (rechazada).', color: '#8a5a00', bg: '#fff4dc' }
  }
  if (last.message_type === 'FNA') {
    return { label: 'Rechazada por la aerolínea (FNA)', detail: `FNA es un rechazo: la aerolínea no aceptó la guía.${last.error ? ` Motivo: ${last.error}.` : ''} Corrige la AWB y vuelve a enviarla.`, color: '#a00', bg: '#fdecea' }
  }
  if (last.message_type === 'FSU') {
    const what = last.status_code ? FSU_MEANING[last.status_code] : undefined
    return { label: `Estado ${last.status_code ?? ''}`.trim(), detail: `FSU es una actualización de estado del envío${what ? `: ${what}` : ''}.`, color: '#1f5f99', bg: '#e8f1fb' }
  }
  return { label: 'Aceptada por la aerolínea (FMA)', detail: 'FMA es el acuse de aceptación: la aerolínea recibió la guía electrónica y la aceptó. Ya no hace falta la guía de papel para esa aerolínea.', color: '#2f7d32', bg: '#eaf6ea' }
}
