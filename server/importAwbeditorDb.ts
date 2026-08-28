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

async function loadExistingByExternalId(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('awb_documents')
      .select('id, external_id')
      .eq('organization_id', organizationId)
      .not('external_id', 'is', null)
      .order('id')
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.external_id) map.set(row.external_id, row.id)
    }
    if (data.length < pageSize) break
    offset += pageSize
  }
  return map
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  if (!items.length) return
  let idx = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      await fn(items[i])
    }
  })
  await Promise.all(workers)
}

type ImportItem = {
  label: string
  externalId: string
  data: Record<string, unknown>
  kind: 'mawb' | 'hawb' | 'dgd'
}

async function flushInserts(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  rows: ImportItem[],
  stats: AwbEditorImportStats,
  onItemDone?: () => void,
) {
  const batchSize = 50
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('awb_documents').insert(
      chunk.map((item) => ({
        data: item.data,
        status: item.data.isDraft ? 'draft' : 'final',
        organization_id: organizationId,
        user_id: userId,
        external_id: item.externalId,
      })),
    )
    if (error) {
      for (const item of chunk) {
        stats.errors.push(`${item.label}: ${error.message}`)
        onItemDone?.()
      }
      continue
    }
    for (const item of chunk) {
      if (item.kind === 'mawb') stats.mawbCreated++
      else if (item.kind === 'hawb') stats.hawbCreated++
      else stats.dgdCreated++
      onItemDone?.()
    }
  }
}

async function flushUpdates(
  supabase: SupabaseClient,
  rows: { item: ImportItem; id: string }[],
  stats: AwbEditorImportStats,
  onItemDone?: () => void,
) {
  await runPool(rows, 20, async ({ item, id }) => {
    try {
      const { error } = await supabase
        .from('awb_documents')
        .update({ data: item.data, status: item.data.isDraft ? 'draft' : 'final', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      if (item.kind === 'mawb') stats.mawbUpdated++
      else if (item.kind === 'hawb') stats.hawbUpdated++
      else stats.dgdUpdated++
    } catch (e: any) {
      stats.errors.push(`${item.label}: ${e?.message || e}`)
    }
    onItemDone?.()
  })
}

export async function importAwbeditorToOrg(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  parsed: AwbEditorParseResult,
  onProgress?: (pct: number) => void,
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

  const items: ImportItem[] = []

  for (const row of parsed.mawb || []) {
    const awbNumber = String(row.awbNumber || '')
    if (!awbNumber || awbNumber === '045') {
      stats.skipped++
      continue
    }
    items.push({
      label: `MAWB ${awbNumber}`,
      externalId: externalIdForRow('mawb', row),
      data: mapMawbRow(row) as unknown as Record<string, unknown>,
      kind: 'mawb',
    })
  }

  for (const row of parsed.hawb || []) {
    const hawbNumber = String(row.hawbNumber || row.document_number || '')
    if (!hawbNumber) {
      stats.skipped++
      continue
    }
    items.push({
      label: `HAWB ${hawbNumber}`,
      externalId: externalIdForRow('hawb', row),
      data: mapHawbRow(row) as unknown as Record<string, unknown>,
      kind: 'hawb',
    })
  }

  for (const row of parsed.dgd || []) {
    const label = String(row.dgdNumber || row.externalId || '')
    items.push({
      label: `DGD ${label}`,
      externalId: externalIdForRow('dgd', row),
      data: mapDgdRow(row) as unknown as Record<string, unknown>,
      kind: 'dgd',
    })
  }

  const total = items.length || 1
  let done = 0
  const tick = () => {
    done++
    onProgress?.(Math.min(99, Math.round((done / total) * 100)))
  }

  const existing = await loadExistingByExternalId(supabase, organizationId)
  const toInsert: ImportItem[] = []
  const toUpdate: { item: ImportItem; id: string }[] = []

  for (const item of items) {
    const id = existing.get(item.externalId)
    if (id) toUpdate.push({ item, id })
    else toInsert.push(item)
  }

  await flushInserts(supabase, organizationId, userId, toInsert, stats, tick)
  await flushUpdates(supabase, toUpdate, stats, tick)

  onProgress?.(100)

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
