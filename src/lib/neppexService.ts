import { supabase } from './supabase'
import { isPartnerHost, partnerDelete, partnerGet, partnerList, partnerSave } from './partnerHost'
import { NeppexData } from '../types/neppex'

export interface NeppexDocument {
  id: string
  user_id: string
  data: NeppexData
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
}

export async function listNeppex(): Promise<NeppexDocument[]> {
  if (isPartnerHost()) return partnerList<NeppexDocument>('neppex')
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as any[]).filter(d => d.data?.docType === 'neppex') as NeppexDocument[]
}

export async function getNeppex(id: string): Promise<NeppexDocument> {
  if (isPartnerHost()) return partnerGet<NeppexDocument>(id)
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as NeppexDocument
}

export async function saveNeppex(neppexData: NeppexData, id?: string): Promise<NeppexDocument> {
  if (isPartnerHost()) return partnerSave<NeppexDocument>(neppexData, id)
  const status = neppexData.isDraft ? 'draft' : 'final'

  if (id) {
    const { data, error } = await supabase
      .from('awb_documents')
      .update({ data: neppexData, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as NeppexDocument
  }

  const { data, error } = await supabase
    .from('awb_documents')
    .insert({ data: neppexData, status })
    .select()
    .single()

  if (error) throw error
  return data as NeppexDocument
}

export async function deleteNeppex(id: string): Promise<void> {
  if (isPartnerHost()) return partnerDelete(id)
  const { error } = await supabase
    .from('awb_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
