/**
 * Create a partner API key for an organization.
 *
 * Usage:
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=…
 *   npm run partner:create-key -- --org-id <uuid> --user-id <uuid> [--name "B2B Express"] [--plan enterprise]
 *
 * Prints the secret once. Paste it in B2B → Configuración → Airwaybill (or set AIRWAYBILL_API_KEY).
 */
import { adminClient, generateApiKey } from '../server/partnerAuth'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const orgId = arg('org-id')
  const userId = arg('user-id')
  const name = arg('name') || 'B2B Express'
  const plan = arg('plan') || 'enterprise'

  if (!orgId || !userId) {
    console.error('Required: --org-id <uuid> --user-id <uuid>')
    process.exit(1)
  }

  const supabase = adminClient()
  const { secret, prefix, hash } = generateApiKey()

  // Ensure org is on waived plan for this self-client
  await supabase.from('organizations').update({ plan }).eq('id', orgId)

  const { data, error } = await supabase
    .from('partner_api_keys')
    .insert({
      organization_id: orgId,
      acting_user_id: userId,
      name,
      key_prefix: prefix,
      key_hash: hash,
      plan_override: plan,
    })
    .select('id, key_prefix, name, plan_override')
    .single()

  if (error) {
    console.error(error)
    process.exit(1)
  }

  console.log(JSON.stringify({
    id: data.id,
    name: data.name,
    key_prefix: data.key_prefix,
    plan_override: data.plan_override,
    secret,
    note: 'Save secret now — it will not be shown again. Paste it in B2B → Airwaybill settings.',
  }, null, 2))
}

main()
