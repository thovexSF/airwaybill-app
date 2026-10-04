import { AWBData, RateItem, OtherCharge } from '../types/awb'
import { AWB_FIELD_POSITIONS, FieldPosition } from './awbFieldPositions'

/**
 * Where every value sits on the air waybill, in PDF points on US Letter.
 *
 * Derived from `awbFieldPositions.ts` — percentages of the page, calibrated
 * against the awbeditor "SET COMPLETO" sheets and shared with the sister `b2b`
 * repo, which prints from the same numbers. This file only turns those
 * percentages into points and maps them onto `AWBData`; never nudge a value
 * here to fix alignment, fix the percentage in the shared schema so both apps
 * move together.
 *
 * Imported by **both** `AWBDocument.tsx` (the PDF) and `AWBOverlay.tsx` (the
 * HTML inputs layered over the preview), so the two cannot drift apart.
 */
export const PAGE_WIDTH = 612
export const PAGE_HEIGHT = 792
export const PAGE_PADDING = 0

/** awbeditor sets the form in Courier at 9.94pt on a 9pt baseline. */
export const DATA_SIZE = 9.94
export const AWB_SIZE = 12
/** The requested flight/date cells are set a size down, so "DL146/15-08" fits its box. */
const FLIGHT_SIZE = 8.6
export const LEADING = 9

/**
 * Every value sits half a point lower than the schema's top edge puts it: the
 * awbeditor reference prints its baselines 0.5pt below where react-pdf lays
 * the same box out, measured across the whole sheet.
 */
const BASELINE_DY = 0.5

const px = (p: FieldPosition) => ({
  x: (p.left / 100) * PAGE_WIDTH,
  y: (p.top / 100) * PAGE_HEIGHT + BASELINE_DY,
  width: (p.width / 100) * PAGE_WIDTH,
  height: (p.height / 100) * PAGE_HEIGHT,
})

export type FieldKey = string

export interface FieldDef {
  key: FieldKey
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  align?: 'left' | 'center' | 'right'
  multiline?: boolean
  /** Derived values the form prints but nobody types. */
  readOnly?: boolean
  label?: string
  bold?: boolean
}

const ONE_LINE_PCT = (LEADING / PAGE_HEIGHT) * 100

const P = AWB_FIELD_POSITIONS

/** A smaller face hangs from the same top edge, so drop it to keep the baseline of its neighbours. */
const FLIGHT_CELL = (pos: FieldPosition): FieldPosition => ({ ...pos, top: pos.top + (1.1 / PAGE_HEIGHT) * 100 })

function field(pos: FieldPosition, key: FieldKey, extra: Partial<FieldDef> = {}): FieldDef {
  return { key, ...px(pos), fontSize: DATA_SIZE, ...extra }
}

/**
 * The charges column is a stack of equal rows: Weight Charge, Valuation
 * Charge, Tax, Total Other Charges Due Agent, Total Other Charges Due Carrier.
 * The shared schema pins the first, fourth and fifth (71.97, 81.06, 84.09),
 * which are exactly 3.03 apart, so the two it leaves out sit at 75.00 and
 * 78.03 rather than being measured again.
 */
const CHARGE_ROW = 3.03
const valuationTop = P.weightChargePrepaid.top + CHARGE_ROW
const taxTop = P.weightChargePrepaid.top + CHARGE_ROW * 2

const row = (base: FieldPosition, top: number): FieldPosition => ({ ...base, top })

/** A tall column of the rate table, cut into typed lines one leading apart. */
function rows(pos: FieldPosition, index: number): FieldPosition {
  const lineHeightPct = (LEADING / PAGE_HEIGHT) * 100
  return { ...pos, top: pos.top + index * lineHeightPct, height: lineHeightPct }
}

export const MAX_RATE_ROWS = Math.floor(((P.ratePieces.height / 100) * PAGE_HEIGHT) / LEADING)
/** The other-charges block is set on a 12pt pitch, looser than the rest of the sheet. */
const CHARGE_LEADING = 12
/** Other charges print in two columns; each holds this many lines. */
export const CHARGES_PER_COLUMN = Math.floor(((P.otherChargeDescL.height / 100) * PAGE_HEIGHT) / CHARGE_LEADING)

