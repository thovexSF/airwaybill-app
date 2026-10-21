import React, { useRef, useState } from 'react'
import { ProformaData, B2B_EXPRESS_LOGO } from '../types/proforma'
import { PAGE_WIDTH, LEADING, RED, proformaLayout, rawValue, setValue } from '../pdf/proformaLayout'
import { newRowId } from '../lib/useDocEditor'

if (typeof document !== 'undefined' && !document.getElementById('proforma-overlay-style')) {
  const s = document.createElement('style')
  s.id = 'proforma-overlay-style'
  s.textContent = `
    .pf-overlay-field:hover { background: rgba(139,0,0,0.04) !important; }
    .pf-overlay-field:focus { outline: 1.5px solid ${RED} !important; background: #fff !important; z-index: 2; }
    .pf-overlay-field::placeholder { color: #ccc; }`
  document.head.appendChild(s)
}

/** Inputs laid over the proforma preview, at the coordinates the PDF prints them. */
export function ProformaOverlay({ data, onChange, pageWidthPx }: {
  data: ProformaData
  onChange: (d: ProformaData) => void
  pageWidthPx: number
}) {
  const k = pageWidthPx / PAGE_WIDTH
  const layout = proformaLayout(!!data.sellerLogo)
  const seller = layout.boxes[0]

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {layout.fields.filter(f => !f.readOnly).map(f => {
        const fontSize = (f.fontSize ?? 9) * k
        const style: React.CSSProperties = {
          position: 'absolute', pointerEvents: 'auto',
          left: f.x * k, top: f.y * k, width: f.w * k, height: f.h * k,
          fontSize, lineHeight: `${Math.max(LEADING, (f.fontSize ?? 9) + 2) * k}px`,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: f.bold ? 700 : 400,
          textAlign: f.align ?? 'left',
          border: 'none', outline: 'none', background: 'transparent',
          padding: 0, color: '#000', resize: 'none',
        }
        const props = {
          className: 'pf-overlay-field',
          value: rawValue(data, f.key),
          placeholder: f.placeholder,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            onChange(setValue(data, f.key, e.target.value, newRowId)),
        }
        return f.multiline
          ? <textarea key={f.key} {...props} style={{ ...style, overflow: 'auto' }} />
          : <input key={f.key} type="text" {...props} style={style} />
      })}

      <LogoMenu
        value={data.sellerLogo ?? ''}
        onChange={v => onChange({ ...data, sellerLogo: v })}
        style={{ position: 'absolute', pointerEvents: 'auto', right: (PAGE_WIDTH - seller.x - seller.w + 4) * k, top: (seller.y + 2) * k }}
      />
    </div>
  )
}

/** Picks the "Issued by" logo: B2B Express, an uploaded image, or none. */
export function LogoMenu({ value, onChange, style, menuAlign = 'right' }: {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
  menuAlign?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    onChange(await downscaleImage(file))
    setOpen(false)
  }

  const item: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }

  return (
    <div style={{ ...style, zIndex: 5 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${RED}`, background: '#fff', color: RED, cursor: 'pointer' }}
      >
        Logo ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', [menuAlign]: 0, top: '100%', marginTop: 2, background: '#fff', border: '1px solid #ddd', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 160 }}>
          <button type="button" style={item} onClick={() => { onChange(B2B_EXPRESS_LOGO); setOpen(false) }}>B2B Express</button>
          <button type="button" style={item} onClick={() => fileRef.current?.click()}>Subir logo…</button>
          {value && <button type="button" style={{ ...item, color: '#a00' }} onClick={() => { onChange(''); setOpen(false) }}>Quitar logo</button>}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }}
      />
    </div>
  )
}

// The logo is stored inside the document's JSON, so keep it small.
function downscaleImage(file: File, maxW = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
