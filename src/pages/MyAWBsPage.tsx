import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { listAWBs, deleteAWB, AWBDocument } from '../lib/awbService'
import { supabase } from '../lib/supabase'
import { LangSwitcher } from '../components/LangSwitcher'
import { ImportModal } from '../components/ImportModal'
import { DOC_TYPES, HUB_DOC_TYPES, DocTypeMeta, docTypeMeta } from '../lib/docTypes'
import { usePostHog } from '@posthog/react'

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | 'final' | 'draft'

function newDocPath(meta: DocTypeMeta): string {
  if (meta.type === 'hawb') return '/editor?docType=hawb'
  return meta.route
}

export function MyAWBsPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user, logout, orgName } = useAuth()
  const { plan, docsUsedThisMonth, docLimit } = usePlan()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabFromUrl = searchParams.get('tab') || 'awb'
  const activeMeta = HUB_DOC_TYPES.find((d) => d.type === tabFromUrl) || HUB_DOC_TYPES[0]

  const [docs, setDocs] = useState<AWBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [view, setView] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortCol, setSortCol] = useState<'awb' | 'shipper' | 'consignee' | 'route' | 'weight' | 'pcs' | 'prepaid' | 'eawb' | 'status' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [ediOpen, setEdiOpen] = useState(false)

  useEffect(() => {
    listAWBs()
      .then(setDocs)
      .catch(async (e) => {
        const msg = e.message || String(e)
        if (msg.includes('JWT issued at future')) {
          await supabase.auth.signOut({ scope: 'local' })
          window.location.reload()
          return
        }
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  function setTab(type: string) {
    setSearchParams({ tab: type }, { replace: true })
  }

  async function handleDelete(id: string) {
    if (!confirm(t('myAwbs.confirmDelete'))) return
    setDeleting(id)
    try {
      await deleteAWB(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
      posthog?.capture('awb_deleted', { doc_id: id })
    } catch (e: any) {
      alert(t('myAwbs.deleteError') + e.message)
    }
    setDeleting(null)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

  function rowOf(doc: AWBDocument) {
    const d = doc.data as any
    const meta = docTypeMeta(d.docType)
    const awbNum = meta.title(d) || '—'
    const shipper = d.shipperNameAndAddress?.split('\n')[0] || d.shipper?.split('\n')[0] || d.razonSocialExportador || d.seller || '—'
    const consignee = d.consigneeNameAndAddress?.split('\n')[0] || d.consignee?.split('\n')[0] || d.consignatario || d.buyer || '—'
    const origin = d.airportOfDeparture || d.originStation || d.puertoEmbarque || d.origin || d.portOfLoading || d.departure || ''
    const dest = d.airportOfDestination || d.destinationStation || d.puertoDestino || d.destination || d.portOfDischarge || ''
    const route = origin && dest ? `${origin} → ${dest}` : origin || dest || '—'
    const weight = d.rateItems?.reduce((s: number, r: any) => s + (parseFloat(r.chargeableWeight) || 0), 0)
      || parseFloat(d.totalKgNetos) || 0
    const pcs = d.rateItems?.reduce((s: number, r: any) => s + (parseFloat(r.pieces) || 0), 0) || 0
    const prepaid = parseFloat(d.totalPrepaid) || 0
    const eawb = d.eAwbStatus && d.eAwbStatus !== 'none' ? String(d.eAwbStatus) : ''
    const editPath = `${meta.route}?id=${doc.id}`
    return { awbNum, shipper, consignee, route, weight, pcs, prepaid, eawb, status: doc.status, meta, editPath }
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const doc of docs) {
      const type = (doc.data as any)?.docType || 'awb'
      map[type] = (map[type] || 0) + 1
    }
    return map
  }, [docs])

  const filtered = useMemo(() => {
    let list = docs.filter((d) => ((d.data as any)?.docType || 'awb') === activeMeta.type)
    if (statusFilter !== 'all') list = list.filter((d) => d.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) => {
        const r = rowOf(d)
        return (
          r.awbNum.toLowerCase().includes(q) ||
          r.shipper.toLowerCase().includes(q) ||
          r.consignee.toLowerCase().includes(q) ||
          r.route.toLowerCase().includes(q) ||
          r.eawb.toLowerCase().includes(q)
        )
      })
    }
    return [...list].sort((a, b) => {
      const ra = rowOf(a)
      const rb = rowOf(b)
      let va: string | number
      let vb: string | number
      if (sortCol === 'date') {
        va = a.updated_at
        vb = b.updated_at
      } else if (sortCol === 'weight') {
        va = ra.weight
        vb = rb.weight
      } else if (sortCol === 'pcs') {
        va = ra.pcs
        vb = rb.pcs
      } else if (sortCol === 'prepaid') {
        va = ra.prepaid
        vb = rb.prepaid
      } else if (sortCol === 'eawb') {
        va = ra.eawb
        vb = rb.eawb
      } else if (sortCol === 'awb') {
        va = ra.awbNum
        vb = rb.awbNum
      } else if (sortCol === 'shipper') {
        va = ra.shipper
        vb = rb.shipper
      } else if (sortCol === 'consignee') {
        va = ra.consignee
        vb = rb.consignee
      } else if (sortCol === 'route') {
        va = ra.route
        vb = rb.route
      } else {
        va = ra.status
        vb = rb.status
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [docs, search, statusFilter, activeMeta.type, sortCol, sortDir])

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function exportCsv() {
    const headers = [
      t('myAwbs.colAwb'),
      t('myAwbs.colShipper'),
      t('myAwbs.colConsignee'),
      t('myAwbs.colRoute'),
      t('myAwbs.colPcs'),
      t('myAwbs.colWeight'),
      t('myAwbs.colPrepaid'),
      t('myAwbs.colEawb'),
      t('myAwbs.colStatus'),
      t('myAwbs.colDate'),
    ]
    const rows = filtered.map((doc) => {
      const r = rowOf(doc)
      return [
        r.awbNum,
        r.shipper,
        r.consignee,
        r.route,
        r.pcs || '—',
        r.weight || '—',
        r.prepaid || '—',
        r.eawb || '—',
        r.status,
        fmt(doc.updated_at),
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeMeta.type}-docs.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'

  const isPro = plan === 'pro' || plan === 'enterprise'
  const canCreate = !activeMeta.pro || isPro
  const ediTypes = DOC_TYPES.filter((d) => ['fwb', 'fhl', 'ffr'].includes(d.type))

  const emptyHints: Record<string, string> = {
    awb: 'No hay MAWB registrados.',
    hawb: 'No hay HAWB registrados.',
    manifest: 'No hay manifiestos registrados.',
    dgd: 'No hay declaraciones DGD registradas.',
    label: 'No hay labels registrados.',
    bl: 'No hay Bills of Lading registrados.',
    bl_manifest: 'No hay manifiestos B/L registrados.',
    imo_dgd: 'No hay IMO DGD registrados.',
    neppex: 'No hay NEPPEX registrados.',
    proforma: 'No hay Proforma Invoices registrados.',
  }

  return (
    <div className="doc-hub">
      <div className="topbar partner-hide-in-embed doc-hub-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
            {t('common.home')}
          </Link>
          <Link to="/my-awbs" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none', letterSpacing: 0.5 }}>
            ✈ AIRWAYBILL APP
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{orgName ?? user?.email}</span>
          {plan === 'free' && docLimit !== null && (
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, whiteSpace: 'nowrap' }}>
              {docsUsedThisMonth}/{docLimit} {t('editor.freeDocs')}
            </span>
          )}
          <Link to="/settings" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>
            {t('common.settings')}
          </Link>
          {plan !== 'free' && (
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                textTransform: 'capitalize',
              }}
            >
              {plan}
            </span>
          )}
          {(plan === 'free' || plan === 'starter') && (
            <Link
              to="/pricing"
              style={{
                background: '#fff',
                color: 'var(--red)',
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 20,
                textDecoration: 'none',
              }}
            >
              {plan === 'starter' ? 'Upgrade to Pro' : t('common.upgrade')}
            </Link>
          )}
          <LangSwitcher />
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}
          >
            {t('common.signOut')}
          </button>
        </div>
      </div>

      <div className="doc-hub-body">
        <div className="doc-hub-header">
          <div>
            <h1>Documentos AWB</h1>
            <p className="doc-hub-sub">
              Suite documental · pestaña <strong>{activeMeta.badge}</strong>
            </p>
          </div>
          <div className="doc-hub-actions">
            <div className="doc-hub-view-toggle">
              <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>
                {t('myAwbs.viewCards')}
              </button>
              <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
                {t('myAwbs.viewTable')}
              </button>
            </div>
            {filtered.length > 0 && (
              <button type="button" className="doc-hub-btn" onClick={exportCsv}>
                ↓ CSV
              </button>
            )}
            {activeMeta.type === 'awb' && (
              <button type="button" className="doc-hub-btn" onClick={() => setShowImport(true)}>
                ↑ Import Excel
              </button>
            )}
            {isPro && (
              <div style={{ position: 'relative' }}>
                <button type="button" className="doc-hub-btn" onClick={() => setEdiOpen((o) => !o)}>
                  EDI ▾
                </button>
                {ediOpen && (
                  <>
                    <div className="doc-hub-menu-backdrop" onClick={() => setEdiOpen(false)} />
                    <div className="doc-hub-menu">
                      {ediTypes.map((dt) => (
                        <Link key={dt.type} to={dt.route} onClick={() => setEdiOpen(false)}>
                          <span style={{ background: dt.color }}>{dt.badge}</span>
                          {dt.name}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {canCreate ? (
              <Link to={newDocPath(activeMeta)} className="doc-hub-btn primary">
                + Nuevo {activeMeta.badge}
              </Link>
            ) : (
              <Link to="/pricing" className="doc-hub-btn primary">
                Pro · {activeMeta.badge}
              </Link>
            )}
          </div>
        </div>

        <div className="doc-hub-panel">
          <div className="doc-hub-tabs" role="tablist" aria-label="Tipos de documento">
            {HUB_DOC_TYPES.map((dt) => {
              const active = dt.type === activeMeta.type
              const n = counts[dt.type] || 0
              return (
                <button
                  key={dt.type}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`doc-hub-tab${active ? ' active' : ''}`}
                  style={{
                    background: active ? dt.color : `${dt.color}22`,
                    color: active ? '#fff' : dt.color,
                    borderBottomColor: active ? dt.color : 'transparent',
                    boxShadow: active ? `inset 0 -3px 0 ${dt.color}` : undefined,
                  }}
                  onClick={() => setTab(dt.type)}
                >
                  <span className="doc-hub-tab-label">{dt.badge}</span>
                  {n > 0 && (
                    <span
                      className="doc-hub-tab-count"
                      style={{
                        background: active ? 'rgba(255,255,255,0.25)' : `${dt.color}33`,
                        color: active ? '#fff' : dt.color,
                      }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="doc-hub-filters">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('myAwbs.searchPlaceholder')}
              className="doc-hub-search"
            />
            {(['all', 'final', 'draft'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`doc-hub-chip${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {t(`myAwbs.filter${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
              </button>
            ))}
            {(search || statusFilter !== 'all') && (
              <button
                type="button"
                className="doc-hub-clear"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
              >
                Clear
              </button>
            )}
          </div>

          {loading && <p className="doc-hub-empty">{t('common.loading')}</p>}
          {error && (
            <p className="doc-hub-empty" style={{ color: 'var(--red)' }}>
              {t('common.error')}: {error}
            </p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="doc-hub-empty-state">
              <div style={{ fontSize: 40, marginBottom: 8 }}>✈</div>
              <p>{emptyHints[activeMeta.type] || t('myAwbs.empty.title')}</p>
              {canCreate && (
                <Link to={newDocPath(activeMeta)} className="doc-hub-btn primary" style={{ marginTop: 14 }}>
                  + Nuevo {activeMeta.badge}
                </Link>
              )}
            </div>
          )}

          {view === 'cards' && filtered.length > 0 && (
            <div className="doc-hub-cards">
              {filtered.map((doc) => {
                const r = rowOf(doc)
                return (
                  <div key={doc.id} className="doc-hub-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="doc-hub-card-title">{r.awbNum}</div>
                      <div className="doc-hub-card-meta">
                        {r.shipper} → {r.consignee}
                      </div>
                      <div className="doc-hub-card-meta muted">
                        {r.route !== '—' && <span>✈ {r.route} · </span>}
                        {r.pcs > 0 && <span>{r.pcs} pcs · </span>}
                        {r.weight > 0 && <span>{r.weight} kg · </span>}
                        {r.eawb && <span>eAWB:{r.eawb} · </span>}
                        {fmt(doc.updated_at)} · {doc.status}
                      </div>
                    </div>
                    <div className="doc-hub-card-actions">
                      <button type="button" className="doc-hub-btn primary" onClick={() => navigate(r.editPath)}>
                        {t('myAwbs.open')}
                      </button>
                      <button
                        type="button"
                        className="doc-hub-btn danger"
                        disabled={deleting === doc.id}
                        onClick={() => handleDelete(doc.id)}
                      >
                        {deleting === doc.id ? '...' : t('myAwbs.delete')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'table' && filtered.length > 0 && (
            <div className="doc-hub-table-wrap">
              <table className="doc-hub-table">
                <thead>
                  <tr>
                    {(
                      [
                        ['awb', t('myAwbs.colAwb')],
                        ['shipper', t('myAwbs.colShipper')],
                        ['consignee', t('myAwbs.colConsignee')],
                        ['route', t('myAwbs.colRoute')],
                        ['pcs', t('myAwbs.colPcs')],
                        ['weight', t('myAwbs.colWeight')],
                        ['prepaid', t('myAwbs.colPrepaid')],
                        ['eawb', t('myAwbs.colEawb')],
                        ['status', t('myAwbs.colStatus')],
                        ['date', t('myAwbs.colDate')],
                      ] as [typeof sortCol, string][]
                    ).map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className={col === 'awb' ? 'sticky-left' : undefined}
                      >
                        {label}
                        <SortIcon col={col} />
                      </th>
                    ))}
                    <th className="sticky-right">{t('myAwbs.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, i) => {
                    const r = rowOf(doc)
                    return (
                      <tr key={doc.id} className={i % 2 ? 'alt' : undefined}>
                        <td className="sticky-left strong">{r.awbNum}</td>
                        <td className="ellipsis">{r.shipper}</td>
                        <td className="ellipsis">{r.consignee}</td>
                        <td>{r.route}</td>
                        <td>{r.pcs > 0 ? r.pcs : '—'}</td>
                        <td>{r.weight > 0 ? `${r.weight} kg` : '—'}</td>
                        <td>{r.prepaid > 0 ? r.prepaid.toFixed(2) : '—'}</td>
                        <td>
                          {r.eawb ? <span className={`doc-hub-status eawb-${r.eawb}`}>{r.eawb}</span> : '—'}
                        </td>
                        <td>
                          <span className={`doc-hub-status ${doc.status}`}>{doc.status}</span>
                        </td>
                        <td className="muted">{fmt(doc.updated_at)}</td>
                        <td className="sticky-right">
                          <div className="doc-hub-card-actions">
                            <button
                              type="button"
                              className="doc-hub-btn primary sm"
                              onClick={() => navigate(r.editPath)}
                            >
                              {t('myAwbs.open')}
                            </button>
                            <button
                              type="button"
                              className="doc-hub-btn danger sm"
                              disabled={deleting === doc.id}
                              onClick={() => handleDelete(doc.id)}
                            >
                              {deleting === doc.id ? '...' : t('myAwbs.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="doc-hub-footer">
                {filtered.length} {activeMeta.badge}
                {docs.length !== filtered.length ? ` · ${docs.length} total` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false)
            listAWBs().then(setDocs).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
