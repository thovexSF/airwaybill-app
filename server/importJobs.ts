import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AwbEditorImportStats, AwbEditorParseResult } from './importAwbeditorDb'
import { importAwbeditorToOrg } from './importAwbeditorDb'

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

export function getImportJob(jobId: string, organizationId: string): ImportJob | null {
  const job = jobs.get(jobId)
  if (!job || job.organizationId !== organizationId) return null
  return job
}

export { importAwbeditorToOrg }
