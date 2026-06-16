import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const WEBHOOK_URL = Deno.env.get('FEEDBACK_WEBHOOK_URL') ?? ''
const FEEDBACK_TOKEN = Deno.env.get('FEEDBACK_TOKEN') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  if (!WEBHOOK_URL || !FEEDBACK_TOKEN) {
    console.error('feedback: FEEDBACK_WEBHOOK_URL or FEEDBACK_TOKEN not configured')
    return new Response(
      JSON.stringify({ ok: false, error: 'not_configured' }),
      { headers: CORS, status: 503 },
    )
  }

  try {
    const body = await req.json()
    const text = String(body?.text ?? '').trim()

    if (text.length < 3) {
      return new Response(
        JSON.stringify({ ok: false, error: 'too_short' }),
        { headers: CORS, status: 400 },
      )
    }

    const payload = {
      text: text.slice(0, 2000),
      page: body?.page ? String(body.page).slice(0, 200) : undefined,
      user_email: body?.user_email ? String(body.user_email).slice(0, 200) : undefined,
      user_agent: body?.user_agent ? String(body.user_agent).slice(0, 300) : undefined,
      context: body?.context && typeof body.context === 'object' ? body.context : undefined,
    }

    const agentRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Feedback-Token': FEEDBACK_TOKEN,
      },
      body: JSON.stringify(payload),
    })

    const agentBody = await agentRes.json().catch(() => ({}))

    if (!agentRes.ok) {
      console.error('feedback: agent webhook failed', agentRes.status, agentBody)
      return new Response(
        JSON.stringify({ ok: false, error: 'agent_error' }),
        { headers: CORS, status: 502 },
      )
    }

    return new Response(
      JSON.stringify({ ok: true, id: agentBody.id ?? null }),
      { headers: CORS, status: 200 },
    )
  } catch (err) {
    console.error('feedback error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'server_error' }),
      { headers: CORS, status: 500 },
    )
  }
})
