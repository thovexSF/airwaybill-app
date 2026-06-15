/**
 * DEV-ONLY page — renders the AWB editor with mock data, no auth required.
 * Access at http://localhost:5173/dev-preview
 * Delete this file and the route in App.tsx before shipping.
 */
import React, { useState, useRef, useEffect } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBOverlay } from '../components/AWBOverlay'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export function DevPreviewPage() {
  const [data, setData] = useState<AWBData>({ ...exampleAWB, isDraft: true })
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [zoom, setZoom] = useState(1.0)
  const [pageWidthPx, setPageWidthPx] = useState(0)
  const pageWrapRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    regenerate(data)
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
  }, [pdfBlob])

  async function regenerate(d: AWBData) {
    const blob = await pdf(<AWBDocument data={d} />).toBlob()
    setPdfBlob(blob)
    setPdfUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
  }

  function handleChange(d: AWBData) {
    setData(d)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(d), 400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f0f0', fontFamily: 'system-ui' }}>
      {/* toolbar */}
      <div style={{ background: '#8B0000', color: '#fff', padding: '8px 16px', display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
        <strong>DEV PREVIEW</strong>
        <span style={{ opacity: 0.6 }}>|</span>
        <span>Zoom:</span>
        {[0.6, 0.8, 1.0, 1.25, 1.5].map(z => (
          <button key={z} onClick={() => setZoom(z)}
            style={{ background: zoom === z ? '#fff' : 'transparent', color: zoom === z ? '#8B0000' : '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>
            {z}x
          </button>
        ))}
        <button onClick={() => setData({ ...defaultAWBData, isDraft: true })}
          style={{ marginLeft: 'auto', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
          Reset
        </button>
        <button onClick={() => setData({ ...exampleAWB, isDraft: true })}
          style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: 12 }}>
          Load example
        </button>
        {pdfUrl && (
          <a href={pdfUrl} download="dev-preview.pdf"
            style={{ background: '#fff', color: '#8B0000', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            Download PDF
          </a>
        )}
      </div>

      {/* PDF canvas + overlay */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        {pdfUrl ? (
          <Document file={pdfUrl} loading={null}>
            <div ref={pageWrapRef} style={{ position: 'relative', display: 'inline-block', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              <Page
                pageNumber={1}
                width={612 * zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={() => {
                  const w = pageWrapRef.current?.getBoundingClientRect().width
                  if (w) setPageWidthPx(w)
                }}
              />
              {pageWidthPx > 0 && (
                <AWBOverlay data={data} onChange={handleChange} pageWidthPx={pageWidthPx} />
              )}
            </div>
          </Document>
        ) : (
          <div style={{ marginTop: 80, color: '#666' }}>Generando PDF…</div>
        )}
      </div>
    </div>
  )
}
