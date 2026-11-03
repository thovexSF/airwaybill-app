import React, { useEffect } from 'react'
import { EditableSticker, QuarterTurn, blankEditable, suggestOverpackText } from '../lib/shipperLabel'
import { DGDData } from '../types/dgd'

const TURNS: QuarterTurn[] = [0, 90, 180, 270]

function turn(n: number): QuarterTurn {
  return TURNS[((n / 90) % 4 + 4) % 4]
}

/**
 * 10×15 cm stickers, shown horizontal (15 cm wide). Each card is edited in place.
 * Clicking the card includes it in the print or leaves it out. OVERPACK is just
 * another card, added with the button.
 */
export function ShipperLabelDialog({
  open,
  labels,
  source,
  onChange,
  onClose,
  onPrint,
  printing,
}: {
  open: boolean
  labels: EditableSticker[]
  source: DGDData
  onChange: (next: EditableSticker[]) => void
  onClose: () => void
  onPrint: () => void
  printing: boolean
}) {
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

  if (!open) return null

  const patch = (id: string, p: Partial<EditableSticker>) =>
    onChange(labels.map(l => l.id === id ? { ...l, ...p } : l))

  const selected = labels.filter(l => l.selected).length
  const seed = labels[0]

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Etiquetas"
        style={{ maxWidth: 980, height: 'auto', maxHeight: '94vh' }}
      >
        <div className="form-dialog-title">
          <span>Etiquetas 10×15</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="form-dialog-body" style={{ background: '#eceae6', padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignContent: 'flex-start' }}>
          {labels.map(label => (
            <LabelCard key={label.id} label={label} onPatch={p => patch(label.id, p)} onRemove={() => onChange(labels.filter(l => l.id !== label.id))} />
          ))}
        </div>
        <div className="form-dialog-actions" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="form-dialog-btn" onClick={() => onChange([...labels, blankEditable({ shipper: seed?.shipper, consignee: seed?.consignee })])}>
              Agregar etiqueta
            </button>
            <button type="button" className="form-dialog-btn" onClick={() => onChange([...labels, blankEditable({ shipper: seed?.shipper, consignee: seed?.consignee, overpack: true, footer: suggestOverpackText(source) })])}>
              Agregar OVERPACK
            </button>
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="form-dialog-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="form-dialog-btn primary" onClick={onPrint} disabled={!selected || printing}>
              {printing ? 'Imprimiendo…' : `Imprimir ${selected || ''}`}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

function LabelCard({ label, onPatch, onRemove }: {
  label: EditableSticker
  onPatch: (p: Partial<EditableSticker>) => void
  onRemove: () => void
}) {
  const sc = label.fontScale || 1
  const fs = (n: number) => Math.round(n * sc)
  const textTurn = `rotate(${label.textTurn}deg)`
  return (
    <div
      onClick={() => onPatch({ selected: !label.selected })}
      style={{
        width: 440, aspectRatio: '15 / 10', background: '#fff', position: 'relative',
        border: label.selected ? '3px solid var(--red)' : '2px solid #bbb',
        opacity: label.selected ? 1 : 0.45, boxSizing: 'border-box', padding: 10,
        margin: '8px 8px 48px', transform: `rotate(${label.labelTurn}deg)`, cursor: 'pointer',
      }}
    >
      <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} aria-label="Quitar etiqueta"
        style={{ position: 'absolute', top: 4, right: 6, border: 0, background: 'none', cursor: 'pointer', color: '#999', fontSize: 16 }}>×</button>
      <div style={{ transform: textTurn, transformOrigin: 'top left', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Cap>SHIPPER:</Cap>
        <Area value={label.shipper} size={fs(11)} rows={2} onChange={v => onPatch({ shipper: v })} />
        <Cap>CONSIGNEE:</Cap>
        <Area value={label.consignee} size={fs(11)} rows={2} onChange={v => onPatch({ consignee: v })} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {label.overpack
            ? <div style={{ fontWeight: 800, fontSize: fs(22), letterSpacing: 2 }}>OVERPACK</div>
            : <Area value={label.title} size={fs(14)} rows={2} center onChange={v => onPatch({ title: v })} />}
        </div>
        {label.overpack
          ? <Area value={label.footer} size={fs(11)} rows={2} placeholder="Texto de abajo" onChange={v => onPatch({ footer: v })} />
          : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Area value={label.un} size={fs(16)} rows={1} onChange={v => onPatch({ un: v.toUpperCase() })} />
              <Area value={label.quantity} size={fs(12)} rows={2} onChange={v => onPatch({ quantity: v })} />
            </div>
          )}
      </div>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 8, bottom: -36, display: 'flex', gap: 4 }}>
        <Mini onClick={() => onPatch({ fontScale: Math.max(0.7, +(sc - 0.15).toFixed(2)) })}>A−</Mini>
        <Mini onClick={() => onPatch({ fontScale: Math.min(2, +(sc + 0.15).toFixed(2)) })}>A+</Mini>
        <Mini onClick={() => onPatch({ labelTurn: turn(label.labelTurn + 90) })}>Girar</Mini>
        <Mini onClick={() => onPatch({ textTurn: turn(label.textTurn + 90) })}>Girar texto</Mini>
      </div>
    </div>
  )
}

function Cap({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 700 }}>{children}</div>
}

function Area({ value, onChange, size, rows, center, placeholder }: {
  value: string
  onChange: (v: string) => void
  size: number
  rows: number
  center?: boolean
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onClick={e => e.stopPropagation()}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', border: '1px dashed transparent', background: 'transparent', resize: 'none',
        fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 700, fontSize: size, lineHeight: 1.15,
        textAlign: center ? 'center' : 'left', padding: 0, color: '#000',
      }}
      onFocus={e => { e.target.style.borderColor = '#ccc'; e.target.style.background = '#fffef6' }}
      onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent' }}
    />
  )
}

function Mini({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ border: '1px solid #ccc', background: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 700, padding: '2px 6px', cursor: 'pointer' }}>
      {children}
    </button>
  )
}
