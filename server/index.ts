/**
 * Partner API + static SPA server.
 *
 * Auth: Authorization: Bearer awb_live_…
 * Base: /v1
 *
 *   GET    /v1/health
 *   GET    /v1/documents?docType=&externalId=
 *   POST   /v1/documents          { data, externalId? }
 *   GET    /v1/documents/:id
 *   PATCH  /v1/documents/:id      { data?, status?, externalId? }
 *   DELETE /v1/documents/:id
 *   POST   /v1/documents/:id/pdf  { copies?: string[] } → application/pdf
 *   GET    /v1/documents/:id/pdf
 *   POST   /v1/fwb/preview        { data } → FWB/17 text
 *   POST   /v1/documents/:id/fwb  → generate + persist eAwb* on document
 *   GET    /v1/admin/overview     → backoffice stats (Authorization: Supabase user JWT, ADMIN_EMAILS-gated)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { adminClient, authenticateApiKey, effectivePlan } from './partnerAuth'
import { requireAdmin } from './adminAuth'
import { renderDocumentPdf } from './renderPdf'
import { applyEAwbResult, buildFwbFromAwb } from '../src/lib/awbToFwb'
import type { AWBData } from '../src/types/awb'
import { buildFwb17 } from '../src/lib/fwbCargoImp'
import { authenticateUser } from './userAuth'
import { createBufferImportJob, getImportJob } from './importJobs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4173)

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
app.disable('x-powered-by')
app.use(cors({ origin: true }))
app.use(express.json({ limit: '4mb' }))

app.use((_req, res, next) => {
  // Allow B2B (and other partners) to embed the SPA in an iframe.
  const ancestors = process.env.FRAME_ANCESTORS || "'self' https: http://localhost:* http://127.0.0.1:*"
  res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`)
  next()
})

app.get('/v1/health', (_req, res) => {
  res.json({ ok: true, service: 'airwaybill-partner-api' })
})

const PLAN_DOC_LIMIT: Record<string, number | null> = {
  free: 10, starter: null, pro: null, enterprise: null,
}

function docTypeOf(doc: { data: unknown }): string {
  return (doc.data as any)?.docType || 'awb'
}

/**
 * Backoffice read model: who's logging in, who's close to (or blowing past)
 * the free-tier limit, and whether a high PDF count is real distinct usage
 * or the same handful of documents re-downloaded/re-printed — pdf_events
 * logs every authorize() call, not just the ones that charge a quota unit.
 */
