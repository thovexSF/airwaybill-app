import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { LangSwitcher } from './LangSwitcher'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/**
 * Editor chrome shared by every document type in the suite: topbar, action
 * bar, resizable form panel and the debounced PDF preview. Pages supply their
 * own form fields as children plus a renderer for their PDF document.
 */
export function DocEditorShell<T>({
  data,
  renderDocument,
  subtitle,
  accent = '#1a3a5c',
  fileName,
  onSave,
  saving,
  saveMsg,
  onDownload,
  extraActions,
  children,
}: {
  data: T
  renderDocument: (data: T) => React.ReactElement
  subtitle: string
  accent?: string
  fileName: string
  onSave: () => void
  saving: boolean
  saveMsg: string | null
  onDownload?: () => void
  extraActions?: React.ReactNode
  children: React.ReactNode
}) {
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [formWidth, setFormWidth] = useState(460)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)

  function onDragStart(e: React.MouseEvent) {
    dragRef.current = true
    const startX = e.clientX
    const startW = formWidth
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setFormWidth(Math.max(320, Math.min(760, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      dragRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void regenerate(data) }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  // Release the last preview URL when the editor unmounts.
  useEffect(() => () => { setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null }) }, [])

  async function regenerate(d: T) {
    setGenerating(true)
    try {
      const blob = await pdf(renderDocument(d)).toBlob()
      setPdfBlob(blob)
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error(`${subtitle} PDF error:`, e)
    }
    setGenerating(false)
  }

  return (
    <div className="app">
      {/* ── Topbar ── */}
      <div className="topbar" style={{ background: accent }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/my-awbs" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← My Docs</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">{subtitle}</div>
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

      {/* ── Action bar ── */}
      <div style={{ background: '#122845', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generating…</span>}
        {saveMsg && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{saveMsg}</span>}
        {extraActions}
        <button
          className="btn-example"
          onClick={onSave}
          disabled={saving}
          style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {pdfUrl && (
          <a className="btn-download" href={pdfUrl} download={fileName} onClick={onDownload}>
            Download PDF
          </a>
        )}
      </div>

      <div className="main">
        {/* ── Form panel ── */}
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          <div className="form-panel">{children}</div>
          <div className="mobile-pdf-strip">
            {pdfUrl
              ? <a className="btn-download" href={pdfUrl} download={fileName}
                   style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}
                   onClick={onDownload}>
                  ↓ Download PDF
                </a>
              : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flex: 1, textAlign: 'center' }}>Generando PDF…</span>}
          </div>
        </div>

        <div className="resize-handle" onMouseDown={onDragStart} title="Drag to resize" />

        {/* ── PDF preview ── */}
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
