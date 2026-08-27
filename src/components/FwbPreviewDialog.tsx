import React, { useEffect, useMemo, useState } from 'react'
import type { AWBData } from '../types/awb'
import { applyEAwbResult, buildFwbFromAwb } from '../lib/awbToFwb'
import type { FwbBuildResult } from '../lib/fwbCargoImp'

interface Props {
  open: boolean
  onClose: () => void
  data: AWBData
  onGenerated: (next: AWBData) => void
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function FwbPreviewDialog({ open, onClose, data, onGenerated }: Props) {
  const [result, setResult] = useState<FwbBuildResult | null>(null)

  const awbLabel = useMemo(() => {
    const p = data.awbPrefix?.replace(/\D/g, '')
    const s = data.awbSerial?.replace(/\D/g, '')
    return p && s ? `${p}-${s}` : 'AWB'
  }, [data.awbPrefix, data.awbSerial])

  useEffect(() => {
    if (!open) {
      setResult(null)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const built = buildFwbFromAwb(data)
    setResult(built)
    onGenerated(applyEAwbResult(data, built))

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps -- snapshot at open

  if (!open) return null

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="eAWB FWB preview"
      >
        <div className="form-dialog-title">
          <span>eAWB — FWB/17 ({awbLabel})</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="form-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result?.errors?.length ? (
            <div style={{ background: '#fdecea', color: '#8b0000', padding: 10, borderRadius: 6, fontSize: 13 }}>
              {result.errors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          ) : null}
          {result?.warnings?.length ? (
            <div style={{ background: '#fff8e6', color: '#7a5a00', padding: 10, borderRadius: 6, fontSize: 13 }}>
              {result.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ) : null}
          {result?.ok && (
            <div style={{ fontSize: 12, color: '#666' }}>
              Estado eAWB: generated — se guarda con el documento al Guardar
            </div>
          )}
          {result?.message ? (
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: '#f4f4f4',
                borderRadius: 6,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 12,
                lineHeight: 1.45,
                overflow: 'auto',
                maxHeight: '55vh',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {result.message}
            </pre>
          ) : (
            !result?.errors?.length && <div style={{ color: '#666' }}>Sin mensaje FWB.</div>
          )}
        </div>

        <div className="form-dialog-actions">
          <button type="button" className="form-dialog-btn" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="form-dialog-btn primary"
            disabled={!result?.ok || !result.message}
            onClick={() => {
              if (!result?.message) return
              downloadTxt(`FWB_${awbLabel.replace(/[^\w.-]+/g, '_')}.txt`, result.message)
            }}
          >
            Descargar FWB
          </button>
        </div>
      </div>
    </div>
  )
}
