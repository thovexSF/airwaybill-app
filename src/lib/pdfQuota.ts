import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from './supabase'
import { usePlan } from './usePlan'

/**
 * Free-plan usage accounting for PDF downloads.
 *
 * The quota is 10 *documents* per organisation per calendar month — any
 * document type in the suite, not just AWBs. The `record_awb_pdf_download`
 * RPC (name kept for backwards compatibility with the deployed function) is
 * already document-agnostic: it works on any row of `awb_documents` and marks
 * `download_counted_at`, so a given document only ever consumes one unit no
 * matter how many times it is re-downloaded.
 */
export type QuotaResult = 'ok' | 'already_counted' | 'limit_reached' | 'skipped'

export interface DownloadAuthorization {
  ok: boolean
  /** Message to surface in the action bar when the download was refused. */
  message?: string
}

export async function recordPdfDownload(
  orgId: string | null,
  documentId: string | null,
  alreadyCountedAt?: string | null,
): Promise<QuotaResult> {
  if (!orgId) return 'skipped'
  if (alreadyCountedAt) return 'already_counted'

  // Without a saved document we cannot mark it as counted, so fall back to the
  // plain monthly counter — it still enforces the limit, it just cannot
  // de-duplicate repeat downloads of the same unsaved draft.
  if (!documentId) {
    const { data, error } = await supabase.rpc('increment_awb_usage', { p_org_id: orgId })
    if (error) throw error
    return (data as QuotaResult) ?? 'ok'
  }

  const { data, error } = await supabase.rpc('record_awb_pdf_download', {
    p_org_id: orgId,
    p_awb_document_id: documentId,
  })
  if (error) throw error
  return (data as QuotaResult) ?? 'ok'
}

/**
 * Charges one unit of the monthly document quota before a PDF download.
 * Used by every document editor so the free-plan allowance is shared across
 * the whole suite rather than counted per document type.
 */
export function usePdfDownloadGuard() {
  const { t } = useTranslation()
  const { plan, orgId, canDownloadDocument, docsUsedThisMonth, docLimit, refreshUsage } = usePlan()
  const [countedAt, setCountedAt] = useState<string | null>(null)

  const atLimit = plan === 'free' && !canDownloadDocument && !countedAt
  const limitMessage = t('editor.limitReached')

  async function authorize(documentId: string | null): Promise<DownloadAuthorization> {
    if (atLimit) return { ok: false, message: limitMessage }
    try {
      const result = await recordPdfDownload(orgId, documentId, countedAt)
      if (result === 'limit_reached') return { ok: false, message: limitMessage }
      if (result === 'ok' || result === 'already_counted') {
        setCountedAt(new Date().toISOString())
        await refreshUsage()
      }
    } catch (e) {
      // Never block the download on a tracking failure — the user already has
      // a valid document; losing one usage unit is the lesser evil.
      console.error('PDF usage tracking failed:', e)
    }
    return { ok: true }
  }

  return { authorize, atLimit, limitMessage, plan, docsUsedThisMonth, docLimit, countedAt, setCountedAt }
}
