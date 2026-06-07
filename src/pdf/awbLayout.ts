import { AWBData, RateItem, OtherCharge } from '../types/awb'

/**
 * Shared coordinate schema for the AWB document — consumed by both the PDF
 * renderer (AWBDocument) and the HTML input overlay (AWBOverlay), so they
 * can never drift out of alignment.
 *
 * Coordinates are in PDF points on an A4 page (595.28 x 841.89, used here as
 * 595 x 842). Derived from the flex layout in AWBDocument at k=1.0 / userScale
 * 'lg' — i.e. the existing proportions and minHeights are "frozen" into fixed
 * boxes rather than measured from scratch, preserving the validated visual design
 * while making every box a fixed size (which is also how real IATA AWBs work:
 * carriers fit/clip text into fixed boxes, the form never reflows).
 */

export const PAGE_WIDTH = 595
export const PAGE_HEIGHT = 842
export const PAGE_PADDING = 12

const CONTENT_X = PAGE_PADDING
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2

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

/** Split a horizontal band into adjacent cells by flex ratio (mirrors flexDirection: 'row'). */
function hsplit(x: number, y: number, width: number, height: number, flexes: number[]): Rect[] {
  const total = flexes.reduce((a, b) => a + b, 0)
  const rects: Rect[] = []
  let cursor = x
  for (const f of flexes) {
    const w = (width * f) / total
    rects.push({ x: cursor, y, width: w, height })
    cursor += w
  }
  return rects
}

/** Split a horizontal band into adjacent cells of fixed widths, with one flexible remainder cell. */
function hsplitFixed(x: number, y: number, totalWidth: number, height: number, widths: (number | 'auto')[]): Rect[] {
  const fixedSum = widths.filter((w): w is number => w !== 'auto').reduce((a, b) => a + b, 0)
  const autoCount = widths.filter((w) => w === 'auto').length
  const autoWidth = autoCount > 0 ? (totalWidth - fixedSum) / autoCount : 0
  const rects: Rect[] = []
  let cursor = x
  for (const w of widths) {
    const ww = w === 'auto' ? autoWidth : w
    rects.push({ x: cursor, y, width: ww, height })
    cursor += ww
  }
  return rects
}

// ── Row heights (frozen from AWBDocument minHeights / measured sizes at k=1.0) ──
const H_HEADER = 22
const H_SEC1 = 76
const H_SEC2 = 66
const H_AGENT = 34
const H_IATA = 24
const H_DEPARTURE = 24
const H_ROUTING = 36
const H_DEST = 30
const H_HANDLING = 24
const H_RATE_HEADER = 26
const H_RATE_ROW = 18
const RATE_ROWS = 5 // fixed visible rows in the table (matches current pad-to-5 behavior)
const H_RATE_TOTALS = 16
const H_CHARGES = 76
const OTHER_CHARGE_ROWS = 6 // fixed visible rows for "Other Charges" mini-table
const H_TOTALS = 22
const H_CC = 34
const H_BOTTOM = 22
const H_FOOTER = 16

const LBL = 6.0
const TXT = 8.5
const XS = 5.5

const COL = {
  pcs: 28, gw: 40, rc: 38, cw: 40, rate: 46, total: 52,
}

export type BoxDef = Rect & { borderTop?: boolean; borderBottom?: boolean; borderLeft?: boolean; borderRight?: boolean }
export type StaticTextDef = { key: string; x: number; y: number; width: number; height: number; fontSize: number; lineHeight: number; text: string }

const fullBorder = { borderTop: true, borderBottom: true, borderLeft: true, borderRight: true }

