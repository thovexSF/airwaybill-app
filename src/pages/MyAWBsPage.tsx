import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { listAWBs, deleteAWB, AWBDocument } from '../lib/awbService'
import { LangSwitcher } from '../components/LangSwitcher'

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | 'final' | 'draft'

export function MyAWBsPage() {
  const { t } = useTranslation()
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<AWBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortCol, setSortCol] = useState<'awb' | 'shipper' | 'consignee' | 'route' | 'weight' | 'status' | 'date'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    listAWBs()
      .then(setDocs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm(t('myAwbs.confirmDelete'))) return
    setDeleting(id)
    try {
      await deleteAWB(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (e: any) {
      alert(t('myAwbs.deleteError') + e.message)
    }
    setDeleting(null)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  // Derived row data
  function rowOf(doc: AWBDocument) {
    const d = doc.data
    const awbNum = d.awbPrefix && d.awbSerial ? `${d.awbPrefix}-${d.awbSerial}` : '—'
    const shipper = d.shipperNameAndAddress?.split('\n')[0] || '—'
    const consignee = d.consigneeNameAndAddress?.split('\n')[0] || '—'
    const origin = d.airportOfDeparture || ''
    const dest = d.airportOfDestination || ''
    const route = origin && dest ? `${origin} → ${dest}` : origin || dest || '—'
    const weight = d.rateItems?.reduce((s, r) => s + (parseFloat(r.chargeableWeight) || 0), 0) || 0
    return { awbNum, shipper, consignee, route, weight, status: doc.status }
  }

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = docs
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d => {
        const r = rowOf(d)
        return r.awbNum.toLowerCase().includes(q) ||
          r.shipper.toLowerCase().includes(q) ||
          r.consignee.toLowerCase().includes(q) ||
          r.route.toLowerCase().includes(q)
      })
    }
    return [...list].sort((a, b) => {
      const ra = rowOf(a), rb = rowOf(b)
      let va: string | number, vb: string | number
      if (sortCol === 'date') { va = a.updated_at; vb = b.updated_at }
      else if (sortCol === 'weight') { va = ra.weight; vb = rb.weight }
      else if (sortCol === 'awb') { va = ra.awbNum; vb = rb.awbNum }
      else if (sortCol === 'shipper') { va = ra.shipper; vb = rb.shipper }
      else if (sortCol === 'consignee') { va = ra.consignee; vb = rb.consignee }
      else if (sortCol === 'route') { va = ra.route; vb = rb.route }
      else { va = ra.status; vb = rb.status }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [docs, search, statusFilter, sortCol, sortDir])

  function handleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function exportCsv() {
    const headers = [
      t('myAwbs.colAwb'), t('myAwbs.colShipper'), t('myAwbs.colConsignee'),
      t('myAwbs.colRoute'), t('myAwbs.colWeight'), t('myAwbs.colStatus'), t('myAwbs.colDate'),
    ]
    const rows = filtered.map(doc => {
      const r = rowOf(doc)
      return [r.awbNum, r.shipper, r.consignee, r.route, r.weight || '—', r.status, fmt(doc.updated_at)]
    })
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'awbs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>{t('common.home')}</Link>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{orgName ?? user?.email}</span>
          <Link to="/settings" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>{t('common.settings')}</Link>
          {/* Plan badge with downgrade tooltip */}
          {plan !== 'free' && (
            <div style={{ position: 'relative' }} className="plan-badge-wrap">
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', cursor: 'default' }}>
                {plan}
              </span>
              <div className="plan-downgrade-tooltip">
                <Link to="/pricing">Downgrade plan</Link>
              </div>
            </div>
          )}
          {/* Upgrade button for free / starter */}
          {(plan === 'free' || plan === 'starter') && (
            <Link to="/pricing" style={{ background: '#fff', color: '#8b0000', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {plan === 'starter' ? '⚡ Upgrade to Pro' : `⚡ ${t('common.upgrade')}`}
            </Link>
          )}
          <LangSwitcher />
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>{t('common.signOut')}</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1440, margin: '32px auto', padding: '0 24px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', margin: 0 }}>{t('myAwbs.title')}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
              <button
                onClick={() => setView('cards')}
                style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === 'cards' ? '#8b0000' : '#fff', color: view === 'cards' ? '#fff' : '#555' }}
              >
                ☰ {t('myAwbs.viewCards')}
              </button>
              <button
                onClick={() => setView('table')}
                style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: 'none', borderLeft: '1px solid #ddd', cursor: 'pointer', background: view === 'table' ? '#8b0000' : '#fff', color: view === 'table' ? '#fff' : '#555' }}
              >
                ⊞ {t('myAwbs.viewTable')}
              </button>
            </div>
            {/* Export CSV */}
            {docs.length > 0 && (
              <button
                onClick={exportCsv}
                style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #ddd', borderRadius: 6, background: '#fff', color: '#333', cursor: 'pointer' }}
              >
                ↓ {t('myAwbs.exportCsv')}
              </button>
            )}
            {/* New AWB */}
            <Link
              to="/editor"
              style={{ background: '#8b0000', color: '#fff', padding: '8px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              {t('myAwbs.newAwb')}
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        {docs.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('myAwbs.searchPlaceholder')}
              style={{ flex: 1, minWidth: 200, maxWidth: 340, padding: '7px 12px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }}
            />
            {(['all', 'final', 'draft'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', border: '1px solid',
                  background: statusFilter === s ? '#8b0000' : '#fff',
                  color: statusFilter === s ? '#fff' : '#555',
                  borderColor: statusFilter === s ? '#8b0000' : '#ddd',
                }}
              >
                {t(`myAwbs.filter${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
              </button>
            ))}
            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all') }}
                style={{ fontSize: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {loading && <p style={{ color: '#666' }}>{t('common.loading')}</p>}
        {error && <p style={{ color: '#8b0000' }}>{t('common.error')}: {error}</p>}

        {/* Empty state */}
        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈</div>
            <p style={{ marginBottom: 4 }}>{t('myAwbs.empty.title')}</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>{t('myAwbs.empty.sub')}</p>
            <Link to="/editor" style={{ background: '#8b0000', color: '#fff', padding: '11px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
              {t('myAwbs.empty.cta')}
            </Link>
          </div>
        )}

        {/* No results after filter */}
        {!loading && docs.length > 0 && filtered.length === 0 && (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>{t('myAwbs.noResults')}</p>
        )}

        {/* ── CARDS VIEW ── */}
        {view === 'cards' && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(doc => {
              const r = rowOf(doc)
              return (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8dcdc', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>AWB {r.awbNum}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                      {r.shipper} → {r.consignee}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {r.route !== '—' && <span style={{ marginRight: 8 }}>✈ {r.route}</span>}
                      {r.weight > 0 && <span style={{ marginRight: 8 }}>{r.weight} kg</span>}
                      {t('myAwbs.updated')}: {fmt(doc.updated_at)} · <span style={{ textTransform: 'uppercase', color: doc.status === 'final' ? '#2a7a2a' : '#888' }}>{doc.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/editor?id=${doc.id}`)}
                      style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      {t('myAwbs.open')}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      style={{ background: '#fff', color: '#c00', border: '1px solid #f5b6b6', borderRadius: 6, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}
                    >
                      {deleting === doc.id ? '...' : t('myAwbs.delete')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {view === 'table' && filtered.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#8b0000', color: '#fff' }}>
                    {([
                      ['awb', t('myAwbs.colAwb')],
                      ['shipper', t('myAwbs.colShipper')],
                      ['consignee', t('myAwbs.colConsignee')],
                      ['route', t('myAwbs.colRoute')],
                      ['weight', t('myAwbs.colWeight')],
                      ['status', t('myAwbs.colStatus')],
                      ['date', t('myAwbs.colDate')],
                    ] as [typeof sortCol, string][]).map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12, letterSpacing: 0.4, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        {label}<SortIcon col={col} />
                      </th>
                    ))}
                    <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>{t('myAwbs.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, i) => {
                    const r = rowOf(doc)
                    return (
                      <tr
                        key={doc.id}
                        style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#222', whiteSpace: 'nowrap' }}>{r.awbNum}</td>
                        <td style={{ padding: '10px 14px', color: '#444', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.shipper}</td>
                        <td style={{ padding: '10px 14px', color: '#444', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.consignee}</td>
                        <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{r.route}</td>
                        <td style={{ padding: '10px 14px', color: '#666', whiteSpace: 'nowrap' }}>{r.weight > 0 ? `${r.weight} kg` : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: doc.status === 'final' ? '#e6f4e6' : '#f0f0f0',
                            color: doc.status === 'final' ? '#2a7a2a' : '#666',
                            textTransform: 'uppercase',
                          }}>
                            {doc.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#888', whiteSpace: 'nowrap', fontSize: 12 }}>{fmt(doc.updated_at)}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => navigate(`/editor?id=${doc.id}`)}
                              style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                              {t('myAwbs.open')}
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={deleting === doc.id}
                              style={{ background: '#fff', color: '#c00', border: '1px solid #f5b6b6', borderRadius: 5, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
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
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12, color: '#888', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
              {filtered.length} AWB{filtered.length !== 1 ? 's' : ''} {filtered.length !== docs.length ? `(${docs.length} total)` : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
