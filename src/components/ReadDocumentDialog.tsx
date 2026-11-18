import React, { useState } from 'react'

/**
 * Picks what to read: a PDF or image (chosen, dropped, or pasted as a
 * screenshot) or text pasted from any document.
 */
export function ReadDocumentDialog({ onRead, onClose }: {
  onRead: (input: File | string) => Promise<void>
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const takeFile = (f: File | undefined | null) => { if (f) { setFile(f); setError(null) } }

  async function read() {
    const input = file ?? text.trim()
    if (!input) { setError('Elige un archivo o pega el texto del documento.'); return }
    setBusy(true)
    setError(null)
    try {
      await onRead(input)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo leer el documento.')
    }
    setBusy(false)
  }

  return (
    <div className="form-dialog-backdrop" onClick={busy ? undefined : onClose} role="presentation">
      <div
        className="form-dialog"
        onClick={e => e.stopPropagation()}
        onPaste={e => takeFile(e.clipboardData.files[0])}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); takeFile(e.dataTransfer.files[0]) }}
        role="dialog"
        aria-modal="true"
        aria-label="Leer documento"
        style={{ maxWidth: 520 }}
      >
        <div className="form-dialog-title">
          <span>Leer documento</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar" disabled={busy}>×</button>
        </div>
        <div className="form-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div style={{ color: '#555' }}>
            Sube la factura o documento (PDF o foto), arrástralo aquí o pega una captura. También puedes pegar el texto.
            Se llenan los campos que aparezcan en el documento; revísalos antes de guardar.
          </div>
          <label className="form-dialog-btn" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
            Elegir archivo…
            <input type="file" accept="application/pdf,image/*" hidden onChange={e => takeFile(e.target.files?.[0])} />
          </label>
          {file && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{file.name || 'Imagen pegada'}</span>
              <button type="button" onClick={() => setFile(null)} style={{ border: 0, background: 'none', color: '#999', cursor: 'pointer' }} aria-label="Quitar archivo">×</button>
            </div>
          )}
          {!file && (
            <textarea
              rows={8}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="…o pega aquí el texto del documento"
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 12, padding: 8 }}
            />
          )}
          {error && <div style={{ color: '#b00' }}>{error}</div>}
        </div>
        <div className="form-dialog-actions" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="form-dialog-btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="form-dialog-btn primary" onClick={read} disabled={busy}>
            {busy ? 'Leyendo…' : 'Leer'}
          </button>
        </div>
      </div>
    </div>
  )
}
