import { AWBData, RateItem, OtherCharge } from '../types/awb'

/**
 * Shared coordinate schema for the AWB document — consumed by both the PDF
 * renderer (AWBDocument) and the HTML input overlay (AWBOverlay), so they
 * can never drift out of alignment.
 *
 * Every coordinate is measured directly from the reference IATA AWB
 * (awbeditor.com format) by extracting its vector grid with pdfplumber:
 * the page is US Letter (612 x 792 pt), content runs from x=57 to x=590 with
 * an inner divider at x=316, and the horizontal bands sit at the exact y
 * values captured in `Y` below. This reproduces the reference layout 1:1
 * rather than approximating it.
 */

export const PAGE_WIDTH = 612
export const PAGE_HEIGHT = 792
export const PAGE_PADDING = 0

// Content grid bounds (measured): left margin 57, right edge 590, inner divider 316.
const L = 57
const R = 590
const MID = 316
const CONTENT_X = L
const CONTENT_WIDTH = R - L

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

/** Rectangle from absolute edge coordinates (x0,y0)-(x1,y1). */
function r(x0: number, y0: number, x1: number, y1: number): Rect {
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
}

// ── Horizontal band boundaries (y, top-origin) measured from the reference grid ──
const Y = {
  top: 14,
  awbBottom: 30,
  shipLblBottom: 54,
  shipBottom: 102,
  consLblBottom: 126,
  consBottom: 174,
  agentBottom: 222,
  iataBottom: 246,
  depBottom: 270,
  routeBottom: 294,
  destBottom: 318,
  handlingBottom: 366,
  rateHdrBottom: 390,
  rateRowsBottom: 534,
  rateCarryBottom: 558,
  chgRow1: 582, // Weight Charge
  chgRow2: 606, // Valuation Charge
  chgRow3: 630, // Tax
  chgRow4: 654, // Total Other Charges Due Agent
  chgRow5: 678, // Total Other Charges Due Carrier
  chgBottom: 702,
  totalsBottom: 726,
  ccBottom: 750,
  bottomBottom: 774,
}

// ── Vertical column boundaries (x) measured from the reference grid ──
const X = {
  acct: 187,          // shipper/consignee name | account divider
  ref: 417,           // reference number | optional shipping divider
  // routing grid
  rTo1: 86, rBy1: 216, rTo2: 244, rBy2: 266, rTo3: 295,
  curr: 345, chgs: 360, wtvalMid: 374, wtvalEnd: 388, otherMid: 403, otherEnd: 417,
  declCustoms: 504,
  // destination row
  destFlight: 186, flightEnd: 316, insAmtEnd: 396,
  // handling
  sci: 504,
  // rate table columns
  cPcs: 86, cGw: 158, cRateClass: 216, cChg: 273, cRate: 338, cTotal: 432,
  // charges
  chgPpdEnd: 158, chgCollEnd: 259,
  // currency/exec sub-columns
  execPlace: 358, execSig: 470,
  // bottom row
  botCharges: 158, botCollect: 259, botCopy: 360,
}

const RATE_ROWS = 4          // visible data rows in the rate table (390→534, ~36pt each)
const OTHER_CHARGE_ROWS = 5  // visible rows in the Other Charges mini-table

const LBL = 5.5
const TXT = 8
const XS = 5

export type BoxDef = Rect & { borderTop?: boolean; borderBottom?: boolean; borderLeft?: boolean; borderRight?: boolean }
export type StaticTextDef = { key: string; x: number; y: number; width: number; height: number; fontSize: number; lineHeight: number; text: string; boldFrom?: string }

const fullBorder = { borderTop: true, borderBottom: true, borderLeft: true, borderRight: true }

