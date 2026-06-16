import { supabase } from './supabase'

export type FeedbackPayload = {
  text: string
  page?: string
  user_email?: string
  user_agent?: string
  context?: Record<string, unknown>
}

export type FeedbackResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResult> {
  const text = payload.text.trim()
  if (text.length < 3) {
    return { ok: false, error: 'too_short' }
  }

  const { data, error } = await supabase.functions.invoke('feedback', {
    body: {
      text,
      page: payload.page,
      user_email: payload.user_email,
      user_agent: payload.user_agent ?? navigator.userAgent,
      context: payload.context,
    },
  })

  if (error) {
    console.error('[feedback]', error)
    return { ok: false, error: error.message || 'network' }
  }

  if (data?.ok && data?.id) {
    return { ok: true, id: data.id }
  }

  return { ok: false, error: data?.error || 'unknown' }
}
