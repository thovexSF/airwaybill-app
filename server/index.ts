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
import { lookupIataRegistry, registryMeta, replaceRegistry } from './iataRegistry'
import { renderDocumentPdf } from './renderPdf'
import { applyEAwbResult, buildFhlFromAwbs, buildFwbFromAwb, hawbBelongsTo } from '../src/lib/awbToFwb'
import type { AWBData } from '../src/types/awb'
import { buildFwb17 } from '../src/lib/fwbCargoImp'
import { authenticateUser } from './userAuth'
import { translateFields } from './translate'
import { EAWB_FROM, fetchReceivedEmail, parseAirlineReply, sendEawbMail, typeBEnvelope, verifyResendWebhook, type EawbChannel } from './eawb'
import { splitAwbSerial } from '../src/lib/awbCheckDigit'
import crypto from 'node:crypto'
import PostalMime from 'postal-mime'
import { createBufferImportJob, getImportJob } from './importJobs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 4173)

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
app.disable('x-powered-by')
// Railway terminates TLS at its proxy; without this req.protocol reads "http"
// and the embed-session URL comes out http://, which an https host page
// (B2B) blocks as mixed content — the iframe then never loads.
app.set('trust proxy', true)
app.use(cors({ origin: true }))
// The raw body is kept for webhooks whose signature covers the exact bytes.
app.use(express.json({ limit: '4mb', verify: (req, _res, buf) => { (req as any).rawBody = buf } }))

app.use((_req, res, next) => {
  // Allow B2B (and other partners) to embed the SPA in an iframe.
  const ancestors = process.env.FRAME_ANCESTORS || "'self' https: http://localhost:* http://127.0.0.1:*"
  res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`)
  next()
})

app.get('/v1/health', (_req, res) => {
  res.json({ ok: true, service: 'airwaybill-partner-api' })
})

// Free plan: free_doc_limit() in migration_free_lifetime_limit.sql — lifetime, not monthly.
const PLAN_DOC_LIMIT: Record<string, number | null> = {
  free: 3, starter: null, pro: null, enterprise: null,
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
  try {
    const auth = await requireAdmin(req.header('authorization') ?? undefined)
    if ('error' in auth) {
      const body = auth.error === 503 ? { error: 'admin_not_configured', message: 'ADMIN_EMAILS is not set on the server' }
        : auth.error === 401 ? { error: 'unauthorized' }
        : { error: 'forbidden' }
      return res.status(auth.error).json(body)
    }
    const { supabase } = auth

    const month = new Date().toISOString().slice(0, 7)

    const [orgsRes, membersRes, loginsRes, usageRes, docsRes, eventsRes] = await Promise.all([
      supabase.from('organizations').select('id, name, plan, plan_expires_at, created_at'),
      supabase.from('organization_members').select('organization_id, user_id, role, joined_at'),
      supabase.from('user_logins').select('user_id, login_count, first_login_at, last_login_at'),
      // free_doc_limit()/org_docs_used() (migration_free_lifetime_limit.sql) enforce a
      // LIFETIME total, not a monthly one — sum every month row, not just the current one.
      supabase.from('awb_usage').select('organization_id, count'),
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
    const usageByOrg = new Map<string, number>()
    for (const u of usage) {
      usageByOrg.set(u.organization_id, (usageByOrg.get(u.organization_id) ?? 0) + u.count)
    }
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
          docsUsedLifetime: usageByOrg.get(org.id) ?? 0,
          docLimit: PLAN_DOC_LIMIT[org.plan] ?? null,
          totalDocuments: orgDocs.length,
          totalDownloadedDocuments: downloaded.length,
          docTypeBreakdown,
        }
      })
      .sort((a, b) => b.docsUsedLifetime - a.docsUsedLifetime)

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

    const documents = docs.map((d) => {
      const org = d.organization_id ? orgById.get(d.organization_id) : undefined
      return {
        id: d.id,
        docType: docTypeOf(d),
        status: d.status,
        orgId: org?.id ?? null,
        orgName: org?.name ?? null,
        userEmail: d.user_id ? emailByUser.get(d.user_id) ?? null : null,
        createdAt: d.created_at,
        downloadCountedAt: d.download_counted_at,
        eventCount: eventsByDoc.get(d.id)?.length ?? 0,
      }
    })

    res.json({ generatedAt: new Date().toISOString(), month, users, organizations, repeats, documents })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'admin_overview_failed' })
  }
})

/** Streams a document's PDF for backoffice inspection — same renderer the partner API uses. */
app.get('/v1/admin/documents/:id/pdf', async (req, res) => {
  try {
    const auth = await requireAdmin(req.header('authorization') ?? undefined)
    if ('error' in auth) {
      const body = auth.error === 503 ? { error: 'admin_not_configured' }
        : auth.error === 401 ? { error: 'unauthorized' }
        : { error: 'forbidden' }
      return res.status(auth.error).json(body)
    }
    const { supabase } = auth

    const { data: row, error } = await supabase
      .from('awb_documents')
      .select('id, data')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!row) return res.status(404).json({ error: 'not_found' })

    const { buffer, filename, contentType } = await renderDocumentPdf(row.data as any)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`)
    res.send(buffer)
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'admin_pdf_failed' })
  }
})