app.get('/v1/admin/overview', async (req, res) => {
  const auth = await requireAdmin(req.header('authorization') ?? undefined)
  if ('error' in auth) {
    const body = auth.error === 503 ? { error: 'admin_not_configured', message: 'ADMIN_EMAILS is not set on the server' }
      : auth.error === 401 ? { error: 'unauthorized' }
      : { error: 'forbidden' }
    return res.status(auth.error).json(body)
  }
  const { supabase } = auth

  try {
    const month = new Date().toISOString().slice(0, 7)

    const [orgsRes, membersRes, loginsRes, usageRes, docsRes, eventsRes] = await Promise.all([
      supabase.from('organizations').select('id, name, plan, plan_expires_at, created_at'),
      supabase.from('organization_members').select('organization_id, user_id, role, joined_at'),
      supabase.from('user_logins').select('user_id, login_count, first_login_at, last_login_at'),
      supabase.from('awb_usage').select('organization_id, count').eq('month', month),
      supabase
        .from('awb_documents')
        .select('id, user_id, organization_id, data, status, download_counted_at, created_at')
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('pdf_events')
        .select('id, organization_id, user_id, awb_document_id, result, created_at')
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    for (const r of [orgsRes, membersRes, loginsRes, usageRes, docsRes, eventsRes]) {
      if (r.error) return res.status(500).json({ error: r.error.message })
    }

    // auth.users isn't queryable via postgrest; page through the admin API.
    const authUsers: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = []
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      if (error) return res.status(500).json({ error: error.message })
      authUsers.push(...data.users)
      if (data.users.length < 200) break
    }

    const orgs = orgsRes.data || []
    const members = membersRes.data || []
    const logins = loginsRes.data || []
    const usage = usageRes.data || []
    const docs = docsRes.data || []
    const events = eventsRes.data || []

    const orgById = new Map(orgs.map((o) => [o.id, o]))
    const membershipByUser = new Map(members.map((m) => [m.user_id, m]))
    const loginByUser = new Map(logins.map((l) => [l.user_id, l]))
    const usageByOrg = new Map(usage.map((u) => [u.organization_id, u.count]))
    const docById = new Map(docs.map((d) => [d.id, d]))
    const emailByUser = new Map(authUsers.map((u) => [u.id, u.email || '(sin email)']))

    const users = authUsers
      .map((u) => {
        const membership = membershipByUser.get(u.id)
        const org = membership ? orgById.get(membership.organization_id) : undefined
        const login = loginByUser.get(u.id)
        return {
          id: u.id,
          email: u.email || '(sin email)',
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at || null,
          loginCount: login?.login_count ?? 0,
          orgId: org?.id ?? null,
          orgName: org?.name ?? null,
          orgPlan: org?.plan ?? null,
          role: membership?.role ?? null,
        }
      })
      .sort((a, b) => b.loginCount - a.loginCount)

    const organizations = orgs
      .map((org) => {
        const orgDocs = docs.filter((d) => d.organization_id === org.id)
        const downloaded = orgDocs.filter((d) => d.download_counted_at)
        const docTypeBreakdown: Record<string, number> = {}
        for (const d of downloaded) {
          const t = docTypeOf(d)
          docTypeBreakdown[t] = (docTypeBreakdown[t] || 0) + 1
        }
        return {
          id: org.id,
          name: org.name,
          plan: org.plan,
          planExpiresAt: org.plan_expires_at,
          createdAt: org.created_at,
          membersCount: members.filter((m) => m.organization_id === org.id).length,
          docsThisMonth: usageByOrg.get(org.id) ?? 0,
          docLimit: PLAN_DOC_LIMIT[org.plan] ?? null,
          totalDocuments: orgDocs.length,
          totalDownloadedDocuments: downloaded.length,
          docTypeBreakdown,
        }
      })
      .sort((a, b) => b.docsThisMonth - a.docsThisMonth)

    // Same document, more than one authorize() call: re-downloads/re-prints,
    // not new usage — this is what answers "fueron del mismo documento?".
    const eventsByDoc = new Map<string, typeof events>()
    for (const ev of events) {
      if (!ev.awb_document_id) continue
      const list = eventsByDoc.get(ev.awb_document_id) || []
      list.push(ev)
      eventsByDoc.set(ev.awb_document_id, list)
    }

    const repeats = Array.from(eventsByDoc.entries())
      .filter(([, evs]) => evs.length > 1)
      .map(([documentId, evs]) => {
        const doc = docById.get(documentId)
        const org = doc?.organization_id ? orgById.get(doc.organization_id) : undefined
        const sorted = [...evs].sort((a, b) => a.created_at.localeCompare(b.created_at))
        return {
          documentId,
          docType: doc ? docTypeOf(doc) : 'unknown',
          orgId: org?.id ?? null,
          orgName: org?.name ?? null,
          userEmail: doc?.user_id ? emailByUser.get(doc.user_id) ?? null : null,
          eventCount: evs.length,
          firstEventAt: sorted[0]?.created_at ?? null,
          lastEventAt: sorted[sorted.length - 1]?.created_at ?? null,
        }
      })
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 100)

    res.json({ generatedAt: new Date().toISOString(), month, users, organizations, repeats })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'admin_overview_failed' })
  }
})

/**
 * One-time SSO for embedding in B2B (no second login).
 * Returns an SPA path that exchanges a magic-link hash for a Supabase session.
 */