const STATIC: FieldDef[] = [
  // HAWB prints its own number here, left-aligned; MAWB fills the three cells instead.
  field(P.awbNumberLeft, 'awbNumberLeft', { fontSize: AWB_SIZE, readOnly: true, bold: true }),
  field(P.awbNumberPrefix, 'awbNumberPrefix', { fontSize: AWB_SIZE, align: 'center', readOnly: true, bold: true }),
  field(P.awbNumberAirport, 'awbNumberAirport', { fontSize: AWB_SIZE, align: 'center', readOnly: true, bold: true }),
  field(P.awbNumberSerial, 'awbNumberSerial', { fontSize: AWB_SIZE, readOnly: true, bold: true }),
  field(P.awbNumber, 'awbNumberTop', { fontSize: AWB_SIZE, align: 'right', readOnly: true, bold: true }),
  field(P.awbNumberBottom, 'awbNumberBottom', { fontSize: AWB_SIZE, align: 'right', readOnly: true, bold: true }),

  field({ ...P.issuedBy, height: ONE_LINE_PCT }, 'carrierName', { label: 'Issued by (carrier)' }),
  field(
    { ...P.issuedBy, top: P.issuedBy.top + ONE_LINE_PCT, height: P.issuedBy.height - ONE_LINE_PCT },
    'carrierAddress',
    { multiline: true, label: 'Carrier address' },
  ),

  field(P.shipperName, 'shipperNameAndAddress', { multiline: true, label: "Shipper's name and address" }),
  field(P.shipperAccount, 'shipperAccountNumber', { label: "Shipper's account number" }),
  field(P.consigneeName, 'consigneeNameAndAddress', { multiline: true, label: "Consignee's name and address" }),
  field(P.consigneeAccount, 'consigneeAccountNumber', { label: "Consignee's account number" }),

  field(P.agentName, 'agentNameAndCity', { multiline: true, label: "Issuing carrier's agent" }),
  field(P.agentIata, 'agentIataCode', { label: "Agent's IATA code" }),
  field(P.agentAccount, 'agentAccountNumber', { label: 'Account no.' }),

  field(P.accounting, 'accountingInformation', { multiline: true, label: 'Accounting information' }),
  field(P.reference, 'referenceNumber', { label: 'Reference number' }),
  field(P.optionalShipping, 'optionalShippingInfo1', { label: 'Optional shipping information' }),

  field(P.airportDeparture, 'airportOfDeparture', { label: 'Airport of departure' }),
  field(P.to1, 'routeTo1', { label: 'To' }),
  field(P.by1, 'routeBy1', { label: 'By first carrier' }),
  field(P.to2, 'routeTo2', { label: 'to' }),
  field(P.by2, 'routeBy2', { label: 'by' }),
  field(P.to3, 'routeTo3', { label: 'to' }),
  field(P.by3, 'routeBy3', { label: 'by' }),
  field(P.destination, 'airportOfDestination', { label: 'Airport of destination' }),
  field(FLIGHT_CELL(P.flightDate), 'flightNumber', { fontSize: FLIGHT_SIZE, label: 'Requested flight/date' }),
  field(FLIGHT_CELL(P.flightDate2), 'flightDate', { fontSize: FLIGHT_SIZE, label: 'Requested flight/date' }),

  field(P.currency, 'currency', { label: 'Currency' }),
  field(P.wtValPpd, 'wtValPPD', { align: 'center', label: 'WT/VAL PPD' }),
  field(P.wtValColl, 'wtValCOLL', { align: 'center', label: 'WT/VAL COLL' }),
  field(P.otherPpd, 'otherPPD', { align: 'center', label: 'Other PPD' }),
  field(P.otherColl, 'otherCOLL', { align: 'center', label: 'Other COLL' }),
  field(P.valueCarriage, 'declaredValueCarriage', { align: 'center', label: 'Declared value for carriage' }),
  field(P.valueCustoms, 'declaredValueCustoms', { align: 'center', label: 'Declared value for customs' }),
  field(P.insurance, 'insuranceAmount', { align: 'center', label: 'Amount of insurance' }),

  field(P.handling, 'handlingInformation', { multiline: true, label: 'Handling information' }),
  field(P.sci, 'sci', { label: 'SCI' }),

  field(P.ratePiecesTotal, 'ratePiecesTotal', { readOnly: true }),
  field(P.rateGrossTotal, 'rateGrossTotal', { readOnly: true }),
  field(P.rateGrandTotal, 'rateGrandTotal', { readOnly: true }),

  field(P.weightChargePrepaid, 'weightChargePPD', { align: 'right', label: 'Weight charge (prepaid)' }),
  field(P.weightChargeCollect, 'weightChargeCOLL', { align: 'right', label: 'Weight charge (collect)' }),
  field(row(P.weightChargePrepaid, valuationTop), 'valuationChargePPD', { align: 'right', label: 'Valuation charge (prepaid)' }),
  field(row(P.weightChargeCollect, valuationTop), 'valuationChargeCOLL', { align: 'right', label: 'Valuation charge (collect)' }),
  field(row(P.weightChargePrepaid, taxTop), 'taxPPD', { align: 'right', label: 'Tax (prepaid)' }),
  field(row(P.weightChargeCollect, taxTop), 'taxCOLL', { align: 'right', label: 'Tax (collect)' }),
  field(P.dueAgentPrepaid, 'totalOtherChargesDueAgent', { align: 'right', label: 'Total other charges due agent' }),
  field(P.dueCarrierPrepaid, 'totalOtherChargesDueCarrier', { align: 'right', label: 'Total other charges due carrier' }),
  field(P.totalPrepaidBox, 'totalPrepaid', { align: 'right', label: 'Total prepaid' }),
  field(P.totalCollectBox, 'totalCollect', { align: 'right', label: 'Total collect' }),

  field(P.signatureShipper, 'signatureShipper', { align: 'center', label: 'Signature of shipper or his agent' }),
  field(P.executedDate, 'executedOnDate', { label: 'Executed on (date)' }),
  field(P.executedPlace, 'executedAtPlace', { label: 'at (place)' }),
  field(P.signatureCarrier, 'signatureCarrier', { align: 'center', label: 'Signature of issuing carrier or its agent' }),
]

