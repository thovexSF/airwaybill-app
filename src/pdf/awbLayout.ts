import { AWBData, RateItem, OtherCharge } from '../types/awb'

/**
 * Shared coordinate schema for the AWB document — consumed by both the PDF
 * renderer (AWBDocument) and the HTML input overlay (AWBOverlay), so they can
 * never drift out of alignment.
 *
 * The sheet itself is `public/awb-template.svg` (rasterised to
 * `awb-template-bg.png` for @react-pdf, which cannot render arbitrary SVG) —
 * the blank IATA air waybill form drawn in Inkscape, shared with the sister
 * `b2b` repo. Because the form supplies every box, rule and printed caption,
 * this file only positions the *values*; it emits no boxes, banners or static
 * text of its own.
 *
 * Every coordinate below is in millimetres on the A4 template and was measured
 * from the SVG itself: the 522 path segments were reduced to their horizontal
 * and vertical rules, and each band was cross-checked against the form's 72
 * printed captions. Keeping the numbers in millimetres means they can be
 * re-verified against the SVG directly; `mm()` converts to PDF points at the
 * single point of use.
 */

/** A4 in PDF points — the template's page size. */
export const PAGE_WIDTH = 595.276
export const PAGE_HEIGHT = 841.89
export const PAGE_PADDING = 0

/** Millimetres → PDF points (72 dpi over a 210 × 297 mm page). */
const MM = 2.834646
const mm = (v: number) => v * MM

// ── Vertical rules (x, mm) ───────────────────────────────────────────────────
const L = 15.1           // content left edge
const R = 200.5          // content right edge
const MID = 105.1        // main left/right column divider
const ACCT = 60.0        // shipper/consignee name | account number divider
const REF_END = 140.2    // reference number | optional shipping info divider

// Routing band dividers
const RT = { to1: 24.9, by1: 70.1, to2: 80.2, by2: 87.5, to3: 97.6 }
// Charge-declaration band dividers
const CD = { currEnd: 115.2, chgsEnd: 120.2, wtValMid: 125.1, wtValEnd: 130.2, otherMid: 135.3, otherEnd: 140.2, declCustoms: 170.3 }
// Destination band dividers
const DS = { destEnd: 60.0, flightMid: 81.8, insEnd: 132.7 }
// Handling band
const SCI_X = 178.0
// Rate table columns
const RC = { pcs: 24.9, gw: 42.6, unit: 44.8, unitEnd: 47.5, rcStart: 50.1, rcEnd: 67.5, cwStart: 70.1, cwEnd: 87.5, rateStart: 90.1, rateEnd: 110.1, totalStart: 112.6, totalEnd: 142.7, natStart: 145.1 }
// Charges block columns
const CH = { ppdEnd: 50.1, collEnd: 85.1 }

// ── Horizontal rules (y, mm) ─────────────────────────────────────────────────
const Y = {
  awbTop: 6.2, awbBottom: 21.5,
  shipBottom: 47.3,
  carrierBottom: 41.0,
  consBottom: 72.3,
  agentBottom: 89.0,
  iataBottom: 97.3,
  depBottom: 105.6,
  routeBottom: 113.9,
  destBottom: 122.3,
  handlingBottom: 139.1,
  rateHdrBottom: 147.5,
  rateBottom: 206.0,
  chgWeight: 214.5,
  chgValuation: 222.8,
  chgTax: 231.0,
  chgAgent: 239.6,
  chgCarrier: 247.9,
  chgReserved: 256.3,
  totalsBottom: 264.7,
  ccBottom: 273.0,
  bottomBottom: 281.3,
  sigShipper: 256.3,
}

/** Rows the rate table and Other Charges list render. */
const RATE_ROWS = 6
const OTHER_CHARGE_ROWS = 5

/** Height reserved at the top of a cell for the caption already printed on the form. */
const CAP = 3.4
const TXT = 8
const SM = 7
const XS = 6

export type FieldKey =
  | keyof AWBData
  | `rateItems.${number}.${keyof RateItem}`
  | `otherCharges.${number}.${keyof OtherCharge}`
  | `static:${string}`

