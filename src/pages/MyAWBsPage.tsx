import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { listAgreements, useRegistryCheck } from '../lib/eawbAgreement'
import { useOrgProfile } from '../lib/orgProfile'

const OnboardingFlow = React.lazy(() => import('./OnboardingPage').then(m => ({ default: m.OnboardingFlow })))
const EawbAgreementFlow = React.lazy(() => import('./EawbAgreementPage').then(m => ({ default: m.EawbAgreementFlow })))
import { listAWBs, deleteAWB, AWBDocument } from '../lib/awbService'
import { supabase } from '../lib/supabase'
import { LangSwitcher } from '../components/LangSwitcher'
import { ImportModal } from '../components/ImportModal'
import { DocEditorModal } from '../components/DocEditorModal'
import { HUB_DOC_TYPES, DocTypeMeta, docTypeMeta, docTypeAvailable, DOC_CATEGORIES } from '../lib/docTypes'
import { isAdminUiUser } from '../lib/adminUi'
import { usePostHog } from '@posthog/react'
import { isPartnerEmbed } from '../lib/partnerTheme'

type ViewMode = 'cards' | 'table'
type StatusFilter = 'all' | 'final' | 'draft'

function newDocPath(meta: DocTypeMeta): string {
  if (meta.type === 'hawb') return '/editor?docType=hawb'
  return meta.route
}

type TableCol = 'awb' | 'shipper' | 'consignee' | 'route' | 'pcs' | 'weight' | 'prepaid' | 'eawb' | 'status' | 'date'
type ColPrefs = { order: TableCol[]; widths: Partial<Record<TableCol, number>> }
const DEFAULT_COL_ORDER: TableCol[] = ['awb', 'shipper', 'consignee', 'route', 'pcs', 'weight', 'prepaid', 'eawb', 'status', 'date']
const DEFAULT_COL_WIDTH: Record<TableCol, number> = {
  awb: 130, shipper: 200, consignee: 200, route: 110, pcs: 60, weight: 90, prepaid: 90, eawb: 90, status: 80, date: 110,
}
const COL_PREFS_KEY = 'doc-hub-table-columns'

function loadColPrefs(): ColPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(COL_PREFS_KEY) || 'null') as ColPrefs | null
    // A saved order is kept only while it names exactly today's columns.
    if (saved && saved.order?.length === DEFAULT_COL_ORDER.length && DEFAULT_COL_ORDER.every((k) => saved.order.includes(k))) {
      return { order: saved.order, widths: saved.widths ?? {} }
    }
  } catch { /* unreadable or blocked storage */ }
  return { order: [...DEFAULT_COL_ORDER], widths: {} }
}

const PLAN_LABEL: Record<string, string> = { free: 'Gratis', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

const icon = (d: string) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/** Line icons for the document categories: plane, ship, document. */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  air: icon('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'),
  maritime: icon('M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M12 2v3'),
  invoice: icon('M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6M16 13H8M16 17H8M10 9H8'),
  eawb: icon('M4 4h16v16H4zM4 9h16M9 4v16'),
}

