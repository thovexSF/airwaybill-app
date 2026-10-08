import { Plan } from './usePlan'

export type WatermarkableDocumentData = {
  isDraft: boolean
}

export interface PdfWatermarkPolicyOptions {
  plan: Plan
  forceWatermark?: boolean
  isDemo?: boolean
}

/**
 * Paid plans always render production PDFs without the DRAFT watermark.
 * Free/demo flows keep the user's draft choice, with the free quota gate able
 * to force the watermark once the included documents have been used.
 */
export function withPdfWatermarkPolicy<T extends WatermarkableDocumentData>(
  data: T,
  { plan, forceWatermark = false, isDemo = false }: PdfWatermarkPolicyOptions,
): T {
  if (isDemo) {
    return forceWatermark && !data.isDraft ? { ...data, isDraft: true } : data
  }

  const shouldWatermark = plan === 'free'
    ? forceWatermark || data.isDraft
    : false

  return data.isDraft === shouldWatermark ? data : { ...data, isDraft: shouldWatermark }
}
