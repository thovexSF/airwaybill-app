import React, { useState } from 'react'
import { AWBData, RateItem, OtherCharge, defaultAWBData } from '../types/awb'
import {
  AWB_LAYOUT, FieldDef, FieldKey, PAGE_WIDTH,
  getFieldDefs, setNestedField,
} from '../pdf/awbLayout'

const RED = '#8B0000'

const BOOLEAN_KEYS = new Set<string>(['wtValPPD', 'wtValCOLL', 'otherPPD', 'otherCOLL'])

// Inject a global style so inputs show a red outline on focus without border clutter at rest
if (typeof document !== 'undefined' && !document.getElementById('awb-overlay-style')) {
  const s = document.createElement('style')
  s.id = 'awb-overlay-style'
  s.textContent = `.awb-overlay-field:focus { outline: 1.5px solid ${RED} !important; background: #fff !important; z-index: 2; }`
  document.head.appendChild(s)
}

function fieldStringValue(data: AWBData, def: FieldDef): string {
  const key = def.key as string
  const rateMatch = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rateMatch) {
    const item = data.rateItems[Number(rateMatch[1])]
    return item ? String(item[rateMatch[2] as keyof RateItem] ?? '') : ''
  }
  const chargeMatch = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (chargeMatch) {
    const item = data.otherCharges[Number(chargeMatch[1])]
    return item ? String(item[chargeMatch[2] as keyof OtherCharge] ?? '') : ''
  }
  return String((data as unknown as Record<string, unknown>)[key] ?? '')
}

/**
 * Absolutely-positioned HTML inputs layered directly over the rendered PDF —
 * lets users type into the document like filling out a paper form. Coordinates
 * come straight from `AWB_LAYOUT` (PDF points), scaled to the rendered page's
 * pixel width so the overlay tracks zoom automatically.
 *
 * Unlike the PDF (which clips per the auto-shrink-then-clip policy), inputs
 * here show the full, untruncated value the user typed — only the exported
 * PDF clips to fit the fixed box.
 */
