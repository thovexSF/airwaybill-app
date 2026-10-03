import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../auth/AuthContext'

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanInfo {
  plan: Plan
  orgId: string | null
  /** Documents of any type downloaded as PDF over the account's lifetime (the free-plan unit). */
  docsUsedThisMonth: number
  docLimit: number | null  // null = unlimited
  canDownloadDocument: boolean
  loading: boolean
  refreshUsage: () => Promise<void>
}

// Keep in step with free_doc_limit() in supabase/migration_free_lifetime_limit.sql.
export const FREE_DOC_LIMIT = 3

const LIMITS: Record<Plan, number | null> = {
  free:       FREE_DOC_LIMIT,
  starter:    null,
  pro:        null,
  enterprise: null,
}

export function usePlan(): PlanInfo {
  const { user } = useAuth()
  const [plan, setPlan]   = useState<Plan>('free')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [used, setUsed]   = useState(0)
  const [loading, setLoading] = useState(true)

  async function loadUsage(id: string) {
    const { data: usage } = await supabase
      .from('awb_usage')
      .select('count')
      .eq('organization_id', id)

    setUsed((usage ?? []).reduce((n, r) => n + (r.count ?? 0), 0))
  }

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function load() {
      setLoading(true)
      // Get org + plan
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(plan)')
        .eq('user_id', user!.id)
        .limit(1)
        .single()

      if (!membership) { setLoading(false); return }

      const id   = membership.organization_id
      const p    = (membership.organizations as any)?.plan ?? 'free'
      setOrgId(id)
      setPlan(p)

      await loadUsage(id)
      setLoading(false)
    }

    load()
  }, [user?.id])

  const limit = LIMITS[plan]
  const canDownloadDocument = limit === null || used < limit
  const refreshUsage = async () => {
    if (orgId) await loadUsage(orgId)
  }

  return {
    plan,
    orgId,
    docsUsedThisMonth: used,
    docLimit: limit,
    canDownloadDocument,
    loading,
    refreshUsage,
  }
}
