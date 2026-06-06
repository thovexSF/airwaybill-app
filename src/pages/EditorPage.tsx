import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { AWBOverlay } from '../components/AWBOverlay'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { useAuth } from '../auth/AuthContext'
import { saveAWB, getAWB } from '../lib/awbService'
import { usePlan } from '../lib/usePlan'
import { supabase } from '../lib/supabase'
import { LangSwitcher } from '../components/LangSwitcher'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export function EditorPage() {
  const { t } = useTranslation()
  const { user, logout, orgName } = useAuth()
  const { plan, orgId, canCreateAWB, awbUsedThisMonth, awbLimit } = usePlan()
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
  const [zoom, setZoom] = useState<number>(1.0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [isWideViewport, setIsWideViewport] = useState(() => window.innerWidth >= 900)
  const [overlayMode, setOverlayMode] = useState(() => window.innerWidth >= 900)
  const [pageWidthPx, setPageWidthPx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageWrapRef = useRef<HTMLDivElement | null>(null)
  const draftKey = `awb-draft-${user?.id || 'anon'}`

  // Narrow-viewport fallback: overlay editing is impractical on phone-sized screens
  useEffect(() => {
    const onResize = () => {
      const wide = window.innerWidth >= 900
      setIsWideViewport(wide)
      if (!wide) setOverlayMode(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Track the rendered PDF page width so the overlay can derive ptToPx and track zoom
  useEffect(() => {
    const el = pageWrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setPageWidthPx(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [overlayMode, pdfBlob])

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
      }).catch(() => {})
    } else {
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
    timerRef.current = setTimeout(() => regenerate(data), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  async function regenerate(d: AWBData) {
    setGenerating(true)
    try {
      const blob = await pdf(<AWBDocument data={d} />).toBlob()
      setPdfBlob(blob)
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setGenerating(false)
  }

  async function handleSave() {
    // Enforce Free plan limit on new docs
    if (!currentId && orgId) {
      const { data: result } = await supabase.rpc('increment_awb_usage', { p_org_id: orgId })
      if (result === 'limit_reached') {
        setSaveMsg(t('editor.limitReached'))
        setTimeout(() => setSaveMsg(null), 4000)
        return
      }
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveAWB(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`/editor?id=${doc.id}`, { replace: true })
      setSaveMsg(t('editor.saved'))
      setTimeout(() => setSaveMsg(null), 2500)
      ;(window as any).clarity?.('event', 'awb_saved')
    } catch {
      setSaveMsg(t('editor.saveError'))
    }
    setSaving(false)
  }

  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || 'HAWB')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB')
  const atLimit = plan === 'free' && !canCreateAWB && !currentId
  const hawbBlocked = false

  return (
    <div className="app">
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
            {plan === 'free' && awbLimit !== null && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>· {awbUsedThisMonth}/{awbLimit} AWBs</span>
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
          <button className="btn-example" onClick={() => { if (window.confirm(t('editor.clearConfirm'))) { setData(defaultAWBData); setCurrentId(null) } }}>{t('editor.clear')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('editor.generating')}</span>}
          {saveMsg && <span style={{ color: saveMsg.includes('Error') ? '#ffaaaa' : 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving || atLimit || hawbBlocked}
            title={hawbBlocked ? 'Upgrade to Pro to save HAWBs' : atLimit ? t('editor.limitReached') : undefined}
          >
            {saving ? t('editor.saving') : t('editor.saveDoc')}
          </button>
          {pdfUrl && (
            <a className="btn-download" href={pdfUrl} download={`${isHawb ? 'HAWB' : 'AWB'}_${awbFull}.pdf`} onClick={() => {
              (window as any).clarity?.('event', 'awb_downloaded')
              supabase.functions.invoke('notify-owner', { body: { event: 'awb_downloaded', data: { email: user?.email, awb: awbFull, plan } } })
            }}>
              ↓ {t('editor.downloadPdf')}
            </a>
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

      <div className="main main-single">
        <div className="preview-panel preview-panel-full">
          {/* Zoom + mode controls */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2a2a2a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #444' }}>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
            <span style={{ color: '#ccc', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
            <button onClick={() => setZoom(1.0)} style={{ background: '#333', border: 'none', color: '#aaa', padding: '0 8px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>{t('editor.zoomReset')}</button>
            <div style={{ width: 1, height: 18, background: '#555' }} />
            {isWideViewport && (
              <button
                onClick={() => setOverlayMode(m => !m)}
                style={{ background: overlayMode ? '#8b0000' : '#333', border: 'none', color: '#fff', padding: '0 10px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >
                {overlayMode ? '✎ Editing on PDF' : '☰ Use form instead'}
              </button>
            )}
            {generating && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>{t('editor.updating')}</span>}
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
                    <div key={i + 1} ref={pageWrapRef} style={{ position: 'relative' }}>
                      <Page
                        pageNumber={i + 1}
                        scale={zoom * 1.5}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      {pageWidthPx > 0 && (
                        <AWBOverlay data={data} onChange={setData} pageWidthPx={pageWidthPx} />
                      )}
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

          {/* Mobile-only: sticky download bar */}
          <div className="mobile-pdf-strip">
            {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 }}>{t('editor.generating')}</span>}
            {pdfUrl && (
              <a className="btn-download" href={pdfUrl} download={`${isHawb ? 'HAWB' : 'AWB'}_${awbFull}.pdf`}
                style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}
                onClick={() => {
                  (window as any).clarity?.('event', 'awb_downloaded')
                  supabase.functions.invoke('notify-owner', { body: { event: 'awb_downloaded', data: { email: user?.email, awb: awbFull, plan } } })
                }}>
                ↓ {t('editor.downloadPdf')}
              </a>
            )}
            {!pdfUrl && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, textAlign: 'center' }}>Generando PDF…</span>}
          </div>
        </div>

        {!overlayMode && (
          <div className="form-panel-wrap form-panel-wrap-fallback">
            <AWBFormPanel data={data} onChange={setData} />
          </div>
        )}
      </div>
    </div>
  )
}
