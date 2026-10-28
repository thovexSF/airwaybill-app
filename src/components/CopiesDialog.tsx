import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page } from 'react-pdf'
import { AWBData } from '../types/awb'
import { AWBCopiesDocument, AwbCopySides } from '../pdf/AWBDocument'
import { AWB_COPIES, DEFAULT_COPIES } from '../pdf/awbCopyTheme'

/**
 * Picks which of the eight IATA copies to issue, previews them and sends them
 * to the printer or to a file.
 *
 * `authorize` is the caller's quota gate: it runs before a download and returns
 * false to block it. Printing goes through it too — a printed copy leaves the
 * app exactly like a downloaded one.
 */
export function CopiesDialog({
  open,
  data,
  onClose,
  authorize,
  fileName,
  allowDownload = true,
  showBrandStamp = true,
}: {
  open: boolean
  data: AWBData
  onClose: () => void
  authorize?: () => Promise<boolean>
  fileName: string
  /** The public demo previews and prints the copies but does not hand out files. */
  allowDownload?: boolean
  showBrandStamp?: boolean
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(DEFAULT_COPIES)
  const [sides, setSides] = useState<AwbCopySides>('both')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [paneWidth, setPaneWidth] = useState(520)
  const genRef = useRef(0)
  const previewRef = useRef<HTMLDivElement>(null)
  const printingRef = useRef(false)

  const copies = useMemo(
    () => AWB_COPIES.filter((c) => selected.includes(c.key)).map((c) => c.key),
    [selected],
  )

  useEffect(() => {
    if (!open) return
    setZoom(1)
    const el = previewRef.current
    if (!el) return
    const measure = () => {
      const width = el.clientWidth - 28
      if (width > 0) setPaneWidth((prev) => (Math.abs(prev - width) < 2 ? prev : width))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

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

  // Debounced preview: re-rendering eight Letter pages on every checkbox tick
  // is slow enough to feel broken.
  useEffect(() => {
    if (!open || !copies.length) { setBlob(null); return }
    const id = ++genRef.current
    setBusy(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await pdf(<AWBCopiesDocument data={data} copies={copies} sides={sides} showBrandStamp={showBrandStamp} />).toBlob()
          if (id !== genRef.current) return
          setBlob(next)
          setError(null)
        } catch (e) {
          if (id !== genRef.current) return
          console.error('copies PDF error:', e)
          setError(t('copies.error'))
        } finally {
          if (id === genRef.current) setBusy(false)
        }
      })()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [open, data, copies, sides, t, showBrandStamp])

  if (!open) return null

  const pageWidth = Math.max(220, Math.round(paneWidth * zoom))

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()))
  }

  /** Renders the current selection once, for whatever the caller does next. */
  async function currentBlob(): Promise<Blob> {
    return blob ?? pdf(<AWBCopiesDocument data={data} copies={copies} sides={sides} showBrandStamp={showBrandStamp} />).toBlob()
  }

  // The contract alone carries none of the waybill's data, so it costs no quota.
  const needsAuthorize = () => sides !== 'conditions' && !!authorize

  async function handleDownload() {
    if (!copies.length) return
    if (needsAuthorize() && !(await authorize!())) return
    const url = URL.createObjectURL(await currentBlob())
    const link = document.createElement('a')
    link.href = url
    link.download = sides === 'conditions' ? `${fileName}_contract.pdf` : `${fileName}_copies.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function handlePrint() {
    if (!copies.length || printingRef.current) return
    printingRef.current = true
    if (needsAuthorize() && !(await authorize!())) { printingRef.current = false; return }
    let url: string
    try {
      url = URL.createObjectURL(await currentBlob())
    } catch {
      printingRef.current = false
      setError(t('copies.error'))
      return
    }
    // A new tab never reaches print(): Chrome's PDF viewer doesn't fire `load`
    // and ignores print() from the opener, so the user is left on the file.
    // An iframe in this page loads as a document we can print.
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;opacity:0;pointer-events:none'
    iframe.src = url
    document.body.appendChild(iframe)

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      printingRef.current = false
      iframe.remove()
      URL.revokeObjectURL(url)
    }

    const printFrame = () => {
      const win = iframe.contentWindow
      if (!win) { cleanup(); setError(t('copies.popupBlocked')); return }
      try {
        win.focus()
        win.print()
      } catch {
        iframe.remove()
        const w = window.open(url, '_blank')
        if (!w) { cleanup(); setError(t('copies.popupBlocked')); return }
        const kick = () => { try { w.focus(); w.print() } catch { /* the tab stays so they can print from the viewer */ } }
        w.addEventListener('load', kick)
        setTimeout(kick, 500)
        setTimeout(cleanup, 60_000)
        return
      }
      win.addEventListener('afterprint', () => setTimeout(cleanup, 200), { once: true })
      setTimeout(cleanup, 120_000)
    }

    let started = false
    const start = () => {
      if (started) return
      started = true
      // The PDF plugin ignores print() in the same turn as load.
      setTimeout(printFrame, 200)
    }
    iframe.addEventListener('load', start)
    setTimeout(start, 3000)
  }

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog copies-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('copies.title')}
      >
        <div className="form-dialog-title">
          <span>{t('copies.title')}</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label={t('common.cancel')}>×</button>
        </div>

        <div className="form-dialog-body copies-body">
          <div className="copies-list">
            {AWB_COPIES.map((c) => (
              <label key={c.key} className="copies-item">
                <input type="checkbox" checked={selected.includes(c.key)} onChange={() => toggle(c.key)} />
                <span className="copies-swatch" style={{ background: c.ink }} aria-hidden="true" />
                <span>{c.label}</span>
              </label>
            ))}
            <div className="copies-sides" role="radiogroup" aria-label={t('copies.sides')}>
              <span className="copies-sides-label">{t('copies.sides')}</span>
              {(['both', 'face', 'conditions'] as const).map((s) => (
                <label key={s} className="copies-item">
                  <input type="radio" name="copies-sides" checked={sides === s} onChange={() => setSides(s)} />
                  <span>{t(`copies.sides_${s}`)}</span>
                </label>
              ))}
            </div>
            <p className="copies-hint">{t('copies.hint')}</p>
            {error && <p className="copies-error">{error}</p>}
          </div>

          <div className="copies-preview">
            <div className="copies-zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(+(z - 0.25).toFixed(2), 0.5))} aria-label={t('copies.zoomOut')}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(+(z + 0.25).toFixed(2), 2.5))} aria-label={t('copies.zoomIn')}>+</button>
              <button type="button" onClick={() => setZoom(1)}>{t('editor.zoomReset')}</button>
              {busy && <span className="copies-hint">{t('editor.updating')}</span>}
            </div>
            <div className="copies-preview-scroll" ref={previewRef}>
              {blob ? (
                <div className="copies-preview-pages">
                  <Document file={blob} onLoadSuccess={({ numPages }) => setPageCount(numPages)} loading={null}>
                    {Array.from({ length: pageCount }, (_, i) => (
                      <Page
                        key={i}
                        pageNumber={i + 1}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        loading={null}
                      />
                    ))}
                  </Document>
                </div>
              ) : (
                !busy && <p className="copies-hint">{t('copies.pickOne')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="form-dialog-actions">
          <button type="button" className="form-dialog-btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="form-dialog-btn" onClick={handlePrint} disabled={!copies.length}>
            {t('copies.print')}
          </button>
          {allowDownload && (
            <button type="button" className="form-dialog-btn primary" onClick={handleDownload} disabled={!copies.length}>
              {t('copies.download')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
