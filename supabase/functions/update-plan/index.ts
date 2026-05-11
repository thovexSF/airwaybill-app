import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    console.log('Auth header present:', !!authHeader, '| JWT length:', jwt.length)

    if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt)
    console.log('Auth result — user:', user?.id ?? null, '| error:', authErr?.message ?? null)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized: ' + (authErr?.message ?? 'no user') }), { status: 401, headers: CORS })

    // ── Get org + subscription ────────────────────────────────────────
    const { data: member, error: memberErr } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    console.log('Member:', member?.organization_id ?? null, '| error:', memberErr?.message ?? null)
    if (!member) return new Response(JSON.stringify({ error: 'No organization found' }), { status: 400, headers: CORS })

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('paddle_subscription_id, plan')
      .eq('id', member.organization_id)
      .single()

    console.log('Org plan:', org?.plan ?? null, '| sub_id:', org?.paddle_subscription_id ?? null, '| error:', orgErr?.message ?? null)

    if (!org?.paddle_subscription_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found (paddle_subscription_id is null)' }), { status: 400, headers: CORS })
    }

    // ── Parse request ─────────────────────────────────────────────────
    const body = await req.json()
    const { action, priceId } = body
    console.log('Action:', action, '| priceId:', priceId ?? null)

    const paddleKey = Deno.env.get('PADDLE_API_KEY')
    console.log('PADDLE_API_KEY present:', !!paddleKey)
    if (!paddleKey) return new Response(JSON.stringify({ error: 'PADDLE_API_KEY not configured' }), { status: 500, headers: CORS })

    const paddleHeaders = {
      'Authorization': `Bearer ${paddleKey}`,
      'Content-Type': 'application/json',
    }
    const subId = org.paddle_subscription_id

    let paddleRes: Response

    if (action === 'cancel') {
      paddleRes = await fetch(`https://api.paddle.com/subscriptions/${subId}/cancel`, {
        method: 'POST',
        headers: paddleHeaders,
        body: JSON.stringify({ effective_from: 'next_billing_period' }),
      })
    } else if (action === 'change' && priceId) {
      paddleRes = await fetch(`https://api.paddle.com/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: paddleHeaders,
        body: JSON.stringify({
          items: [{ price_id: priceId, quantity: 1 }],
          proration_billing_mode: 'do_not_bill',
        }),
      })
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: CORS })
    }

    const result = await paddleRes.json()
    console.log('Paddle response status:', paddleRes.status, '| body:', JSON.stringify(result).slice(0, 200))

    if (!paddleRes.ok) {
      const msg = result?.error?.detail ?? result?.error?.type ?? JSON.stringify(result?.error ?? result)
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: CORS })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: CORS })

  } catch (e: any) {
    console.error('update-plan exception:', e.message)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
  }
})