function buildLayout(): { fields: FieldDef[]; boxes: BoxDef[]; staticTexts: StaticTextDef[] } {
  const fields: FieldDef[] = []
  const boxes: BoxDef[] = []
  const staticTexts: StaticTextDef[] = []
  const push = (f: FieldDef) => fields.push(f)
  const box = (r: Rect, borders: Partial<BoxDef> = fullBorder) => boxes.push({ ...r, ...borders })
  let y = PAGE_PADDING

  // ── Header: AWB number ──
  // Real IATA format: [prefix][airport][serial] on left, [full number prominently] on right
  {
    const r = hsplitFixed(CONTENT_X, y, CONTENT_WIDTH, H_HEADER, [46, 40, 120, 'auto'])
    box(r[0]); box(r[1]); box(r[2])
    // r[3] = auto-width area on the right, no border, shows full AWB number prominently
    push({ key: 'awbPrefix',      ...rectIn(r[0], 3), fontSize: 12, align: 'center', label: 'Prefix' })
    push({ key: 'awbAirportCode', ...rectIn(r[1], 3), fontSize: 12, align: 'center', label: 'Airport' })
    push({ key: 'awbSerial',      ...rectIn(r[2], 3), fontSize: 12, align: 'left',   label: 'Serial' })
    // Full AWB number on the right is rendered directly in AWBDocument (dynamic value)
    y += H_HEADER
  }

  // ── Section 1: Shipper / Not Negotiable ──
  {
    const [shipperCol, notNeg] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_SEC1, [1.35, 1.8])
    const shipperNameH = H_SEC1 - 22
    const shipperName = { x: shipperCol.x, y: shipperCol.y, width: shipperCol.width, height: shipperNameH }
    const shipperAcct = { x: shipperCol.x, y: shipperCol.y + shipperNameH, width: shipperCol.width, height: 22 }
    box(shipperName)
    box(shipperAcct)
    box(notNeg)
    push({
      key: 'shipperNameAndAddress', x: shipperCol.x + 4, y: shipperCol.y + 4,
      width: shipperCol.width - 8, height: shipperNameH - 8, fontSize: TXT,
      label: "Shipper's Name and Address", multiline: true, maxLines: 4,
    })
    push({
      key: 'shipperAccountNumber', x: shipperCol.x + 4, y: shipperCol.y + shipperNameH + 4,
      width: shipperCol.width - 8, height: 22 - 8, fontSize: TXT,
      label: "Shipper's Account Number",
    })
    push({
      key: 'carrierName', x: notNeg.x + 5, y: notNeg.y + 28,
      width: notNeg.width - 10, height: 12, fontSize: TXT, label: 'Issued by',
    })
    push({
      key: 'carrierAddress', x: notNeg.x + 5, y: notNeg.y + 40,
      width: notNeg.width - 10, height: 12, fontSize: TXT,
    })
    staticTexts.push({
      key: 'awbTitle', x: notNeg.x + 5, y: notNeg.y + 5, width: notNeg.width - 10, height: 24,
      fontSize: 17, lineHeight: 1.2, text: 'Air Waybill',
    })
    staticTexts.push({
      key: 'copiesNotice', x: notNeg.x + 5, y: notNeg.y + H_SEC1 - 16, width: notNeg.width - 10, height: 14,
      fontSize: XS, lineHeight: 1.3, text: 'Copies 1, 2 and 3 of this Air Waybill are originals and have the same validity.',
    })
    y += H_SEC1
  }

  // ── Section 2: Consignee / Conditions ──
  {
    const [consigneeCol, conditions] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_SEC2, [1.35, 1.8])
    const consigneeNameH = H_SEC2 - 22
    const consigneeName = { x: consigneeCol.x, y: consigneeCol.y, width: consigneeCol.width, height: consigneeNameH }
    const consigneeAcct = { x: consigneeCol.x, y: consigneeCol.y + consigneeNameH, width: consigneeCol.width, height: 22 }
    box(consigneeName)
    box(consigneeAcct)
    box(conditions)
    push({
      key: 'consigneeNameAndAddress', x: consigneeCol.x + 4, y: consigneeCol.y + 4,
      width: consigneeCol.width - 8, height: consigneeNameH - 8, fontSize: TXT,
      label: "Consignee's Name and Address", multiline: true, maxLines: 4,
    })
    push({
      key: 'consigneeAccountNumber', x: consigneeCol.x + 4, y: consigneeCol.y + consigneeNameH + 4,
      width: consigneeCol.width - 8, height: 22 - 8, fontSize: TXT,
      label: "Consignee's Account Number",
    })
    staticTexts.push({
      key: 'iataConditions', x: conditions.x + 4, y: conditions.y + 4, width: conditions.width - 8, height: conditions.height - 8,
      fontSize: XS, lineHeight: 1.5, text: IATA_CONDITIONS,
    })
    y += H_SEC2
  }

  // ── Section 3: Agent / Accounting ──
  {
    const [agent, accounting] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_AGENT, [1.5, 2])
    box(agent)
    box(accounting)
    push({ key: 'agentNameAndCity', ...cellIn(agent), fontSize: TXT, label: "Issuing Carrier's Agent Name and City", multiline: true, maxLines: 2 })
    push({ key: 'accountingInformation', ...cellIn(accounting), fontSize: TXT, label: 'Accounting Information', multiline: true, maxLines: 2 })
    y += H_AGENT
  }

  // ── Section 4: IATA Code / Account No ──
  {
    const [iata, acct] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_IATA, [1, 0.8])
    box(iata)
    box(acct)
    push({ key: 'agentIataCode', ...cellIn(iata), fontSize: TXT, label: "Agent's IATA Code" })
    push({ key: 'agentAccountNumber', ...cellIn(acct), fontSize: TXT, label: 'Account No.' })
    y += H_IATA
  }

  // ── Section 5: Departure / Reference / Optional ──
  {
    const [dep, ref, opt] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_DEPARTURE, [2, 1.5, 1.5])
    box(dep); box(ref); box(opt)
    push({ key: 'airportOfDeparture', ...cellIn(dep), fontSize: TXT, label: 'Airport of Departure (Addr. of First Carrier) and Requested Routing' })
    push({ key: 'referenceNumber', ...cellIn(ref), fontSize: TXT, label: 'Reference Number' })
    push({ key: 'optionalShippingInfo', ...cellIn(opt), fontSize: TXT, label: 'Optional Shipping Information' })
    y += H_DEPARTURE
  }

  // ── Section 6: Routing grid ──
  {
    const widths: (number | 'auto')[] = [28, 34, 38, 26, 26, 26, 26, 30, 20, 40, 40, 'auto', 'auto']
    const r = hsplitFixed(CONTENT_X, y, CONTENT_WIDTH, H_ROUTING, widths)
    r.forEach((cell) => box(cell))
    push({ key: 'routeTo1', ...cellIn(r[0], 2), fontSize: XS, label: 'To' })
    push({ key: 'routeBy1', ...cellIn(r[1], 2), fontSize: XS, label: 'By First Carrier' })
    push({
      key: 'static:routingLabel', x: r[2].x + 2, y: r[2].y + 2, width: r[2].width - 4, height: r[2].height - 4,
      fontSize: XS, readOnly: true, staticText: 'Routing and Destination',
    })
    push({ key: 'routeTo2', ...cellIn(r[3], 2), fontSize: XS, label: 'to' })
    push({ key: 'routeBy2', ...cellIn(r[4], 2), fontSize: XS, label: 'by' })
    push({ key: 'routeTo3', ...cellIn(r[5], 2), fontSize: XS, label: 'to' })
    push({ key: 'routeBy3', ...cellIn(r[6], 2), fontSize: XS, label: 'by' })
    push({ key: 'currency', ...cellIn(r[7], 2), fontSize: XS, label: 'Currency' })
    push({
      key: 'static:chgsCode', x: r[8].x + 2, y: r[8].y + 2, width: r[8].width - 4, height: r[8].height - 4,
      fontSize: XS, readOnly: true, staticText: 'CHGS\nCode',
    })
    push({ key: 'wtValPPD', x: r[9].x + 4, y: r[9].y + 14, width: 16, height: 12, fontSize: XS, label: 'PPD', align: 'center' })
    push({ key: 'wtValCOLL', x: r[9].x + 20, y: r[9].y + 14, width: 16, height: 12, fontSize: XS, label: 'COLL', align: 'center' })
    push({
      key: 'static:wtValLabel', x: r[9].x + 2, y: r[9].y + 2, width: r[9].width - 4, height: 10,
      fontSize: XS, readOnly: true, staticText: 'WT/VAL',
    })
    push({ key: 'otherPPD', x: r[10].x + 4, y: r[10].y + 14, width: 16, height: 12, fontSize: XS, label: 'PPD', align: 'center' })
    push({ key: 'otherCOLL', x: r[10].x + 20, y: r[10].y + 14, width: 16, height: 12, fontSize: XS, label: 'COLL', align: 'center' })
    push({
      key: 'static:otherLabel', x: r[10].x + 2, y: r[10].y + 2, width: r[10].width - 4, height: 10,
      fontSize: XS, readOnly: true, staticText: 'Other',
    })
    push({ key: 'declaredValueCarriage', ...cellIn(r[11], 2), fontSize: XS, label: 'Declared Value for Carriage' })
    push({ key: 'declaredValueCustoms', ...cellIn(r[12], 2), fontSize: XS, label: 'Declared Value for Customs' })
    y += H_ROUTING
  }

  // ── Section 7: Destination / Flight / Insurance ──
  {
    const [dest, flight, insAmt, insTxt] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_DEST, [1, 1, 0.5, 2.2])
    box(dest); box(flight); box(insAmt); box(insTxt)
    push({ key: 'airportOfDestination', ...cellIn(dest), fontSize: TXT, label: 'Airport of Destination' })
    push({ key: 'flightNumber', ...cellIn(flight), fontSize: TXT, label: 'Requested Flight/Date' })
    push({ key: 'insuranceAmount', ...cellIn(insAmt, 3), fontSize: TXT, label: 'Amount of Insurance', align: 'center' })
    staticTexts.push({
      key: 'insuranceText', x: insTxt.x + 3, y: insTxt.y + 3, width: insTxt.width - 6, height: insTxt.height - 6,
      fontSize: XS, lineHeight: 1.5, text: INSURANCE_TEXT,
    })
    y += H_DEST
  }

  // ── Section 8: Handling / SCI ──
  {
    const [handling, sci] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_HANDLING, [4, 0.7])
    box(handling); box(sci)
    push({ key: 'handlingInformation', ...cellIn(handling), fontSize: TXT, label: 'Handling Information', multiline: true, maxLines: 2 })
    push({ key: 'sci', ...cellIn(sci), fontSize: TXT, label: 'SCI' })
    y += H_HANDLING
  }

  // ── Rate table ──
  const rateColWidths: (number | 'auto')[] = [COL.pcs, COL.gw, COL.rc, COL.cw, COL.rate, COL.total, 'auto']
  const rateHeaderLabels = ['No. of\nPieces\nRCP', 'Gross\nWeight\nkg / lb', 'Rate Class\nCommodity\nItem No.', 'Chargeable\nWeight', 'Rate\nCharge', 'Total', 'Nature and Quantity of Goods\n(incl. Dimensions or Volume)']
  {
    const hdr = hsplitFixed(CONTENT_X, y, CONTENT_WIDTH, H_RATE_HEADER, rateColWidths)
    box({ x: CONTENT_X, y, width: CONTENT_WIDTH, height: H_RATE_HEADER })
    hdr.forEach((cell, i) => {
      staticTexts.push({
        key: `rateHeader${i}`, x: cell.x + 2, y: cell.y + 2, width: cell.width - 4, height: cell.height - 4,
        fontSize: XS, lineHeight: 1.2, text: rateHeaderLabels[i],
      })
    })
  }
  const rateTableTop = y + H_RATE_HEADER
  for (let i = 0; i < RATE_ROWS; i++) {
    const rowY = rateTableTop + i * H_RATE_ROW
    const r = hsplitFixed(CONTENT_X, rowY, CONTENT_WIDTH, H_RATE_ROW, rateColWidths)
    box({ x: CONTENT_X, y: rowY, width: CONTENT_WIDTH, height: H_RATE_ROW }, { borderBottom: true, borderLeft: true, borderRight: true })
    push({ key: `rateItems.${i}.pieces`, ...cellIn(r[0]), fontSize: TXT, align: 'center', rowTemplate: true })
    push({ key: `rateItems.${i}.grossWeight`, ...cellIn(r[1]), fontSize: TXT, align: 'center', rowTemplate: true })
    push({ key: `rateItems.${i}.rateClass`, ...cellIn(r[2]), fontSize: TXT, align: 'center', rowTemplate: true })
    push({ key: `rateItems.${i}.chargeableWeight`, ...cellIn(r[3]), fontSize: TXT, align: 'center', rowTemplate: true })
    push({ key: `rateItems.${i}.rateCharge`, ...cellIn(r[4]), fontSize: TXT, align: 'right', rowTemplate: true })
    push({ key: `rateItems.${i}.total`, ...cellIn(r[5]), fontSize: TXT, align: 'right', rowTemplate: true })
    push({ key: `rateItems.${i}.natureAndQuantity`, ...cellIn(r[6]), fontSize: TXT, rowTemplate: true })
  }
  box({ x: CONTENT_X, y: rateTableTop + RATE_ROWS * H_RATE_ROW, width: CONTENT_WIDTH, height: H_RATE_TOTALS })
  y = rateTableTop + RATE_ROWS * H_RATE_ROW + H_RATE_TOTALS

  // ── Charges section ──
  {
    const [chargesLeft, chargesRight] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_CHARGES, [1, 2.2])
    box(chargesLeft, { borderLeft: true })
    box(chargesRight, fullBorder)
    const chgRowH = 10
    const leftFields: { key: FieldKey; row: number; col: 'label' | 'value' }[] = [
      { key: 'weightChargePPD', row: 1, col: 'label' },
      { key: 'weightChargeCOLL', row: 1, col: 'value' },
      { key: 'valuationChargePPD', row: 3, col: 'label' },
      { key: 'valuationChargeCOLL', row: 3, col: 'value' },
      { key: 'taxPPD', row: 5, col: 'label' },
      { key: 'taxCOLL', row: 5, col: 'value' },
      { key: 'totalOtherChargesDueAgent', row: 7, col: 'label' },
      { key: 'totalOtherChargesDueCarrier', row: 9, col: 'value' },
    ]
    const labels: Record<string, string> = {
      weightChargePPD: 'Prepaid Weight Charge', weightChargeCOLL: 'Collect Weight Charge',
      valuationChargePPD: 'Valuation Charge (Prepaid)', valuationChargeCOLL: 'Valuation Charge (Collect)',
      taxPPD: 'Tax (Prepaid)', taxCOLL: 'Tax (Collect)',
      totalOtherChargesDueAgent: 'Total Other Charges Due Agent', totalOtherChargesDueCarrier: 'Total Other Charges Due Carrier',
    }
    for (const f of leftFields) {
      const [labelCell, valueCell] = hsplit(chargesLeft.x, chargesLeft.y + f.row * chgRowH, chargesLeft.width, chgRowH, [1, 1])
      const cell = f.col === 'label' ? labelCell : valueCell
      push({ key: f.key, ...cellIn(cell, 2), fontSize: TXT, label: labels[f.key as string] })
    }

    // Other charges mini-table
    const otherChargesTop = chargesRight.y + 10
    staticTexts.push({
      key: 'otherChargesLabel', x: chargesRight.x + 2, y: chargesRight.y + 1, width: chargesRight.width - 4, height: 9,
      fontSize: XS, lineHeight: 1.2, text: 'Other Charges',
    })
    for (let i = 0; i < OTHER_CHARGE_ROWS; i++) {
      const rowY = otherChargesTop + i * chgRowH
      const [descCell, amtCell] = hsplit(chargesRight.x, rowY, chargesRight.width, chgRowH, [2, 1])
      push({ key: `otherCharges.${i}.description`, ...cellIn(descCell, 2), fontSize: TXT, rowTemplate: true })
      push({ key: `otherCharges.${i}.amount`, ...cellIn(amtCell, 2), fontSize: TXT, align: 'right', rowTemplate: true })
    }
    staticTexts.push({
      key: 'shipperCert', x: chargesRight.x + 4, y: chargesRight.y + H_CHARGES - 56, width: chargesRight.width - 8, height: 36,
      fontSize: XS, lineHeight: 1.5, text: SHIPPER_CERT,
    })
    push({
      key: 'signatureShipper',
      x: chargesRight.x + 4, y: chargesRight.y + H_CHARGES - 16,
      width: chargesRight.width - 8, height: 12, fontSize: TXT, label: 'Signature of Shipper or his Agent',
    })
    y += H_CHARGES
  }

  // ── Totals row ──
  {
    const [prepaid, collect, blank] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_TOTALS, [1, 1, 2.2])
    box(prepaid); box(collect); box(blank)
    push({ key: 'totalPrepaid', ...cellIn(prepaid), fontSize: TXT, label: 'Total Prepaid' })
    push({ key: 'totalCollect', ...cellIn(collect), fontSize: TXT, label: 'Total Collect' })
    y += H_TOTALS
  }

  // ── Currency conversion / Execution ──
  {
    const [ccRates, ccDest, exec] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_CC, [1, 1, 2.2])
    box(ccRates); box(ccDest); box(exec)
    push({ key: 'currencyConversionRates', ...cellIn(ccRates), fontSize: TXT, label: 'Currency Conversion Rates' })
    push({ key: 'ccChargesInDestCurrency', ...cellIn(ccDest), fontSize: TXT, label: 'CC Charges in Dest. Currency' })
    const [dateCol, placeCol, sigCol] = hsplit(exec.x, exec.y, exec.width, exec.height, [1, 0.9, 1.8])
    push({ key: 'executedOnDate', x: dateCol.x + 4, y: dateCol.y + H_CC - 18, width: dateCol.width - 8, height: 12, fontSize: TXT, label: 'Executed on (date)' })
    push({ key: 'executedAtPlace', x: placeCol.x + 4, y: placeCol.y + H_CC - 18, width: placeCol.width - 8, height: 12, fontSize: TXT, label: 'at (place)' })
    staticTexts.push({
      key: 'carrierSigLabel', x: sigCol.x + 4, y: sigCol.y + H_CC - 10, width: sigCol.width - 8, height: 8,
      fontSize: XS, lineHeight: 1.2, text: 'Signature of Issuing Carrier or its Agent',
    })
    y += H_CC
  }

  // ── Bottom row ──
  {
    const [carrierUse, charges, collectCharges] = hsplit(CONTENT_X, y, CONTENT_WIDTH, H_BOTTOM, [0.8, 1, 1.4])
    box(carrierUse); box(charges); box(collectCharges)
    staticTexts.push({
      key: 'carrierUseLabel', x: carrierUse.x + 4, y: carrierUse.y + 4, width: carrierUse.width - 8, height: H_BOTTOM - 8,
      fontSize: XS, lineHeight: 1.3, text: "For Carrier's Use only\nat Destination",
    })
    push({ key: 'chargesAtDestination', ...cellIn(charges), fontSize: TXT, label: 'Charges at Destination' })
    push({ key: 'totalCollectCharges', ...cellIn(collectCharges), fontSize: TXT, label: 'Total Collect Charges' })
    y += H_BOTTOM
  }

  return { fields, boxes, staticTexts }
}

function rectIn(r: Rect, pad = 4): { x: number; y: number; width: number; height: number } {
  return { x: r.x + pad, y: r.y + pad, width: r.width - pad * 2, height: r.height - pad * 2 }
}

function cellIn(r: Rect, pad = 4) {
  return rectIn(r, pad)
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
