import { createHash, randomBytes } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type PartnerContext = {
  keyId: string
  organizationId: string
  actingUserId: string
  planOverride: string | null
  orgPlan: string
}

export function hashApiKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex')
}

/** Generate a new key. Returns plaintext once; store only the hash. */
export function generateApiKey(): { secret: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString('base64url')
  const secret = `awb_live_${raw}`
  const prefix = secret.slice(0, 16)
  return { secret, prefix, hash: hashApiKey(secret) }
}

export function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for partner API')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function authenticateApiKey(
  supabase: SupabaseClient,
  authorization: string | undefined,
): Promise<PartnerContext | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  const secret = authorization.slice('Bearer '.length).trim()
  if (!secret.startsWith('awb_live_')) return null
  const hash = hashApiKey(secret)

  const { data: row, error } = await supabase
    .from('partner_api_keys')
    .select('id, organization_id, acting_user_id, plan_override, revoked_at, organizations(plan)')
    .eq('key_hash', hash)
    .maybeSingle()

  if (error || !row || row.revoked_at) return null

  await supabase
    .from('partner_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)

  const orgPlan = (row as any).organizations?.plan ?? 'free'
  return {
    keyId: row.id,
    organizationId: row.organization_id,
    actingUserId: row.acting_user_id,
    planOverride: row.plan_override,
    orgPlan,
  }
}

export function effectivePlan(ctx: PartnerContext): string {
  return ctx.planOverride || ctx.orgPlan || 'free'
}
