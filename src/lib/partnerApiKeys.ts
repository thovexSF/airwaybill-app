/** Browser-side helpers for Partner API keys (secret shown once at creation). */

export type PartnerApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  plan_override: string | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashApiKey(secret: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateApiKeySecret(): { secret: string; prefix: string } {
  const raw = toBase64Url(crypto.getRandomValues(new Uint8Array(24)))
  const secret = `awb_live_${raw}`
  return { secret, prefix: secret.slice(0, 16) }
}
