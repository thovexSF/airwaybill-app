import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../auth/AuthContext'

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise'

export interface PlanInfo {
  plan: Plan
  orgId: string | null
  awbUsedThisMonth: number
  awbLimit: number | null  // null = unlimited
  canDownloadAWB: boolean
  loading: boolean
  refreshUsage: () => Promise<void>
}

const LIMITS: Record<Plan, number | null> = {
  free:       10,
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
    const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
    const { data: usage } = await supabase
      .from('awb_usage')
      .select('count')
      .eq('organization_id', id)
      .eq('month', month)
      .single()

    setUsed(usage?.count ?? 0)
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
  const canDownloadAWB = limit === null || used < limit
  const refreshUsage = async () => {
    if (orgId) await loadUsage(orgId)
  }

  return {
    plan,
    orgId,
    awbUsedThisMonth: used,
    awbLimit: limit,
    canDownloadAWB,
    loading,
    refreshUsage,
  }
}
