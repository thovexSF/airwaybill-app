import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOverview, openAdminDocumentPdf, openAdminDocumentJson, AdminOverview, AdminAgreementRow, fetchAdminAgreements, advanceAgreement, RegistryMeta, fetchRegistryMeta, uploadRegistryCsv } from '../lib/adminApi'
import { STATUS_LABEL, IATA_REGISTERED_REPORT_URL, iataPrefillUrl } from '../lib/eawbAgreement'

const ACCENT = '#8B0000'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [docSearch, setDocSearch] = useState('')
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [agreements, setAgreements] = useState<AdminAgreementRow[]>([])
  const reloadAgreements = () => fetchAdminAgreements().then(setAgreements).catch(() => {})

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    reloadAgreements()
  }, [])

  async function viewPdf(documentId: string) {
    setPdfError(null)
    try {
      await openAdminDocumentPdf(documentId)
    } catch (e: any) {
      setPdfError(e.message || 'No se pudo abrir el PDF')
    }
  }

  async function viewJson(documentId: string) {
    setPdfError(null)
    try {
      await openAdminDocumentJson(documentId)
    } catch (e: any) {
      setPdfError(e.message || 'No se pudieron abrir los datos')
    }
  }

  const filteredUsers = useMemo(() => {
    if (!data) return []
    const q = userSearch.trim().toLowerCase()
    if (!q) return data.users
    return data.users.filter((u) => u.email.toLowerCase().includes(q) || (u.orgName || '').toLowerCase().includes(q))
  }, [data, userSearch])

  const filteredDocuments = useMemo(() => {
    if (!data) return []
    const q = docSearch.trim().toLowerCase()
    if (!q) return data.documents
    return data.documents.filter(
      (d) =>
        (d.userEmail || '').toLowerCase().includes(q) ||
        (d.orgName || '').toLowerCase().includes(q) ||
        d.docType.toLowerCase().includes(q),
    )
  }, [data, docSearch])

  const kpis = useMemo(() => {
    if (!data) return null
    const nearLimitOrgs = data.organizations.filter(
      (o) => o.docLimit != null && o.docsUsedLifetime >= o.docLimit,
    ).length
    const totalLogins = data.users.reduce((sum, u) => sum + u.loginCount, 0)
    const activeUsers = data.users.filter((u) => u.loginCount > 0).length
    return {
      totalUsers: data.users.length,
      totalOrgs: data.organizations.length,
      activeUsers,
      totalLogins,
      nearLimitOrgs,
      repeatedDocs: data.repeats.length,
    }
  }, [data])

  if (loading) return <Centered>Cargando…</Centered>
  if (error) return <Centered>{error}</Centered>
  if (!data || !kpis) return null

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 1200, margin: '0 auto', padding: '24px 20px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Backoffice</h1>
          <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>
            Generado {fmtDate(data.generatedAt)} · mes {data.month}
          </p>
        </div>
        <Link to="/my-awbs" style={{ fontSize: 13, color: ACCENT }}>← Volver</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        <Kpi label="Usuarios" value={kpis.totalUsers} />
        <Kpi label="Con login registrado" value={kpis.activeUsers} />
        <Kpi label="Organizaciones" value={kpis.totalOrgs} />
        <Kpi label="En el límite free" value={kpis.nearLimitOrgs} sub="3 docs de por vida, alcanzados" />
        <Kpi label="Documentos re-impresos" value={kpis.repeatedDocs} sub="mismo doc, 2+ veces" />
      </div>

      <AgreementsSection rows={agreements} reload={reloadAgreements} />
      <RegistrySection />

      <Section title="Organizaciones" subtitle="Uso de PDF de por vida vs. límite del plan (free: 3 documentos, no por mes)">
        <TableScroll>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Organización</Th>
                <Th>Plan</Th>
                <Th>Miembros</Th>
                <Th align="right">PDFs usados (de por vida)</Th>
                <Th align="right">Límite</Th>
                <Th align="right">Docs totales</Th>
                <Th align="right">Docs descargados</Th>
                <Th>Desglose (descargados)</Th>
                <Th>Creada</Th>
              </tr>
            </thead>
            <tbody>
              {data.organizations.map((o) => {
                const atRisk = o.docLimit != null && o.docsUsedLifetime >= o.docLimit
                return (
                  <tr key={o.id}>
                    <Td>{o.name}</Td>
                    <Td><PlanBadge plan={o.plan} /></Td>
                    <Td>{o.membersCount}</Td>
                    <Td align="right" style={atRisk ? { color: ACCENT, fontWeight: 700 } : undefined}>
                      {o.docsUsedLifetime}
                    </Td>
                    <Td align="right">{o.docLimit ?? '∞'}</Td>
                    <Td align="right">{o.totalDocuments}</Td>
                    <Td align="right">{o.totalDownloadedDocuments}</Td>
                    <Td>
                      {Object.entries(o.docTypeBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([type, count]) => `${type}: ${count}`)
                        .join(', ') || '—'}
                    </Td>
                    <Td>{fmtDate(o.createdAt)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section
        title="Documentos"
        subtitle="Cada documento creado, si cargó cuota (Descargado) y cuántas veces pasó por Descargar/Imprimir. &quot;Ver PDF&quot; regenera el PDF actual del documento para inspeccionarlo"
      >
        <input
          type="text"
          placeholder="Buscar por email, organización o tipo…"
          value={docSearch}
          onChange={(e) => setDocSearch(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, marginBottom: 10, width: 280 }}
        />
        {pdfError && <p style={{ color: ACCENT, fontSize: 12, marginBottom: 8 }}>{pdfError}</p>}
        <TableScroll>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Organización</Th>
                <Th>Tipo</Th>
                <Th>Estado</Th>
                <Th>Descargado</Th>
                <Th align="right">Veces (descarga/impresión)</Th>
                <Th>Creado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((d) => (
                <tr key={d.id}>
                  <Td>{d.userEmail || '—'}</Td>
                  <Td>{d.orgName || '—'}</Td>
                  <Td>{d.docType}</Td>
                  <Td>{d.status}</Td>
                  <Td>{d.downloadCountedAt ? fmtDate(d.downloadCountedAt) : 'No'}</Td>
                  <Td align="right">{d.eventCount}</Td>
                  <Td>{fmtDate(d.createdAt)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => viewPdf(d.id)}
                        style={{ fontSize: 12, color: ACCENT, background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                      >
                        Ver PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => viewJson(d.id)}
                        style={{ fontSize: 12, color: '#555', background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
                      >
                        Ver datos
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section
        title="Documentos re-descargados / re-impresos"
        subtitle="Un mismo documento pasado por Descargar o Imprimir más de una vez — no cuenta doble contra el límite, pero explica un total de PDFs alto sin usar 10+ documentos distintos"
      >
        {data.repeats.length === 0 ? (
          <p style={{ color: '#666', fontSize: 13 }}>Sin repeticiones registradas todavía.</p>
        ) : (
          <TableScroll>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Usuario</Th>
                <Th>Organización</Th>
                <Th>Tipo</Th>
                <Th align="right">Veces</Th>
                <Th>Primera vez</Th>
                <Th>Última vez</Th>
              </tr>
            </thead>
            <tbody>
              {data.repeats.map((r) => (
                <tr key={r.documentId}>
                  <Td>{r.userEmail || '—'}</Td>
                  <Td>{r.orgName || '—'}</Td>
                  <Td>{r.docType}</Td>
                  <Td align="right" style={{ fontWeight: 700 }}>{r.eventCount}</Td>
                  <Td>{fmtDate(r.firstEventAt)}</Td>
                  <Td>{fmtDate(r.lastEventAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        )}
      </Section>

      <Section title="Usuarios" subtitle="Logins registrados desde que se activó el tracking; ordenado por más activos">
        <input
          type="text"
          placeholder="Buscar por email u organización…"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, marginBottom: 10, width: 280 }}
        />
        <TableScroll>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Email</Th>
                <Th>Organización</Th>
                <Th>Plan</Th>
                <Th align="right">Logins</Th>
                <Th>Último login</Th>
                <Th>Registrado</Th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <Td>{u.email}</Td>
                  <Td>{u.orgName || '—'}</Td>
                  <Td>{u.orgPlan ? <PlanBadge plan={u.orgPlan} /> : '—'}</Td>
                  <Td align="right">{u.loginCount}</Td>
                  <Td>{fmtDate(u.lastSignInAt)}</Td>
                  <Td>{fmtDate(u.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>
    </div>
  )
}

const NEXT_LABEL: Record<string, string> = {
  solicitado: 'Marcar enviado a IATA',
  enviado_iata: 'Marcar pendiente de firma',
  firmado: 'Aprobar y notificar',
}

function AgreementsSection({ rows, reload }: { rows: AdminAgreementRow[]; reload: () => void }) {
  const act = async (id: string, opts: { reject?: boolean; note?: string; action?: 'iata_check' }) => {
    try { await advanceAgreement(id, opts); reload() } catch (e: any) { alert(e.message) }
  }
  return (
    <Section title="e-AWB Agreement" subtitle="Solicitudes del Multilateral e-AWB Agreement: abre el formulario de IATA prellenado, envíalo y avanza el estado">
      {rows.length === 0 ? <p style={{ color: '#666', fontSize: 13 }}>Sin solicitudes.</p> : (
        <table style={tableStyle}>
          <thead><tr><Th>Empresa</Th><Th>Org</Th><Th>Estado</Th><Th>Solicitada</Th><Th>Estimada</Th><Th>Acciones</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{r.form.companyName}<br /><span style={{ color: '#888', fontSize: 11 }}>{r.form.signatoryEmail}</span>{r.status === 'solicitado' && r.registry?.available && (
                      <><br /><span style={{ fontSize: 11, fontWeight: 700, color: r.registry.status === 'not_found' ? '#2f7d32' : ACCENT }}>
                        {r.registry.status === 'not_found'
                          ? `Lista IATA (${r.registry.asOf}): no figura`
                          : `${r.registry.status === 'registered' ? 'YA FIGURA en IATA' : 'Parecida en IATA'}: ${r.registry.matches.map(m => `${m.companyName} (${m.countryName})`).join('; ')}`}
                      </span></>
                    )}
                    {r.possibleDuplicate && <><br /><span style={{ color: ACCENT, fontSize: 11, fontWeight: 700 }}>⚠ Misma razón social que otra solicitud</span></>}</Td>
                <Td>{r.orgName || '—'}</Td>
                <Td>{STATUS_LABEL[r.status]}</Td>
                <Td>{fmtDate(r.created_at)}</Td>
                <Td>{r.estimated_ready_at || '—'}</Td>
                <Td>
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.status === 'solicitado' && !r.iata_checked_at && (<>
                      <a href={IATA_REGISTERED_REPORT_URL} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Revisar si ya está en IATA</a>
                      <button onClick={() => act(r.id, { action: 'iata_check' })}>Confirmar: no registrada</button>
                    </>)}
                    {r.status === 'solicitado' && r.iata_checked_at && <a href={iataPrefillUrl(r.form)} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Abrir en IATA</a>}
                    {r.signedUrl && <a href={r.signedUrl} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>PDF firmado</a>}
                    {NEXT_LABEL[r.status] && !(r.status === 'solicitado' && !r.iata_checked_at) && <button onClick={() => act(r.id, {})}>{NEXT_LABEL[r.status]}</button>}
                    {!['aprobado', 'rechazado'].includes(r.status) && (
                      <button onClick={() => { const note = prompt('Motivo del rechazo (se envía al cliente):'); if (note !== null) act(r.id, { reject: true, note }) }}>Rechazar</button>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  )
}

function RegistrySection() {
  const [meta, setMeta] = useState<RegistryMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { fetchRegistryMeta().then(setMeta).catch(() => {}) }, [])

  async function onFile(file: File) {
    // La fecha de descarga del archivo es la fecha "al" que verá el cliente.
    const asOf = new Date(file.lastModified).toISOString().slice(0, 10)
    if (!confirm(`Reemplazar la lista IATA con ${file.name} (descargada el ${asOf})?`)) return
    setBusy(true); setMsg(null)
    try {
      const r = await uploadRegistryCsv(file, asOf)
      setMsg(`Cargadas ${r.rows} filas.`)
      setMeta(await fetchRegistryMeta())
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <Section title="Lista IATA de forwarders" subtitle="Se usa para avisar al cliente si su empresa ya figura en el Multilateral e-AWB Agreement">
      <p style={{ fontSize: 13, margin: '0 0 8px' }}>
        {meta
          ? <>Cargada al <b>{meta.as_of}</b> · {meta.row_count.toLocaleString('es-CL')} empresas · subida {fmtDate(meta.uploaded_at)}</>
          : 'Aún no hay lista cargada: los clientes no verán la verificación.'}
      </p>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>
        1. <a href={IATA_REGISTERED_REPORT_URL} target="_blank" rel="noreferrer" style={{ color: ACCENT }}>Abre el reporte de IATA</a>{' '}
        (te pedirá una verificación de seguridad), sin filtros de país, y exporta la tabla completa a CSV.
        2. Sube el archivo aquí; reemplaza la lista anterior.
      </p>
      <input type="file" accept=".csv,text/csv" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      {busy && <span style={{ fontSize: 12, marginLeft: 8 }}>Cargando…</span>}
      {msg && <p style={{ fontSize: 12, margin: '6px 0 0' }}>{msg}</p>}
    </Section>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#666' }}>
      {children}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: ACCENT }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px', maxWidth: 720 }}>{subtitle}</p>}
      {children}
    </div>
  )
}

/** Caps a long table's height and scrolls inside it; the header row (sticky Th) stays visible. */
function TableScroll({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflow: 'auto', maxHeight: 420, border: '1px solid #eee', borderRadius: 8 }}>
      {children}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: '#999', starter: '#0b7285', pro: '#2f9e44', enterprise: '#7048e8',
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: colors[plan] || '#666' }}>
      {plan}
    </span>
  )
}

const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: 13 }

function Th({ children, align }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align || 'left',
        padding: '6px 10px',
        borderBottom: '2px solid #eee',
        color: '#666',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 1,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align, style }: { children: React.ReactNode; align?: 'left' | 'right'; style?: React.CSSProperties }) {
  return (
    <td style={{ textAlign: align || 'left', padding: '6px 10px', borderBottom: '1px solid #f2f2f2', ...style }}>
      {children}
    </td>
  )
}