function rateRow(index: number): FieldDef[] {
  return [
    field(rows(P.ratePieces, index), `rateItems.${index}.pieces`, { label: 'No. of pieces' }),
    field(rows(P.rateGross, index), `rateItems.${index}.grossWeight`, { label: 'Gross weight' }),
    field(rows(P.rateClass, index), `rateItems.${index}.rateClass`, { label: 'Rate class' }),
    field(rows(P.rateChargeable, index), `rateItems.${index}.chargeableWeight`, { label: 'Chargeable weight' }),
    field(rows(P.rateCharge, index), `rateItems.${index}.rateCharge`, { label: 'Rate / charge' }),
    field(rows(P.rateTotal, index), `rateItems.${index}.total`, { label: 'Total' }),
  ]
}

/** The goods description is one block beside the whole rate table, not per row. */
const NATURE = field(P.natureQuantity, 'rateItems.0.natureAndQuantity', {
  multiline: true, label: 'Nature and quantity of goods',
})

function chargeLine(pos: FieldPosition, line: number): FieldPosition {
  const pitch = (CHARGE_LEADING / PAGE_HEIGHT) * 100
  return { ...pos, top: pos.top + line * pitch, height: (LEADING / PAGE_HEIGHT) * 100 }
}

function chargeRow(index: number): FieldDef[] {
  const left = index < CHARGES_PER_COLUMN
  const line = left ? index : index - CHARGES_PER_COLUMN
  return [
    field(chargeLine(left ? P.otherChargeDescL : P.otherChargeDescR, line), `otherCharges.${index}.description`, { label: 'Other charges' }),
    field(chargeLine(left ? P.otherChargeAmtL : P.otherChargeAmtR, line), `otherCharges.${index}.amount`, { align: 'right', label: 'Amount' }),
  ]
}

export const AWB_LAYOUT: FieldDef[] = [
  ...STATIC,
  NATURE,
  ...Array.from({ length: MAX_RATE_ROWS }, (_, i) => rateRow(i)).flat(),
  ...Array.from({ length: CHARGES_PER_COLUMN * 2 }, (_, i) => chargeRow(i)).flat(),
]

/** Only the rows that actually carry data get a box on the sheet. */
export function getFieldDefs(rateItemCount: number, otherChargeCount: number): FieldDef[] {
  return AWB_LAYOUT.filter((f) => {
    const rate = /^rateItems\.(\d+)\./.exec(f.key)
    if (rate) return Number(rate[1]) < Math.max(rateItemCount, 1)
    const other = /^otherCharges\.(\d+)\./.exec(f.key)
    if (other) return Number(other[1]) < otherChargeCount
    return true
  })
}

export function setNestedField(data: AWBData, key: FieldKey, value: string | boolean): AWBData {
  const rate = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rate) {
    const idx = Number(rate[1])
    const prop = rate[2] as keyof RateItem
    return { ...data, rateItems: data.rateItems.map((item, i) => (i === idx ? { ...item, [prop]: value } : item)) }
  }
  const other = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (other) {
    const idx = Number(other[1])
    const prop = other[2] as keyof OtherCharge
    return { ...data, otherCharges: data.otherCharges.map((item, i) => (i === idx ? { ...item, [prop]: value } : item)) }
  }
  return { ...data, [key as keyof AWBData]: value }
}