export function AWBOverlay({ data, onChange, pageWidthPx }: { data: AWBData; onChange: (d: AWBData) => void; pageWidthPx: number }) {
  const [focusedRow, setFocusedRow] = useState<{ table: 'rateItems' | 'otherCharges'; index: number } | null>(null)
  const ptToPx = pageWidthPx / PAGE_WIDTH

  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)
    .filter((def) => !def.readOnly && !(def.key as string).startsWith('static:'))

  function set(def: FieldDef, value: string | boolean) {
    onChange(setNestedField(data, def.key, value))
  }

  function addRow(table: 'rateItems' | 'otherCharges') {
    if (table === 'rateItems') {
      const next: RateItem = { ...defaultAWBData.rateItems[0], id: String(Date.now()) }
      onChange({ ...data, rateItems: [...data.rateItems, next] })
    } else {
      const next: OtherCharge = { id: String(Date.now()), description: '', amount: '', entitlement: 'DUE AGENT' }
      onChange({ ...data, otherCharges: [...data.otherCharges, next] })
    }
  }

  function removeRow(table: 'rateItems' | 'otherCharges', index: number) {
    if (table === 'rateItems') {
      onChange({ ...data, rateItems: data.rateItems.filter((_, i) => i !== index) })
    } else {
      onChange({ ...data, otherCharges: data.otherCharges.filter((_, i) => i !== index) })
    }
    setFocusedRow(null)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {fieldDefs.map((def, i) => {
        const key = def.key as string
        const px = {
          left: def.x * ptToPx, top: def.y * ptToPx,
          width: def.width * ptToPx, height: def.height * ptToPx,
          fontSize: Math.max(def.fontSize * ptToPx, 8),
        }

        if (BOOLEAN_KEYS.has(key)) {
          const checked = Boolean((data as unknown as Record<string, unknown>)[key])
          return (
            <input
              key={i}
              type="checkbox"
              checked={checked}
              onChange={(e) => set(def, e.target.checked)}
              style={{ position: 'absolute', pointerEvents: 'auto', left: px.left, top: px.top, width: Math.max(px.width, 12), height: Math.max(px.height, 12), accentColor: RED }}
            />
          )
        }

        const value = fieldStringValue(data, def)
        const rowMatch = /^(rateItems|otherCharges)\.(\d+)\./.exec(key)
        const rowInfo = rowMatch ? { table: rowMatch[1] as 'rateItems' | 'otherCharges', index: Number(rowMatch[2]) } : null

        // The form sheet already prints every caption, so the overlay draws no
        // label of its own and its input sits exactly on the PDF's field box.
        const labelH = 0

        const commonStyle: React.CSSProperties = {
          position: 'absolute', pointerEvents: 'auto',
          left: px.left,
          top: px.top + labelH,
          width: px.width,
          height: Math.max(px.height - labelH, 10),
          fontSize: px.fontSize, lineHeight: 1.15,
          fontFamily: 'Helvetica, Arial, sans-serif',
          textAlign: def.align ?? 'left',
          // Transparent: the PDF underneath is rendered with `hideValues`, so
          // there is nothing to mask, and the sheet's own shaded boxes stay
          // visible through the input.
          border: 'none', outline: 'none', background: 'transparent',
          padding: 0, color: '#000', resize: 'none',
        }

        const sharedHandlers = rowInfo ? {
          onFocus: () => setFocusedRow(rowInfo),
        } : undefined


        if (def.multiline) {
          return (
            <React.Fragment key={i}>
              <textarea
                value={value}
                onChange={(e) => set(def, e.target.value)}
                style={{ ...commonStyle, overflow: 'auto' }}
                className="awb-overlay-field"
                {...sharedHandlers}
              />
            </React.Fragment>
          )
        }

        return (
          <React.Fragment key={i}>
            <input
              type="text"
              value={value}
              onChange={(e) => set(def, e.target.value)}
              style={commonStyle}
              className="awb-overlay-field"
              {...sharedHandlers}
            />
          </React.Fragment>
        )
      })}

      {focusedRow && (
        <RowToolbar
          table={focusedRow.table}
          index={focusedRow.index}
          rowCount={focusedRow.table === 'rateItems' ? data.rateItems.length : data.otherCharges.length}
          ptToPx={ptToPx}
          onAdd={() => addRow(focusedRow.table)}
          onRemove={() => removeRow(focusedRow.table, focusedRow.index)}
        />
      )}
    </div>
  )
}

function RowToolbar({ table, index, rowCount, ptToPx, onAdd, onRemove }: {
  table: 'rateItems' | 'otherCharges'; index: number; rowCount: number; ptToPx: number
  onAdd: () => void; onRemove: () => void
}) {
  const def = AWB_LAYOUT.find((f) => f.key === (`${table}.${index}.${table === 'rateItems' ? 'pieces' : 'description'}` as FieldKey))
  if (!def) return null
  const left = (def.x + def.width + 4) * ptToPx
  const top = def.y * ptToPx
  return (
    <div style={{ position: 'absolute', pointerEvents: 'auto', left, top, display: 'flex', gap: 4, zIndex: 5 }}>
      <button
        type="button"
        title="Add row"
        onClick={onAdd}
        style={{ width: 18, height: 18, borderRadius: 3, border: `1px solid ${RED}`, background: '#fff', color: RED, fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
      >+</button>
      {rowCount > 1 && (
        <button
          type="button"
          title="Remove row"
          onClick={onRemove}
          style={{ width: 18, height: 18, borderRadius: 3, border: `1px solid ${RED}`, background: '#fff', color: RED, fontSize: 12, lineHeight: 1, cursor: 'pointer' }}
        >−</button>
      )}
    </div>
  )
}
