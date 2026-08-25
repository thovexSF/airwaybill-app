import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Document, Page } from 'react-pdf'
import { AWBData } from '../types/awb'
import { AWBCopiesDocument } from '../pdf/AWBDocument'
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
}: {
  open: boolean
  data: AWBData
  onClose: () => void
  authorize?: () => Promise<boolean>
  fileName: string
  /** The public demo previews and prints the copies but does not hand out files. */
  allowDownload?: boolean
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(DEFAULT_COPIES)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const genRef = useRef(0)

  const copies = useMemo(
    () => AWB_COPIES.filter((c) => selected.includes(c.key)).map((c) => c.key),
    [selected],
  )

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
          const next = await pdf(<AWBCopiesDocument data={data} copies={copies} />).toBlob()
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
  }, [open, data, copies, t])

  if (!open) return null

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()))
  }

  /** Renders the current selection once, for whatever the caller does next. */
  async function currentBlob(): Promise<Blob> {
    return blob ?? pdf(<AWBCopiesDocument data={data} copies={copies} />).toBlob()
  }

  async function handleDownload() {
    if (!copies.length) return
    if (authorize && !(await authorize())) return
    const url = URL.createObjectURL(await currentBlob())
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}_copies.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function handlePrint() {
    if (!copies.length) return
    if (authorize && !(await authorize())) return
    const url = URL.createObjectURL(await currentBlob())
    // A dedicated window so the browser's own print dialog owns the job; some
    // mobile browsers refuse to open a blob, in which case the tab never
    // appears and the user still has the Download button.
    const w = window.open(url, '_blank')
    if (!w) { setError(t('copies.popupBlocked')); return }
    w.addEventListener('load', () => { try { w.print() } catch { /* user can print from the viewer */ } })
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
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
            <p className="copies-hint">{t('copies.hint')}</p>
            {error && <p className="copies-error">{error}</p>}
          </div>

          <div className="copies-preview">
            {busy && <p className="copies-hint">{t('editor.updating')}</p>}
            {blob ? (
              <Document file={blob} onLoadSuccess={({ numPages }) => setPageCount(numPages)} loading={null}>
                {Array.from({ length: pageCount }, (_, i) => (
                  <Page
                    key={i}
                    pageNumber={i + 1}
                    width={280}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={null}
                  />
                ))}
              </Document>
            ) : (
              !busy && <p className="copies-hint">{t('copies.pickOne')}</p>
            )}
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
