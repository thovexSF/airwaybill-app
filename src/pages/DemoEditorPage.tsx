import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { FormDialog } from '../components/FormDialog'
import { AWBOverlay } from '../components/AWBOverlay'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { LangSwitcher } from '../components/LangSwitcher'
import '../App.css'
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

export function DemoEditorPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  // Reached as /demo/awb or /demo/hawb from the demo picker; both use this
  // editor because only the AWB has the form-over-PDF overlay.
  const { docType } = useParams<{ docType?: string }>()
  const demoDocType: 'awb' | 'hawb' = docType === 'hawb' ? 'hawb' : 'awb'
  const initialData: AWBData = { ...exampleAWB, docType: demoDocType, isDraft: true }
  const [data, setDataRaw] = useState<AWBData>(initialData)
  const setData = (next: AWBData | ((prev: AWBData) => AWBData)) => {
    setDataRaw(prev => {
      const updated = typeof next === 'function' ? next(prev) : next
      return { ...updated, isDraft: true }
    })
  }
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(initialZoom())
  const [generating, setGenerating] = useState(false)
  const [isWideViewport, setIsWideViewport] = useState(() => window.innerWidth >= 900)
  const [overlayMode, setOverlayMode] = useState(() => window.innerWidth >= 900)
  // On narrow screens the sheet stays on screen and the form moves into a
  // dialog; edits are buffered there so Cancel discards them.
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [draft, setDraft] = useState<AWBData | null>(null)
  const [pageWidthPx, setPageWidthPx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageWrapRef = useRef<HTMLDivElement | null>(null)

  const updatePageWidth = useCallback(() => {
    const width = pageWrapRef.current?.getBoundingClientRect().width
    if (width) setPageWidthPx(width)
  }, [])

  const setPageWrap = useCallback((node: HTMLDivElement | null) => {
    pageWrapRef.current = node
    if (node) requestAnimationFrame(updatePageWidth)
  }, [updatePageWidth])

  useEffect(() => {
    posthog?.capture('demo_viewed')
  }, [])

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

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data), 700)
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

  return (
    <div className="app sheet-editor">
      <div style={{
        background: '#fff3cd',
        borderBottom: '1px solid #ffc107',
        padding: '10px 20px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span>{t('demo.banner')}</span>
        <Link to="/signup" style={{ fontWeight: 700, color: '#8b0000', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {t('demo.signupCta')} →
        </Link>
      </div>

      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/demo" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← All documents</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">{t('demo.sub')}</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{t('demo.modeLabel')}</span>
          <LangSwitcher />
          <Link to="/login" className="btn-example">{t('landing.nav.signIn')}</Link>
        </div>
      </div>

      <div className="action-bar" style={{ background: '#6b0000', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="btn-example" onClick={() => setData(initialData)}>
            {t('editor.example')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('editor.generating')}</span>}
          <Link to="/signup" state={{ from: `/demo/${demoDocType}` }} className="btn-download">
            {t('demo.downloadCta')}
          </Link>
        </div>
      </div>

      <div className="main main-single">
        <div className="preview-panel preview-panel-full">
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2a2a2a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #444' }}>
            <button type="button" onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>−</button>
            <span style={{ color: '#ccc', fontSize: 12, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} style={{ background: '#444', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>+</button>
            {isWideViewport && (
              <button
                type="button"
                onClick={() => setOverlayMode(m => !m)}
                style={{ background: overlayMode ? '#8b0000' : '#333', border: 'none', color: '#fff', padding: '0 10px', height: 26, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              >
                {overlayMode ? '✎ Editing on PDF' : '☰ Use form instead'}
              </button>
            )}
          </div>

          {pdfBlob ? (
            <div style={{ overflow: 'auto', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ opacity: generating ? 0.65 : 1, transition: 'opacity 180ms' }}>
                <Document file={pdfBlob} onLoadSuccess={({ numPages: n }) => setNumPages(n)} loading={null}>
                  {Array.from({ length: numPages }, (_, i) => (
                    i === 0 && overlayMode ? (
                      <div key={i + 1} ref={setPageWrap} style={{ position: 'relative' }}>
                        <Page pageNumber={1} scale={zoom * 1.5} renderTextLayer={false} renderAnnotationLayer={false} loading={null} onRenderSuccess={updatePageWidth} />
                        {pageWidthPx > 0 && <AWBOverlay data={data} onChange={setData} pageWidthPx={pageWidthPx} />}
                      </div>
                    ) : (
                      <Page key={i + 1} pageNumber={i + 1} scale={zoom * 1.5} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
                    )
                  ))}
                </Document>
              </div>
            </div>
          ) : (
            <div className="preview-loading">{t('editor.previewLoading')}</div>
          )}
        </div>

        {!overlayMode && (
          <div className="form-panel-wrap form-panel-wrap-fallback">
            <AWBFormPanel data={data} onChange={setData} lockDraftWatermark />
          </div>
        )}

        {/* Mobile: the form lives in a dialog over the sheet */}
        <button
          type="button"
          className="edit-fab"
          onClick={() => { setDraft(data); setFormDialogOpen(true) }}
        >
          ✎ {t('editor.editFields')}
        </button>
        <FormDialog
          open={formDialogOpen}
          title={demoDocType === 'hawb' ? 'HAWB' : 'AWB'}
          onCancel={() => { setDraft(null); setFormDialogOpen(false) }}
          onSave={() => { if (draft) setData(draft); setDraft(null); setFormDialogOpen(false) }}
          cancelLabel={t('common.cancel')}
          saveLabel={t('editor.applyChanges')}
        >
          <AWBFormPanel data={draft ?? data} onChange={setDraft} lockDraftWatermark />
        </FormDialog>
      </div>
    </div>
  )
}