export type FieldDef = {
  key: FieldKey
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  label?: string
  multiline?: boolean
  maxLines?: number
  align?: 'left' | 'center' | 'right'
  readOnly?: boolean
  staticText?: string
  rowTemplate?: boolean
}

type Rect = { x: number; y: number; width: number; height: number }

export type BoxDef = Rect & { borderTop?: boolean; borderBottom?: boolean; borderLeft?: boolean; borderRight?: boolean }
export type StaticTextDef = { key: string; x: number; y: number; width: number; height: number; fontSize: number; lineHeight: number; text: string; boldFrom?: string }
export type BannerDef =
  | { kind: 'divider'; cx: number; y: number; text: string }
  | { kind: 'side'; x: number; y: number; width: number; text: string; cutSide: 'left' | 'right' }

/**
 * A value cell in millimetre edge coordinates, converted to points.
 * `capped` leaves room for the caption the form already prints at the top.
 */
function cell(x0: number, y0: number, x1: number, y1: number, capped = true): Rect {
  const top = y0 + (capped ? CAP : 0.8)
  return {
    x: mm(x0 + 1),
    y: mm(top),
    width: mm(x1 - x0 - 2),
    height: mm(Math.max(y1 - top - 0.8, 2)),
  }
}

function buildLayout(): { fields: FieldDef[]; boxes: BoxDef[]; staticTexts: StaticTextDef[]; banners: BannerDef[] } {
  const fields: FieldDef[] = []
  const push = (f: FieldDef) => fields.push(f)

  // ── Master AWB number (top bar) ──
  // Three ticks split the box into prefix | airport | serial.
  push({ key: 'awbPrefix', ...cell(L, 13.5, 25.5, Y.awbBottom, false), fontSize: 11, align: 'center', label: 'Prefix' })
  push({ key: 'awbAirportCode', ...cell(25.5, 13.5, 35.2, Y.awbBottom, false), fontSize: 11, align: 'center', label: 'Airport' })
  push({ key: 'awbSerial', ...cell(35.2, 13.5, 105.0, Y.awbBottom, false), fontSize: 11, align: 'left', label: 'Serial' })
  // The full number is repeated top-right by AWBDocument (CUSTOMS REF band).

  // ── Shipper ──
  push({ key: 'shipperNameAndAddress', ...cell(L, Y.awbBottom, ACCT, Y.shipBottom), fontSize: TXT, label: "Shipper's Name and Address", multiline: true, maxLines: 6 })
  push({ key: 'shipperAccountNumber', ...cell(ACCT, Y.awbBottom, MID, 30.6), fontSize: SM, label: "Shipper's Account Number" })

  // ── Carrier (right of "Air Waybill / Issued By") ──
  push({ key: 'carrierName', ...cell(150.0, 26.0, R, 33.0, false), fontSize: 10, label: 'Issued by (carrier)' })
  push({ key: 'carrierAddress', ...cell(150.0, 33.0, R, Y.carrierBottom, false), fontSize: XS, multiline: true, maxLines: 3, label: 'Carrier address' })

  // ── Consignee ──
  push({ key: 'consigneeNameAndAddress', ...cell(L, Y.shipBottom, ACCT, Y.consBottom), fontSize: TXT, label: "Consignee's Name and Address", multiline: true, maxLines: 6 })
  push({ key: 'consigneeAccountNumber', ...cell(ACCT, Y.shipBottom, MID, 55.7), fontSize: SM, label: "Consignee's Account Number" })

  // ── Issuing carrier's agent / Accounting information ──
  push({ key: 'agentNameAndCity', ...cell(L, Y.consBottom, MID, Y.agentBottom), fontSize: TXT, label: "Issuing Carrier's Agent Name and City", multiline: true, maxLines: 4 })
  push({ key: 'accountingInformation', ...cell(MID, Y.consBottom, R, Y.iataBottom), fontSize: TXT, label: 'Accounting Information', multiline: true, maxLines: 5 })
  push({ key: 'agentIataCode', ...cell(L, Y.agentBottom, ACCT, Y.iataBottom), fontSize: SM, label: "Agent's IATA Code" })
  push({ key: 'agentAccountNumber', ...cell(ACCT, Y.agentBottom, MID, Y.iataBottom), fontSize: SM, label: 'Account No.' })

  // ── Airport of departure / Reference / Optional shipping information ──
  push({ key: 'airportOfDeparture', ...cell(L, Y.iataBottom, MID, Y.depBottom), fontSize: SM, label: 'Airport of Departure (Addr. of First Carrier) and Requested Routing' })
  push({ key: 'referenceNumber', ...cell(MID, Y.iataBottom, REF_END, Y.depBottom), fontSize: SM, label: 'Reference Number' })
  const osiW = (R - REF_END) / 3
  push({ key: 'optionalShippingInfo1', ...cell(REF_END, Y.iataBottom, REF_END + osiW, Y.depBottom), fontSize: XS, label: 'Optional Shipping Information' })
  push({ key: 'optionalShippingInfo2', ...cell(REF_END + osiW, Y.iataBottom, REF_END + osiW * 2, Y.depBottom), fontSize: XS, label: 'Optional Shipping Information' })
  push({ key: 'optionalShippingInfo3', ...cell(REF_END + osiW * 2, Y.iataBottom, R, Y.depBottom), fontSize: XS, label: 'Optional Shipping Information' })

  // ── Routing + charge declarations ──
  const rowTop = Y.depBottom
  const rowBot = Y.routeBottom
  push({ key: 'routeTo1', ...cell(L, rowTop, RT.to1, rowBot), fontSize: SM, align: 'center', label: 'To' })
  push({ key: 'routeBy1', ...cell(RT.to1, rowTop, RT.by1, rowBot), fontSize: SM, align: 'center', label: 'By First Carrier' })
  push({ key: 'routeTo2', ...cell(RT.by1, rowTop, RT.to2, rowBot), fontSize: SM, align: 'center', label: 'to' })
  push({ key: 'routeBy2', ...cell(RT.to2, rowTop, RT.by2, rowBot), fontSize: SM, align: 'center', label: 'by' })
  push({ key: 'routeTo3', ...cell(RT.by2, rowTop, RT.to3, rowBot), fontSize: SM, align: 'center', label: 'to' })
  push({ key: 'routeBy3', ...cell(RT.to3, rowTop, MID, rowBot), fontSize: SM, align: 'center', label: 'by' })
  push({ key: 'currency', ...cell(MID, rowTop, CD.currEnd, rowBot), fontSize: SM, align: 'center', label: 'Currency' })
  // WT/VAL and Other each carry a PPD and a COLL tick box. The form prints the
  // PPD/COLL captions at y 110.1, so the X sits in the ~3.5 mm strip below them.
  const tickTop = 110.3
  const tick = (key: FieldKey, x0: number, x1: number, label: string) =>
    push({ key, x: mm(x0), y: mm(tickTop), width: mm(x1 - x0), height: mm(rowBot - tickTop), fontSize: 8, align: 'center', label })
  tick('wtValPPD', CD.chgsEnd, CD.wtValMid, 'WT/VAL PPD')
  tick('wtValCOLL', CD.wtValMid, CD.wtValEnd, 'WT/VAL COLL')
  tick('otherPPD', CD.wtValEnd, CD.otherMid, 'Other PPD')
  tick('otherCOLL', CD.otherMid, CD.otherEnd, 'Other COLL')
  push({ key: 'declaredValueCarriage', ...cell(CD.otherEnd, rowTop, CD.declCustoms, rowBot), fontSize: SM, align: 'center', label: 'Declared Value for Carriage' })
  push({ key: 'declaredValueCustoms', ...cell(CD.declCustoms, rowTop, R, rowBot), fontSize: SM, align: 'center', label: 'Declared Value for Customs' })

  // ── Airport of destination / Requested flight / Amount of insurance ──
  push({ key: 'airportOfDestination', ...cell(L, Y.routeBottom, DS.destEnd, Y.destBottom), fontSize: TXT, align: 'center', label: 'Airport of Destination' })
  push({ key: 'flightNumber', ...cell(DS.destEnd, Y.routeBottom, DS.flightMid, Y.destBottom), fontSize: SM, align: 'center', label: 'Requested Flight/Date' })
  push({ key: 'flightDate', ...cell(DS.flightMid, Y.routeBottom, MID, Y.destBottom), fontSize: SM, align: 'center', label: 'Date' })
  push({ key: 'insuranceAmount', ...cell(MID, Y.routeBottom, DS.insEnd, Y.destBottom), fontSize: SM, align: 'center', label: 'Amount of Insurance' })

  // ── Handling information / SCI ──
  push({ key: 'handlingInformation', ...cell(L, Y.destBottom, SCI_X, Y.handlingBottom), fontSize: TXT, label: 'Handling Information', multiline: true, maxLines: 5 })
  push({ key: 'sci', ...cell(SCI_X, 130.8, R, Y.handlingBottom), fontSize: SM, align: 'center', label: 'SCI' })

  // ── Rate table ──
  {
    const rowH = (Y.rateBottom - Y.rateHdrBottom) / RATE_ROWS
    for (let i = 0; i < RATE_ROWS; i++) {
      const y0 = Y.rateHdrBottom + i * rowH
      const y1 = y0 + rowH
      const c = (x0: number, x1: number) => cell(x0, y0, x1, y1, false)
      push({ key: `rateItems.${i}.pieces`, ...c(L, RC.pcs), fontSize: SM, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.grossWeight`, ...c(RC.pcs, RC.gw), fontSize: SM, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.weightUnit`, ...c(RC.gw, RC.unit), fontSize: XS, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.rateClass`, ...c(RC.unitEnd, RC.rcStart), fontSize: XS, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.commodityItemNo`, ...c(RC.rcStart, RC.rcEnd), fontSize: SM, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.chargeableWeight`, ...c(RC.cwStart, RC.cwEnd), fontSize: SM, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.rateCharge`, ...c(RC.rateStart, RC.rateEnd), fontSize: SM, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.total`, ...c(RC.totalStart, RC.totalEnd), fontSize: SM, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.natureAndQuantity`, ...c(RC.natStart, R), fontSize: SM, multiline: true, maxLines: 3, rowTemplate: true })
    }
  }

  // ── Charges: Prepaid | Collect ──
  const chargeRow = (key: string, y0: number, y1: number, ppd: FieldKey, coll: FieldKey) => {
    push({ key: ppd, ...cell(L, y0, CH.ppdEnd, y1), fontSize: TXT, align: 'right', label: `${key} (prepaid)` })
    push({ key: coll, ...cell(CH.ppdEnd, y0, CH.collEnd, y1), fontSize: TXT, align: 'right', label: `${key} (collect)` })
  }
  chargeRow('Weight Charge', Y.rateBottom, Y.chgWeight, 'weightChargePPD', 'weightChargeCOLL')
  chargeRow('Valuation Charge', Y.chgWeight, Y.chgValuation, 'valuationChargePPD', 'valuationChargeCOLL')
  chargeRow('Tax', Y.chgValuation, Y.chgTax, 'taxPPD', 'taxCOLL')
  push({ key: 'totalOtherChargesDueAgent', ...cell(L, Y.chgTax, CH.collEnd, Y.chgAgent), fontSize: TXT, align: 'right', label: 'Total Other Charges Due Agent' })
  push({ key: 'totalOtherChargesDueCarrier', ...cell(L, Y.chgAgent, CH.collEnd, Y.chgCarrier), fontSize: TXT, align: 'right', label: 'Total Other Charges Due Carrier' })
  chargeRow('Total', Y.chgReserved, Y.totalsBottom, 'totalPrepaid', 'totalCollect')
  push({ key: 'currencyConversionRates', ...cell(L, Y.totalsBottom, CH.ppdEnd, Y.ccBottom), fontSize: SM, align: 'center', label: 'Currency Conversion Rates' })
  push({ key: 'ccChargesInDestCurrency', ...cell(CH.ppdEnd, Y.totalsBottom, CH.collEnd, Y.ccBottom), fontSize: SM, align: 'center', label: 'CC Charges in Dest. Currency' })
  push({ key: 'chargesAtDestination', ...cell(CH.ppdEnd, Y.ccBottom, CH.collEnd, Y.bottomBottom), fontSize: SM, align: 'center', label: 'Charges at Destination' })
  push({ key: 'totalCollectCharges', ...cell(CH.collEnd, Y.ccBottom, 132.0, Y.bottomBottom), fontSize: SM, align: 'center', label: 'Total Collect Charges' })

  // ── Other charges (right of the charges block) ──
  {
    const rowH = (Y.chgTax - Y.rateBottom) / OTHER_CHARGE_ROWS
    for (let i = 0; i < OTHER_CHARGE_ROWS; i++) {
      const y0 = Y.rateBottom + 1.5 + i * rowH
      const y1 = y0 + rowH
      push({ key: `otherCharges.${i}.description`, ...cell(CH.collEnd, y0, 165.0, y1, false), fontSize: SM, rowTemplate: true })
      push({ key: `otherCharges.${i}.amount`, ...cell(165.0, y0, R, y1, false), fontSize: SM, align: 'right', rowTemplate: true })
    }
  }

  // ── Signatures / execution ──
  push({ key: 'signatureShipper', ...cell(CH.collEnd, 248.5, R, 254.6, false), fontSize: SM, align: 'center', label: 'Signature of Shipper or his Agent' })
  push({ key: 'executedOnDate', ...cell(CH.collEnd, 265.5, 126.0, 271.4, false), fontSize: SM, align: 'center', label: 'Executed on (date)' })
  push({ key: 'executedAtPlace', ...cell(126.0, 265.5, 158.0, 271.4, false), fontSize: SM, align: 'center', label: 'at (place)' })
  push({ key: 'signatureCarrier', ...cell(158.0, 265.5, R, 271.4, false), fontSize: SM, align: 'center', label: 'Signature of Issuing Carrier or its Agent' })

  // The template supplies every box, rule and caption, so nothing else is drawn.
  return { fields, boxes: [], staticTexts: [], banners: [] }
}

