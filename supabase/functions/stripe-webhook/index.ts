import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const PLAN_BY_PRICE: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_STARTER') ?? '']: 'starter',
  [Deno.env.get('STRIPE_PRICE_PRO')     ?? '']: 'pro',
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e: any) {
    return new Response(`Webhook error: ${e.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription
    const orgId = sub.metadata.org_id
    const priceId = sub.items.data[0]?.price.id
    const plan = PLAN_BY_PRICE[priceId] ?? 'free'
    const active = sub.status === 'active' || sub.status === 'trialing'

    await supabase.from('organizations').update({
      plan: active ? plan : 'free',
      stripe_subscription_id: sub.id,
      plan_expires_at: active ? new Date(sub.current_period_end * 1000).toISOString() : null,
    }).eq('id', orgId)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const orgId = sub.metadata.org_id
    await supabase.from('organizations').update({
      plan: 'free',
      stripe_subscription_id: null,
      plan_expires_at: null,
    }).eq('id', orgId)
  }

  return new Response('ok')
})
