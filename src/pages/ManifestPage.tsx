import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { ManifestData, ManifestRow, defaultManifestData } from '../types/manifest'
import { ManifestDocument } from '../pdf/ManifestDocument'
import { saveManifest, getManifest } from '../lib/manifestService'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { usePdfDownloadGuard } from '../lib/pdfQuota'
import { DownloadPdfButton } from '../components/DownloadPdfButton'
import { LangSwitcher } from '../components/LangSwitcher'
import { useDemoMode } from '../components/DemoMode'
import { track } from '../lib/analytics'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function ManifestPage() {
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()
  const quota = usePdfDownloadGuard()
  const demo = useDemoMode()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id')
  const demoSignupTarget = '/signup?source=demo&intent=download_pdf&doc_type=manifest'

  const [data, setData] = useState<ManifestData>(defaultManifestData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [formWidth, setFormWidth] = useState(420)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)

  const blocked = false

  function onDragStart(e: React.MouseEvent) {
    dragRef.current = true
    const startX = e.clientX
    const startW = formWidth
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setFormWidth(Math.max(320, Math.min(700, startW + ev.clientX - startX)))
    }
    const onUp = () => { dragRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    if (docId) {
      getManifest(docId).then(doc => { setData(doc.data); setCurrentId(doc.id) }).catch(() => {})
    }
  }, [docId])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  async function regenerate(d: ManifestData) {
    setGenerating(true)
    try {
      const blob = await pdf(<ManifestDocument data={d} />).toBlob()
      setPdfBlob(blob)
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error('Manifest PDF error:', e)
    }
    setGenerating(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveManifest(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`/manifest?id=${doc.id}`, { replace: true })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg('Save error')
    }
    setSaving(false)
  }

  const set = (key: keyof ManifestData) => (val: any) => setData(d => ({ ...d, [key]: val }))
  const uid = () => Math.random().toString(36).slice(2, 8)

  function updateRow(id: string, key: keyof ManifestRow, val: string) {
    setData(d => ({ ...d, rows: d.rows.map(r => r.id === id ? { ...r, [key]: val } : r) }))
  }

  function addRow() {
    setData(d => ({
      ...d,
      rows: [...d.rows, { id: uid(), awbNumber: '', shipperName: '', consigneeName: '', pieces: '', grossWeight: '', chargeableWeight: '', natureOfGoods: '', specialHandling: '' }],
    }))
  }

  function removeRow(id: string) {
    setData(d => ({ ...d, rows: d.rows.filter(r => r.id !== id) }))
  }

  const totalPieces = data.rows.reduce((s, r) => s + (parseInt(r.pieces) || 0), 0)
  const totalGross  = data.rows.reduce((s, r) => s + (parseFloat(r.grossWeight) || 0), 0)
  const totalCharg  = data.rows.reduce((s, r) => s + (parseFloat(r.chargeableWeight) || 0), 0)

  /** Save first (a saved id lets the quota de-duplicate re-downloads), then charge one unit. */
  async function authorizeDownload() {
    let id = currentId
    if (!id) {
      try {
        const doc = await saveManifest(data, undefined)
        id = doc.id
        setCurrentId(doc.id)
        navigate(`/manifest?id=${doc.id}`, { replace: true })
      } catch (e) {
        console.error('Save before download failed:', e)
      }
    }
    return quota.authorize(id)
  }

  function onDownloadRefused(message: string) {
    setSaveMsg(message)
    setTimeout(() => setSaveMsg(null), 5000)
  }

  function trackDemoSignupClick(placement: string) {
    track('demo_signup_cta_clicked', { placement, doc_type: 'manifest', intent: 'download_pdf' })
  }

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar" style={{ background: '#1a3a5c' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to={demo ? '/demo' : '/my-awbs'} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{demo ? '← All documents' : '← My Docs'}</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">Air Cargo Manifest</div>
          </div>
        </div>
        <div className="topbar-actions">
          {demo ? (
            <>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Demo</span>
              <LangSwitcher />
              <Link to={demoSignupTarget} onClick={() => trackDemoSignupClick('topbar')} className="btn-download" style={{ textDecoration: 'none' }}>Create free account</Link>
            </>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{orgName ?? user?.email}</span>
              {plan !== 'free' && (
                <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                  {plan}
                </span>
              )}
              <LangSwitcher />
              <button className="btn-example" onClick={logout}>Sign Out</button>
            </>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ background: '#122845', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generating…</span>}
        {saveMsg && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
        {!demo && (
          <button
            className="btn-example"
            onClick={handleSave}
            disabled={saving || blocked}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700, opacity: blocked ? 0.5 : 1 }}
            title={blocked ? 'Upgrade to Pro to save manifests' : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {demo ? (
          <Link to={demoSignupTarget} onClick={() => trackDemoSignupClick('download_bar')} className="btn-download" style={{ textDecoration: 'none' }}>Sign up to download PDF</Link>
        ) : pdfUrl && (
          <DownloadPdfButton
            pdfUrl={pdfUrl}
            fileName={`Manifest_${data.flightNumber || 'document'}_${data.flightDate || ''}.pdf`}
            authorize={authorizeDownload}
            onRefused={onDownloadRefused}
            onDownloaded={() => track('manifest_downloaded')}
          />
        )}
      </div>

      <div className="main">
        {/* Form panel */}
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          <div className="form-panel">

            <Section title="Flight Details">
              <Row>
                <Field label="Flight No." value={data.flightNumber} onChange={set('flightNumber')} placeholder="LA804" />
                <Field label="Airline" value={data.airline} onChange={set('airline')} placeholder="LATAM Airlines" />
              </Row>
              <Row>
                <Field label="Flight Date" value={data.flightDate} onChange={set('flightDate')} placeholder="01-JAN-2025" />
                <Field label="Origin (IATA)" value={data.originStation} onChange={set('originStation')} placeholder="SCL" />
                <Field label="Destination (IATA)" value={data.destinationStation} onChange={set('destinationStation')} placeholder="MIA" />
              </Row>
            </Section>

            <Section title="AWB List">
              <div className="rate-table">
                <div className="rate-inner" style={{ minWidth: 700 }}>
                  <div className="rate-header" style={{ gridTemplateColumns: '100px 1fr 1fr 50px 70px 70px 1fr 70px 24px' }}>
                    <span>AWB No.</span>
                    <span>Shipper</span>
                    <span>Consignee</span>
                    <span>Pcs</span>
                    <span>Gross Wt</span>
                    <span>Chg Wt</span>
                    <span>Nature</span>
                    <span>SPH</span>
                    <span></span>
                  </div>
                  {data.rows.map(row => (
                    <div key={row.id} className="rate-row" style={{ gridTemplateColumns: '100px 1fr 1fr 50px 70px 70px 1fr 70px 24px' }}>
                      <input value={row.awbNumber} onChange={e => updateRow(row.id, 'awbNumber', e.target.value)} placeholder="020-12345678" />
                      <input value={row.shipperName} onChange={e => updateRow(row.id, 'shipperName', e.target.value)} placeholder="Shipper name" />
                      <input value={row.consigneeName} onChange={e => updateRow(row.id, 'consigneeName', e.target.value)} placeholder="Consignee name" />
                      <input value={row.pieces} onChange={e => updateRow(row.id, 'pieces', e.target.value)} placeholder="1" style={{ textAlign: 'center' }} />
                      <input value={row.grossWeight} onChange={e => updateRow(row.id, 'grossWeight', e.target.value)} placeholder="10.0" style={{ textAlign: 'right' }} />
                      <input value={row.chargeableWeight} onChange={e => updateRow(row.id, 'chargeableWeight', e.target.value)} placeholder="10.0" style={{ textAlign: 'right' }} />
                      <input value={row.natureOfGoods} onChange={e => updateRow(row.id, 'natureOfGoods', e.target.value)} placeholder="General cargo" />
                      <input value={row.specialHandling} onChange={e => updateRow(row.id, 'specialHandling', e.target.value)} placeholder="HEA" />
                      <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
                    </div>
                  ))}
                  {/* Totals summary */}
                  {data.rows.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 50px 70px 70px 1fr 70px 24px', borderTop: '2px solid #1a3a5c', marginTop: 2, paddingTop: 4, fontSize: 12, fontWeight: 700, color: '#1a3a5c' }}>
                      <span style={{ padding: '2px 4px' }}>TOTAL</span>
                      <span></span><span></span>
                      <span style={{ padding: '2px 4px', textAlign: 'center' }}>{totalPieces || '—'}</span>
                      <span style={{ padding: '2px 4px', textAlign: 'right' }}>{totalGross ? totalGross.toFixed(1) : '—'}</span>
                      <span style={{ padding: '2px 4px', textAlign: 'right' }}>{totalCharg ? totalCharg.toFixed(1) : '—'}</span>
                      <span></span><span></span><span></span>
                    </div>
                  )}
                </div>
                <button className="btn-add" onClick={addRow}>+ Add AWB</button>
              </div>
            </Section>

            <Section title="Certification">
              <Row>
                <Field label="Prepared by" value={data.preparedBy} onChange={set('preparedBy')} placeholder="Agent name" />
                <Field label="Date" value={data.preparedDate} onChange={set('preparedDate')} placeholder="01-JAN-2025" />
              </Row>
              <div className="field">
                <label>Draft watermark</label>
                <label className="toggle">
                  <input type="checkbox" checked={data.isDraft} onChange={e => set('isDraft')(e.target.checked)} />
                  <span>Show DRAFT</span>
                </label>
              </div>
            </Section>

          </div>
          {/* Mobile-only: sticky download bar */}
          <div className="mobile-pdf-strip">
            {demo
              ? <Link to={demoSignupTarget} onClick={() => trackDemoSignupClick('mobile_download_bar')} className="btn-download" style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px', textDecoration: 'none' }}>Sign up to download PDF</Link>
              : pdfUrl
              ? <DownloadPdfButton
                  pdfUrl={pdfUrl}
                  fileName={`Manifest_${data.flightNumber || 'document'}_${data.flightDate || ''}.pdf`}
                  authorize={authorizeDownload}
                  onRefused={onDownloadRefused}
                  onDownloaded={() => track('manifest_downloaded')}
                  label="↓ Download Manifest PDF"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}
                />
              : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, textAlign: 'center' }}>Generando PDF…</span>
            }
          </div>
        </div>

        <div className="resize-handle" onMouseDown={onDragStart} title="Drag to resize" />

        {/* PDF Preview */}
        <div className="preview-panel">
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2a2a2a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #444' }}>
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>−</button>
            <span style={{ color: '#ccc', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>+</button>
            <button onClick={() => setZoom(1.0)} style={{ background: '#333', border: 'none', color: '#aaa', padding: '0 8px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Reset</button>
            {generating && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>Updating…</span>}
          </div>
          {pdfBlob ? (
            <div style={{ overflow: 'auto', flex: 1, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Document file={pdfBlob} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={null}>
                {Array.from({ length: numPages }, (_, i) => (
                  <Page key={i + 1} pageNumber={i + 1} scale={zoom * 1.5} renderTextLayer={false} renderAnnotationLayer={false} />
                ))}
              </Document>
            </div>
          ) : (
            <div className="preview-loading">Generating preview…</div>
          )}
        </div>
      </div>
    </div>
  )
}
