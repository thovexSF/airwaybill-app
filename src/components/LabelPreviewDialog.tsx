import React, { useEffect, useState } from 'react'
import { Document, Page } from 'react-pdf'

/**
 * Shows the 10×15 cm labels before they go to the Zebra. The OVERPACK sheet,
 * when present, stays visible so it can be left out of the print.
 */
export function LabelPreviewDialog({
  open,
  title,
  blob,
  onClose,
  onPrint,
  printing,
  overpackPage,
  printOverpack,
  onPrintOverpack,
}: {
  open: boolean
  title: string
  blob: Blob | null
  onClose: () => void
  onPrint: () => void
  printing: boolean
  overpackPage?: boolean
  printOverpack?: boolean
  onPrintOverpack?: (v: boolean) => void
}) {
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    if (open) setPageCount(0)
  }, [open, blob])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: 480 }}
      >
        <div className="form-dialog-title">
          <span>{title}</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="form-dialog-body" style={{ background: '#eceae6', padding: 16 }}>
          {blob ? (
            <Document file={blob} onLoadSuccess={({ numPages }) => setPageCount(numPages)} loading={null}>
              {Array.from({ length: pageCount }, (_, i) => {
                const isOverpack = !!overpackPage && i === pageCount - 1
                const skipped = isOverpack && !printOverpack
                return (
                  <div key={i} style={{ margin: '0 auto 16px', width: 280, opacity: skipped ? 0.4 : 1 }}>
                    <Page
                      pageNumber={i + 1}
                      width={280}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={null}
                    />
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, marginTop: 4, color: '#555' }}>
                      {isOverpack ? 'OVERPACK' : `${i + 1} / ${pageCount}`}
                    </div>
                  </div>
                )
              })}
            </Document>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', fontSize: 13 }}>Generating…</p>
          )}
        </div>
        <div className="form-dialog-actions" style={{ justifyContent: 'space-between' }}>
          {overpackPage ? (
            <label className="toggle" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={!!printOverpack}
                onChange={(e) => onPrintOverpack?.(e.target.checked)}
              />
              <span>Print OVERPACK sheet</span>
            </label>
          ) : <span />}
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="form-dialog-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="form-dialog-btn primary" onClick={onPrint} disabled={!blob || printing}>
              {printing ? 'Printing…' : 'Print to Zebra'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
