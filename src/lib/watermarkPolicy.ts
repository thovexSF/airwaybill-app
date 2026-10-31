import { Plan } from './usePlan'

export interface DraftableDocument {
  isDraft: boolean
}

/**
 * One render-time rule for every PDF:
 * - Free users over the allowance always get the DRAFT watermark.
 * - Paid plans never get the DRAFT watermark, even for older saved drafts.
 * - Free users inside the allowance keep the document's own draft toggle.
 */
export function withPdfWatermarkPolicy<T extends DraftableDocument>(
  data: T,
  { plan, forceWatermark }: { plan: Plan; forceWatermark?: boolean },
): T {
  const shouldBeDraft = plan === 'free' && (forceWatermark || data.isDraft)
  if (data.isDraft === shouldBeDraft) return data
  return { ...data, isDraft: shouldBeDraft }
}
