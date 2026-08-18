import React, { useEffect } from 'react'

/**
 * Near-full-height modal that hosts a document's editing form, following the
 * shape of `DocumentFormDialog` in the sister `b2b` repo: title bar, scrolling
 * body and a Cancel / Save footer.
 *
 * Used on narrow screens, where there is no room for the form beside the
 * document — the sheet stays on screen behind the dialog instead of being
 * replaced by the form.
 */
export function FormDialog({
  open,
  title,
  onCancel,
  onSave,
  saveLabel,
  cancelLabel,
  children,
}: {
  open: boolean
  title: string
  onCancel: () => void
  onSave: () => void
  saveLabel: string
  cancelLabel: string
  children: React.ReactNode
}) {
  // Esc closes, and the page behind must not scroll while the dialog is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="form-dialog-backdrop" onClick={onCancel} role="presentation">
      <div
        className="form-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="form-dialog-title">
          <span>{title}</span>
          <button type="button" className="form-dialog-close" onClick={onCancel} aria-label={cancelLabel}>×</button>
        </div>

        <div className="form-dialog-body">{children}</div>

        <div className="form-dialog-actions">
          <button type="button" className="form-dialog-btn" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="form-dialog-btn primary" onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}
