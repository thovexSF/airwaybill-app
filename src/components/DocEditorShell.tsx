import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { DownloadAuthorization } from '../lib/pdfQuota'
import { LangSwitcher } from './LangSwitcher'
import { useDemoMode } from './DemoMode'
import { useTranslation } from 'react-i18next'
import { usePostHog } from '@posthog/react'

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
  authorizeDownload,
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
  /** Charges the monthly document quota; the download is refused when it returns not-ok. */
  authorizeDownload?: () => Promise<DownloadAuthorization>
  extraActions?: React.ReactNode
  children: React.ReactNode
}) {
  const demo = useDemoMode()
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user, logout, orgName } = useAuth()
  const { plan, docsUsedThisMonth, docLimit } = usePlan()
  const [downloading, setDownloading] = useState(false)
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null)

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [formWidth, setFormWidth] = useState(460)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragRef = useRef(false)
  const demoDocType = typeof (data as { docType?: unknown }).docType === 'string'
    ? (data as { docType: string }).docType
    : fileName.split('_')[0]?.toLowerCase() || 'document'
  const demoSignupTarget = `/signup?source=demo&intent=download_pdf&doc_type=${encodeURIComponent(demoDocType)}`

  function trackDemoSignupClick(placement: 'topbar' | 'download' | 'mobile_download') {
    ;(window as any).clarity?.('event', 'demo_signup_cta_clicked')
    posthog?.capture('demo_signup_cta_clicked', {
      doc_type: demoDocType,
      intent: 'download_pdf',
      placement,
    })
  }

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

  useEffect(() => {
    if (!demo) return
    posthog?.capture('demo_viewed', {
      doc_type: demoDocType,
      editor: 'shared_shell',
      viewport_width: window.innerWidth,
    })
  }, [demo, demoDocType, posthog])

  // Release the last preview URL when the editor unmounts.
  useEffect(() => () => { setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null }) }, [])

  async function handleDownload() {
    if (!pdfUrl || downloading) return
    setDownloadMsg(null)
    setDownloading(true)
    try {
      if (authorizeDownload) {
        const auth = await authorizeDownload()
        if (!auth.ok) {
          setDownloadMsg(auth.message ?? 'Download not allowed')
          setTimeout(() => setDownloadMsg(null), 5000)
          return
        }
      }
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      onDownload?.()
    } finally {
      setDownloading(false)
    }
  }

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
      <div className="topbar" style={{ background: accent || undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to={demo ? '/demo' : '/my-awbs'} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            {demo ? '← Todos los documentos' : '← Mis documentos'}
          </Link>
          <div>
            <Link to="/my-awbs" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ Documentos</Link>
            <div className="topbar-sub">{subtitle}</div>
          </div>
        </div>
        <div className="topbar-actions">
          {demo ? (
            <>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Demo
              </span>
              <LangSwitcher />
              <Link
                to={demoSignupTarget}
                className="btn-download"
                style={{ textDecoration: 'none' }}
                onClick={() => trackDemoSignupClick('topbar')}
              >
                Crear cuenta gratis
              </Link>
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
              <button className="btn-example" onClick={logout}>Cerrar sesión</button>
            </>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div style={{ background: '#122845', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        {!demo && plan === 'free' && docLimit !== null && (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {docsUsedThisMonth}/{docLimit} {t('editor.freeDocs')}
          </span>
        )}
        {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Generating…</span>}
        {(saveMsg || downloadMsg) && (
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{downloadMsg ?? saveMsg}</span>
        )}
        {!demo && extraActions}
        {!demo && (
          <button
            className="btn-example"
            onClick={onSave}
            disabled={saving}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {demo ? (
          <Link
            to={demoSignupTarget}
            className="btn-download"
            style={{ textDecoration: 'none' }}
            onClick={() => trackDemoSignupClick('download')}
          >
            Sign up to download PDF
          </Link>
        ) : pdfUrl && (
          <button className="btn-download" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        )}
      </div>

      <div className="main">
        {/* ── Form panel ── */}
        <div className="form-panel-wrap" style={{ width: formWidth }}>
          <div className="form-panel">{children}</div>
          <div className="mobile-pdf-strip">
            {demo
              ? <Link to={demoSignupTarget} className="btn-download"
                   onClick={() => trackDemoSignupClick('mobile_download')}
                   style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px', textDecoration: 'none' }}>
                  Sign up to download PDF
                </Link>
              : pdfUrl
              ? <button className="btn-download" onClick={handleDownload} disabled={downloading}
                   style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '10px 16px' }}>
                  ↓ {downloading ? 'Preparing…' : 'Download PDF'}
                </button>
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