/** Raw stored JSON for a document — lets us tell "empty PDF" from "empty saved data" without a DB client. */
app.get('/v1/admin/documents/:id', async (req, res) => {
  try {
    const auth = await requireAdmin(req.header('authorization') ?? undefined)
    if ('error' in auth) {
      const body = auth.error === 503 ? { error: 'admin_not_configured' }
        : auth.error === 401 ? { error: 'unauthorized' }
        : { error: 'forbidden' }
      return res.status(auth.error).json(body)
    }
    const { supabase } = auth

    const { data: row, error } = await supabase
      .from('awb_documents')
      .select('id, data, status, created_at, updated_at, download_counted_at')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!row) return res.status(404).json({ error: 'not_found' })

    res.json(row)
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'admin_document_failed' })
  }
})

/** Estado de la lista IATA cargada (fecha de descarga, filas). */
app.get('/v1/admin/iata-registry', async (req, res) => {
  try {
    const auth = await requireAdmin(req.header('authorization') ?? undefined)
    if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
    res.json({ meta: await registryMeta() })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'iata_registry_failed' })
  }
})

/** Reemplaza la lista IATA completa con el CSV exportado del reporte (`{ csv, asOf: 'YYYY-MM-DD' }`). */
app.post('/v1/admin/iata-registry', async (req, res) => {
  try {
    const auth = await requireAdmin(req.header('authorization') ?? undefined)
    if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
    const { csv, asOf } = req.body ?? {}
    if (typeof csv !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? '')) {
      return res.status(400).json({ error: 'csv_and_asOf_required' })
    }
    res.json(await replaceRegistry(csv, asOf))
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'iata_registry_upload_failed' })
  }
})

/** Para el formulario del cliente: ¿ya figura esta razón social en la lista de IATA? */
app.get('/v1/eawb/registry-check', async (req, res) => {
  try {
    const ctx = await authenticateUser(req.header('authorization') ?? undefined)
    if (!ctx) return res.status(401).json({ error: 'unauthorized' })
    res.json(await lookupIataRegistry(String(req.query.name ?? '')))
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'iata_registry_failed' })
  }
})

const AGREEMENT_NEXT: Record<string, string> = {
  solicitado: 'enviado_iata',
  enviado_iata: 'pendiente_firma',
  firmado: 'aprobado',
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Airwaybill App <support@airwaybill.app>', to, subject, html }),
  })
  return r.ok
}