function buildLayout(): { fields: FieldDef[]; boxes: BoxDef[]; staticTexts: StaticTextDef[] } {
  const fields: FieldDef[] = []
  const boxes: BoxDef[] = []
  const staticTexts: StaticTextDef[] = []
  const push = (f: FieldDef) => fields.push(f)
  const box = (rect: Rect, borders: Partial<BoxDef> = fullBorder) => boxes.push({ ...rect, ...borders })
  let st = 0
  const text = (x: number, y: number, width: number, height: number, fontSize: number, txt: string, lineHeight = 1.2, boldFrom?: string) =>
    staticTexts.push({ key: `s${st++}`, x, y, width, height, fontSize, lineHeight, text: txt, boldFrom })

  // ── Header: AWB number bar (y 14–30) ──
  box(r(L, Y.top, X.rTo1, Y.awbBottom))                 // prefix
  box(r(X.rTo1, Y.top, 115, Y.awbBottom))               // airport
  box(r(115, Y.top, X.acct, Y.awbBottom))               // serial
  push({ key: 'awbPrefix',      ...cellIn(r(L, Y.top, X.rTo1, Y.awbBottom), 2), fontSize: 11, align: 'center' })
  push({ key: 'awbAirportCode', ...cellIn(r(X.rTo1, Y.top, 115, Y.awbBottom), 2), fontSize: 11, align: 'center' })
  push({ key: 'awbSerial',      ...cellIn(r(115, Y.top, X.acct, Y.awbBottom), 2), fontSize: 11, align: 'left' })
  // full AWB number on the right is drawn dynamically by AWBDocument

  // ── Shipper / Air Waybill (y 30–102) ──
  box(r(L, Y.awbBottom, X.acct, Y.shipBottom))                // shipper name+address
  box(r(X.acct, Y.awbBottom, MID, Y.shipBottom))              // shipper account number
  box(r(MID, Y.awbBottom, R, Y.shipBottom))                   // Air Waybill / carrier
  push({ key: 'shipperNameAndAddress', ...cellIn(r(L, Y.awbBottom, X.acct, Y.shipBottom), 3), fontSize: TXT, label: "Shipper's Name and Address", multiline: true, maxLines: 5 })
  push({ key: 'shipperAccountNumber', ...cellIn(r(X.acct, Y.awbBottom, MID, Y.shipBottom), 3), fontSize: TXT, label: "Shipper's Account Number" })
  text(MID + 4, Y.awbBottom + 3, 70, 9, XS, 'Not Negotiable')
  text(MID + 4, Y.awbBottom + 13, 95, 18, 15, 'Air Waybill')
  push({ key: 'carrierName', x: MID + 96, y: Y.awbBottom + 14, width: R - MID - 100, height: 12, fontSize: 10, align: 'left' })
  push({ key: 'carrierAddress', x: MID + 96, y: Y.awbBottom + 28, width: R - MID - 100, height: 30, fontSize: TXT, multiline: true, maxLines: 4, label: 'Issued by' })
  text(MID + 4, Y.shipBottom - 12, R - MID - 8, 10, XS, 'Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.')

  // ── Consignee / Conditions of contract (y 102–174) ──
  box(r(L, Y.shipBottom, X.acct, Y.consBottom))               // consignee name+address
  box(r(X.acct, Y.shipBottom, MID, Y.consBottom))             // consignee account number
  box(r(MID, Y.shipBottom, R, Y.consBottom))                  // IATA conditions
  push({ key: 'consigneeNameAndAddress', ...cellIn(r(L, Y.shipBottom, X.acct, Y.consBottom), 3), fontSize: TXT, label: "Consignee's Name and Address", multiline: true, maxLines: 5 })
  push({ key: 'consigneeAccountNumber', ...cellIn(r(X.acct, Y.shipBottom, MID, Y.consBottom), 3), fontSize: TXT, label: "Consignee's Account Number" })
  text(MID + 4, Y.shipBottom + 3, R - MID - 8, Y.consBottom - Y.shipBottom - 6, 4.6, IATA_CONDITIONS, 1.32)

  // ── Issuing Carrier's Agent / Accounting Information (y 174–246) ──
  box(r(L, Y.consBottom, MID, Y.agentBottom))                 // agent name and city
  box(r(MID, Y.consBottom, R, Y.iataBottom))                  // accounting information (spans both rows)
  push({ key: 'agentNameAndCity', ...cellIn(r(L, Y.consBottom, MID, Y.agentBottom), 3), fontSize: TXT, label: "Issuing Carrier's Agent Name and City", multiline: true, maxLines: 3 })
  push({ key: 'accountingInformation', ...cellIn(r(MID, Y.consBottom, R, Y.iataBottom), 3), fontSize: TXT, label: 'Accounting Information', multiline: true, maxLines: 5 })

  // ── Agent's IATA Code / Account No. (y 222–246) ──
  box(r(L, Y.agentBottom, X.acct, Y.iataBottom))
  box(r(X.acct, Y.agentBottom, MID, Y.iataBottom))
  push({ key: 'agentIataCode', ...cellIn(r(L, Y.agentBottom, X.acct, Y.iataBottom), 3), fontSize: TXT, label: "Agent's IATA Code" })
  push({ key: 'agentAccountNumber', ...cellIn(r(X.acct, Y.agentBottom, MID, Y.iataBottom), 3), fontSize: TXT, label: 'Account No.' })

  // ── Airport of Departure / Reference / Optional (y 246–270) ──
  box(r(L, Y.iataBottom, MID, Y.depBottom))
  box(r(MID, Y.iataBottom, X.ref, Y.depBottom))
  // Optional Shipping Info — 3 boxes per IATA 5.2.16
  const optW = Math.round((R - X.ref) / 3)
  box(r(X.ref, Y.iataBottom, X.ref + optW, Y.depBottom))
  box(r(X.ref + optW, Y.iataBottom, X.ref + optW * 2, Y.depBottom))
  box(r(X.ref + optW * 2, Y.iataBottom, R, Y.depBottom))
  push({ key: 'airportOfDeparture', ...cellIn(r(L, Y.iataBottom, MID, Y.depBottom), 3), fontSize: TXT, label: 'Airport of Departure (Addr. of First Carrier) and Requested Routing' })
  push({ key: 'referenceNumber', ...cellIn(r(MID, Y.iataBottom, X.ref, Y.depBottom), 3), fontSize: TXT, label: 'Reference Number' })
  // OSI: single label spanning all 3 boxes (§5.2.16 allows "without title"; spanning label matches official form)
  text(X.ref + 2, Y.iataBottom + 2, R - X.ref - 4, LBL + 1, LBL - 0.5, 'Optional Shipping Information')
  push({ key: 'optionalShippingInfo1', x: X.ref + 3, y: Y.iataBottom + LBL + 3, width: optW - 6, height: Y.depBottom - Y.iataBottom - LBL - 6, fontSize: TXT })
  push({ key: 'optionalShippingInfo2', x: X.ref + optW + 3, y: Y.iataBottom + LBL + 3, width: optW - 6, height: Y.depBottom - Y.iataBottom - LBL - 6, fontSize: TXT })
  push({ key: 'optionalShippingInfo3', x: X.ref + optW * 2 + 3, y: Y.iataBottom + LBL + 3, width: R - (X.ref + optW * 2) - 6, height: Y.depBottom - Y.iataBottom - LBL - 6, fontSize: TXT })

  // ── Routing grid (y 270–294) ──
  {
    const yb = Y.routeBottom
    box(r(L, Y.depBottom, X.rTo1, yb))
    box(r(X.rTo1, Y.depBottom, X.rBy1, yb))
    box(r(X.rBy1, Y.depBottom, X.rTo2, yb))
    box(r(X.rTo2, Y.depBottom, X.rBy2, yb))
    box(r(X.rBy2, Y.depBottom, X.rTo3, yb))
    box(r(X.rTo3, Y.depBottom, MID, yb))
    box(r(MID, Y.depBottom, X.curr, yb))
    box(r(X.curr, Y.depBottom, X.chgs, yb))
    box(r(X.chgs, Y.depBottom, X.otherEnd, yb))   // WT/VAL + Other (sub-divided below)
    box(r(X.otherEnd, Y.depBottom, X.declCustoms, yb))
    box(r(X.declCustoms, Y.depBottom, R, yb))
    push({ key: 'routeTo1', ...cellIn(r(L, Y.depBottom, X.rTo1, yb), 2), fontSize: XS, label: 'To' })
    push({ key: 'routeBy1', ...cellIn(r(X.rTo1, Y.depBottom, X.rBy1, yb), 2), fontSize: XS, label: 'By First Carrier' })
    push({ key: 'routeTo2', ...cellIn(r(X.rBy1, Y.depBottom, X.rTo2, yb), 2), fontSize: XS, label: 'to' })
    push({ key: 'routeBy2', ...cellIn(r(X.rTo2, Y.depBottom, X.rBy2, yb), 2), fontSize: XS, label: 'by' })
    push({ key: 'routeTo3', ...cellIn(r(X.rBy2, Y.depBottom, X.rTo3, yb), 2), fontSize: XS, label: 'to' })
    push({ key: 'routeBy3', ...cellIn(r(X.rTo3, Y.depBottom, MID, yb), 2), fontSize: XS, label: 'by' })
    push({ key: 'currency', ...cellIn(r(MID, Y.depBottom, X.curr, yb), 2), fontSize: XS, label: 'Currency' })
    // CHGS Code (own narrow cell, stacked) + WT/VAL & Other with PPD/COLL sub-columns and X marks below
    text(X.curr + 1, Y.depBottom + 2, X.chgs - X.curr - 2, 12, 4, 'CHGS\nCode', 1.2)
    // sub-column dividers within [chgs..otherEnd]
    for (const vx of [X.wtvalMid, X.wtvalEnd, X.otherMid]) {
      boxes.push({ x: vx, y: Y.depBottom, width: 0, height: yb - Y.depBottom, borderRight: true })
    }
    text(X.chgs + 1, Y.depBottom + 2, X.wtvalEnd - X.chgs - 1, 6, 4, 'WT/VAL', 1)
    text(X.wtvalEnd + 1, Y.depBottom + 2, X.otherEnd - X.wtvalEnd - 1, 6, 4, 'Other', 1)
    // PPD / COLL sub-labels, one per quarter cell
    text(X.chgs, Y.depBottom + 8, X.wtvalMid - X.chgs, 5, 3.4, 'PPD')
    text(X.wtvalMid, Y.depBottom + 8, X.wtvalEnd - X.wtvalMid, 5, 3.4, 'COLL')
    text(X.wtvalEnd, Y.depBottom + 8, X.otherMid - X.wtvalEnd, 5, 3.4, 'PPD')
    text(X.otherMid, Y.depBottom + 8, X.otherEnd - X.otherMid, 5, 3.4, 'COLL')
    // X marks sit in their own row below the PPD/COLL labels
    push({ key: 'wtValPPD',  x: X.chgs, y: Y.depBottom + 14, width: X.wtvalMid - X.chgs, height: 9, fontSize: XS, align: 'center' })
    push({ key: 'wtValCOLL', x: X.wtvalMid, y: Y.depBottom + 14, width: X.wtvalEnd - X.wtvalMid, height: 9, fontSize: XS, align: 'center' })
    push({ key: 'otherPPD',  x: X.wtvalEnd, y: Y.depBottom + 14, width: X.otherMid - X.wtvalEnd, height: 9, fontSize: XS, align: 'center' })
    push({ key: 'otherCOLL', x: X.otherMid, y: Y.depBottom + 14, width: X.otherEnd - X.otherMid, height: 9, fontSize: XS, align: 'center' })
    push({ key: 'declaredValueCarriage', ...cellIn(r(X.otherEnd, Y.depBottom, X.declCustoms, yb), 2), fontSize: XS, label: 'Declared Value for Carriage' })
    push({ key: 'declaredValueCustoms', ...cellIn(r(X.declCustoms, Y.depBottom, R, yb), 2), fontSize: XS, label: 'Declared Value for Customs' })
  }

  // ── Destination / Flight / Insurance (y 294–318) ──
  box(r(L, Y.routeBottom, X.destFlight, Y.destBottom))
  box(r(X.destFlight, Y.routeBottom, X.flightEnd, Y.destBottom))
  box(r(X.flightEnd, Y.routeBottom, X.insAmtEnd, Y.destBottom))
  box(r(X.insAmtEnd, Y.routeBottom, R, Y.destBottom))
  push({ key: 'airportOfDestination', ...cellIn(r(L, Y.routeBottom, X.destFlight, Y.destBottom), 3), fontSize: XS, label: 'Airport of Destination' })
  push({ key: 'flightNumber', ...cellIn(r(X.destFlight, Y.routeBottom, X.flightEnd, Y.destBottom), 3), fontSize: XS, label: 'Requested Flight/Date' })
  push({ key: 'insuranceAmount', ...cellIn(r(X.flightEnd, Y.routeBottom, X.insAmtEnd, Y.destBottom), 3), fontSize: XS, label: 'Amount of Insurance', align: 'center' })
  text(X.insAmtEnd + 3, Y.routeBottom + 2, R - X.insAmtEnd - 6, Y.destBottom - Y.routeBottom - 4, 4.4, INSURANCE_TEXT, 1.3)

  // ── Handling Information / SCI (y 318–366) ──
  box(r(L, Y.destBottom, X.sci, Y.handlingBottom))
  box(r(X.sci, Y.destBottom, R, Y.handlingBottom))
  push({ key: 'handlingInformation', ...cellIn(r(L, Y.destBottom, X.sci, Y.handlingBottom), 3), fontSize: TXT, label: 'Handling Information', multiline: true, maxLines: 4 })
  push({ key: 'sci', ...cellIn(r(X.sci, Y.destBottom, R, Y.handlingBottom), 3), fontSize: TXT, label: 'SCI' })

  // ── Rate table (header y 366–390, rows 390–534, carry 534–558) ──
  {
    const cols = [L, X.cPcs, X.cGw, X.cRateClass, X.cChg, X.cRate, X.cTotal, R]
    const headers = [
      'No. of\nPieces\nRCP', 'Gross Weight\nkg lb', 'Rate Class\nCommodity\nItem No.',
      'Chargeable\nWeight', 'Rate    Charge', 'Total', 'Nature and Quantity of Goods\n(incl. Dimensions or Volume)',
    ]
    // header row
    box(r(L, Y.handlingBottom, R, Y.rateHdrBottom))
    for (let c = 1; c < cols.length - 1; c++) {
      boxes.push({ x: cols[c], y: Y.handlingBottom, width: 0, height: Y.rateHdrBottom - Y.handlingBottom, borderRight: true })
    }
    headers.forEach((h, i) => text(cols[i] + 2, Y.handlingBottom + 2, cols[i + 1] - cols[i] - 4, Y.rateHdrBottom - Y.handlingBottom - 4, 4.6, h, 1.15))

    // data rows
    const rowH = (Y.rateRowsBottom - Y.rateHdrBottom) / RATE_ROWS
    for (let i = 0; i < RATE_ROWS; i++) {
      const ry = Y.rateHdrBottom + i * rowH
      box(r(L, ry, R, ry + rowH), { borderLeft: true, borderRight: true, borderBottom: true })
      for (let c = 1; c < cols.length - 1; c++) {
        boxes.push({ x: cols[c], y: ry, width: 0, height: rowH, borderRight: true })
      }
      const cy = ry + 2
      push({ key: `rateItems.${i}.pieces`, x: cols[0] + 2, y: cy, width: cols[1] - cols[0] - 4, height: rowH - 4, fontSize: TXT, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.grossWeight`, x: cols[1] + 2, y: cy, width: cols[2] - cols[1] - 4, height: rowH - 4, fontSize: TXT, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.rateClass`, x: cols[2] + 2, y: cy, width: cols[3] - cols[2] - 4, height: rowH - 4, fontSize: TXT, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.chargeableWeight`, x: cols[3] + 2, y: cy, width: cols[4] - cols[3] - 4, height: rowH - 4, fontSize: TXT, align: 'center', rowTemplate: true })
      push({ key: `rateItems.${i}.rateCharge`, x: cols[4] + 2, y: cy, width: cols[5] - cols[4] - 4, height: rowH - 4, fontSize: TXT, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.total`, x: cols[5] + 2, y: cy, width: cols[6] - cols[5] - 4, height: rowH - 4, fontSize: TXT, align: 'right', rowTemplate: true })
      push({ key: `rateItems.${i}.natureAndQuantity`, x: cols[6] + 2, y: cy, width: cols[7] - cols[6] - 4, height: rowH - 4, fontSize: TXT, multiline: true, maxLines: 3, rowTemplate: true })
    }
    // carry-forward subtotal row
    box(r(L, Y.rateRowsBottom, R, Y.rateCarryBottom), { borderLeft: true, borderRight: true, borderBottom: true })
    for (let c = 1; c < cols.length - 1; c++) {
      boxes.push({ x: cols[c], y: Y.rateRowsBottom, width: 0, height: Y.rateCarryBottom - Y.rateRowsBottom, borderRight: true })
    }
  }

  // ── Charges left column (y 558–702) ──
  // Three logical sub-columns: Prepaid [57–158] | Collect [158–259].
  {
    const lx = L, midx = X.chgPpdEnd, rx = X.chgCollEnd
    const rows = [
      { y0: Y.rateCarryBottom, y1: Y.chgRow1, label: '' },          // weight charge (special header)
      { y0: Y.chgRow1, y1: Y.chgRow2, label: 'Valuation Charge' },
      { y0: Y.chgRow2, y1: Y.chgRow3, label: 'Tax' },
      { y0: Y.chgRow3, y1: Y.chgRow4, label: 'Total Other Charges Due Agent' },
      { y0: Y.chgRow4, y1: Y.chgRow5, label: 'Total Other Charges Due Carrier' },
    ]
    rows.forEach((row) => {
      box(r(lx, row.y0, midx, row.y1))
      box(r(midx, row.y0, rx, row.y1))
    })
    // weight-charge header row sub-labels
    text(lx + 2, Y.rateCarryBottom + 1, midx - lx - 4, 8, 4.6, 'Prepaid')
    text(midx + 2, Y.rateCarryBottom + 1, rx - midx - 4, 8, 4.6, 'Collect')
    text(lx + 2, Y.rateCarryBottom + 8, rx - lx - 4, 8, 4.6, 'Weight Charge')
    push({ key: 'weightChargePPD',  x: lx + 2, y: Y.rateCarryBottom + 14, width: midx - lx - 4, height: 11, fontSize: TXT })
    push({ key: 'weightChargeCOLL', x: midx + 2, y: Y.rateCarryBottom + 14, width: rx - midx - 4, height: 11, fontSize: TXT })
    // other rows: centered label at top + PPD/COLL values
    const valFields: Record<string, [string, string]> = {
      'Valuation Charge': ['valuationChargePPD', 'valuationChargeCOLL'],
      'Tax': ['taxPPD', 'taxCOLL'],
    }
    rows.slice(1).forEach((row) => {
      text(lx + 2, row.y0 + 1, rx - lx - 4, 8, 4.6, row.label)
      const vf = valFields[row.label]
      if (vf) {
        push({ key: vf[0] as FieldKey, x: lx + 2, y: row.y0 + 12, width: midx - lx - 4, height: 11, fontSize: TXT })
        push({ key: vf[1] as FieldKey, x: midx + 2, y: row.y0 + 12, width: rx - midx - 4, height: 11, fontSize: TXT })
      }
    })
    push({ key: 'totalOtherChargesDueAgent', x: lx + 2, y: Y.chgRow3 + 12, width: midx - lx - 4, height: 11, fontSize: TXT })
    push({ key: 'totalOtherChargesDueCarrier', x: midx + 2, y: Y.chgRow4 + 12, width: rx - midx - 4, height: 11, fontSize: TXT })
  }

  // ── Other Charges (right column, y 558–630) + shipper cert + signature (630–702) ──
  {
    const ox = X.chgCollEnd
    box(r(ox, Y.rateCarryBottom, R, Y.chgRow3))           // other charges box
    box(r(ox, Y.chgRow3, R, Y.chgRow5))                   // shipper certification box
    box(r(ox, Y.chgRow5, R, Y.chgBottom))                 // signature box
    text(ox + 4, Y.rateCarryBottom + 1, R - ox - 8, 8, 4.6, 'Other Charges')
    const top = Y.rateCarryBottom + 10
    const rowH = (Y.chgRow3 - top) / OTHER_CHARGE_ROWS
    for (let i = 0; i < OTHER_CHARGE_ROWS; i++) {
      const ry = top + i * rowH
      push({ key: `otherCharges.${i}.description`, x: ox + 4, y: ry, width: 150, height: rowH, fontSize: TXT, rowTemplate: true })
      push({ key: `otherCharges.${i}.amount`, x: R - 90, y: ry, width: 86, height: rowH, fontSize: TXT, align: 'right', rowTemplate: true })
    }
    // IATA Res. 600a: the part from "insofar…" (dangerous goods) must be printed in bold.
    text(ox + 4, Y.chgRow3 + 2, R - ox - 8, Y.chgRow5 - Y.chgRow3 - 4, 4.6, SHIPPER_CERT, 1.32, 'insofar')
    push({ key: 'signatureShipper', x: ox + 4, y: Y.chgRow5 + 4, width: R - ox - 8, height: 10, fontSize: TXT, align: 'center' })
    text(ox + 4, Y.chgBottom - 9, R - ox - 8, 8, 4.6, 'Signature of Shipper or his Agent')
  }

  // ── Totals (y 702–726) ──
  box(r(L, Y.chgBottom, X.botCharges, Y.totalsBottom))
  box(r(X.botCharges, Y.chgBottom, X.botCollect, Y.totalsBottom))
  box(r(X.botCollect, Y.chgBottom, R, Y.totalsBottom))
  push({ key: 'totalPrepaid', ...cellIn(r(L, Y.chgBottom, X.botCharges, Y.totalsBottom), 3), fontSize: TXT, label: 'Total Prepaid' })
  push({ key: 'totalCollect', ...cellIn(r(X.botCharges, Y.chgBottom, X.botCollect, Y.totalsBottom), 3), fontSize: TXT, label: 'Total Collect' })

  // ── Currency conversion / Execution (y 726–750) ──
  box(r(L, Y.totalsBottom, X.botCharges, Y.ccBottom))
  box(r(X.botCharges, Y.totalsBottom, X.botCollect, Y.ccBottom))
  box(r(X.botCollect, Y.totalsBottom, R, Y.ccBottom))
  push({ key: 'currencyConversionRates', ...cellIn(r(L, Y.totalsBottom, X.botCharges, Y.ccBottom), 3), fontSize: XS, label: 'Currency Conversion Rates' })
  push({ key: 'ccChargesInDestCurrency', ...cellIn(r(X.botCharges, Y.totalsBottom, X.botCollect, Y.ccBottom), 3), fontSize: XS, label: 'CC Charges in Dest. Currency' })
  push({ key: 'executedOnDate', ...cellIn(r(X.botCollect, Y.totalsBottom, X.execPlace, Y.ccBottom), 3), fontSize: TXT, label: 'Executed on (date)' })
  push({ key: 'executedAtPlace', ...cellIn(r(X.execPlace, Y.totalsBottom, X.execSig, Y.ccBottom), 3), fontSize: TXT, label: 'at (place)' })
  push({ key: 'signatureCarrier', x: X.execSig + 4, y: Y.totalsBottom + 4, width: R - X.execSig - 8, height: 14, fontSize: TXT, align: 'center' })
  text(X.execSig + 4, Y.ccBottom - 9, R - X.execSig - 8, 8, 4.4, 'Signature of Issuing Carrier or its Agent')

  // ── Bottom row (y 750–774) ──
  box(r(L, Y.ccBottom, X.botCharges, Y.bottomBottom))
  box(r(X.botCharges, Y.ccBottom, X.botCollect, Y.bottomBottom))
  box(r(X.botCollect, Y.ccBottom, X.botCopy, Y.bottomBottom))
  box(r(X.botCopy, Y.ccBottom, R, Y.bottomBottom))
  text(L + 4, Y.ccBottom + 3, X.botCharges - L - 8, 18, 4.6, "For Carrier's Use only\nat Destination")
  push({ key: 'chargesAtDestination', ...cellIn(r(X.botCharges, Y.ccBottom, X.botCollect, Y.bottomBottom), 3), fontSize: XS, label: 'Charges at Destination' })
  push({ key: 'totalCollectCharges', ...cellIn(r(X.botCollect, Y.ccBottom, X.botCopy, Y.bottomBottom), 3), fontSize: XS, label: 'Total Collect Charges' })
  // copy label + repeated AWB number drawn dynamically by AWBDocument in [botCopy..R]

  return { fields, boxes, staticTexts }
}

