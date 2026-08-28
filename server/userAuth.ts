import { adminClient } from './partnerAuth'

export type UserContext = {
  userId: string
  organizationId: string
}

export async function authenticateUser(authorization: string | undefined): Promise<UserContext | null> {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) return null

  try {
    const supabase = adminClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (!member?.organization_id) return null
    return { userId: data.user.id, organizationId: member.organization_id }
  } catch (e) {
    console.error('authenticateUser failed', e)
    return null
  }
}