/** Backoffice: solicitudes del Multilateral e-AWB Agreement, con URL firmada del PDF firmado. */
app.get('/v1/admin/eawb-agreements', async (req, res) => {
  const auth = await requireAdmin(req.header('authorization') ?? undefined)
  if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
  const { supabase } = auth
  const { data, error } = await supabase
    .from('eawb_agreements')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  const rows = await Promise.all((data ?? []).map(async (r: any) => {
    let signedUrl: string | null = null
    if (r.signed_pdf_path) {
      const s = await supabase.storage.from('eawb-agreements').createSignedUrl(r.signed_pdf_path, 3600)
      signedUrl = s.data?.signedUrl ?? null
    }
    const norm = (n: string) => String(n || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const possibleDuplicate = (data ?? []).some((o: any) =>
      o.id !== r.id && o.status !== 'rechazado' && norm(o.form?.companyName) === norm(r.form?.companyName))
    const registry = r.status === 'solicitado' ? await lookupIataRegistry(r.form?.companyName ?? '').catch(() => null) : null
    return { ...r, orgName: r.organizations?.name ?? null, organizations: undefined, signedUrl, possibleDuplicate, registry }
  }))
  res.json({ agreements: rows })
})

/**
 * Avanza el estado (solicitado → enviado_iata → pendiente_firma; firmado → aprobado)
 * o lo pasa a rechazado. Al aprobar o rechazar avisa al cliente por correo (si hay RESEND_API_KEY).
 */
app.post('/v1/admin/eawb-agreements/:id/status', async (req, res) => {
  const auth = await requireAdmin(req.header('authorization') ?? undefined)
  if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
  const { supabase } = auth
  const reject = req.body?.reject === true
  const checkOnly = req.body?.action === 'iata_check'
  const note = typeof req.body?.note === 'string' ? req.body.note : null

  const { data: row, error } = await supabase.from('eawb_agreements').select('*').eq('id', req.params.id).single()
  if (error || !row) return res.status(404).json({ error: 'not_found' })

  if (checkOnly) {
    const c = await supabase.from('eawb_agreements').update({ iata_checked_at: new Date().toISOString() }).eq('id', row.id)
    if (c.error) return res.status(500).json({ error: c.error.message })
    return res.json({ status: row.status, checked: true })
  }
  if (!reject && row.status === 'solicitado' && !row.iata_checked_at) {
    return res.status(409).json({ error: 'iata_check_required' })
  }
  const next = reject ? 'rechazado' : AGREEMENT_NEXT[row.status]
  if (!next) return res.status(409).json({ error: 'no_next_status' })

  const patch: Record<string, unknown> = { status: next }
  if (next === 'enviado_iata') patch.sent_to_iata_at = new Date().toISOString()
  if (next === 'aprobado') patch.approved_at = new Date().toISOString()
  if (note !== null) patch.admin_note = note
  const upd = await supabase.from('eawb_agreements').update(patch).eq('id', row.id)
  if (upd.error) return res.status(500).json({ error: upd.error.message })

  let emailed = false
  if (next === 'aprobado' || next === 'rechazado') {
    const f = row.form
    const base = process.env.PUBLIC_APP_URL || 'https://airwaybill.app'
    const es = f.locale === 'es'
    const body = next === 'aprobado'
      ? (es
        ? `<p>Tu empresa <b>${f.companyName}</b> fue aprobada en el IATA Multilateral e-AWB Agreement.</p><p>El siguiente paso es activar el eAWB con tus aerolíneas; escríbenos a support@airwaybill.app indicando con cuáles quieres operar (partimos con LATAM).</p>`
        : `<p>Your company <b>${f.companyName}</b> has been approved in the IATA Multilateral e-AWB Agreement.</p><p>The next step is activating eAWB with your airlines; write to support@airwaybill.app telling us which ones you want to operate with (we start with LATAM).</p>`)
      : (es
        ? `<p>Tu solicitud del e-AWB Agreement fue rechazada${note ? `: ${note}` : ''}.</p><p>Revisa los datos y vuelve a enviarla en <a href="${base}/eawb-agreement">${base}/eawb-agreement</a>.</p>`
        : `<p>Your e-AWB Agreement request was rejected${note ? `: ${note}` : ''}.</p><p>Review the details and submit it again at <a href="${base}/eawb-agreement">${base}/eawb-agreement</a>.</p>`)
    const subject = next === 'aprobado'
      ? (es ? 'Tu e-AWB Agreement fue aprobado' : 'Your e-AWB Agreement was approved')
      : (es ? 'Tu solicitud de e-AWB Agreement fue rechazada' : 'Your e-AWB Agreement request was rejected')
    emailed = await sendEmail(f.submitterEmail, subject, body)
  }
  res.json({ status: next, emailed })
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
    // The partner vouches for the person signed in on its side; without one we
    // fall back to the key's acting user.
    const partnerEmail =
      typeof req.body?.user?.email === 'string' ? req.body.user.email.trim().toLowerCase() : ''
    let email: string
    if (partnerEmail) {
      email = partnerEmail
      const fullName = typeof req.body.user.name === 'string' ? req.body.user.name.trim() : ''
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        app_metadata: { partner_org_id: ctx.organizationId },
        user_metadata: fullName ? { full_name: fullName } : {},
      })
      if (createErr && (createErr as any).code !== 'email_exists') {
        return res.status(500).json({ error: createErr.message })
      }
    } else {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(ctx.actingUserId)
      if (userErr || !userData?.user?.email) {
        return res.status(500).json({ error: 'acting_user_missing_email' })
      }
      email = userData.user.email
    }

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr || !linkData?.properties?.hashed_token) {
      return res.status(500).json({ error: linkErr?.message || 'embed_link_failed' })
    }

    if (partnerEmail) {
      const { data: memberships, error: memErr } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', linkData.user.id)
      if (memErr) return res.status(500).json({ error: memErr.message })
      const orgIds = (memberships ?? []).map((m) => m.organization_id)
      // The app works on a user's single org; joining a second one would leave
      // it guessing which documents to show.
      if (orgIds.length && !orgIds.includes(ctx.organizationId)) {
        return res.status(409).json({ error: 'user_in_other_org' })
      }
      if (!orgIds.length) {
        const ins = await supabase
          .from('organization_members')
          .insert({ organization_id: ctx.organizationId, user_id: linkData.user.id, role: 'member' })
        if (ins.error) return res.status(500).json({ error: ins.error.message })
      }
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

// ── eAWB por SMTP ──────────────────────────────────────────────────────────

const awbNumberOf = (d: AWBData) => {
  const prefix = String(d.awbPrefix ?? '').replace(/\D/g, '').padStart(3, '0')
  const serial = d.awbSerial ? splitAwbSerial(d.awbSerial).serial : ''
  return prefix !== '000' && serial ? { prefix, number: `${prefix}-${serial}` } : null
}

/** Transmite el FWB de una MAWB guardada a su aerolínea por el canal configurado. */
app.post('/api/eawb/send', async (req, res) => {
  try {
    const ctx = await authenticateUser(req.header('authorization') ?? undefined)
    if (!ctx) return res.status(401).json({ error: 'unauthorized', message: 'Inicia sesión para enviar la eAWB.' })
    const documentId = String(req.body?.documentId ?? '')
    const { data: row } = await ctx.supabase
      .from('awb_documents').select('id, organization_id, data').eq('id', documentId).maybeSingle()
    if (!row || row.organization_id !== ctx.organizationId) {
      return res.status(404).json({ error: 'not_found', message: 'Guarda la AWB antes de enviarla.' })
    }
    const data = row.data as AWBData
    if (data.docType === 'hawb') return res.status(400).json({ error: 'hawb', message: 'Las HAWB viajan como FHL junto a su MAWB; envía la MAWB.' })
    const awb = awbNumberOf(data)
    if (!awb) return res.status(400).json({ error: 'awb_number', message: 'La AWB no tiene prefijo y número.' })

    const admin = adminClient()
    const { data: channel } = await admin
      .from('eawb_channels').select('airline_prefix, airline_name, destination_email, type_b_address')
      .eq('airline_prefix', awb.prefix).eq('active', true).maybeSingle()
    if (!channel) return res.status(409).json({ error: 'no_channel', message: 'Esta aerolínea todavía no está habilitada para eAWB en la plataforma.' })

    const built = buildFwbFromAwb(data)
    if (!built.ok) return res.status(400).json({ error: 'invalid_fwb', message: built.errors.join(' · '), errors: built.errors })

    const body = typeBEnvelope(built.message, channel as EawbChannel)
    const base = {
      organization_id: ctx.organizationId, document_id: row.id, awb_number: awb.number, airline_prefix: awb.prefix,
      direction: 'out', message_type: 'FWB', counterpart: channel.destination_email, subject: `FWB ${awb.number}`, body,
    }
    try {
      const providerId = await sendEawbMail(channel as EawbChannel, awb.number, body)
      await admin.from('eawb_messages').insert({ ...base, provider_id: providerId ?? null })
    } catch (e: any) {
      await admin.from('eawb_messages').insert({ ...base, error: e?.message || String(e) })
      return res.status(502).json({ error: 'send_failed', message: `No se pudo enviar: ${e?.message || e}` })
    }

    // A consolidation: one FHL per house waybill that names this master, after the FWB.
    const serial = awb.number.slice(4)
    const { data: houseRows } = await ctx.supabase
      .from('awb_documents').select('id, data')
      .eq('organization_id', ctx.organizationId).eq('data->>docType', 'hawb').ilike('data->>mawbReference', `%${serial}%`)
    const houses = (houseRows ?? []).filter(h => hawbBelongsTo(h.data as AWBData, awb.prefix, serial))
    const fhl: { hawb: string; ok: boolean; error?: string }[] = []
    for (const h of houses) {
      const house = h.data as AWBData
      const built = buildFhlFromAwbs(data, house)
      const subject = `FHL ${awb.number} / ${house.hawbNumber}`
      if (!built.ok) {
        fhl.push({ hawb: house.hawbNumber || '', ok: false, error: built.errors.join(' · ') })
        continue
      }
      const text = typeBEnvelope(built.message, channel as EawbChannel)
      const row = { ...base, message_type: 'FHL', subject, body: text }
      try {
        const id = await sendEawbMail(channel as EawbChannel, `${awb.number} / ${house.hawbNumber}`, text, 'FHL')
        await admin.from('eawb_messages').insert({ ...row, provider_id: id ?? null })
        fhl.push({ hawb: house.hawbNumber || '', ok: true })
      } catch (e: any) {
        await admin.from('eawb_messages').insert({ ...row, error: e?.message || String(e) })
        fhl.push({ hawb: house.hawbNumber || '', ok: false, error: e?.message || String(e) })
      }
    }
    res.json({ ok: true, airline: channel.airline_name, fhl })
  } catch (e: any) {
    console.error('eawb send failed', e)
    res.status(500).json({ error: 'send_failed', message: e?.message || String(e) })
  }
})

/**
 * Webhook "email.received" de Resend para la casilla eAWB. Cada respuesta de la
 * aerolínea se asigna al último FWB enviado con ese número de AWB.
 */
app.post('/api/eawb/inbound', async (req, res) => {
  const raw: Buffer | undefined = (req as any).rawBody
  const headers = { 'svix-id': req.header('svix-id'), 'svix-timestamp': req.header('svix-timestamp'), 'svix-signature': req.header('svix-signature') }
  if (!raw || !verifyResendWebhook(raw, headers)) return res.status(401).json({ error: 'bad_signature' })
  if (req.body?.type !== 'email.received') return res.json({ ignored: true })
  try {
    const emailId = String(req.body.data?.email_id ?? '')
    const mail = await fetchReceivedEmail(emailId)
    res.json(await recordAirlineReply({ ...mail, providerId: emailId }))
  } catch (e: any) {
    console.error('eawb inbound failed', e)
    // 500 makes Resend retry the delivery.
    res.status(500).json({ error: 'inbound_failed' })
  }
})

/**
 * Entrada desde un Email Worker de Cloudflare (Email Routing de airwaybill.app):
 * el Worker reenvía el correo crudo con la clave compartida EAWB_INBOUND_SECRET.
 */
app.post('/api/eawb/inbound/cloudflare', express.text({ type: () => true, limit: '5mb' }), async (req, res) => {
  const secret = process.env.EAWB_INBOUND_SECRET
  const given = req.header('x-eawb-secret') ?? ''
  if (!secret || given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return res.status(401).json({ error: 'bad_secret' })
  }
  try {
    const raw = typeof req.body === 'string' ? req.body : String((req as any).rawBody ?? '')
    const email = await PostalMime.parse(raw)
    const text = email.text || String(email.html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    res.json(await recordAirlineReply({
      text, from: email.from?.address ?? '', subject: email.subject ?? '', providerId: email.messageId ?? null,
    }))
  } catch (e: any) {
    console.error('eawb inbound (cloudflare) failed', e)
    res.status(500).json({ error: 'inbound_failed' })
  }
})

/** Guarda una respuesta de aerolínea y la asigna al último FWB enviado con ese número de AWB. */
async function recordAirlineReply(mail: { text: string; from: string; subject: string; providerId: string | null }) {
  const reply = parseAirlineReply(mail.text)
  const admin = adminClient()
  const { data: sent } = reply.awbNumber
    ? await admin.from('eawb_messages').select('organization_id, document_id, airline_prefix')
        .eq('awb_number', reply.awbNumber).eq('direction', 'out').order('created_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null }
  const { error } = await admin.from('eawb_messages').insert({
    organization_id: sent?.organization_id ?? null,
    document_id: sent?.document_id ?? null,
    awb_number: reply.awbNumber ?? '',
    airline_prefix: sent?.airline_prefix ?? reply.awbNumber?.slice(0, 3) ?? null,
    direction: 'in',
    message_type: reply.type,
    status_code: reply.statusCode,
    counterpart: mail.from,
    subject: mail.subject,
    body: mail.text,
    error: reply.error,
    provider_id: mail.providerId,
  })
  if (error) throw new Error(error.message)
  return { ok: true, matched: Boolean(sent), type: reply.type, awb: reply.awbNumber }
}

/** Backoffice: canales eAWB por aerolínea. */
app.get('/v1/admin/eawb-channels', async (req, res) => {
  const auth = await requireAdmin(req.header('authorization') ?? undefined)
  if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
  const { data, error } = await auth.supabase.from('eawb_channels').select('*').order('airline_prefix')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ channels: data, mailbox: EAWB_FROM(), typeBOrigin: process.env.EAWB_TYPEB_ORIGIN || null })
})

app.put('/v1/admin/eawb-channels/:prefix', async (req, res) => {
  const auth = await requireAdmin(req.header('authorization') ?? undefined)
  if ('error' in auth) return res.status(auth.error).json({ error: 'admin_denied' })
  const prefix = req.params.prefix
  const b = req.body ?? {}
  if (!/^\d{3}$/.test(prefix) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(b.destination_email ?? ''))) {
    return res.status(400).json({ error: 'invalid', message: 'Prefijo de 3 dígitos y correo de destino válido.' })
  }
  const typeB = String(b.type_b_address ?? '').trim().toUpperCase()
  if (typeB && !/^[A-Z0-9]{7}$/.test(typeB)) return res.status(400).json({ error: 'invalid', message: 'La dirección Type B tiene 7 caracteres.' })
  const { data, error } = await auth.supabase.from('eawb_channels').upsert({
    airline_prefix: prefix,
    airline_name: String(b.airline_name ?? '').trim(),
    destination_email: String(b.destination_email).trim(),
    type_b_address: typeB || null,
    active: b.active !== false,
    notes: b.notes ? String(b.notes) : null,
    updated_at: new Date().toISOString(),
  }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ channel: data })
})

/** Traduce los textos libres de un documento (proforma) con Gemini, el mismo proveedor de b2b. */
app.post('/api/translate', async (req, res) => {
  try {
    const ctx = await authenticateUser(req.header('authorization') ?? undefined)
    if (!ctx) return res.status(401).json({ error: 'unauthorized', message: 'Inicia sesión para traducir el contenido.' })
    const target = req.body?.target
    const fields = req.body?.fields
    if ((target !== 'en' && target !== 'es') || !fields || typeof fields !== 'object') {
      return res.status(400).json({ error: 'invalid_request' })
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'translation_unavailable', message: 'La traducción automática no está configurada en el servidor.' })
    }
    const clean = Object.fromEntries(
      Object.entries(fields as Record<string, unknown>).filter(([, v]) => typeof v === 'string').slice(0, 200),
    ) as Record<string, string>
    res.json({ fields: await translateFields(clean, target) })
  } catch (e: any) {
    console.error('translate failed', e)
    res.status(502).json({ error: 'translate_failed', message: 'No se pudo traducir el contenido. Intenta de nuevo.' })
  }
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
app.use('/assets', express.static(path.join(DIST, 'assets'), { index: false, maxAge: '1y', immutable: true }))
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
