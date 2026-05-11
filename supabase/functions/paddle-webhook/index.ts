import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLAN_BY_PRICE: Record<string, string> = {
  [Deno.env.get('PADDLE_PRICE_STARTER') ?? '']: 'starter',
  [Deno.env.get('PADDLE_PRICE_PRO')     ?? '']: 'pro',
}

Deno.serve(async (req) => {
  // Verify Paddle webhook signature
  const sig = req.headers.get('paddle-signature') ?? ''
  const body = await req.text()
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET') ?? ''

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const parts = Object.fromEntries(sig.split(';').map(p => p.split('=')))
  const signedPayload = `${parts.ts}:${body}`
  const valid = await crypto.subtle.verify('HMAC', key, hexToBuffer(parts.h1), encoder.encode(signedPayload))
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const event = JSON.parse(body)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const type = event.event_type as string

  if (type === 'subscription.created' || type === 'subscription.updated') {
    const sub = event.data
    const orgId = sub.custom_data?.org_id
    if (!orgId) return new Response('ok')

    const priceId = sub.items?.[0]?.price?.id ?? ''
    const plan = PLAN_BY_PRICE[priceId] ?? 'free'
    const active = sub.status === 'active' || sub.status === 'trialing'

    await supabase.from('organizations').update({
      plan: active ? plan : 'free',
      stripe_subscription_id: sub.id,
      plan_expires_at: active ? sub.current_billing_period?.ends_at : null,
      paddle_customer_id: sub.customer_id ?? null,
      paddle_cancel_url: sub.management_urls?.cancel ?? null,
    }).eq('id', orgId)

    console.log(`Plan updated: org=${orgId} plan=${active ? plan : 'free'} status=${sub.status}`)
  }

  if (type === 'subscription.canceled') {
    const orgId = event.data?.custom_data?.org_id
    if (orgId) {
      await supabase.from('organizations').update({
        plan: 'free',
        stripe_subscription_id: null,
        plan_expires_at: null,
        paddle_cancel_url: null,
      }).eq('id', orgId)
      console.log(`Subscription canceled: org=${orgId}`)
    }
  }

  return new Response('ok')
})

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes.buffer
}
