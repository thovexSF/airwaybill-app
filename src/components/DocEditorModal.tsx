import React, { useEffect } from 'react'

/**
 * Large dialog hosting an editor page in an iframe (same origin / session).
 * Keeps the document hub underneath instead of navigating to full-screen editor.
 */
export function DocEditorModal({
  open,
  title,
  src,
  onClose,
}: {
  open: boolean
  title: string
  src: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open || !src) return null

  return (
    <div className="form-dialog-backdrop doc-editor-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog doc-editor-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="form-dialog-title">
          <span>{title}</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="form-dialog-body doc-editor-modal-body">
          <iframe title={title} src={src} className="doc-editor-modal-frame" />
        </div>
        <div className="form-dialog-actions">
          <button type="button" className="form-dialog-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
