import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { NeppexData, NeppexProductRow, NeppexCertRow, defaultNeppexData } from '../types/neppex'
import { NeppexDocument } from '../pdf/NeppexDocument'
import { saveNeppex, getNeppex } from '../lib/neppexService'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { LangSwitcher } from '../components/LangSwitcher'
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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle" style={{ marginRight: 12 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function NeppexPage() {
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id')

  const [data, setData] = useState<NeppexData>(defaultNeppexData)
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
      getNeppex(docId).then(doc => { setData(doc.data); setCurrentId(doc.id) }).catch(() => {})
    } else {
      const raw = sessionStorage.getItem('neppex-prefill')
      if (raw) {
        try { setData({ ...defaultNeppexData, ...JSON.parse(raw), docType: 'neppex' }) } catch { /* ignore */ }
        sessionStorage.removeItem('neppex-prefill')
      }
    }
  }, [docId])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  async function regenerate(d: NeppexData) {
    setGenerating(true)
    try {
      const blob = await pdf(<NeppexDocument data={d} />).toBlob()
      setPdfBlob(blob)
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error('NEPPEX PDF error:', e)
    }
    setGenerating(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveNeppex(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`/neppex?id=${doc.id}`, { replace: true })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg('Save error')
    }
    setSaving(false)
  }

  const set = (key: keyof NeppexData) => (val: any) => setData(d => ({ ...d, [key]: val }))
  const uid = () => Math.random().toString(36).slice(2, 8)

  function updateProduct(id: string, key: keyof NeppexProductRow, val: string) {
    setData(d => ({ ...d, products: d.products.map(r => r.id === id ? { ...r, [key]: val } : r) }))
  }
  function addProduct() {
    setData(d => ({
      ...d,
      products: [...d.products, { id: uid(), elaborador: '', descripcion: '', numEnvases: '', fechaElaboracion: '', kgNetos: '' }],
    }))
  }
  function removeProduct(id: string) {
    setData(d => ({ ...d, products: d.products.filter(r => r.id !== id) }))
  }

  function updateCert(id: string, key: keyof NeppexCertRow, val: string) {
    setData(d => ({ ...d, certificates: d.certificates.map(r => r.id === id ? { ...r, [key]: val } : r) }))
  }
  function addCert() {
    setData(d => ({
      ...d,
      certificates: [...d.certificates, { id: uid(), numero: '', tipoCertificado: '', valorUf: '', folioAsociado: '' }],
    }))
  }
  function removeCert(id: string) {
    setData(d => ({ ...d, certificates: d.certificates.filter(r => r.id !== id) }))
  }

  function recalcTotals() {
    const env = data.products.reduce((s, p) => s + (parseInt(p.numEnvases) || 0), 0)
    const net = data.products.reduce((s, p) => s + (parseFloat(p.kgNetos) || 0), 0)
    setData(d => ({
      ...d,
      totalEnvases: env ? String(env) : d.totalEnvases,
      totalKgNetos: net ? String(net) : d.totalKgNetos,
    }))
  }

  return (
    <div className="app">
      <div className="topbar" style={{ background: '#0d4a6b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/my-awbs" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← My Docs</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">SERNAPESCA · F15 NEPPEX (A4)</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{orgName ?? user?.email}</span>
          {plan !== 'free' && (
            <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
              {plan}
            </span>
          )}
          <LangSwitcher />
          <button className="btn-example" onClick={logout}>Sign Out</button>
        </div>
      </div>

      <div style={{ background: '#08374f', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generating…</span>}
        {saveMsg && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
        <button className="btn-example" onClick={handleSave} disabled={saving} style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {pdfUrl && (
          <a className="btn-download" href={pdfUrl}
            download={`NEPPEX_${data.neppexNumber || data.rutExportador || 'document'}.pdf`}
            onClick={() => track('neppex_downloaded')}>
            Download PDF (A4)
          </a>
        )}
      </div>

      <div className="main">
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          <div className="form-panel">
            <Section title="A. Antecedentes">
              <Field label="Nº NEPPEX" value={data.neppexNumber} onChange={set('neppexNumber')} placeholder="Asignado por SERNAPESCA" />
              <Row>
                <Field label="RUT Exportador" value={data.rutExportador} onChange={set('rutExportador')} placeholder="76.734.666-2" />
                <Field label="Razón Social" value={data.razonSocialExportador} onChange={set('razonSocialExportador')} placeholder="DELFISH TRADING SPA" />
              </Row>
              <Field label="Dirección exportador" value={data.direccionExportador} onChange={set('direccionExportador')} rows={2} />
              <Row>
                <Field label="País de destino" value={data.paisDestino} onChange={set('paisDestino')} placeholder="JAPON" />
                <Field label="Puerto de destino" value={data.puertoDestino} onChange={set('puertoDestino')} placeholder="HANEDA" />
              </Row>
              <Row>
                <Field label="Puerto de Embarque" value={data.puertoEmbarque} onChange={set('puertoEmbarque')} placeholder="AEROPUERTO A.M.B" />
                <Field label="Oficina" value={data.oficina} onChange={set('oficina')} placeholder="A.M.B" />
                <Field label="Fecha Zarpe/salida" value={data.fechaZarpe} onChange={set('fechaZarpe')} placeholder="10-06-2026" />
              </Row>
              <Field label="N° Bill of Lading / AWB" value={data.billOfLading} onChange={set('billOfLading')} placeholder="045-…" />
              <Row>
                <Field label="Nº Contenedor" value={data.numContenedor} onChange={set('numContenedor')} />
                <Field label="ID medio de transporte" value={data.idMedioTransporte} onChange={set('idMedioTransporte')} placeholder="LA602 / vuelo" />
              </Row>
              <Row>
                <Field label="N° Sello" value={data.numSello} onChange={set('numSello')} />
                <Field label="Rut Conductor" value={data.rutConductor} onChange={set('rutConductor')} />
              </Row>
              <Field label="Consignatario" value={data.consignatario} onChange={set('consignatario')} rows={2} />
              <Field label="Agencia Aduana/embarque" value={data.agenciaAduana} onChange={set('agenciaAduana')} placeholder="Nombre / teléfono" />
              <div className="field" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Check label="Muestras" checked={data.esMuestra} onChange={set('esMuestra')} />
                <Check label="Comercial" checked={data.esComercial} onChange={set('esComercial')} />
                <Check label="Consumo Humano" checked={data.consumoHumano} onChange={set('consumoHumano')} />
                <Check label="Consumo no humano" checked={data.consumoNoHumano} onChange={set('consumoNoHumano')} />
              </div>
            </Section>

            <Section title="B. Identificación del producto">
              <div className="rate-table">
                <div className="rate-inner" style={{ minWidth: 640 }}>
                  <div className="rate-header" style={{ gridTemplateColumns: '1.2fr 1.6fr 70px 90px 70px 24px' }}>
                    <span>Elaborador</span>
                    <span>Descripción</span>
                    <span>Envases</span>
                    <span>F. elab.</span>
                    <span>kg Netos</span>
                    <span></span>
                  </div>
                  {data.products.map(row => (
                    <div key={row.id} className="rate-row" style={{ gridTemplateColumns: '1.2fr 1.6fr 70px 90px 70px 24px' }}>
                      <input value={row.elaborador} onChange={e => updateProduct(row.id, 'elaborador', e.target.value)} placeholder="Nº y nombre" />
                      <input value={row.descripcion} onChange={e => updateProduct(row.id, 'descripcion', e.target.value)} placeholder="Especie / producto" />
                      <input value={row.numEnvases} onChange={e => updateProduct(row.id, 'numEnvases', e.target.value)} style={{ textAlign: 'center' }} />
                      <input value={row.fechaElaboracion} onChange={e => updateProduct(row.id, 'fechaElaboracion', e.target.value)} placeholder="dd-mm-yyyy" />
                      <input value={row.kgNetos} onChange={e => updateProduct(row.id, 'kgNetos', e.target.value)} style={{ textAlign: 'right' }} />
                      <button className="btn-remove" onClick={() => removeProduct(row.id)}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="btn-add" onClick={addProduct}>+ Producto</button>
                  <button className="btn-add" type="button" onClick={recalcTotals} style={{ background: '#0d4a6b' }}>Σ Recalcular totales</button>
                </div>
              </div>
              <Row>
                <Field label="Total Envases" value={data.totalEnvases} onChange={set('totalEnvases')} />
                <Field label="Total kg Brutos" value={data.totalKgBrutos} onChange={set('totalKgBrutos')} />
                <Field label="Total kg Netos" value={data.totalKgNetos} onChange={set('totalKgNetos')} />
              </Row>
            </Section>

            <Section title="C. Respaldos Inocuidad y Certificación">
              <div className="field" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Check label="Declaración Certificación Origen" checked={data.declaracionCertificacionOrigen} onChange={set('declaracionCertificacionOrigen')} />
                <Check label="Declaración Jurada Productos Afectos" checked={data.declaracionJuradaProductosAfectos} onChange={set('declaracionJuradaProductosAfectos')} />
              </div>
              <Row>
                <Field label="Nº AOCS" value={data.numAocs} onChange={set('numAocs')} />
                <Field label="Nº SMAE" value={data.numSmae} onChange={set('numSmae')} />
              </Row>
              <Row>
                <Field label="Nº informe Brasil/UEE" value={data.numInformeBrasilUee} onChange={set('numInformeBrasilUee')} />
                <Field label="Nº SIPP/SUI" value={data.numSippSui} onChange={set('numSippSui')} />
              </Row>
              <Field label="Lugar de Almacenamiento" value={data.lugarAlmacenamiento} onChange={set('lugarAlmacenamiento')} />
              <Field label="Lugar de consolidación" value={data.lugarConsolidacion} onChange={set('lugarConsolidacion')} rows={2} />
            </Section>

            <Section title="D. Autorización Programa Fiscalización">
              <Row>
                <Field label="Nº FIP" value={data.numFip} onChange={set('numFip')} />
                <Field label="Nombre inspector" value={data.nombreInspector} onChange={set('nombreInspector')} />
              </Row>
              <Row>
                <Field label="Nº Guía Despacho" value={data.numGuiaDespacho} onChange={set('numGuiaDespacho')} />
                <Field label="Oficina" value={data.oficinaFiscalizacion} onChange={set('oficinaFiscalizacion')} />
              </Row>
            </Section>

            <Section title="E. Certificación solicitada y cobros">
              <Check label="No solicitaré certificados para esta exportación" checked={data.noSolicitaCertificados} onChange={set('noSolicitaCertificados')} />
              <div className="rate-table">
                <div className="rate-inner" style={{ minWidth: 520 }}>
                  <div className="rate-header" style={{ gridTemplateColumns: '50px 1.5fr 70px 1fr 24px' }}>
                    <span>Nº</span>
                    <span>Tipo certificado</span>
                    <span>UF</span>
                    <span>Folio</span>
                    <span></span>
                  </div>
                  {data.certificates.map(row => (
                    <div key={row.id} className="rate-row" style={{ gridTemplateColumns: '50px 1.5fr 70px 1fr 24px' }}>
                      <input value={row.numero} onChange={e => updateCert(row.id, 'numero', e.target.value)} />
                      <input value={row.tipoCertificado} onChange={e => updateCert(row.id, 'tipoCertificado', e.target.value)} placeholder="Sanitario / Especial…" />
                      <input value={row.valorUf} onChange={e => updateCert(row.id, 'valorUf', e.target.value)} style={{ textAlign: 'center' }} />
                      <input value={row.folioAsociado} onChange={e => updateCert(row.id, 'folioAsociado', e.target.value)} />
                      <button className="btn-remove" onClick={() => removeCert(row.id)}>×</button>
                    </div>
                  ))}
                </div>
                <button className="btn-add" onClick={addCert}>+ Certificado</button>
              </div>
              <Row>
                <Field label="Nombre responsable" value={data.responsableNombre} onChange={set('responsableNombre')} />
                <Field label="RUT responsable" value={data.responsableRut} onChange={set('responsableRut')} />
              </Row>
            </Section>

            <Section title="F. Rechazo (SERNAPESCA)">
              <Row>
                <Field label="Fecha" value={data.rechazoFecha} onChange={set('rechazoFecha')} />
                <Field label="Causa" value={data.rechazoCausa} onChange={set('rechazoCausa')} />
              </Row>
            </Section>

            <Section title="Meta">
              <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
            </Section>
          </div>
          <div className="mobile-pdf-strip">
            {pdfUrl
              ? <a className="btn-download" href={pdfUrl}
                  download={`NEPPEX_${data.neppexNumber || 'document'}.pdf`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}
                  onClick={() => track('neppex_downloaded')}>
                  ↓ Download NEPPEX PDF
                </a>
              : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, textAlign: 'center' }}>Generando PDF…</span>
            }
          </div>
        </div>

        <div className="resize-handle" onMouseDown={onDragStart} title="Drag to resize" />

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
                  <Page key={i + 1} pageNumber={i + 1} scale={zoom * 1.4} renderTextLayer={false} renderAnnotationLayer={false} />
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
