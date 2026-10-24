import React, { Suspense, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { PostHogProvider } from '@posthog/react'
import { AuthProvider } from '../auth/AuthContext'
import { posthogClient } from '../lib/analytics'
import { EditorRoutes } from '../App'

/**
 * Large dialog hosting a document editor over the hub. The editor runs in its
 * own React root with a memory router: same page, same loaded code and session,
 * so opening a document no longer boots the whole app again inside an iframe.
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
          <InlineEditor path={src} />
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

/** A separate root, since a router cannot sit inside the hub's own router. */
function InlineEditor({ path }: { path: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const root: Root = createRoot(ref.current)
    root.render(
      <PostHogProvider client={posthogClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Suspense fallback={<div className="hub-inline-editor-loading">Cargando editor…</div>}>
              <EditorRoutes />
            </Suspense>
          </MemoryRouter>
        </AuthProvider>
      </PostHogProvider>,
    )
    // Unmount after the current render pass; React warns when a root unmounts during one.
    return () => { setTimeout(() => root.unmount(), 0) }
  }, [path])
  return <div ref={ref} className="hub-inline-editor" />
}
