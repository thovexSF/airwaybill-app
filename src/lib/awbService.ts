import { supabase } from './supabase'
import { isPartnerHost, partnerDelete, partnerGet, partnerList, partnerSave } from './partnerHost'
import { AWBData } from '../types/awb'

export interface AWBDocument {
  id: string
  user_id: string
  organization_id: string | null
  data: AWBData
  status: 'draft' | 'final'
  download_counted_at: string | null
  created_at: string
  updated_at: string
}

export async function listAWBs(): Promise<AWBDocument[]> {
  if (isPartnerHost()) return partnerList<AWBDocument>()
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data as AWBDocument[]
}

export async function getAWB(id: string): Promise<AWBDocument> {
  let doc: AWBDocument
  if (isPartnerHost()) {
    doc = await partnerGet<AWBDocument>(id)
  } else {
    const { data, error } = await supabase
      .from('awb_documents')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    doc = data as AWBDocument
  }
  // Migrate legacy optionalShippingInfo → optionalShippingInfo1
  if (doc.data.optionalShippingInfo && !doc.data.optionalShippingInfo1) {
    doc.data.optionalShippingInfo1 = doc.data.optionalShippingInfo
    doc.data.optionalShippingInfo2 = ''
    doc.data.optionalShippingInfo3 = ''
    delete doc.data.optionalShippingInfo
  }
  if (!doc.data.signatureCarrier) doc.data.signatureCarrier = ''
  return doc
}

export async function saveAWB(awbData: AWBData, id?: string, orgId?: string): Promise<AWBDocument> {
  if (isPartnerHost()) return partnerSave<AWBDocument>(awbData, id)
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
    .insert({ data: awbData, organization_id: orgId, status: awbData.isDraft ? 'draft' : 'final' })
    .select()
    .single()

  if (error) throw error
  return data as AWBDocument
}

export async function deleteAWB(id: string): Promise<void> {
  if (isPartnerHost()) return partnerDelete(id)
  const { error } = await supabase
    .from('awb_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
