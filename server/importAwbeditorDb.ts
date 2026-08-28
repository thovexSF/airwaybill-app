import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import AdmZip from 'adm-zip'
import { externalIdForRow, mapDgdRow, mapHawbRow, mapMawbRow } from './mapAwbeditorRows'
import { parseAwbeditorDbFile } from './parseAwbeditorDbNode'

export type AwbEditorParseResult = {
  mawb: Record<string, unknown>[]
  hawb: Record<string, unknown>[]
  dgd: Record<string, unknown>[]
  errors: { id?: number; type?: number; error: string }[]
}

export type AwbEditorImportStats = {
  mawbCreated: number
  mawbUpdated: number
  hawbCreated: number
  hawbUpdated: number
  dgdCreated: number
  dgdUpdated: number
  skipped: number
  errors: string[]
}

function extractDbToTemp(buffer: Buffer, originalName: string): { dbPath: string; tmpDir: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awb-db-import-'))
  const lower = originalName.toLowerCase()
  const dbPath = path.join(tmpDir, 'awbeditor.db')
  if (lower.endsWith('.zip')) {
    const zip = new AdmZip(buffer)
    const entry = zip.getEntry('awbeditor.db')
    if (!entry) throw new Error('El ZIP no contiene awbeditor.db en la raíz')
    fs.writeFileSync(dbPath, entry.getData())
  } else if (lower.endsWith('.db')) {
    fs.writeFileSync(dbPath, buffer)
  } else {
    throw new Error('Formato no soportado. Usa awbeditor.db o .zip')
  }
  return { dbPath, tmpDir }
}

export function parseAwbeditorDbBuffer(buffer: Buffer, originalName = 'awbeditor.db'): AwbEditorParseResult {
  const { dbPath, tmpDir } = extractDbToTemp(buffer, originalName)
  try {
    return parseAwbeditorDbFile(dbPath)
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

async function upsertDocument(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  externalId: string,
  data: Record<string, unknown>,
): Promise<'created' | 'updated'> {
  const status = data.isDraft ? 'draft' : 'final'
  const { data: existing } = await supabase
    .from('awb_documents')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('external_id', externalId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('awb_documents')
      .update({ data, status, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw error
    return 'updated'
  }

  const { error } = await supabase.from('awb_documents').insert({
    data,
    status,
    organization_id: organizationId,
    user_id: userId,
    external_id: externalId,
  })
  if (error) throw error
  return 'created'
}

export async function importAwbeditorToOrg(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  parsed: AwbEditorParseResult,
): Promise<AwbEditorImportStats> {
  const stats: AwbEditorImportStats = {
    mawbCreated: 0,
    mawbUpdated: 0,
    hawbCreated: 0,
    hawbUpdated: 0,
    dgdCreated: 0,
    dgdUpdated: 0,
    skipped: 0,
    errors: [],
  }

  for (const row of parsed.mawb || []) {
    const awbNumber = String(row.awbNumber || '')
    if (!awbNumber || awbNumber === '045') {
      stats.skipped++
      continue
    }
    try {
      const data = mapMawbRow(row) as unknown as Record<string, unknown>
      const ext = externalIdForRow('mawb', row)
      const action = await upsertDocument(supabase, organizationId, userId, ext, data)
      if (action === 'created') stats.mawbCreated++
      else stats.mawbUpdated++
    } catch (e: any) {
      stats.errors.push(`MAWB ${awbNumber}: ${e?.message || e}`)
    }
  }

  for (const row of parsed.hawb || []) {
    const hawbNumber = String(row.hawbNumber || row.document_number || '')
    if (!hawbNumber) {
      stats.skipped++
      continue
    }
    try {
      const data = mapHawbRow(row) as unknown as Record<string, unknown>
      const ext = externalIdForRow('hawb', row)
      const action = await upsertDocument(supabase, organizationId, userId, ext, data)
      if (action === 'created') stats.hawbCreated++
      else stats.hawbUpdated++
    } catch (e: any) {
      stats.errors.push(`HAWB ${hawbNumber}: ${e?.message || e}`)
    }
  }

  for (const row of parsed.dgd || []) {
    const label = String(row.dgdNumber || row.externalId || '')
    try {
      const data = mapDgdRow(row) as unknown as Record<string, unknown>
      const ext = externalIdForRow('dgd', row)
      const action = await upsertDocument(supabase, organizationId, userId, ext, data)
      if (action === 'created') stats.dgdCreated++
      else stats.dgdUpdated++
    } catch (e: any) {
      stats.errors.push(`DGD ${label}: ${e?.message || e}`)
    }
  }

  for (const err of parsed.errors || []) {
    stats.errors.push(`Parse doc ${err.id}: ${err.error}`)
  }

  return stats
}

export async function importAwbeditorDbBuffer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  buffer: Buffer,
  originalName: string,
): Promise<AwbEditorImportStats & { preview: { mawb: number; hawb: number; dgd: number } }> {
  const parsed = parseAwbeditorDbBuffer(buffer, originalName)
  const stats = await importAwbeditorToOrg(supabase, organizationId, userId, parsed)
  return {
    ...stats,
    preview: {
      mawb: parsed.mawb?.length || 0,
      hawb: parsed.hawb?.length || 0,
      dgd: parsed.dgd?.length || 0,
    },
  }
}
