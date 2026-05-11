import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBFormPanel } from '../components/AWBFormPanel'
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

  const [data, setData] = useState<AWBData>(defaultAWBData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState<number>(1)
  const [zoom, setZoom] = useState<number>(1.0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [formWidth, setFormWidth] = useState(380)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [pdfScale, setPdfScale] = useState<'sm' | 'md' | 'lg'>('lg')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)
  const draftKey = `awb-draft-${user?.id || 'anon'}`

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
    timerRef.current = setTimeout(() => regenerate(data, pdfScale), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data, pdfScale])

  async function regenerate(d: AWBData, scale: 'sm' | 'md' | 'lg' = 'lg') {
    setGenerating(true)
    try {
      const blob = await pdf(<AWBDocument data={d} userScale={scale} />).toBlob()
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
    } catch {
      setSaveMsg(t('editor.saveError'))
    }
    setSaving(false)
  }

  const awbFull = data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB'
  const atLimit = plan === 'free' && !canCreateAWB && !currentId

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
          <Link to="/my-awbs" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>{t('common.myAwbs')}</Link>
          {/* Plan badge — simple label for paid users */}
          {plan !== 'free' && (
            <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', cursor: 'default' }}>
              {plan}
            </span>
          )}
          {/* Upgrade button with downgrade tooltip on hover */}
          {(plan === 'free' || plan === 'starter') && (
            <div style={{ position: 'relative' }} className="plan-badge-wrap">
              <Link to="/pricing" style={{ background: '#fff', color: '#8b0000', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, textDecoration: 'none', whiteSpace: 'nowrap', display: 'block' }}>
                {plan === 'starter' ? 'Upgrade to Pro' : t('common.upgrade')}
              </Link>
              {plan === 'starter' && (
                <div className="plan-downgrade-tooltip">
                  <Link to="/pricing">Downgrade plan</Link>
                </div>
              )}
            </div>
          )}
          <LangSwitcher />
          <button className="btn-example" onClick={logout}>{t('common.signOut')}</button>
        </div>
      </div>

      {/* Row 2 — Document actions */}
      <div style={{ background: '#6b0000', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn-example" onClick={() => setData(exampleAWB)}>{t('editor.example')}</button>
          <button className="btn-example" onClick={() => { setData(defaultAWBData); setCurrentId(null) }}>{t('editor.clear')}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('editor.generating')}</span>}
          {saveMsg && <span style={{ color: saveMsg.includes('Error') ? '#ffaaaa' : 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
          <button
            className="btn-example"
            onClick={handleSave}
            disabled={saving || atLimit}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700, opacity: atLimit ? 0.5 : 1 }}
            title={atLimit ? t('editor.limitReached') : undefined}
          >
            {saving ? t('editor.saving') : t('editor.saveDoc')}
          </button>
          {pdfUrl && (
            <a className="btn-download" href={pdfUrl} download={`AWB_${awbFull}.pdf`}>
              {t('editor.downloadPdf')}
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

      <div className="main">
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          {/* Font size toolbar */}
          <div className="form-font-toolbar">
            <span style={{ fontSize: 10, color: '#888', marginRight: 4 }}>Text size:</span>
            <button className={`btn-font-size ${fontSize === 'sm' ? 'active' : ''}`} onClick={() => setFontSize('sm')}>A−</button>
            <button className={`btn-font-size ${fontSize === 'md' ? 'active' : ''}`} onClick={() => setFontSize('md')}>A</button>
            <button className={`btn-font-size ${fontSize === 'lg' ? 'active' : ''}`} onClick={() => setFontSize('lg')}>A+</button>
          </div>
          <div className={`font-size-${fontSize}`}>
            <AWBFormPanel data={data} onChange={setData} />
          </div>
        </div>
        <div className="resize-handle" onMouseDown={onDragStart} title="Drag to resize" />
        <div className="preview-panel">
          {/* Zoom + PDF text size controls */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2a2a2a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #444' }}>
            {/* View zoom */}
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
            <span style={{ color: '#ccc', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
            <button onClick={() => setZoom(1.0)} style={{ background: '#333', border: 'none', color: '#aaa', padding: '0 8px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>{t('editor.zoomReset')}</button>
            {/* Divider */}
            <div style={{ width: 1, height: 18, background: '#555' }} />
            {/* PDF text size */}
            <span style={{ color: '#888', fontSize: 10 }}>Doc:</span>
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button key={s} onClick={() => setPdfScale(s)} style={{
                background: pdfScale === s ? '#8b0000' : '#333', border: 'none',
                color: pdfScale === s ? '#fff' : '#aaa',
                padding: '0 7px', height: 26, borderRadius: 4, cursor: 'pointer',
                fontSize: s === 'sm' ? 10 : s === 'md' ? 12 : 14, fontWeight: 700,
              }}>A</button>
            ))}
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
                  <Page
                    key={i + 1}
                    pageNumber={i + 1}
                    scale={zoom * 1.5}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
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
