import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOverview, AdminOverview } from '../lib/adminApi'

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

  useEffect(() => {
    fetchAdminOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredUsers = useMemo(() => {
    if (!data) return []
    const q = userSearch.trim().toLowerCase()
    if (!q) return data.users
    return data.users.filter((u) => u.email.toLowerCase().includes(q) || (u.orgName || '').toLowerCase().includes(q))
  }, [data, userSearch])

  const kpis = useMemo(() => {
    if (!data) return null
    const nearLimitOrgs = data.organizations.filter(
      (o) => o.docLimit != null && o.docsThisMonth >= o.docLimit * 0.8,
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
        <Kpi label="Cerca del límite free" value={kpis.nearLimitOrgs} sub="≥80% de 10/mes" />
        <Kpi label="Documentos re-impresos" value={kpis.repeatedDocs} sub="mismo doc, 2+ veces" />
      </div>

      <Section title="Organizaciones" subtitle="Uso de PDF del mes actual vs. límite del plan">
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Organización</Th>
              <Th>Plan</Th>
              <Th>Miembros</Th>
              <Th align="right">PDFs este mes</Th>
              <Th align="right">Límite</Th>
              <Th align="right">Docs totales</Th>
              <Th align="right">Docs descargados</Th>
              <Th>Desglose (descargados)</Th>
              <Th>Creada</Th>
            </tr>
          </thead>
          <tbody>
            {data.organizations.map((o) => {
              const atRisk = o.docLimit != null && o.docsThisMonth >= o.docLimit
              return (
                <tr key={o.id}>
                  <Td>{o.name}</Td>
                  <Td><PlanBadge plan={o.plan} /></Td>
                  <Td>{o.membersCount}</Td>
                  <Td align="right" style={atRisk ? { color: ACCENT, fontWeight: 700 } : undefined}>
                    {o.docsThisMonth}
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
      </Section>

      <Section
        title="Documentos re-descargados / re-impresos"
        subtitle="Un mismo documento pasado por Descargar o Imprimir más de una vez — no cuenta doble contra el límite, pero explica un total de PDFs alto sin usar 10+ documentos distintos"
      >
        {data.repeats.length === 0 ? (
          <p style={{ color: '#666', fontSize: 13 }}>Sin repeticiones registradas todavía.</p>
        ) : (
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
      </Section>
    </div>
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
      <div style={{ overflowX: 'auto' }}>{children}</div>
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

function Th({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{ textAlign: align || 'left', padding: '6px 10px', borderBottom: '2px solid #eee', color: '#666', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
