import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { DGDData, DGDItem, defaultDGDData } from '../types/dgd'
import { DGDDocument, DGD_ROWS } from '../pdf/DGDDocument'
import { DGDOverlay } from '../components/DGDOverlay'
import { clearSignature, signatureState, signDgd } from '../lib/dgdSignature'
import { useOrgProfile } from '../lib/orgProfile'
import { saveDGD, getDGD } from '../lib/dgdService'
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

function Field({ label, value, onChange, rows, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {rows
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function DGDPage() {
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()
  const quota = usePdfDownloadGuard()
  const { profile } = useOrgProfile()
  const demo = useDemoMode()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id')

  const [data, setData] = useState<DGDData>(defaultDGDData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  // Edit on the sheet itself: the preview is rendered without values and the inputs draw them. Downloads
  // always use the full `pdfUrl`, never this preview.
  const [overlayMode, setOverlayMode] = useState(() => window.matchMedia('(min-width: 900px)').matches)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [formWidth, setFormWidth] = useState(380)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const savedScroll = useRef(0)
  const restorePending = useRef(false)
  const dragRef = useRef(false)

  const blocked = false

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
    if (docId) {
      getDGD(docId).then(doc => { setData(doc.data); setCurrentId(doc.id) }).catch(() => {})
    }
  }, [docId])

  const logo = data.logoUrl ?? (profile.companyLogoUrl || undefined)
  const docForRender = (d: DGDData) => (quota.atLimit ? { ...d, isDraft: true } : d)

  // The PDF that gets downloaded: always complete, refreshed shortly after the data changes.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const blob = await pdf(<DGDDocument data={docForRender(data)} logoUrl={logo} />).toBlob()
        setPdfBlob(blob)
        setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
      } catch (e) {
        console.error('DGD PDF error:', e)
      }
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data, quota.atLimit, logo])

  // What the preview shows. Editing on the sheet draws no values underneath, so typing must not reload the
  // viewer (that emptied it, scrolled it to the top and dropped focus): it only reloads when the sheet itself
  // changes: struck options, number of sheets, draft mark, logo.
  const sigState = signatureState(data)
  const previewKey = overlayMode
    ? JSON.stringify(['sheet', data.shipmentType, data.isRadioactive, data.isDraft, quota.atLimit, Math.max(1, Math.ceil(data.items.length / DGD_ROWS)), logo, sigState, data.signatureProof?.signedAt])
    : JSON.stringify(['full', data, quota.atLimit, logo])

  useEffect(() => {
    let cancelled = false
    const h = setTimeout(async () => {
      setGenerating(true)
      try {
        const blob = await pdf(<DGDDocument data={docForRender(data)} logoUrl={logo} hideValues={overlayMode} />).toBlob()
        if (cancelled) return
        savedScroll.current = previewScrollRef.current?.scrollTop ?? 0
        restorePending.current = true
        setPreviewBlob(blob)
      } catch (e) {
        console.error('DGD preview error:', e)
      }
      if (!cancelled) setGenerating(false)
    }, overlayMode ? 120 : 400)
    return () => { cancelled = true; clearTimeout(h) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveDGD(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`/dgd?id=${doc.id}`, { replace: true })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg('Save error')
    }
    setSaving(false)
  }

  const set = (key: keyof DGDData) => (val: any) => setData(d => ({ ...d, [key]: val }))
  const uid = () => Math.random().toString(36).slice(2, 8)

  function updateItem(id: string, key: keyof DGDItem, val: string) {
    setData(d => ({ ...d, items: d.items.map(r => r.id === id ? { ...r, [key]: val } : r) }))
  }

  function addItem() {
    setData(d => ({
      ...d,
      items: [...d.items, { id: uid(), unIdNo: '', properShippingName: '', classDivision: '', subsidiaryRisk: '', packingGroup: '', quantity: '', packingInstruction: '', authorization: '' }],
    }))
  }

  /** Typing into the empty line at the foot of the table creates the item. */
  function addItemWith(key: keyof DGDItem, value: string) {
    setData(d => ({
      ...d,
      items: [...d.items, { id: uid(), unIdNo: '', properShippingName: '', classDivision: '', subsidiaryRisk: '', packingGroup: '', quantity: '', packingInstruction: '', authorization: '', [key]: value } as DGDItem],
    }))
  }

  function signNow() {
    if (!profile.signatureUrl) return
    setData(d => signDgd(d, profile.signatureUrl, user?.email ?? ''))
  }

  function removeItem(id: string) {
    setData(d => ({ ...d, items: d.items.filter(r => r.id !== id) }))
  }

  /** Save first (a saved id lets the quota de-duplicate re-downloads), then charge one unit. */
  async function authorizeDownload() {
    let id = currentId
    if (!id) {
      try {
        const doc = await saveDGD(data, undefined)
        id = doc.id
        setCurrentId(doc.id)
        navigate(`/dgd?id=${doc.id}`, { replace: true })
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

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to={demo ? '/demo' : '/my-awbs'} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{demo ? '← All documents' : '← My Docs'}</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">Dangerous Goods Declaration</div>
          </div>
        </div>
        <div className="topbar-actions">
          {demo ? (
            <>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Demo</span>
              <LangSwitcher />
              <Link to="/signup" className="btn-download" style={{ textDecoration: 'none' }}>Create free account</Link>
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
      <div style={{ background: '#6b0000', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generating…</span>}
        {saveMsg && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
        {!demo && (
          <button
            className="btn-example"
            onClick={handleSave}
            disabled={saving || blocked}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700, opacity: blocked ? 0.5 : 1 }}
            title={blocked ? 'Upgrade to Pro to save DGDs' : undefined}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {demo ? (
          <Link to="/signup" className="btn-download" style={{ textDecoration: 'none' }}>Sign up to download PDF</Link>
        ) : pdfUrl && (
          <DownloadPdfButton
            pdfUrl={pdfUrl}
            fileName={`DGD_${data.awbNo || 'document'}.pdf`}
            authorize={authorizeDownload}
            onRefused={onDownloadRefused}
            onDownloaded={() => track('dgd_downloaded')}
          />
        )}
      </div>

      <div className="main">
        {/* Form panel */}
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          <div className="form-panel">

            <Section title="Header">
              <Field label="Shipper Name & Address" value={data.shipperNameAndAddress} onChange={set('shipperNameAndAddress')} rows={3} />
              <Field label="Consignee Name & Address" value={data.consigneeNameAndAddress} onChange={set('consigneeNameAndAddress')} rows={3} />
              <Row>
                <Field label="Air Waybill No." value={data.awbNo} onChange={set('awbNo')} placeholder="999-12345675" />
                <Field label="Page of Pages" value={data.pageOf} onChange={set('pageOf')} placeholder="1 of 1" />
              </Row>
              <Field label="Shipper's Reference (optional)" value={data.shipperReference} onChange={set('shipperReference')} />
            </Section>

            <Section title="Transport">
              <Row>
                <Field label="Airport of Departure" value={data.airportOfDeparture} onChange={set('airportOfDeparture')} placeholder="SCL" />
                <Field label="Airport of Destination" value={data.airportOfDestination} onChange={set('airportOfDestination')} placeholder="MIA" />
              </Row>
              <Row>
                <div className="field">
                  <label>Aircraft Limitation</label>
                  <select value={data.shipmentType} onChange={e => set('shipmentType')(e.target.value)}>
                    <option value="cargo_only">Cargo Aircraft Only</option>
                    <option value="passenger_and_cargo">Passenger and Cargo Aircraft</option>
                  </select>
                </div>
                <div className="field">
                  <label>Shipment Type</label>
                  <label className="toggle" style={{ marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.isRadioactive}
                      onChange={e => set('isRadioactive')(e.target.checked)}
                    />
                    <span>Radioactive</span>
                  </label>
                </div>
              </Row>
            </Section>

            <Section title="Dangerous Goods">
              <div className="rate-table">
                <div className="rate-inner" style={{ minWidth: 600 }}>
                  <div className="rate-header" style={{ gridTemplateColumns: '70px 1fr 70px 60px 100px 70px 80px 24px' }}>
                    <span>UN/ID No.</span>
                    <span>Proper Shipping Name</span>
                    <span>Class/Div.</span>
                    <span>PG</span>
                    <span>Quantity & Packing</span>
                    <span>Pack. Inst.</span>
                    <span>Authorization</span>
                    <span></span>
                  </div>
                  {data.items.map(item => (
                    <div key={item.id} className="rate-row" style={{ gridTemplateColumns: '70px 1fr 70px 60px 100px 70px 80px 24px' }}>
                      <input value={item.unIdNo} onChange={e => updateItem(item.id, 'unIdNo', e.target.value)} placeholder="UN1234" />
                      <input value={item.properShippingName} onChange={e => updateItem(item.id, 'properShippingName', e.target.value)} placeholder="Flammable liquid, n.o.s." />
                      <input value={item.classDivision} onChange={e => updateItem(item.id, 'classDivision', e.target.value)} placeholder="3" />
                      <select value={item.packingGroup} onChange={e => updateItem(item.id, 'packingGroup', e.target.value as any)}>
                        <option value="">—</option>
                        <option value="I">I</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                      </select>
                      <input value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} placeholder="2 x 10L" />
                      <input value={item.packingInstruction} onChange={e => updateItem(item.id, 'packingInstruction', e.target.value)} placeholder="Y341" />
                      <input value={item.authorization} onChange={e => updateItem(item.id, 'authorization', e.target.value)} />
                      <button className="btn-remove" onClick={() => removeItem(item.id)}>×</button>
                    </div>
                  ))}
                </div>
                <button className="btn-add" onClick={addItem}>+ Add Item</button>
              </div>
            </Section>

            <Section title="Additional Handling Information">
              <Field label="Handling Information" value={data.additionalHandling} onChange={set('additionalHandling')} rows={3} placeholder="Keep upright. Do not stack." />
            </Section>

            <Section title="Certification">
              <Row>
                <Field label="Name of Signatory" value={data.signatoryName} onChange={set('signatoryName')} />
                <Field label="Title" value={data.signatoryTitle} onChange={set('signatoryTitle')} />
              </Row>
              <Field label="Date" value={data.signatureDate} onChange={set('signatureDate')} placeholder="01-JAN-2025" />
              {!demo && (
                <div className="field">
                  <label>Signature</label>
                  {sigState === 'valid' ? (
                    <div style={{ fontSize: 12, color: '#2f7d32', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Signed {data.signatureProof?.signedAt.slice(0, 16).replace('T', ' ')} UTC</span>
                      <button type="button" className="btn-example" style={{ color: '#8b0000', background: 'none' }} onClick={() => setData(d => clearSignature(d))}>Remove</button>
                    </div>
                  ) : profile.signatureUrl ? (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button type="button" className="btn-download" style={{ fontSize: 12, padding: '6px 14px' }} onClick={signNow}>Sign with my signature</button>
                      {sigState === 'modified' && <span style={{ fontSize: 11, color: '#8b0000' }}>The declaration changed after it was signed. Sign again.</span>}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#777' }}>No signature saved. Upload one in Settings, under Company profile.</span>
                  )}
                </div>
              )}
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
              ? <Link to="/signup" className="btn-download" style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px', textDecoration: 'none' }}>Sign up to download PDF</Link>
              : pdfUrl
              ? <DownloadPdfButton
                  pdfUrl={pdfUrl}
                  fileName={`DGD_${data.awbNo || 'document'}.pdf`}
                  authorize={authorizeDownload}
                  onRefused={onDownloadRefused}
                  onDownloaded={() => track('dgd_downloaded')}
                  label="↓ Download DGD PDF"
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
            <button
              onClick={() => setOverlayMode(m => !m)}
              title="Type directly on the sheet"
              style={{ background: overlayMode ? '#8b0000' : '#333', border: 'none', color: overlayMode ? '#fff' : '#aaa', padding: '0 10px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
            >
              {overlayMode ? 'Editing on sheet' : 'Edit on sheet'}
            </button>
            {generating && <span style={{ color: '#888', fontSize: 11, marginLeft: 4 }}>Updating…</span>}
          </div>
          {previewBlob ? (
            <div ref={previewScrollRef} style={{ overflow: 'auto', flex: 1, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Document file={previewBlob} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={null}>
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i + 1} style={{ position: 'relative', width: 612 * zoom * 1.5, flexShrink: 0 }}>
                    <Page
                      pageNumber={i + 1}
                      scale={zoom * 1.5}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      // The viewer rebuilds when the sheet changes; put the reader back where they were.
                      onRenderSuccess={() => {
                        // Once per reload, when the last sheet has painted (earlier ones would clamp the position).
                        if (restorePending.current && i === numPages - 1 && previewScrollRef.current) {
                          previewScrollRef.current.scrollTop = savedScroll.current
                          restorePending.current = false
                        }
                      }}
                    />
                    {overlayMode && (
                      <DGDOverlay
                        data={data}
                        scale={zoom * 1.5}
                        pageIndex={i}
                        items={data.items.slice(i * DGD_ROWS, (i + 1) * DGD_ROWS)}
                        onField={patch => setData(d => ({ ...d, ...patch }))}
                        onItem={updateItem}
                        onAddItem={addItemWith}
                        onRemoveItem={removeItem}
                        signature={sigState}
                        hasProfileSignature={!!profile.signatureUrl}
                        onSign={signNow}
                        onClearSignature={() => setData(d => clearSignature(d))}
                      />
                    )}
                  </div>
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
