import React, { useEffect, useMemo, useState } from 'react'
import type { RateDimension, RateItem } from '../types/awb'
import {
  applyAutoCalc,
  emptyDimension,
  roundHalfUp,
  volumetricWeightKg,
  volumeCm3,
} from '../lib/rateVolume'

interface Props {
  open: boolean
  item: RateItem | null
  onClose: () => void
  onAccept: (item: RateItem) => void
}

export function RateItemDialog({ open, item, onClose, onAccept }: Props) {
  const [draft, setDraft] = useState<RateItem | null>(null)
  const [dims, setDims] = useState<RateDimension[]>([emptyDimension()])

  useEffect(() => {
    if (!open || !item) {
      setDraft(null)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    setDraft({
      ...item,
      autoCalc: item.autoCalc || 'total',
      dimensions: item.dimensions?.length ? item.dimensions : undefined,
    })
    setDims(item.dimensions?.length ? item.dimensions.map((d) => ({ ...d })) : [emptyDimension()])

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, item]) // eslint-disable-line react-hooks/exhaustive-deps

  const volCm3 = useMemo(() => volumeCm3(dims), [dims])
  const volKg = useMemo(() => volumetricWeightKg(dims), [dims])

  if (!open || !draft) return null

  function patch(partial: Partial<RateItem>) {
    setDraft((prev) => {
      if (!prev) return prev
      return applyAutoCalc({ ...prev, ...partial })
    })
  }

  function updateDim(idx: number, key: keyof RateDimension, val: string) {
    setDims((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)))
  }

  function useVolWeight() {
    if (!draft) return
    const gross = parseFloat(draft.grossWeight) || 0
    const vol = roundHalfUp(volKg)
    const chg = Math.max(gross, vol)
    patch({ chargeableWeight: String(chg) })
  }

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog"
        style={{ maxWidth: 900 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Rate item"
      >
        <div className="form-dialog-title">
          <span>Rate Description Item</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="form-dialog-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="field-row">
              <div className="field" style={{ flex: 1 }}>
                <label>Pieces</label>
                <input value={draft.pieces} onChange={(e) => patch({ pieces: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Gross Wt</label>
                <input value={draft.grossWeight} onChange={(e) => patch({ grossWeight: e.target.value })} />
              </div>
              <div className="field" style={{ flex: '0 0 64px' }}>
                <label>Unit</label>
                <select
                  value={draft.weightUnit}
                  onChange={(e) => patch({ weightUnit: e.target.value as 'K' | 'L' })}
                >
                  <option value="K">K</option>
                  <option value="L">L</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field" style={{ flex: 1 }}>
                <label>Rate Class</label>
                <input value={draft.rateClass} onChange={(e) => patch({ rateClass: e.target.value })} placeholder="Q" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Item No.</label>
                <input value={draft.commodityItemNo} onChange={(e) => patch({ commodityItemNo: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Chargeable Weight</label>
              <input
                value={draft.chargeableWeight}
                onChange={(e) => patch({ chargeableWeight: e.target.value })}
              />
            </div>
            <div className="field-row">
              <div className="field" style={{ flex: 1 }}>
                <label>Rate/Charge</label>
                <input
                  value={draft.rateCharge}
                  onChange={(e) => patch({ rateCharge: e.target.value })}
                  readOnly={draft.autoCalc === 'rate'}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Total</label>
                <input
                  value={draft.total}
                  onChange={(e) => patch({ total: e.target.value })}
                  readOnly={draft.autoCalc === 'total'}
                />
              </div>
            </div>
            <div className="field">
              <label>Auto-calculations</label>
              <select
                value={draft.autoCalc || 'total'}
                onChange={(e) => {
                  const autoCalc = e.target.value as RateItem['autoCalc']
                  setDraft((prev) => (prev ? applyAutoCalc({ ...prev, autoCalc }) : prev))
                }}
              >
                <option value="total">Total = chg × rate</option>
                <option value="rate">Rate = total ÷ chg</option>
                <option value="none">None</option>
              </select>
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              Volume: {Math.round(volCm3)} cm³
              <br />
              Volumetric weight: {volKg.toFixed(1)} kg (÷6000)
              <br />
              Rounding: Up (half kilo) → {roundHalfUp(volKg).toFixed(1)} kg
            </div>
            <button type="button" className="btn-add" onClick={useVolWeight} disabled={volKg <= 0}>
              Usar peso volumétrico (max gross/vol)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="field">
              <label>Nature and quantity of goods</label>
              <textarea
                rows={5}
                value={draft.natureAndQuantity}
                onChange={(e) => patch({ natureAndQuantity: e.target.value })}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Dimensions</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
                    <th style={{ padding: 4 }}>L</th>
                    <th style={{ padding: 4 }}>W</th>
                    <th style={{ padding: 4 }}>H</th>
                    <th style={{ padding: 4 }}>Unit</th>
                    <th style={{ padding: 4 }}>Pcs</th>
                    <th style={{ padding: 4 }}>Wt</th>
                    <th style={{ padding: 4 }}>U</th>
                    <th style={{ padding: 4 }} />
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 2 }}>
                        <input style={{ width: 52 }} value={d.length} onChange={(e) => updateDim(idx, 'length', e.target.value)} />
                      </td>
                      <td style={{ padding: 2 }}>
                        <input style={{ width: 52 }} value={d.width} onChange={(e) => updateDim(idx, 'width', e.target.value)} />
                      </td>
                      <td style={{ padding: 2 }}>
                        <input style={{ width: 52 }} value={d.height} onChange={(e) => updateDim(idx, 'height', e.target.value)} />
                      </td>
                      <td style={{ padding: 2 }}>
                        <select value={d.unit} onChange={(e) => updateDim(idx, 'unit', e.target.value)}>
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </td>
                      <td style={{ padding: 2 }}>
                        <input style={{ width: 44 }} value={d.pieces} onChange={(e) => updateDim(idx, 'pieces', e.target.value)} />
                      </td>
                      <td style={{ padding: 2 }}>
                        <input style={{ width: 52 }} value={d.weight} onChange={(e) => updateDim(idx, 'weight', e.target.value)} />
                      </td>
                      <td style={{ padding: 2 }}>
                        <select value={d.weightUnit} onChange={(e) => updateDim(idx, 'weightUnit', e.target.value)}>
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                      </td>
                      <td style={{ padding: 2 }}>
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => setDims((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)))}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-add" onClick={() => setDims((d) => [...d, emptyDimension()])}>
              + Add dimension
            </button>
          </div>
        </div>

        <div className="form-dialog-actions">
          <button type="button" className="form-dialog-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="form-dialog-btn primary"
            onClick={() => {
              const next = applyAutoCalc({
                ...draft,
                dimensions: dims,
                autoCalc: draft.autoCalc || 'total',
              })
              onAccept(next)
              onClose()
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
