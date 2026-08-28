import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AwbEditorImportStats, AwbEditorParseResult } from './importAwbeditorDb'
import { importAwbeditorToOrg, parseAwbeditorDbBuffer } from './importAwbeditorDb'

export type ImportJobStatus = 'running' | 'done' | 'error'

export type ImportJob = {
  status: ImportJobStatus
  preview: { mawb: number; hawb: number; dgd: number }
  progress: number
  result?: AwbEditorImportStats
  error?: string
  organizationId: string
  userId: string
  startedAt: number
}

const jobs = new Map<string, ImportJob>()

export function createImportJob(
  organizationId: string,
  userId: string,
  parsed: AwbEditorParseResult,
  run: (supabase: SupabaseClient, onProgress: (pct: number) => void) => Promise<AwbEditorImportStats>,
  supabase: SupabaseClient,
): string {
  const jobId = randomUUID()
  const preview = {
    mawb: parsed.mawb?.length || 0,
    hawb: parsed.hawb?.length || 0,
    dgd: parsed.dgd?.length || 0,
  }
  jobs.set(jobId, {
    status: 'running',
    preview,
    progress: 0,
    organizationId,
    userId,
    startedAt: Date.now(),
  })

  void run(supabase, (pct) => {
      const job = jobs.get(jobId)
      if (job) job.progress = pct
    })
    .then((result) => {
      const job = jobs.get(jobId)
      if (!job) return
      job.status = 'done'
      job.progress = 100
      job.result = result
    })
    .catch((e: Error) => {
      const job = jobs.get(jobId)
      if (!job) return
      job.status = 'error'
      job.error = e?.message || 'import_failed'
    })

  // GC jobs after 2h
  setTimeout(() => jobs.delete(jobId), 2 * 60 * 60 * 1000).unref?.()
  return jobId
}

/** Recibe el buffer crudo; parse + import en background (POST responde al instante). */
export function createBufferImportJob(
  organizationId: string,
  userId: string,
  buffer: Buffer,
  originalName: string,
  supabase: SupabaseClient,
): string {
  const jobId = randomUUID()
  jobs.set(jobId, {
    status: 'running',
    preview: { mawb: 0, hawb: 0, dgd: 0 },
    progress: 1,
    organizationId,
    userId,
    startedAt: Date.now(),
  })

  void (async () => {
    const job = jobs.get(jobId)
    if (!job) return
    try {
      job.progress = 3
      const parsed = parseAwbeditorDbBuffer(buffer, originalName)
      job.preview = {
        mawb: parsed.mawb?.length || 0,
        hawb: parsed.hawb?.length || 0,
        dgd: parsed.dgd?.length || 0,
      }
      job.progress = 8
      const result = await importAwbeditorToOrg(supabase, organizationId, userId, parsed, (pct) => {
        const j = jobs.get(jobId)
        if (j) j.progress = Math.max(j.progress, 8 + Math.round(pct * 0.92))
      })
      job.status = 'done'
      job.progress = 100
      job.result = result
    } catch (e: any) {
      job.status = 'error'
      job.error = e?.message || 'import_failed'
    }
  })()

  setTimeout(() => jobs.delete(jobId), 2 * 60 * 60 * 1000).unref?.()
  return jobId
}

export function getImportJob(jobId: string, organizationId: string): ImportJob | null {
  const job = jobs.get(jobId)
  if (!job || job.organizationId !== organizationId) return null
  return job
}

export { importAwbeditorToOrg }
