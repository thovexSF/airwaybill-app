import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { AWBData } from '../types/awb'
import { eawbSuggestions } from '../lib/eawbSuggestions'

const LEVEL = {
  error: { icon: '⛔', color: '#a00' },
  warn: { icon: '⚠', color: '#8a5a00' },
  tip: { icon: '💡', color: '#555' },
}

/** Toolbar chip: how the waybill reads against eAWB, with the list and one-click fixes behind it. */
export function EawbSuggestionsButton({ data, onApply }: { data: AWBData; onApply: (next: AWBData) => void }) {
  const items = useMemo(() => eawbSuggestions(data), [data])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  if (data.docType === 'hawb') return null
  const blocking = items.filter(i => i.level !== 'tip').length
  const label = items.length === 0 ? '✓ eAWB OK' : blocking ? `⚠ ${blocking} por corregir` : `💡 ${items.length} sugerencias`
  const bg = items.length === 0 ? '#2f7d32' : blocking ? '#b26a00' : 'rgba(255,255,255,0.15)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn-example"
        onClick={() => setOpen(o => !o)}
        title="Revisión de la guía según el estándar eAWB (FWB) de las aerolíneas"
        style={{ background: bg, fontWeight: 700 }}
      >
        {label}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 420, maxHeight: '60vh', overflow: 'auto', background: '#fff', color: '#222', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 50, padding: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Revisión eAWB</div>
          {items.length === 0 ? (
            <div style={{ color: '#2f7d32' }}>La guía cumple lo que revisamos para enviarla como eAWB.</div>
          ) : items.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: i ? '1px solid #f0f0f0' : 'none' }}>
              <span>{LEVEL[s.level].icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: LEVEL[s.level].color }}>{s.field}</div>
                <div style={{ color: '#444' }}>{s.message}</div>
              </div>
              {s.fix && (
                <button type="button" onClick={() => onApply({ ...data, ...s.fix!.patch })}
                  style={{ alignSelf: 'center', fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--red)', background: '#fff', color: 'var(--red)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {s.fix.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