function rectIn(rect: Rect, pad = 4): { x: number; y: number; width: number; height: number } {
  return { x: rect.x + pad, y: rect.y + pad, width: rect.width - pad * 2, height: rect.height - pad * 2 }
}

function cellIn(rect: Rect, pad = 4) {
  return rectIn(rect, pad)
}

const IATA_CONDITIONS =
  'It is agreed that the goods described herein are accepted in apparent good order and condition (except as noted) for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER CARRIER UNLESS SPECIFIC CONTRARY INSTRUCTIONS ARE GIVEN HEREON BY THE SHIPPER, AND SHIPPER AGREES THAT THE SHIPMENT MAY BE CARRIED VIA INTERMEDIATE STOPPING PLACES WHICH THE CARRIER DEEMS APPROPRIATE. THE SHIPPER\'S ATTENTION IS DRAWN TO THE NOTICE CONCERNING CARRIER\'S LIMITATION OF LIABILITY. Shipper may increase such limitation of liability by declaring a higher value for carriage and paying a supplemental charge if required.'

const INSURANCE_TEXT =
  'INSURANCE – If carrier offers insurance, and such insurance is requested in accordance with the conditions thereof, indicate amount to be insured in figures in box marked "Amount of Insurance".'

const SHIPPER_CERT =
  'Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to the applicable Dangerous Goods Regulations.'

