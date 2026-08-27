import type { RateDimension, RateItem } from '../types/awb'

const VOL_FACTOR = 6000

export function emptyDimension(): RateDimension {
  return {
    length: '',
    width: '',
    height: '',
    unit: 'cm',
    pieces: '',
    weight: '',
    weightUnit: 'kg',
  }
}

/** Volume in cm³ across all dimension rows. */
export function volumeCm3(dims: RateDimension[] | undefined): number {
  if (!dims?.length) return 0
  return dims.reduce((sum, d) => {
    const unit = (d.unit || 'cm').toLowerCase()
    const f = unit === 'in' ? 2.54 : unit === 'm' ? 100 : 1
    const L = (parseFloat(d.length) || 0) * f
    const W = (parseFloat(d.width) || 0) * f
    const H = (parseFloat(d.height) || 0) * f
    const pcs = parseFloat(d.pieces) || 0
    return sum + L * W * H * pcs
  }, 0)
}

/** Volumetric weight in kg (IATA ÷6000). */
export function volumetricWeightKg(dims: RateDimension[] | undefined): number {
  return volumeCm3(dims) / VOL_FACTOR
}

/** Half-kilo round up (display convention). */
export function roundHalfUp(kg: number): number {
  return Math.ceil(kg * 2) / 2
}

export function applyAutoCalc(item: RateItem): RateItem {
  const mode = item.autoCalc || 'total'
  const chg = parseFloat(item.chargeableWeight) || 0
  const rate = parseFloat(item.rateCharge) || 0
  const total = parseFloat(item.total) || 0
  if (mode === 'total') {
    return { ...item, total: (chg * rate).toFixed(2) }
  }
  if (mode === 'rate' && chg > 0) {
    return { ...item, rateCharge: (total / chg).toFixed(2) }
  }
  return item
}

export function money(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}
