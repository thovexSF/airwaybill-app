import { supabase } from './supabase'
import { AWBData } from '../types/awb'

export interface AWBDocument {
  id: string
  user_id: string
  data: AWBData
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
}

export async function listAWBs(): Promise<AWBDocument[]> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as AWBDocument[]
}

export async function getAWB(id: string): Promise<AWBDocument> {
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as AWBDocument
}

export async function saveAWB(awbData: AWBData, id?: string): Promise<AWBDocument> {
  if (id) {
    const { data, error } = await supabase
      .from('awb_documents')
      .update({ data: awbData, status: awbData.isDraft ? 'draft' : 'final', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AWBDocument
  }

  const { data, error } = await supabase
    .from('awb_documents')
    .insert({ data: awbData, status: awbData.isDraft ? 'draft' : 'final' })
    .select()
    .single()

  if (error) throw error
  return data as AWBDocument
}

export async function deleteAWB(id: string): Promise<void> {
  const { error } = await supabase
    .from('awb_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
