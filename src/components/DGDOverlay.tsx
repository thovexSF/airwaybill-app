import React from 'react'
import { DGDData, DGDItem } from '../types/dgd'
import {
  BODY_TOP, COL, DGD_ROWS, ROW_H,
  CARGO_ONLY_BOX, NON_RADIOACTIVE_BOX, PASSENGER_BOX, RADIOACTIVE_BOX,
} from '../pdf/DGDDocument'

/**
 * Editable fields laid over the rendered Shipper's Declaration, in the same point coordinates
 * `DGDDocument` places its values at, so typing feels like filling in the paper form. While this
 * is mounted the preview PDF is rendered with `hideValues`, so a value is never drawn twice.
 */
export function DGDOverlay({ data, scale, pageIndex, items, onField, onItem, onAddItem, onRemoveItem }: {
  data: DGDData
  /** CSS pixels per PDF point. */
  scale: number
  pageIndex: number
  /** The table rows printed on this sheet. */
  items: DGDItem[]
  onField: (patch: Partial<DGDData>) => void
  onItem: (id: string, key: keyof DGDItem, value: string) => void
  onAddItem: (key: keyof DGDItem, value: string) => void
  onRemoveItem: (id: string) => void
}) {
  const px = (v: number) => v * scale
  const box = (x: number, y: number, w: number, h: number): React.CSSProperties => ({
    position: 'absolute', left: px(x), top: px(y), width: px(w), height: px(h),
  })
  /** An input whose text baseline lands on `baseline`, like `At` in the PDF. */
  const line = (x: number, baseline: number, w: number, size: number) =>
    box(x - 1, baseline - size * 1.02, w, size * 1.35)
  const font = (size: number, bold = true): React.CSSProperties => ({
    fontFamily: 'Helvetica, Arial, sans-serif', fontSize: px(size), fontWeight: bold ? 700 : 400, lineHeight: 1.2,
  })

  const first = pageIndex === 0
  const isLast = items.length < DGD_ROWS
  const rowsShown = isLast ? items.length + 1 : items.length

  const cell = (r: number, col: number, item: DGDItem | undefined, key: keyof DGDItem, opts?: { w?: number; x?: number; placeholder?: string; area?: boolean }) => {
    const x = (opts?.x ?? COL[col]) + 2
    const w = opts?.w ?? COL[col + 1] - COL[col] - 4
    const top = BODY_TOP + 3 + r * ROW_H
    const common = {
      className: 'dgdo-in',
      style: { ...box(x, top, w, ROW_H - 3), ...font(key === 'properShippingName' ? 7.2 : 7.2, key === 'properShippingName') },
      value: item ? String(item[key] ?? '') : '',
      placeholder: opts?.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        item ? onItem(item.id, key, e.target.value) : onAddItem(key, e.target.value),
    }
    return opts?.area
      ? <textarea key={`${r}-${key}`} {...common} rows={2} />
      : <input key={`${r}-${key}`} {...common} />
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        .dgdo-in { background: transparent; border: 0; outline: 0; padding: 0 1px; margin: 0; resize: none; color: #000; box-sizing: border-box; overflow: hidden; }
        .dgdo-in:hover { background: rgba(60,120,255,0.07); box-shadow: 0 0 0 1px rgba(60,120,255,0.25); }
        .dgdo-in:focus { background: rgba(255,240,150,0.45); box-shadow: 0 0 0 1px rgba(200,150,0,0.6); }
        .dgdo-in::placeholder { color: rgba(0,0,0,0.28); font-weight: 400; }
        .dgdo-opt { position: absolute; background: transparent; border: 0; padding: 0; cursor: pointer; }
        .dgdo-opt:hover { background: rgba(60,120,255,0.12); }
        .dgdo-x { position: absolute; background: none; border: 0; padding: 0; color: #b00; cursor: pointer; line-height: 1; opacity: 0.35; }
        .dgdo-x:hover { opacity: 1; }
      `}</style>

      {first && (
        <>
          <textarea className="dgdo-in" aria-label="Shipper" style={{ ...box(53, 56, 236, 52), ...font(9) }}
            value={data.shipperNameAndAddress} onChange={e => onField({ shipperNameAndAddress: e.target.value })} />
          <input className="dgdo-in" aria-label="Air Waybill No." placeholder="999-12345675" style={{ ...line(420, 53, 134, 10), ...font(10) }}
            value={data.awbNo} onChange={e => onField({ awbNo: e.target.value })} />
          <input className="dgdo-in" aria-label="Shipper's reference" style={{ ...line(470, 100, 86, 8), ...font(8) }}
            value={data.shipperReference} onChange={e => onField({ shipperReference: e.target.value })} />
          <textarea className="dgdo-in" aria-label="Consignee" style={{ ...box(53, 138, 236, 46), ...font(9) }}
            value={data.consigneeNameAndAddress} onChange={e => onField({ consigneeNameAndAddress: e.target.value })} />

          <input className="dgdo-in" aria-label="Airport of departure" placeholder="SCL" style={{ ...line(186, 268, 100, 10), ...font(10) }}
            value={data.airportOfDeparture} onChange={e => onField({ airportOfDeparture: e.target.value.toUpperCase() })} />
          <input className="dgdo-in" aria-label="Airport of destination" placeholder="MIA" style={{ ...line(182, 313, 100, 10), ...font(10) }}
            value={data.airportOfDestination} onChange={e => onField({ airportOfDestination: e.target.value.toUpperCase() })} />

          {[
            [PASSENGER_BOX, 'Passenger and Cargo Aircraft', () => onField({ shipmentType: 'passenger_and_cargo' })],
            [CARGO_ONLY_BOX, 'Cargo Aircraft Only', () => onField({ shipmentType: 'cargo_only' })],
            [NON_RADIOACTIVE_BOX, 'Non-radioactive', () => onField({ isRadioactive: false })],
            [RADIOACTIVE_BOX, 'Radioactive', () => onField({ isRadioactive: true })],
          ].map(([b, title, onClick], i) => {
            const [x1, y1, x2, y2] = b as number[]
            return <button key={i} type="button" className="dgdo-opt" title={`${title} — click to select`} aria-label={title as string}
              style={box(x1, y1, x2 - x1, y2 - y1)} onClick={onClick as () => void} />
          })}

          <textarea className="dgdo-in" aria-label="Additional handling information" style={{ ...box(53, 632, 500, 25), ...font(8, false) }}
            value={data.additionalHandling} onChange={e => onField({ additionalHandling: e.target.value })} />

          <input className="dgdo-in" aria-label="Name of signatory" placeholder="Name" style={{ ...line(359, 693, 92, 8.5), ...font(8.5) }}
            value={data.signatoryName} onChange={e => onField({ signatoryName: e.target.value })} />
          <input className="dgdo-in" aria-label="Title" placeholder="Title" style={{ ...line(454, 693, 103, 8.5), ...font(8.5) }}
            value={data.signatoryTitle} onChange={e => onField({ signatoryTitle: e.target.value })} />
          <input className="dgdo-in" aria-label="Date" placeholder="Date" style={{ ...line(456, 709, 101, 9), ...font(9) }}
            value={data.signatureDate} onChange={e => onField({ signatureDate: e.target.value })} />
        </>
      )}

      {Array.from({ length: rowsShown }, (_, r) => {
        const item = items[r]
        return (
          <React.Fragment key={r}>
            {cell(r, 0, item, 'unIdNo', { placeholder: r === 0 ? 'UN1234' : undefined })}
            {cell(r, 1, item, 'properShippingName', { area: true, placeholder: r === 0 ? 'Proper shipping name' : undefined })}
            {cell(r, 2, item, 'classDivision', { x: COL[2], w: 19, placeholder: r === 0 ? 'Cl.' : undefined })}
            {cell(r, 2, item, 'subsidiaryRisk', { x: COL[2] + 19, w: 18, placeholder: r === 0 ? '(sub)' : undefined })}
            <select key={`${r}-pg`} className="dgdo-in" aria-label="Packing group"
              style={{ ...box(COL[3] + 2, BODY_TOP + 3 + r * ROW_H, COL[4] - COL[3] - 4, ROW_H - 3), ...font(7.2, false), appearance: 'none' }}
              value={item?.packingGroup ?? ''}
              onChange={e => (item ? onItem(item.id, 'packingGroup', e.target.value) : onAddItem('packingGroup', e.target.value))}>
              <option value="">{r === 0 ? 'PG' : ''}</option>
              <option value="I">I</option><option value="II">II</option><option value="III">III</option>
            </select>
            {cell(r, 4, item, 'quantity', { area: true, placeholder: r === 0 ? 'Qty and type of packaging' : undefined })}
            {cell(r, 5, item, 'packingInstruction', { placeholder: r === 0 ? 'Y341' : undefined })}
            {cell(r, 6, item, 'authorization', { w: COL[7] - COL[6] - 14 })}
            {item && (
              <button type="button" className="dgdo-x" title="Remove line" aria-label="Remove line"
                style={{ ...box(COL[7] - 11, BODY_TOP + 5 + r * ROW_H, 9, 10), fontSize: px(9) }}
                onClick={() => onRemoveItem(item.id)}>×</button>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
