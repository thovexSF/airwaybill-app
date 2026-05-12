import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? ''

const EVENT_EMOJI: Record<string, string> = {
  awb_downloaded: '📥',
  subscription_completed: '💰',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { event, data } = await req.json()

    const emoji = EVENT_EMOJI[event] ?? '📊'
    const lines = [`${emoji} <b>airwaybill.app</b>: ${event}`]
    if (data?.email) lines.push(`👤 ${data.email}`)
    if (data?.awb)   lines.push(`📋 AWB: ${data.awb}`)
    if (data?.plan)  lines.push(`📦 Plan: ${data.plan}`)

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML' }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: CORS, status: 200 })
  } catch (err) {
    console.error('notify-owner error:', err)
    return new Response(JSON.stringify({ ok: false }), { headers: CORS, status: 200 })
  }
})