const built = buildLayout()

export const AWB_LAYOUT: FieldDef[] = built.fields
export const AWB_BOXES: BoxDef[] = built.boxes
export const STATIC_TEXT_BLOCKS: StaticTextDef[] = built.staticTexts

/**
 * Expand row-template entries to match the actual number of rate items / other
 * charges in the data, dropping unused template rows beyond what's needed and
 * keeping the table area visually fixed (extra rows beyond RATE_ROWS /
 * OTHER_CHARGE_ROWS clip in the PDF — same as a real airline form).
 */
export function getFieldDefs(rateItemCount: number, otherChargeCount: number): FieldDef[] {
  return AWB_LAYOUT.filter((f) => {
    const m = /^rateItems\.(\d+)\./.exec(f.key as string)
    if (m) return Number(m[1]) < Math.max(rateItemCount, RATE_ROWS)
    const m2 = /^otherCharges\.(\d+)\./.exec(f.key as string)
    if (m2) return Number(m2[1]) < Math.max(otherChargeCount, OTHER_CHARGE_ROWS)
    return true
  })
}

/** Immutable update of a (possibly nested dot-path) field, mirroring `set(key) -> onChange({...data, [key]: val})`. */
export function setNestedField(data: AWBData, key: FieldKey, value: string | boolean): AWBData {
  const rateMatch = /^rateItems\.(\d+)\.(.+)$/.exec(key as string)
  if (rateMatch) {
    const idx = Number(rateMatch[1])
    const prop = rateMatch[2] as keyof RateItem
    const rateItems = data.rateItems.map((item, i) => (i === idx ? { ...item, [prop]: value } : item))
    return { ...data, rateItems }
  }
  const chargeMatch = /^otherCharges\.(\d+)\.(.+)$/.exec(key as string)
  if (chargeMatch) {
    const idx = Number(chargeMatch[1])
    const prop = chargeMatch[2] as keyof OtherCharge
    const otherCharges = data.otherCharges.map((item, i) => (i === idx ? { ...item, [prop]: value } : item))
    return { ...data, otherCharges }
  }
  return { ...data, [key as keyof AWBData]: value }
}