export function MyAWBsPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user, logout, orgName } = useAuth()
  const { plan, docsUsedThisMonth, docLimit, orgId } = usePlan()
  const [hasAgreement, setHasAgreement] = useState(true)
  const { profile, loading: profileLoading } = useOrgProfile()
  const { registry: iataRegistry } = useRegistryCheck(profile.legalName)
  const profileIncomplete = !profileLoading && (!profile.country || (!profile.onboardingCompletedAt && !profile.onboardingDismissedAt))
  const navigate = useNavigate()
  const [modalParams, setModalParams] = useSearchParams()
  const modal = modalParams.get('modal')
  const openModal = (m: 'onboarding' | 'eawb' | null) => setModalParams(prev => {
    const n = new URLSearchParams(prev)
    if (m) n.set('modal', m); else n.delete('modal')
    return n
  }, { replace: true })
  useEffect(() => {
    // Cuentas recién creadas (también las de Google) pasan por el onboarding; las existentes solo ven el aviso.
    const created = user?.created_at ? Date.now() - new Date(user.created_at).getTime() : Infinity
    if (profileIncomplete && !profile.country && !profile.onboardingDismissedAt && created < 24 * 3600 * 1000) {
      openModal('onboarding')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileIncomplete, profile.country, profile.onboardingDismissedAt, user?.created_at])
  useEffect(() => {
    if (orgId) listAgreements(orgId).then(r => setHasAgreement(r.some(a => a.status !== 'rechazado'))).catch(() => {})
  }, [orgId])
  const [searchParams, setSearchParams] = useSearchParams()

  const tabFromUrl = searchParams.get('tab') || 'awb'
  const isB2bPartner = isPartnerEmbed() || document.documentElement.getAttribute('data-partner-theme') === 'b2b'
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSrc, setEditorSrc] = useState('')
  const [editorTitle, setEditorTitle] = useState('')

  function openEditor(path: string, title: string) {
    setEditorTitle(title)
    setEditorSrc(path)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorSrc('')
    listAWBs().then(setDocs).catch(() => {})
  }

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

  function handleRowDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    void handleDelete(id)
  }

  const rowNumCell = (n: number, docId: string) => (
    <td
      className="sticky-left doc-hub-row-num"
      title={t('myAwbs.deleteRightClick')}
      onContextMenu={(e) => handleRowDelete(e, docId)}
    >
      {n}
    </td>
  )

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

  // Table columns: order and widths are the viewer's own, kept in this browser.
  const colLabel: Record<TableCol, string> = {
    awb: t('myAwbs.colAwb'), shipper: t('myAwbs.colShipper'), consignee: t('myAwbs.colConsignee'),
    route: t('myAwbs.colRoute'), pcs: t('myAwbs.colPcs'), weight: t('myAwbs.colWeight'),
    prepaid: t('myAwbs.colPrepaid'), eawb: t('myAwbs.colEawb'), status: t('myAwbs.colStatus'), date: t('myAwbs.colDate'),
  }
  const [colPrefs, setColPrefs] = useState<ColPrefs>(loadColPrefs)
  const [dragCol, setDragCol] = useState<TableCol | null>(null)
  const [dropCol, setDropCol] = useState<TableCol | null>(null)
  const colOrder = colPrefs.order
  const colWidth = (k: TableCol) => colPrefs.widths[k] ?? DEFAULT_COL_WIDTH[k]
  const colsCustomized = colOrder.join() !== DEFAULT_COL_ORDER.join() || Object.keys(colPrefs.widths).length > 0
  const savePrefs = (next: ColPrefs) => {
    setColPrefs(next)
    try { localStorage.setItem(COL_PREFS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }
  const moveCol = (from: TableCol, to: TableCol) => {
    if (from === to) return
    const order = colOrder.filter((k) => k !== from)
    order.splice(order.indexOf(to) + (colOrder.indexOf(from) < colOrder.indexOf(to) ? 1 : 0), 0, from)
    savePrefs({ ...colPrefs, order })
  }
  const startResize = (e: React.MouseEvent, k: TableCol) => {
    e.preventDefault()
    e.stopPropagation()
    const x0 = e.clientX, w0 = colWidth(k)
    let latest = colPrefs
    const onMove = (ev: MouseEvent) => {
      latest = { ...latest, widths: { ...latest.widths, [k]: Math.max(50, Math.round(w0 + ev.clientX - x0)) } }
      setColPrefs(latest)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      savePrefs(latest)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const resetCols = () => savePrefs({ order: [...DEFAULT_COL_ORDER], widths: {} })

  const SortIcon = ({ col }: { col: typeof sortCol }) =>
    sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'


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
        <Link to="/my-awbs" className="hub-bar-logo">✈ AIRWAYBILL APP</Link>
        {isAdminUiUser(user?.email) && <Link to="/admin" className="hub-bar-admin">Admin</Link>}
        <div className="hub-bar-right">
          <div className="hub-bar-group">
            {plan === 'free' && docLimit !== null && (
              <span className={`hub-bar-usage${docsUsedThisMonth >= docLimit ? ' full' : ''}`}>
                {docsUsedThisMonth}/{docLimit} {t('editor.freeDocsShort')}
              </span>
            )}
            {plan !== 'free' && <span className="hub-bar-plan">{plan}</span>}
            {(plan === 'free' || plan === 'starter') && (
              <Link to="/pricing" className="hub-bar-upgrade">
                {plan === 'starter' ? 'Upgrade to Pro' : t('common.upgrade')}
              </Link>
            )}
          </div>
          <span className="hub-bar-sep" />
          <div className="hub-bar-group">
            <Link to="/settings" className="hub-bar-gear" aria-label={t('common.settings')} title={t('common.settings')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
          <span className="hub-bar-sep" />
          <div className="hub-bar-group">
            <LangSwitcher />
            <span className="hub-bar-name">{orgName ?? user?.email}</span>
            <button onClick={logout} className="hub-bar-signout">{t('common.signOut')}</button>
          </div>
        </div>
      </div>

      <div className="doc-hub-body">
        {modal === 'onboarding' && (
          <Modal onClose={() => openModal(null)} label={t('onboarding.title.company')} width={560}>
            <React.Suspense fallback={<div style={{ minHeight: 240 }} />}>
              <OnboardingFlow onClose={() => openModal(null)} onOpenEawb={() => openModal('eawb')} />
            </React.Suspense>
          </Modal>
        )}
        {modal === 'eawb' && (
          <Modal onClose={() => openModal(null)} label={t('eawb.title')} width={720}>
            <React.Suspense fallback={<div style={{ minHeight: 240 }} />}>
              <EawbAgreementFlow onClose={() => openModal(null)} />
            </React.Suspense>
          </Modal>
        )}
        {profileIncomplete && (
          <a href="?modal=onboarding" onClick={(e) => { e.preventDefault(); openModal('onboarding') }} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: '#faf8f8', border: '1px solid #e8dcdc', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            textDecoration: 'none', color: '#222',
          }}>
            <span style={{ fontSize: 14 }}><b>{t('onboarding.banner.title')}</b> {t('onboarding.banner.sub')}</span>
            <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{t('onboarding.banner.button')} →</span>
          </a>
        )}
        {/* B2B already issues eAWB; the e-AWB Agreement pitch is for the platform's own customers. */}
        {!isB2bPartner && !profileIncomplete && !profileLoading && !hasAgreement && iataRegistry?.status !== 'registered' && (
          <a href="?modal=eawb" onClick={(e) => { e.preventDefault(); openModal('eawb') }} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: '#faf8f8', border: '1px solid #e8dcdc', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            textDecoration: 'none', color: '#222',
          }}>
            <span style={{ fontSize: 14 }}><b>{t('eawbPromo.title')}</b> {t('eawbPromo.sub')}</span>
            <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{t('eawbPromo.button')} →</span>
          </a>
        )}
        <div className="doc-hub-brand">
          Airwaybill App <span>· Plan {PLAN_LABEL[plan] ?? plan}</span>
        </div>
        <div className="doc-hub-tabs" role="tablist" aria-label={t('myAwbs.docTypes')}>
          {DOC_CATEGORIES.map((cat) => {
            const tabs = HUB_DOC_TYPES.filter((dt) => cat.types.includes(dt.type) && !profileLoading && docTypeAvailable(dt, profile.country, counts[dt.type] || 0))
            if (!tabs.length) return null
            return (
              <div key={cat.key} className="doc-hub-group">
                <div className="doc-hub-cat">{CATEGORY_ICON[cat.key]}{t(cat.labelKey)}</div>
                <div className="doc-hub-group-tabs">
                  {tabs.map((dt) => {
                    const active = dt.type === activeMeta.type
                    const n = counts[dt.type] || 0
                    return (
                    <button
                      key={dt.type}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`doc-hub-tab${active ? ' active' : ''}`}

                      onClick={() => setTab(dt.type)}
                    >
                      <span className="doc-hub-tab-label">{dt.badge}</span>
                      {n > 0 && (
                        <span className="doc-hub-tab-count">
                          {n}
                        </span>
                      )}
                    </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="doc-hub-header">
          <div>
            <h1>{activeMeta.name}</h1>
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
                ↑ {t('myAwbs.import')}
              </button>
            )}
            <button
              type="button"
              className="doc-hub-btn primary"
              onClick={() => openEditor(newDocPath(activeMeta), `${t('myAwbs.newPrefix')} ${activeMeta.badge}`)}
            >
              + {t('myAwbs.newPrefix')} {activeMeta.badge}
            </button>
          </div>
        </div>


        <div className="doc-hub-panel">
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
                {t('myAwbs.clear')}
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
              <button
                type="button"
                className="doc-hub-btn primary"
                style={{ marginTop: 14 }}
                onClick={() => openEditor(newDocPath(activeMeta), `Nuevo ${activeMeta.badge}`)}
              >
                + Nuevo {activeMeta.badge}
              </button>
            </div>
          )}

          {view === 'cards' && filtered.length > 0 && (
            <div className="doc-hub-cards">
              {filtered.map((doc, i) => {
                const r = rowOf(doc)
                return (
                  <div key={doc.id} className="doc-hub-card doc-hub-row-clickable" onClick={() => openEditor(r.editPath, r.awbNum)}>
                    <span
                      className="doc-hub-row-num card"
                      title={t('myAwbs.deleteRightClick')}
                      onContextMenu={(e) => handleRowDelete(e, doc.id)}
                    >
                      {i + 1}
                    </span>
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
                  </div>
                )
              })}
            </div>
          )}

          {view === 'table' && filtered.length > 0 && (
            <div className="doc-hub-table-wrap">
              <table className="doc-hub-table" style={{ tableLayout: 'fixed', width: 44 + colOrder.reduce((w, k) => w + colWidth(k), 0) }}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  {colOrder.map((k) => <col key={k} style={{ width: colWidth(k) }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky-left doc-hub-row-num">{t('myAwbs.colNum')}</th>
                    {colOrder.map((k) => (
                      <th
                        key={k}
                        draggable
                        className={`doc-hub-th${dragCol === k ? ' dragging' : ''}${dropCol === k && dragCol !== k ? ' drop' : ''}`}
                        onDragStart={(e) => { setDragCol(k); e.dataTransfer.effectAllowed = 'move' }}
                        onDragOver={(e) => { e.preventDefault(); if (dropCol !== k) setDropCol(k) }}
                        onDragEnd={() => { setDragCol(null); setDropCol(null) }}
                        onDrop={(e) => { e.preventDefault(); if (dragCol) moveCol(dragCol, k); setDragCol(null); setDropCol(null) }}
                        onClick={() => handleSort(k)}
                        title={t('myAwbs.colDragHint', 'Arrastra para mover · borde derecho para ajustar el ancho')}
                      >
                        <span className="doc-hub-th-label">{colLabel[k]}<SortIcon col={k} /></span>
                        <span
                          className="doc-hub-col-resize"
                          onMouseDown={(e) => startResize(e, k)}
                          onClick={(e) => e.stopPropagation()}
                          draggable={false}
                          onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, i) => {
                    const r = rowOf(doc)
                    const cell: Record<TableCol, React.ReactNode> = {
                      awb: <td className="strong">{r.awbNum}</td>,
                      shipper: <td className="ellipsis">{r.shipper}</td>,
                      consignee: <td className="ellipsis">{r.consignee}</td>,
                      route: <td className="ellipsis">{r.route}</td>,
                      pcs: <td>{r.pcs > 0 ? r.pcs : '—'}</td>,
                      weight: <td>{r.weight > 0 ? `${r.weight} kg` : '—'}</td>,
                      prepaid: <td>{r.prepaid > 0 ? r.prepaid.toFixed(2) : '—'}</td>,
                      eawb: <td>{r.eawb ? <span className={`doc-hub-status eawb-${r.eawb}`}>{r.eawb}</span> : '—'}</td>,
                      status: <td><span className={`doc-hub-status ${doc.status}`}>{doc.status}</span></td>,
                      date: <td className="muted">{fmt(doc.updated_at)}</td>,
                    }
                    return (
                      <tr
                        key={doc.id}
                        className={`doc-hub-row-clickable${i % 2 ? ' alt' : ''}${deleting === doc.id ? ' deleting' : ''}`}
                        onClick={() => openEditor(r.editPath, r.awbNum)}
                      >
                        {rowNumCell(i + 1, doc.id)}
                        {colOrder.map((k) => <React.Fragment key={k}>{cell[k]}</React.Fragment>)}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="doc-hub-footer">
                {filtered.length} {activeMeta.badge}
                {docs.length !== filtered.length ? ` · ${docs.length} total` : ''}
                {colsCustomized && (
                  <button type="button" className="doc-hub-cols-reset" onClick={resetCols}>
                    {t('myAwbs.resetColumns', 'Restablecer columnas')}
                  </button>
                )}
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
      <DocEditorModal
        open={editorOpen}
        title={editorTitle}
        src={editorSrc}
        onClose={closeEditor}
      />
    </div>
  )
}
