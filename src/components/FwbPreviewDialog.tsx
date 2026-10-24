import React, { useEffect, useMemo, useState } from 'react'
import type { AWBData } from '../types/awb'
import { applyEAwbResult, buildFwbFromAwb } from '../lib/awbToFwb'
import type { FwbBuildResult } from '../lib/fwbCargoImp'
import { splitAwbSerial } from '../lib/awbCheckDigit'
import { EawbChannel, EawbMessage, FSU_MEANING, MESSAGE_MEANING, eawbState, getEawbChannel, listEawbMessages, sendEawb } from '../lib/eawbMessaging'

interface Props {
  open: boolean
  onClose: () => void
  data: AWBData
  onGenerated: (next: AWBData) => void
  /** Saves the document and returns its id; the server sends what is saved. */
  saveFirst?: () => Promise<string | null>
  documentId?: string | null
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

export function FwbPreviewDialog({ open, onClose, data, onGenerated, saveFirst, documentId }: Props) {
  const [result, setResult] = useState<FwbBuildResult | null>(null)
  const [channel, setChannel] = useState<EawbChannel | null>(null)
  const [messages, setMessages] = useState<EawbMessage[]>([])
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const prefix = (data.awbPrefix ?? '').replace(/\D/g, '').padStart(3, '0')

  useEffect(() => {
    if (!open) return
    setSendMsg(null)
    getEawbChannel(prefix).then(setChannel).catch(() => setChannel(null))
    if (documentId) listEawbMessages(documentId).then(setMessages).catch(() => setMessages([]))
    else setMessages([])
  }, [open, prefix, documentId])

  async function send() {
    if (!saveFirst) return
    setSending(true)
    setSendMsg(null)
    try {
      const id = await saveFirst()
      if (!id) throw new Error('No se pudo guardar la AWB antes de enviarla.')
      await sendEawb(id)
      setMessages(await listEawbMessages(id))
    } catch (e: any) {
      setSendMsg(e?.message ?? 'No se pudo enviar la eAWB.')
    } finally {
      setSending(false)
    }
  }
  const state = eawbState(messages)

  const awbLabel = useMemo(() => {
    const p = data.awbPrefix?.replace(/\D/g, '')
    const s = data.awbSerial && splitAwbSerial(data.awbSerial).serial
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
            <div style={{ background: '#fdecea', color: 'var(--red)', padding: 10, borderRadius: 6, fontSize: 13 }}>
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
          {data.docType !== 'hawb' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
              {state && <span style={{ fontWeight: 700, color: state.color, background: state.bg, borderRadius: 12, padding: '3px 10px' }}>{state.label}</span>}
              {!channel && <span style={{ color: '#666' }}>Esta aerolínea todavía no recibe eAWB por la plataforma: descarga el FWB.</span>}
              {sendMsg && <span style={{ color: '#a00' }}>{sendMsg}</span>}
            </div>
          )}
          {state && <div style={{ fontSize: 12, color: '#555', marginTop: -4 }}>{state.detail}</div>}
          {messages.length > 0 && (
            <div style={{ border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
              {messages.map(m => (
                <details key={m.id} style={{ padding: '6px 10px', borderBottom: '1px solid #f2f2f2' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    {new Date(m.created_at).toLocaleString()} · {m.direction === 'out' ? '→ enviado' : '← recibido'} <b>{m.message_type}</b>
                    {m.status_code ? ` ${m.status_code}` : ''}
                    <span style={{ color: '#777' }}>
                      {' — '}{m.message_type === 'FSU' && m.status_code && FSU_MEANING[m.status_code]
                        ? `estado: ${FSU_MEANING[m.status_code]}`
                        : MESSAGE_MEANING[m.message_type] ?? 'correo sin formato de aerolínea'}
                    </span>
                    {m.error ? <span style={{ color: '#a00' }}> · {m.error}</span> : null}
                  </summary>
                  <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: 11, color: '#444' }}>{m.body}</pre>
                </details>
              ))}
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
          {channel && saveFirst && data.docType !== 'hawb' && (
            <button
              type="button"
              className="form-dialog-btn primary"
              disabled={!result?.ok || sending}
              title={`Guarda la AWB y envía el FWB a ${channel.airline_name || channel.airline_prefix}`}
              onClick={send}
            >
              {sending ? 'Enviando…' : `Enviar a ${channel.airline_name || channel.airline_prefix}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
