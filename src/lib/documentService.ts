import { supabase } from './supabase'

/**
 * Generic CRUD over the shared `awb_documents` table, parameterised by the
 * `docType` discriminator stored inside the JSON `data` column. AWB, DGD and
 * Manifest keep their own hand-written services; every document type ported
 * from the B2B suite goes through this one.
 */

export type SuiteDocType =
  | 'label'
  | 'proforma'
  | 'bl'
  | 'bl_manifest'
  | 'imo_dgd'
  | 'fwb'
  | 'fhl'
  | 'ffr'

export interface SuiteDocumentData {
  docType: string
  isDraft: boolean
}

export interface SuiteDocument<T extends SuiteDocumentData> {
  id: string
  user_id: string
  data: T
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
}

export async function listDocuments<T extends SuiteDocumentData>(docType: SuiteDocType): Promise<SuiteDocument<T>[]> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as any[]).filter(d => d.data?.docType === docType) as SuiteDocument<T>[]
}

export async function getDocument<T extends SuiteDocumentData>(id: string): Promise<SuiteDocument<T>> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as SuiteDocument<T>
}

export async function saveDocument<T extends SuiteDocumentData>(docData: T, id?: string): Promise<SuiteDocument<T>> {
  const status: 'draft' | 'final' = docData.isDraft ? 'draft' : 'final'

  if (id) {
    const { data, error } = await supabase
      .from('awb_documents')
      .update({ data: docData, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as SuiteDocument<T>
  }

  const { data, error } = await supabase
    .from('awb_documents')
    .insert({ data: docData, status })
    .select()
    .single()

  if (error) throw error
  return data as SuiteDocument<T>
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('awb_documents').delete().eq('id', id)
  if (error) throw error
}
