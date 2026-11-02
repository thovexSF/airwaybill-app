import { supabase } from './supabase'
import { isPartnerHost, partnerDelete, partnerGet, partnerList, partnerSave } from './partnerHost'
import { ManifestData } from '../types/manifest'

export interface ManifestDocument {
  id: string
  user_id: string
  data: ManifestData
  status: 'draft' | 'final'
  created_at: string
  updated_at: string
}

export async function listManifests(): Promise<ManifestDocument[]> {
  if (isPartnerHost()) return partnerList<ManifestDocument>('manifest')
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data as any[]).filter(d => d.data?.docType === 'manifest') as ManifestDocument[]
}

export async function getManifest(id: string): Promise<ManifestDocument> {
  if (isPartnerHost()) return partnerGet<ManifestDocument>(id)
  const { data, error } = await supabase
    .from('awb_documents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ManifestDocument
}

export async function saveManifest(manifestData: ManifestData, id?: string): Promise<ManifestDocument> {
  if (isPartnerHost()) return partnerSave<ManifestDocument>(manifestData, id)
  const status = manifestData.isDraft ? 'draft' : 'final'

  if (id) {
    const { data, error } = await supabase
      .from('awb_documents')
      .update({ data: manifestData, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ManifestDocument
  }

  const { data, error } = await supabase
    .from('awb_documents')
    .insert({ data: manifestData, status })
    .select()
    .single()

  if (error) throw error
  return data as ManifestDocument
}

export async function deleteManifest(id: string): Promise<void> {
  if (isPartnerHost()) return partnerDelete(id)
  const { error } = await supabase
    .from('awb_documents')
    .delete()
    .eq('id', id)

  if (error) throw error
}
