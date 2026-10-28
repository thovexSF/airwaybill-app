import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { Plan } from './usePlan'

export interface WatermarkPolicy {
  plan: Plan
  atLimit: boolean
  demo?: boolean
}

/**
 * Demo PDFs and Free accounts past their allowance must carry DRAFT; paid
 * accounts should never have a stale draft flag leak into the rendered PDF.
 */
export function applyPdfWatermarkPolicy<T extends { isDraft: boolean }>(
  data: T,
  { plan, atLimit, demo = false }: WatermarkPolicy,
): T {
  const forceDraft = demo || atLimit
  const forceClean = !demo && plan !== 'free'

  if (forceDraft && !data.isDraft) return { ...data, isDraft: true }
  if (forceClean && data.isDraft) return { ...data, isDraft: false }
  return data
}

export function usePaidPlanDraftCleanup<T extends { isDraft: boolean }>(
  data: T,
  setData: Dispatch<SetStateAction<T>>,
  { plan, demo = false }: Pick<WatermarkPolicy, 'plan' | 'demo'>,
) {
  useEffect(() => {
    if (demo || plan === 'free' || !data.isDraft) return
    setData(prev => prev.isDraft ? { ...prev, isDraft: false } : prev)
  }, [data.isDraft, demo, plan, setData])
}
