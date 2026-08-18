import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDocument, saveDocument, SuiteDocType, SuiteDocumentData } from './documentService'

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

  const [data, setData] = useState<T>(defaultData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!docId) return
    getDocument<T>(docId)
      .then(doc => { setData(doc.data); setCurrentId(doc.id) })
      .catch(() => {})
  }, [docId])

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveDocument<T>(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`${route}?id=${doc.id}`, { replace: true })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch (e: any) {
      setSaveMsg(`Save error: ${e?.message ?? 'unknown'}`)
    }
    setSaving(false)
  }

  /** Patch a single top-level field. */
  const set = <K extends keyof T>(key: K) => (value: T[K]) =>
    setData(d => ({ ...d, [key]: value }))

  return { data, setData, set, currentId, saving, saveMsg, save }
}

/** Ids for newly added table rows — short and unique enough for a form. */
export const newRowId = () => Math.random().toString(36).slice(2, 8)
