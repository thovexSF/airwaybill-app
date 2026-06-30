import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBFormPanel } from '../components/AWBFormPanel'
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

export function DemoEditorPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const [data, setDataRaw] = useState<AWBData>({ ...exampleAWB, isDraft: true })
  const setData = (next: AWBData | ((prev: AWBData) => AWBData)) => {
    setDataRaw(prev => {
      const updated = typeof next === 'function' ? next(prev) : next
      return { ...updated, isDraft: true }
    })
  }
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [generating, setGenerating] = useState(false)
  const [isWideViewport, setIsWideViewport] = useState(() => window.innerWidth >= 900)
  const [overlayMode, setOverlayMode] = useState(() => window.innerWidth >= 900)
  const [pageWidthPx, setPageWidthPx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageWrapRef = useRef<HTMLDivElement | null>(null)

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
    return () => ro.disconnect()
  }, [overlayMode, pdfBlob])

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
    <div className="app">
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
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{t('common.home')}</Link>
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
          <button type="button" className="btn-example" onClick={() => setData({ ...exampleAWB, isDraft: true })}>
            {t('editor.example')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generating && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('editor.generating')}</span>}
          <Link to="/signup" state={{ from: '/demo' }} className="btn-download">
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
                      <div key={i + 1} ref={pageWrapRef} style={{ position: 'relative' }}>
                        <Page pageNumber={1} scale={zoom * 1.5} renderTextLayer={false} renderAnnotationLayer={false} loading={null} />
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
      </div>
    </div>
  )
}
