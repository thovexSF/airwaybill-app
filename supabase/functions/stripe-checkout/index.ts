import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' })

const PRICE_IDS: Record<string, string> = {
  starter: Deno.env.get('STRIPE_PRICE_STARTER') ?? '',
  pro:     Deno.env.get('STRIPE_PRICE_PRO')     ?? '',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token!)
    if (error || !user) return new Response('Unauthorized', { status: 401 })

    const { plan, successUrl, cancelUrl } = await req.json()
    const priceId = PRICE_IDS[plan]
    if (!priceId) return new Response('Invalid plan', { status: 400 })

    // Get or create Stripe customer
    const { data: org } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(stripe_customer_id)')
      .eq('user_id', user.id)
      .single()

    let customerId = (org?.organizations as any)?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { org_id: org!.organization_id } })
      customerId = customer.id
      await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org!.organization_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      subscription_data: { metadata: { org_id: org!.organization_id, plan } },
      allow_promotion_codes: true,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
