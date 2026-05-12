import { supabase } from './supabase'
import { DGDData } from '../types/dgd'

export interface DGDDocument {
  id: string
  user_id: string
  data: DGDData
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
}

export async function listDGDs(): Promise<DGDDocument[]> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as any[]).filter(d => d.data?.docType === 'dgd') as DGDDocument[]
}

export async function getDGD(id: string): Promise<DGDDocument> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as DGDDocument
}

export async function saveDGD(dgdData: DGDData, id?: string): Promise<DGDDocument> {
  const status = dgdData.isDraft ? 'draft' : 'final'

  if (id) {
    const { data, error } = await supabase
      .from('awb_documents')
      .update({ data: dgdData, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as DGDDocument
  }

  const { data, error } = await supabase
    .from('awb_documents')
    .insert({ data: dgdData, status })
    .select()
    .single()

  if (error) throw error
  return data as DGDDocument
}

export async function deleteDGD(id: string): Promise<void> {
  const { error } = await supabase
    .from('awb_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
