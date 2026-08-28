import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type UserContext = {
  userId: string
  organizationId: string
  supabase: SupabaseClient
}

function supabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/** Cliente Supabase con la sesión del usuario (RLS); no requiere service role. */
export function userClient(accessToken: string): SupabaseClient {
  const cfg = supabasePublicConfig()
  if (!cfg) {
    throw new Error('Falta SUPABASE_URL y SUPABASE_ANON_KEY (o VITE_SUPABASE_*) en el servidor')
  }
  return createClient(cfg.url, cfg.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function authenticateUser(authorization: string | undefined): Promise<UserContext | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return null

  try {
    const supabase = userClient(token)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (!member?.organization_id) return null
    return { userId: data.user.id, organizationId: member.organization_id, supabase }
  } catch (e) {
    console.error('authenticateUser failed', e)
    return null
  }
}
