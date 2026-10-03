import { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from './partnerAuth'
import { userClient } from './userAuth'

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || ''
  return new Set(
    raw
      .split(',')
      // Railway's raw env editor doesn't strip quotes around a value, so
      // `ADMIN_EMAILS="a@b.com"` arrives here with the quotes still on it.
      .map((e) => e.trim().replace(/^["']|["']$/g, '').trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Verifies the bearer token is a real Supabase session for an email on
 * ADMIN_EMAILS, then hands back a service-role client (bypasses RLS) for the
 * backoffice queries. Returns null (401/403 already sent) otherwise.
 */
export async function requireAdmin(
  authorization: string | undefined,
): Promise<{ supabase: SupabaseClient; email: string } | { error: number }> {
  const allowed = adminEmails()
  if (allowed.size === 0) return { error: 503 }

  if (!authorization?.startsWith('Bearer ')) return { error: 401 }
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return { error: 401 }

  const { data, error } = await userClient(token).auth.getUser(token)
  if (error || !data.user?.email) return { error: 401 }

  const email = data.user.email.toLowerCase()
  if (!allowed.has(email)) return { error: 403 }

  return { supabase: adminClient(), email }
}
