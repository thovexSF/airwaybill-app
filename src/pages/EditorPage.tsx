import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { FormDialog } from '../components/FormDialog'
import { CopiesDialog } from '../components/CopiesDialog'
import { AWBOverlay } from '../components/AWBOverlay'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { applyAirlineForPrefix } from '../lib/airlines'
import { useAuth } from '../auth/AuthContext'
import { saveAWB, getAWB } from '../lib/awbService'
import { usePlan } from '../lib/usePlan'
import { recordPdfDownload } from '../lib/pdfQuota'
import { supabase } from '../lib/supabase'
import { LangSwitcher } from '../components/LangSwitcher'
import { usePostHog } from '@posthog/react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** The sheet is wider than a phone at 100%, so start fitted to the viewport. */
function initialZoom(): number {
  if (typeof window === 'undefined') return 1.0
  const PAGE_PT = 612
  const RENDER_SCALE = 1.5
  if (window.innerWidth >= 768) return 1.0
  return Math.max(0.4, Math.min(1, (window.innerWidth - 16) / (PAGE_PT * RENDER_SCALE)))
}

export function EditorPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user, logout, orgName } = useAuth()
  const { plan, orgId, canDownloadDocument, docsUsedThisMonth, docLimit, loading: planLoading, refreshUsage } = usePlan()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id')
  const docTypeParam = searchParams.get('docType') as 'awb' | 'hawb' | null

  const initialData: AWBData = docTypeParam === 'hawb'
    ? { ...defaultAWBData, docType: 'hawb', isDraft: true, copyNumber: 1, copyLabel: 'Original 1 (for Consignee)' }
    : defaultAWBData
  const [data, setData] = useState<AWBData>(initialData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(initialZoom())
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [downloadCountedAt, setDownloadCountedAt] = useState<string | null>(null)
  const [formWidth, setFormWidth] = useState(380)
  const [pdfScale] = useState<'sm' | 'md' | 'lg'>('lg')
  const [isWideViewport, setIsWideViewport] = useState(() => window.innerWidth >= 900)
  const [overlayMode, setOverlayMode] = useState(() => window.innerWidth >= 900)
  // On narrow screens the sheet stays on screen and the form moves into a
  // dialog; edits are buffered there so Cancel discards them.
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [copiesOpen, setCopiesOpen] = useState(false)
  const [draft, setDraft] = useState<AWBData | null>(null)
  const [pageWidthPx, setPageWidthPx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)
  const pageWrapRef = useRef<HTMLDivElement | null>(null)
  const draftKey = `awb-draft-${user?.id || 'anon'}`

  const updatePageWidth = useCallback(() => {
    const width = pageWrapRef.current?.getBoundingClientRect().width
    if (width) setPageWidthPx(width)
  }, [])

  const setPageWrap = useCallback((node: HTMLDivElement | null) => {
    pageWrapRef.current = node
    if (node) requestAnimationFrame(updatePageWidth)
  }, [updatePageWidth])

  function onDragStart(e: React.MouseEvent) {
    dragRef.current = true
    const startX = e.clientX
    const startW = formWidth
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setFormWidth(Math.max(280, Math.min(600, startW + ev.clientX - startX)))
    }
    const onUp = () => { dragRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    const onResize = () => {
      const wide = window.innerWidth >= 900
      setIsWideViewport(wide)
      if (!wide) setOverlayMode(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const el = pageWrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setPageWidthPx(w)
    })
    ro.observe(el)
    updatePageWidth()
    return () => ro.disconnect()
  }, [overlayMode, pdfBlob, updatePageWidth])

  // Auto-disable DRAFT watermark for paid plans
  useEffect(() => {
    if (plan !== 'free' && data.isDraft) {
      setData(prev => ({ ...prev, isDraft: false }))
    }
  }, [plan])

  // Load doc
  useEffect(() => {
    if (docId) {
      getAWB(docId).then(doc => {
        setData(doc.data)
        setCurrentId(doc.id)
        setDownloadCountedAt(doc.download_counted_at ?? null)
      }).catch(() => {})
    } else {
      setDownloadCountedAt(null)
      // Try local draft first, then org defaults
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        try { setData(JSON.parse(raw) as AWBData); return } catch { /* ignore */ }
      }
      // Load org defaults for new AWB
      if (orgId) {
        supabase
          .from('organization_defaults')
          .select('*')
          .eq('organization_id', orgId)
          .single()
          .then(({ data: defaults }) => {
            if (!defaults) return
            setData(prev => ({
              ...prev,
              shipperNameAndAddress: defaults.shipper_name_and_address || prev.shipperNameAndAddress,
              shipperAccountNumber: defaults.shipper_account_number || prev.shipperAccountNumber,
              carrierName: defaults.carrier_name || prev.carrierName,
              carrierAddress: defaults.carrier_address || prev.carrierAddress,
              agentNameAndCity: defaults.issuing_carrier_agent || prev.agentNameAndCity,
              airportOfDeparture: defaults.airport_of_departure || prev.airportOfDeparture,
              awbPrefix: defaults.awb_prefix || prev.awbPrefix,
            }))
          })
      }
    }
  }, [docId, draftKey, orgId])

  // Persist local draft
  useEffect(() => {
    if (!currentId) localStorage.setItem(draftKey, JSON.stringify(data))
  }, [data, draftKey, currentId])

  // Debounced PDF regeneration
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data, pdfScale), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data, pdfScale, overlayMode])

  async function regenerate(d: AWBData, scale: 'sm' | 'md' | 'lg' = 'lg') {
    setGenerating(true)
    try {
      const blob = await pdf(<AWBDocument data={d} userScale={scale} hideValues={overlayMode} />).toBlob()
      setPdfBlob(blob)
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setGenerating(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveAWB(data, currentId ?? undefined, orgId ?? undefined)
      setCurrentId(doc.id)
      setDownloadCountedAt(doc.download_counted_at ?? null)
      navigate(`/editor?id=${doc.id}`, { replace: true })
      setSaveMsg(t('editor.saved'))
      setTimeout(() => setSaveMsg(null), 2500)
      ;(window as any).clarity?.('event', 'awb_saved')
      posthog?.capture('awb_saved', { doc_type: data.docType ?? 'awb', doc_id: doc.id, is_new: !currentId })
    } catch {
      setSaveMsg(t('editor.saveError'))
    }
    setSaving(false)
  }

  /**
   * Always renders a fresh PDF that carries the values. The preview blob cannot
   * be reused: while the overlay is up it is deliberately the blank sheet, with
   * every value drawn by the HTML inputs instead.
   */
  async function downloadPdfFile() {
    const blob = await pdf(<AWBDocument data={data} userScale={pdfScale} withConditions />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${isHawb ? 'HAWB' : 'AWB'}_${awbFull}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  /**
   * The free-tier gate. Returns false once the month's allowance is spent, so
   * callers can stop before handing the user a file. Every route out of the
   * app — the Download button and the copies dialog alike — goes through here.
   */
  function withinQuota(): boolean {
    if (!atLimit) return true
    setSaveMsg(t('editor.limitReached'))
    setTimeout(() => setSaveMsg(null), 5000)
    ;(window as any).clarity?.('event', 'free_pdf_limit_reached')
    posthog?.capture('free_pdf_limit_reached', { doc_type: data.docType ?? 'awb', awb_number: awbFull, plan })
    return false
  }

  /** Saves the document if it is still unsaved, then counts one PDF against the plan. */
  async function countPdfDownload(source: string) {
    let docIdForDownload = currentId
    let countedAt = downloadCountedAt

    if (!docIdForDownload) {
      try {
        const doc = await saveAWB(data, undefined, orgId ?? undefined)
        docIdForDownload = doc.id
        countedAt = doc.download_counted_at ?? null
        setCurrentId(doc.id)
        setDownloadCountedAt(countedAt)
        navigate(`/editor?id=${doc.id}`, { replace: true })
        ;(window as any).clarity?.('event', 'awb_saved')
        posthog?.capture('awb_saved', { doc_type: data.docType ?? 'awb', doc_id: doc.id, is_new: true, source })
      } catch (error) {
        console.error('PDF save before download failed:', error)
      }
    }

    try {
      const result = await recordPdfDownload(orgId, docIdForDownload, countedAt)
      if (result === 'limit_reached') {
        setSaveMsg(t('editor.limitReached'))
        setTimeout(() => setSaveMsg(null), 5000)
        ;(window as any).clarity?.('event', 'free_pdf_limit_reached')
        posthog?.capture('free_pdf_limit_reached', { doc_type: data.docType ?? 'awb', awb_number: awbFull, plan })
        return false
      }
      if (result === 'ok' || result === 'already_counted') {
        setDownloadCountedAt(new Date().toISOString())
        await refreshUsage()
      }
    } catch (error) {
      console.error('PDF usage tracking failed:', error)
    }

    ;(window as any).clarity?.('event', 'awb_downloaded')
    posthog?.capture('awb_downloaded', { doc_type: data.docType ?? 'awb', awb_number: awbFull, plan, source })
    supabase.functions.invoke('notify-owner', { body: { event: 'awb_downloaded', data: { email: user?.email, awb: awbFull, plan } } })
    return true
  }

  /** Gate handed to the copies dialog: check the plan, then count the issue. */
  async function authorizeCopies(): Promise<boolean> {
    if (planLoading) return false
    if (!withinQuota()) return false
    return countPdfDownload('copies')
  }

  async function handleDownloadPdf() {
    if (!pdfUrl || downloading || planLoading) return
    if (!withinQuota()) return

    setSaveMsg(null)
    setDownloading(true)
    await downloadPdfFile()
    try {
      await countPdfDownload('download')
    } catch {
      setSaveMsg(t('editor.downloadError'))
      setTimeout(() => setSaveMsg(null), 5000)
    } finally {
      setDownloading(false)
    }
  }

  /**
   * Every user edit goes through here so the carrier block can follow the AWB
   * prefix. It only fills fields the user has not written themselves — see
   * `applyAirlineForPrefix`.
   */
  const applyData = useCallback((next: AWBData) => {
    setData(prev => applyAirlineForPrefix(next, prev.awbPrefix))
  }, [])

  const applyDraft = useCallback((next: AWBData) => {
    setDraft(prev => applyAirlineForPrefix(next, (prev ?? next).awbPrefix))
  }, [])

  function openFormDialog() { setDraft(data); setFormDialogOpen(true) }
  function cancelFormDialog() { setDraft(null); setFormDialogOpen(false) }
  function applyFormDialog() {
    if (draft) applyData(draft)
    setDraft(null)
    setFormDialogOpen(false)
  }

  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || 'HAWB')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB')
  const atLimit = plan === 'free' && !canDownloadDocument && !downloadCountedAt
  const hawbBlocked = false

  return (
    <div className="app sheet-editor">
      {/* Row 1 — Brand + account */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{t('common.home')}</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">{t('editor.sub')}</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {orgName ?? user?.email}
            {plan === 'free' && docLimit !== null && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>· {docsUsedThisMonth}/{docLimit} {t('editor.pdfDownloads')}</span>
            )}
          </span>
          {/* Plan badge — simple label for paid users */}
          {plan !== 'free' && (
            <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', cursor: 'default' }}>
              {plan}
            </span>
          )}
          {/* Upgrade — plain text link with downgrade tooltip */}
          {(plan === 'free' || plan === 'starter') && (
            <div style={{ position: 'relative' }} className="plan-badge-wrap">
              <Link to="/pricing" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {plan === 'starter' ? 'Upgrade to Pro' : t('common.upgrade')}
              </Link>
              {plan === 'starter' && (
                <div className="plan-downgrade-tooltip">
                  <Link to="/pricing">or Downgrade</Link>
                </div>
              )}
            </div>
          )}
          <LangSwitcher />
          <button className="btn-example" onClick={logout}>{t('common.signOut')}</button>
        </div>
      </div>

      {/* Row 2 — Document actions */}
      <div className="action-bar" style={{ background: '#6b0000', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn-example" onClick={() => { if (window.confirm(t('editor.exampleConfirm'))) setData(exampleAWB) }}>{t('editor.example')}</button>
          <button className="btn-example" onClick={() => { if (window.confirm(t('editor.clearConfirm'))) { setData(defaultAWBData); setCurrentId(null); setDownloadCountedAt(null) } }}>{t('editor.clear')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('editor.generating')}</span>}
          {saveMsg && <span style={{ color: saveMsg.includes('Error') ? '#ffaaaa' : 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving || hawbBlocked}
            title={hawbBlocked ? 'Upgrade to Pro to save HAWBs' : undefined}
          >
            {saving ? t('editor.saving') : t('editor.saveDoc')}
          </button>
          <button className="btn-example" type="button" onClick={() => setCopiesOpen(true)}>
            🖨 {t('editor.copies')}
          </button>
          {pdfUrl && (
            <button className="btn-download" type="button" onClick={handleDownloadPdf} disabled={downloading || planLoading}>
              {downloading ? t('editor.downloading') : t('editor.downloadPdf')}
            </button>
          )}
          <Link to="/settings" className="btn-download" style={{ gap: 4 }}>
            {t('common.settings')}
          </Link>
        </div>
      </div>

      {/* Free plan limit banner */}
      {atLimit && (
        <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '8px 20px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('editor.limitBanner')}</span>
          <Link to="/pricing" style={{ fontWeight: 700, color: '#8b0000', textDecoration: 'none' }}>{t('editor.upgradeNow')}</Link>
        </div>
      )}

      <div className={`main ${overlayMode ? 'main-single' : ''}`}>
        {!overlayMode && (
          <>
            <div className="form-panel-wrap" style={{ width: formWidth }}>
              <AWBFormPanel data={data} onChange={applyData} />
              {/* Mobile-only: sticky download bar */}
              <div className="mobile-pdf-strip">
                {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 }}>{t('editor.generating')}</span>}
                {pdfUrl && (
                  <button className="btn-download" type="button" onClick={handleDownloadPdf} disabled={downloading || planLoading}
                    style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}
                  >
                    {downloading ? t('editor.downloading') : t('editor.downloadPdf')}
                  </button>
                )}
                {!pdfUrl && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, textAlign: 'center' }}>Generando PDF…</span>}
              </div>
            </div>
            <div className="resize-handle" onMouseDown={onDragStart} title="Drag to resize" />
          </>
        )}
        {/* Mobile: the form lives in a dialog over the sheet */}
        <button type="button" className="edit-fab" onClick={openFormDialog}>
          ✎ {t('editor.editFields')}
        </button>
        <CopiesDialog
          open={copiesOpen}
          data={data}
          onClose={() => setCopiesOpen(false)}
          authorize={authorizeCopies}
          fileName={`${isHawb ? 'HAWB' : 'AWB'}_${awbFull}`}
        />
        <FormDialog
          open={formDialogOpen}
          title={`${isHawb ? 'HAWB' : 'AWB'}${awbFull ? ` · ${awbFull}` : ''}`}
          onCancel={cancelFormDialog}
          onSave={applyFormDialog}
          cancelLabel={t('common.cancel')}
          saveLabel={t('editor.applyChanges')}
        >
          <AWBFormPanel data={draft ?? data} onChange={applyDraft} />
        </FormDialog>

        <div className={`preview-panel ${overlayMode ? 'preview-panel-full' : ''}`}>
          {/* Zoom + PDF text size controls */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2a2a2a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #444' }}>
            {/* View zoom */}
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
            <span style={{ color: '#ccc', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
            <button onClick={() => setZoom(initialZoom())} style={{ background: '#333', border: 'none', color: '#aaa', padding: '0 8px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>{t('editor.zoomReset')}</button>
            {isWideViewport && (
              <button
                type="button"
                onClick={() => setOverlayMode(m => !m)}
                style={{ background: overlayMode ? '#8b0000' : '#333', border: 'none', color: '#fff', padding: '0 10px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >
                {overlayMode ? '✎ Editing on PDF' : '☰ Use form instead'}
              </button>
            )}
            {generating && <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>{t('editor.updating')}</span>}
          </div>
          {pdfBlob ? (
            <div style={{ overflow: 'auto', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Document
                file={pdfBlob}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                loading={null}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  i === 0 && overlayMode ? (
                    <div key={i + 1} ref={setPageWrap} style={{ position: 'relative' }}>
                      <Page
                        pageNumber={1}
                        scale={zoom * 1.5}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={null}
                        onRenderSuccess={updatePageWidth}
                      />
                      {pageWidthPx > 0 && <AWBOverlay data={data} onChange={applyData} pageWidthPx={pageWidthPx} />}
                    </div>
                  ) : (
                    <Page
                      key={i + 1}
                      pageNumber={i + 1}
                      scale={zoom * 1.5}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  )
                ))}
              </Document>
            </div>
          ) : (
            <div className="preview-loading">{t('editor.previewLoading')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
