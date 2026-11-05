import { deleteDocument, listDocuments, saveDocument } from './documentService'
import { LabelDesign } from './labelDesign'

/** Label layouts saved per organization, so everyone printing from B2B uses the same ones. */
export type TemplateKind = 'item' | 'overpack'

export interface LabelTemplateData {
  docType: 'labelTemplate'
  isDraft: false
  name: string
  kind: TemplateKind
  design: LabelDesign
}

export interface LabelTemplate {
  id: string
  name: string
  kind: TemplateKind
  design: LabelDesign
}

export async function listLabelTemplates(): Promise<LabelTemplate[]> {
  const docs = await listDocuments<LabelTemplateData>('labelTemplate')
  return docs
    .map(d => ({ id: d.id, name: d.data.name, kind: d.data.kind || 'item', design: d.data.design }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveLabelTemplate(t: Omit<LabelTemplate, 'id'>, id?: string): Promise<LabelTemplate> {
  const doc = await saveDocument<LabelTemplateData>(
    { docType: 'labelTemplate', isDraft: false, name: t.name, kind: t.kind, design: t.design },
    id,
  )
  return { id: doc.id, name: t.name, kind: t.kind, design: t.design }
}

export function deleteLabelTemplate(id: string): Promise<void> {
  return deleteDocument(id)
}

/** The last template used per kind on this computer, applied when the dialog opens. */
const LAST_KEY = 'labelTemplateLast'
export function lastTemplateId(kind: TemplateKind): string | null {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || '{}')[kind] || null } catch { return null }
}
export function rememberTemplate(kind: TemplateKind, id: string | null) {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY) || '{}')
    v[kind] = id
    localStorage.setItem(LAST_KEY, JSON.stringify(v))
  } catch { /* private mode */ }
}
