import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDocument, saveDocument, SuiteDocType, SuiteDocumentData } from './documentService'
import { usePdfDownloadGuard, DownloadAuthorization } from './pdfQuota'

export type { DownloadAuthorization }

/**
 * Load-by-id + save state shared by the suite document editors, so each page
 * only owns its own fields. `route` is the editor's path, used to put the new
 * document id in the URL after the first save.
 */
export function useDocEditor<T extends SuiteDocumentData>(
  _docType: SuiteDocType,
  defaultData: T,
  route: string,
) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const docId = searchParams.get('id')

  const guard = usePdfDownloadGuard()

  const [data, setData] = useState<T>(defaultData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!docId) return
    getDocument<T>(docId)
      .then(doc => {
        setData(doc.data)
        setCurrentId(doc.id)
        guard.setCountedAt((doc as any).download_counted_at ?? null)
      })
      .catch(() => {})
  }, [docId])

  /** Persist and return the document id, or null if the save failed. */
  async function persist(): Promise<string | null> {
    const doc = await saveDocument<T>(data, currentId ?? undefined)
    setCurrentId(doc.id)
    guard.setCountedAt((doc as any).download_counted_at ?? null)
    navigate(`${route}?id=${doc.id}`, { replace: true })
    return doc.id
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      await persist()
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch (e: any) {
      setSaveMsg(`Save error: ${e?.message ?? 'unknown'}`)
    }
    setSaving(false)
  }

  /**
   * Charge one unit of the monthly document quota before a PDF download.
   * Saves the document first when it is still unsaved, so the same document
   * re-downloaded later does not consume a second unit.
   */
  async function authorizeDownload(): Promise<DownloadAuthorization> {
    if (guard.atLimit) return { ok: false, message: guard.limitMessage }

    let id = currentId
    if (!id) {
      try {
        id = await persist()
      } catch (e) {
        console.error('Save before download failed:', e)
      }
    }
    return guard.authorize(id)
  }

  /** Patch a single top-level field. */
  const set = <K extends keyof T>(key: K) => (value: T[K]) =>
    setData(d => ({ ...d, [key]: value }))

  return {
    data, setData, set,
    currentId, saving, saveMsg, setSaveMsg, save,
    authorizeDownload,
    atLimit: guard.atLimit,
    plan: guard.plan,
    docsUsedThisMonth: guard.docsUsedThisMonth,
    docLimit: guard.docLimit,
  }
}

/** Ids for newly added table rows — short and unique enough for a form. */
export const newRowId = () => Math.random().toString(36).slice(2, 8)
