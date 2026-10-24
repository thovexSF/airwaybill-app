import crypto from 'node:crypto'

/**
 * eAWB over SMTP. The platform holds one mailbox per environment (EAWB_FROM),
 * which each airline registers once as a message provider; every client's FWB
 * goes out from it and the airline's FMA / FNA / FSU come back to it, matched
 * to the document by AWB number.
 *
 *   RESEND_API_KEY       sends, and reads received mail
 *   EAWB_FROM            sender and reply mailbox (default eawb@airwaybill.app)
 *   EAWB_TYPEB_ORIGIN    the platform's own Type B address, when one is assigned
 *   EAWB_WEBHOOK_SECRET  signing secret of the Resend "email.received" webhook
 *   EAWB_INBOUND_SECRET  shared key of the Cloudflare Email Worker
 *                        (cloudflare/eawb-email-worker.js), the free way in:
 *                        airwaybill.app already receives mail through Cloudflare Email Routing
 */

export const EAWB_FROM = () => process.env.EAWB_FROM || 'eawb@airwaybill.app'

export interface EawbChannel {
  airline_prefix: string
  airline_name: string
  destination_email: string
  type_b_address: string | null
}

/**
 * Type B framing for an airline that gave an address: priority + destination,
 * then "." + our origin and a DDHHMM UTC stamp. Without a destination the
 * Cargo-IMP text goes as is, which is what most email gateways expect.
 */
export function typeBEnvelope(body: string, channel: EawbChannel, now = new Date()): string {
  const dest = channel.type_b_address?.trim().toUpperCase()
  const origin = process.env.EAWB_TYPEB_ORIGIN?.trim().toUpperCase()
  if (!dest || !origin) return body
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${p(now.getUTCDate())}${p(now.getUTCHours())}${p(now.getUTCMinutes())}`
  return `QK ${dest}\n.${origin} ${stamp}\n${body}`
}

export async function sendEawbMail(channel: EawbChannel, awbNumber: string, text: string, kind: 'FWB' | 'FHL' = 'FWB') {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no está configurada en el servidor')
  const from = EAWB_FROM()
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Airwaybill eAWB <${from}>`,
      to: channel.destination_email,
      reply_to: from,
      subject: `${kind} ${awbNumber}`,
      // Gateways parse the plain-text body line by line; no HTML part.
      text,
    }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body?.message || `Resend respondió ${r.status}`)
  return body?.id as string | undefined
}

export interface AirlineReply {
  type: 'FMA' | 'FNA' | 'FSU' | 'OTHER'
  awbNumber: string | null
  statusCode: string | null
  error: string | null
}

const FSU_CODES = /^(BKD|RCS|FOH|PRE|MAN|DEP|TFD|RCT|RCF|ARR|NFD|AWD|CCD|DLV|DDL|DIS|TGC|CRC|OCI)\b/

/** Reads an airline's Cargo-IMP reply; any Type B heading lines before it are skipped. */
export function parseAirlineReply(text: string): AirlineReply {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  const head = lines.find(l => /^(FMA|FNA|FSU)\b/.test(l))
  const type = (head?.slice(0, 3) as AirlineReply['type']) ?? 'OTHER'
  const awb = /(?<!\d)(\d{3})-(\d{8})(?!\d)/.exec(text)
  const statusLine = type === 'FSU' ? lines.find(l => FSU_CODES.test(l)) : undefined
  const ack = type === 'FNA'
    ? lines.filter(l => l.startsWith('ACK/')).map(l => l.slice(4).trim()).join(' · ') || null
    : null
  return {
    type,
    awbNumber: awb ? `${awb[1]}-${awb[2]}` : null,
    statusCode: statusLine ? statusLine.slice(0, 3) : null,
    error: ack,
  }
}

/** Resend signs webhooks the Svix way: HMAC-SHA256 of "id.timestamp.body" with the whsec_ secret. */
export function verifyResendWebhook(raw: Buffer, headers: Record<string, string | undefined>): boolean {
  const secret = process.env.EAWB_WEBHOOK_SECRET
  const id = headers['svix-id'], ts = headers['svix-timestamp'], sigs = headers['svix-signature']
  if (!secret || !id || !ts || !sigs) return false
  // Replays older than five minutes are refused.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw.toString('utf8')}`).digest()
  return sigs.split(' ').some(s => {
    const [, sig] = s.split(',')
    const got = sig ? Buffer.from(sig, 'base64') : Buffer.alloc(0)
    return got.length === expected.length && crypto.timingSafeEqual(got, expected)
  })
}

/** The webhook only carries metadata; the body is fetched from the Receiving API. */
export async function fetchReceivedEmail(emailId: string): Promise<{ text: string; from: string; subject: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no está configurada en el servidor')
  const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body?.message || `Resend respondió ${r.status}`)
  const html = String(body.html ?? '')
  const text = body.text ?? html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
  return { text: String(text), from: String(body.from ?? ''), subject: String(body.subject ?? '') }
}