app.post('/v1/embed-session', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth

  try {
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(ctx.actingUserId)
    if (userErr || !userData?.user?.email) {
      return res.status(500).json({ error: 'acting_user_missing_email' })
    }
    const email = userData.user.email
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      return res.status(500).json({ error: linkErr?.message || 'embed_link_failed' })
    }

    const theme = typeof req.body?.theme === 'string' ? req.body.theme : 'b2b'
    const next = typeof req.body?.next === 'string' ? req.body.next : '/my-awbs'
    const q = new URLSearchParams({
      token_hash: linkData.properties.hashed_token,
      email,
      theme,
      embed: '1',
      next,
    })
    const base =
      process.env.PUBLIC_APP_URL ||
      process.env.AIRWAYBILL_APP_URL ||
      `${req.protocol}://${req.get('host')}`
    res.json({
      embedUrl: `${String(base).replace(/\/$/, '')}/partner-entry?${q}`,
      expiresInSeconds: 60,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'embed_session_failed' })
  }
})

async function requirePartner(req: express.Request, res: express.Response) {
  try {
    const supabase = adminClient()
    const ctx = await authenticateApiKey(supabase, req.header('authorization') ?? undefined)
    if (!ctx) {
      res.status(401).json({ error: 'invalid_api_key' })
      return null
    }
    return { supabase, ctx }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'auth_error' })
    return null
  }
}

app.get('/v1/documents', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth
  const docType = typeof req.query.docType === 'string' ? req.query.docType : undefined
  const externalId = typeof req.query.externalId === 'string' ? req.query.externalId : undefined

  let q = supabase
    .from('awb_documents')
    .select('id, organization_id, external_id, data, status, created_at, updated_at')
    .eq('organization_id', ctx.organizationId)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (externalId) q = q.eq('external_id', externalId)

  const { data, error } = await q
  if (error) return res.status(500).json({ error: error.message })

  const rows = (data || []).filter(r => !docType || (r.data as any)?.docType === docType)
  res.json({ documents: rows, plan: effectivePlan(ctx) })
})

app.post('/v1/documents', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth
  const body = req.body || {}
  const data = body.data
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data_required' })
  if (!data.docType) data.docType = 'awb'
  data.isDraft = false

  const status = body.status === 'draft' ? 'draft' : 'final'
  const externalId = typeof body.externalId === 'string' ? body.externalId : null

  const { data: row, error } = await supabase
    .from('awb_documents')
    .insert({
      user_id: ctx.actingUserId,
      organization_id: ctx.organizationId,
      external_id: externalId,
      data,
      status,
    })
    .select('id, organization_id, external_id, data, status, created_at, updated_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ document: row })
})

app.get('/v1/documents/:id', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth

  const { data: row, error } = await supabase
    .from('awb_documents')
    .select('id, organization_id, external_id, data, status, created_at, updated_at')
    .eq('id', req.params.id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!row) return res.status(404).json({ error: 'not_found' })
  res.json({ document: row })
})

app.patch('/v1/documents/:id', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth
  const body = req.body || {}
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.data && typeof body.data === 'object') {
    patch.data = { ...body.data, isDraft: false }
  }
  if (body.status === 'draft' || body.status === 'final') patch.status = body.status
  if (typeof body.externalId === 'string') patch.external_id = body.externalId

  const { data: row, error } = await supabase
    .from('awb_documents')
    .update(patch)
    .eq('id', req.params.id)
    .eq('organization_id', ctx.organizationId)
    .select('id, organization_id, external_id, data, status, created_at, updated_at')
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!row) return res.status(404).json({ error: 'not_found' })
  res.json({ document: row })
})

app.delete('/v1/documents/:id', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth

  const { error, count } = await supabase
    .from('awb_documents')
    .delete({ count: 'exact' })
    .eq('id', req.params.id)
    .eq('organization_id', ctx.organizationId)

  if (error) return res.status(500).json({ error: error.message })
  if (!count) return res.status(404).json({ error: 'not_found' })
  res.status(204).end()
})

