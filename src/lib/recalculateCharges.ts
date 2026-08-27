import type { AWBData } from '../types/awb'
import { money } from './rateVolume'

/** Recalculate due-agent / due-carrier and weight/totals from rate + other charges. */
export function recalculateCharges(data: AWBData): AWBData {
  const rateTotal = (data.rateItems || []).reduce((s, r) => s + (parseFloat(r.total) || 0), 0)
  const agent = (data.otherCharges || [])
    .filter((c) => c.entitlement === 'DUE AGENT')
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)
  const carrier = (data.otherCharges || [])
    .filter((c) => c.entitlement === 'DUE CARRIER')
    .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0)

  const collectWt = Boolean(data.wtValCOLL) && !data.wtValPPD
  const weightPPD = collectWt ? 0 : rateTotal
  const weightCOLL = collectWt ? rateTotal : 0

  const otherOnCollect = Boolean(data.otherCOLL) && !data.otherPPD
  const otherPPD = otherOnCollect ? 0 : agent + carrier
  const otherCOLL = otherOnCollect ? agent + carrier : 0

  const valP = parseFloat(data.valuationChargePPD) || 0
  const valC = parseFloat(data.valuationChargeCOLL) || 0
  const taxP = parseFloat(data.taxPPD) || 0
  const taxC = parseFloat(data.taxCOLL) || 0

  return {
    ...data,
    weightChargePPD: money(weightPPD),
    weightChargeCOLL: money(weightCOLL),
    totalOtherChargesDueAgent: money(agent),
    totalOtherChargesDueCarrier: money(carrier),
    totalPrepaid: money(weightPPD + valP + taxP + otherPPD),
    totalCollect: money(weightCOLL + valC + taxC + otherCOLL),
  }
}
