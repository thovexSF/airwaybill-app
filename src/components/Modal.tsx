import React, { useEffect } from 'react'

/** Diálogo centrado sobre la página. No se cierra al hacer clic fuera: los formularios largos perderían lo escrito. */
export function Modal({ onClose, label, children, width = 640 }: {
  onClose: () => void
  label: string
  children: React.ReactNode
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,15,26,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }}>
      <div role="dialog" aria-modal="true" aria-label={label} style={{
        position: 'relative', background: '#fff', borderRadius: 12, width: '100%', maxWidth: width,
        maxHeight: '92vh', overflowY: 'auto', padding: '24px 24px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 10, right: 12, background: 'none', border: 0, fontSize: 22, lineHeight: 1,
          color: '#777', cursor: 'pointer',
        }}>×</button>
        {children}
      </div>
    </div>
  )
}