async function sendPdf(req: express.Request, res: express.Response) {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth

  const { data: row, error } = await supabase
    .from('awb_documents')
    .select('id, data')
    .eq('id', req.params.id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!row) return res.status(404).json({ error: 'not_found' })

  const copies = Array.isArray(req.body?.copies) ? req.body.copies.map(String) : undefined
  try {
    const { buffer, filename, contentType } = await renderDocumentPdf(row.data as any, { copies })
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`)
    res.send(buffer)
  } catch (e: any) {
    console.error('PDF render failed', e)
    res.status(500).json({ error: 'pdf_render_failed', message: e.message })
  }
}

app.get('/v1/documents/:id/pdf', sendPdf)
app.post('/v1/documents/:id/pdf', sendPdf)

/** Preview FWB/17 from AWB JSON (no persistence). */
app.post('/v1/fwb/preview', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const body = req.body || {}
  const data = body.data && typeof body.data === 'object' ? body.data : body
  const result = data.docType || data.awbPrefix || data.rateItems
    ? buildFwbFromAwb(data as AWBData)
    : buildFwb17(data)
  res.status(result.ok ? 200 : 400).json(result)
})

/** Generate FWB/17 from a saved document and persist eAwb* fields. */
app.post('/v1/documents/:id/fwb', async (req, res) => {
  const auth = await requirePartner(req, res)
  if (!auth) return
  const { supabase, ctx } = auth

  const { data: row, error } = await supabase
    .from('awb_documents')
    .select('id, data')
    .eq('id', req.params.id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!row) return res.status(404).json({ error: 'not_found' })

  const merged = {
    ...(row.data as object),
    ...(req.body?.data && typeof req.body.data === 'object' ? req.body.data : {}),
  } as AWBData
  const result = buildFwbFromAwb(merged)
  const nextData = applyEAwbResult(merged, result)

  const { data: updated, error: upErr } = await supabase
    .from('awb_documents')
    .update({ data: { ...nextData, isDraft: false }, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('organization_id', ctx.organizationId)
    .select('id, organization_id, external_id, data, status, created_at, updated_at')
    .maybeSingle()

  if (upErr) return res.status(500).json({ error: upErr.message })
  res.status(result.ok ? 200 : 400).json({
    ...result,
    eAwbStatus: nextData.eAwbStatus,
    document: updated,
  })
})

/** Import awbeditor.db / .zip — responde al instante; parse + import en background. */
app.post('/api/import/awbeditor', upload.single('file'), async (req, res) => {
  try {
    const ctx = await authenticateUser(req.header('authorization') ?? undefined)
    if (!ctx) {
      return res.status(401).json({ error: 'unauthorized', message: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' })
    }
    if (!req.file?.buffer) return res.status(400).json({ error: 'file_required' })

    const jobId = createBufferImportJob(
      ctx.organizationId,
      ctx.userId,
      req.file.buffer,
      req.file.originalname || 'awbeditor.db',
      ctx.supabase,
    )

    res.json({
      jobId,
      preview: { mawb: 0, hawb: 0, dgd: 0 },
      status: 'running',
    })
  } catch (e: any) {
    console.error('awbeditor import failed', e)
    res.status(500).json({ error: 'import_failed', message: e?.message || String(e) })
  }
})

app.get('/api/import/awbeditor/:jobId', async (req, res) => {
  try {
    const ctx = await authenticateUser(req.header('authorization') ?? undefined)
    if (!ctx) return res.status(401).json({ error: 'unauthorized' })
    const job = getImportJob(req.params.jobId, ctx.organizationId)
    if (!job) return res.status(404).json({ error: 'job_not_found' })
    res.json({
      status: job.status,
      preview: job.preview,
      progress: job.progress,
      result: job.result,
      error: job.error,
    })
  } catch (e: any) {
    res.status(500).json({ error: 'job_status_failed', message: e?.message || String(e) })
  }
})

// SPA: serve built assets; fall through to index.html for client routes
app.use(express.static(DIST, { index: false, maxAge: '1h' }))
// Express 5 / path-to-regexp: bare '*' is invalid; use a named splat.
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/v1/') || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(DIST, 'index.html'), err => {
    if (err) res.status(404).send('Build missing — run npm run build')
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Airwaybill partner API + SPA on :${PORT}`)
})