const built = buildLayout()

export const AWB_LAYOUT: FieldDef[] = built.fields
export const AWB_BOXES: BoxDef[] = built.boxes
export const STATIC_TEXT_BLOCKS: StaticTextDef[] = built.staticTexts
export const AWB_BANNERS: BannerDef[] = built.banners

/** Rows the rate table and Other Charges list expose to the editor. */
export const RATE_ROW_COUNT = RATE_ROWS
export const OTHER_CHARGE_ROW_COUNT = OTHER_CHARGE_ROWS

/**
 * Field defs for the given row counts — rows beyond what the document holds
 * are dropped so the overlay does not render inputs for absent data.
 */
export function getFieldDefs(rateItemCount: number, otherChargeCount: number): FieldDef[] {
  return AWB_LAYOUT.filter((f) => {
    const rate = /^rateItems\.(\d+)\./.exec(f.key as string)
    if (rate) return Number(rate[1]) < Math.max(rateItemCount, 1)
    const other = /^otherCharges\.(\d+)\./.exec(f.key as string)
    if (other) return Number(other[1]) < otherChargeCount
    return true
  })
}

export function setNestedField(data: AWBData, key: FieldKey, value: string | boolean): AWBData {
  const rate = /^rateItems\.(\d+)\.(.+)$/.exec(key as string)
  if (rate) {
    const idx = Number(rate[1])
    const prop = rate[2] as keyof RateItem
    const rateItems = data.rateItems.map((item, i) => (i === idx ? { ...item, [prop]: value } : item))
    return { ...data, rateItems }
  }
  const other = /^otherCharges\.(\d+)\.(.+)$/.exec(key as string)
  if (other) {
    const idx = Number(other[1])
    const prop = other[2] as keyof OtherCharge
    const otherCharges = data.otherCharges.map((item, i) => (i === idx ? { ...item, [prop]: value } : item))
    return { ...data, otherCharges }
  }
  return { ...data, [key as keyof AWBData]: value }
}
