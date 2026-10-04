import type { AWBData, OtherCharge, RateItem } from '../src/types/awb'
import { defaultAWBData } from '../src/types/awb'
import type { DGDData, DGDItem } from '../src/types/dgd'
import { defaultDGDData } from '../src/types/dgd'

function s(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

/** Money as the form prints it: "8.30", "155.00". Zero and blanks stay empty. */
function money(v: unknown): string {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n !== 0 ? n.toFixed(2) : ''
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** "2026-08-15" → "15-AUG-2026", the way the form prints the execution date. */
function printedDate(v: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s(v))
  return m ? `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${m[1]}` : s(v)
}

/** Dimension lines the sheet appends to the goods description: "60X40X20CM/20 211K". */
function dimensionLines(dims: unknown): string[] {
  if (!Array.isArray(dims)) return []
  return dims.flatMap((d: Record<string, unknown>) => {
    if (!d.length || !d.width || !d.height) return []
    const unit = s(d.unit).toUpperCase().startsWith('IN') ? 'IN' : 'CM'
    const weight = d.weight ? ` ${+Number(d.weight)}${s(d.weightUnit) || 'K'}` : ''
    return [`${+Number(d.length)}X${+Number(d.width)}X${+Number(d.height)}${unit}/${+Number(d.pieces) || 0}${weight}`]
  })
}

function rateItemsFromLines(lines: unknown): RateItem[] {
  if (!Array.isArray(lines) || lines.length === 0) return defaultAWBData.rateItems
  return lines.map((r: Record<string, unknown>, i) => ({
    id: String(i + 1),
    pieces: s(r.pieces),
    grossWeight: s(r.grossWeight),
    weightUnit: (s(r.weightUnit) === 'L' ? 'L' : 'K') as 'K' | 'L',
    rateClass: s(r.rateClass),
    commodityItemNo: s(r.itemNo),
    chargeableWeight: s(r.chargeableWeight),
    rateCharge: money(r.rate ?? r.rateCharge),
    total: money(r.total),
    natureAndQuantity: [s(r.natureAndQuantity ?? r.nature), ...dimensionLines(r.dimensions)].filter(Boolean).join('\n'),
  }))
}

function otherChargesFrom(lines: unknown): OtherCharge[] {
  if (!Array.isArray(lines)) return []
  return lines.map((oc: Record<string, unknown>, i) => ({
    id: String(i + 1),
    description: s(oc.description ?? oc.code),
    amount: money(oc.amount ?? oc.charges),
    entitlement: String(oc.entitlement || '').includes('AGENT') ? 'DUE AGENT' : 'DUE CARRIER',
  }))
}

function partyBlock(name?: unknown, address?: unknown, fallback?: unknown): string {
  const parts = [s(name), s(address)].filter(Boolean)
  if (parts.length) return parts.join('\n')
  return s(fallback)
}

/** "DL146/15-08 / DL295/17-08": the sheet's two cells hold one leg each, flight and day together. */
function flightFields(row: Record<string, unknown>) {
  const [first = '', second = ''] = s(row.requestedFlightsDates).split(' / ').map((x) => x.trim())
  return { flightNumber: first || s(row.flightNumber), flightDate: second }
}

/** The editor leaves these blank in the file ("calculations: AUTOMATIC"), so they are summed here. */
function chargeTotals(row: Record<string, unknown>, wtVal: string, otherPay: string) {
  const lines = Array.isArray(row.rateLines) ? (row.rateLines as Record<string, unknown>[]) : []
  const charges = Array.isArray(row.otherCharges) ? (row.otherCharges as Record<string, unknown>[]) : []
  const sum = (xs: number[]) => xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
  const weight = sum(lines.map((r) => Number(r.total)))
  const due = (who: string) =>
    sum(charges.filter((c) => String(c.entitlement || '').includes(who)).map((c) => Number(c.amount)))
  const agent = due('AGENT')
  const carrier = due('CARRIER')
  const weightPpd = !wtVal.includes('COLL')
  const otherPpd = !otherPay.includes('COLL')
  const prepaid = (weightPpd ? weight : 0) + (otherPpd ? agent + carrier : 0)
  const collect = (weightPpd ? 0 : weight) + (otherPpd ? 0 : agent + carrier)
  return {
    weightChargePPD: weightPpd ? money(weight) : '',
    weightChargeCOLL: weightPpd ? '' : money(weight),
    totalOtherChargesDueAgent: otherPpd ? money(agent) : '',
    totalOtherChargesDueCarrier: otherPpd ? money(carrier) : '',
    totalPrepaid: money(Number(row.totalPrepaid) || prepaid),
    totalCollect: money(Number(row.totalCollect) || collect),
  }
}

function baseAwbFields(row: Record<string, unknown>): AWBData {
  const wtVal = s(row.weightValuationCharges).toUpperCase()
  const otherPay = s(row.otherChargesCode).toUpperCase()
  return {
    ...defaultAWBData,
    isDraft: false,
    awbPrefix: /^\d{1,3}$/.test(s(row.awbPrefix)) ? s(row.awbPrefix).padStart(3, '0') : s(row.awbPrefix),
    awbSerial: s(row.awbSerial),
    carrierName: s(row.issuer) || partyBlock(row.issuedBy, '', '').split('\n')[0],
    // The first row of the issued-by block is the carrier name, which has its own field.
    carrierAddress: s(row.issuedBy).split('\n').slice(1).join('\n').trim(),
    shipperAccountNumber: s(row.shipperAccountNumber),
    shipperNameAndAddress: partyBlock(row.shipperName, row.shipperAddress, row.shipper),
    consigneeAccountNumber: s(row.consigneeAccountNumber),
    consigneeNameAndAddress: partyBlock(row.consigneeName, row.consigneeAddress, row.consignee),
    agentNameAndCity: s(row.agentNameAndCity),
    agentIataCode: s(row.agentIataCode),
    agentAccountNumber: s(row.agentAccountNumber),
    accountingInformation: s(row.accountingInformation),
    referenceNumber: s(row.referenceNumber),
    optionalShippingInfo1: s(row.optionalShippingInformation),
    awbAirportCode: s(row.airportCityCode) || s(row.airportOfDeparture).match(/\b([A-Z]{3})\b/)?.[1] || '',
    airportOfDeparture: s(row.airportOfDeparture),
    airportOfDestination: s(row.airportOfDestination),
    routeTo1: s(row.routeTo1),
    routeBy1: s(row.routeBy1),
    routeTo2: s(row.routeTo2),
    routeBy2: s(row.routeBy2),
    routeTo3: s(row.routeTo3),
    routeBy3: s(row.routeBy3),
    ...flightFields(row),
    ...chargeTotals(row, wtVal, otherPay),
    currency: s(row.currency) || 'USD',
    wtValPPD: wtVal.includes('PPD') || wtVal.includes('PREPAID'),
    wtValCOLL: wtVal.includes('COLL') || wtVal.includes('COLLECT'),
    otherPPD: otherPay.includes('PPD') || otherPay.includes('PREPAID'),
    otherCOLL: otherPay.includes('COLL') || otherPay.includes('COLLECT'),
    declaredValueCarriage: s(row.valueForCarriage) || 'NVD',
    declaredValueCustoms: s(row.valueForCustoms) || 'NCV',
    insuranceAmount: s(row.insuranceAmount) || 'XXX',
    handlingInformation: s(row.handlingInformation),
    sci: s(row.sci),
    rateItems: rateItemsFromLines(row.rateLines),
    otherCharges: otherChargesFrom(row.otherCharges),
    executedOnDate: printedDate(row.executedOnDate || row.issueDate),
    executedAtPlace: s(row.executedAtPlace),
    signatureShipper: s(row.signatureOfShipperOrAgent),
    signatureCarrier: s(row.signatureOfIssuingCarrierOrAgent),
  }
}

export function mapMawbRow(row: Record<string, unknown>): AWBData {
  return { ...baseAwbFields(row), docType: 'awb' }
}

export function mapHawbRow(row: Record<string, unknown>): AWBData {
  return {
    ...baseAwbFields(row),
    docType: 'hawb',
    hawbNumber: s(row.hawbNumber || row.document_number),
    mawbReference: s(row.masterAwbNumber || row.awbNumber),
  }
}

export function mapDgdRow(row: Record<string, unknown>): DGDData {
  const dangerous = Array.isArray(row.dangerousGoods) ? row.dangerousGoods : []
  const items: DGDItem[] = dangerous.length
    ? dangerous.map((d: Record<string, unknown>, i) => ({
        id: String(i + 1),
        unIdNo: s(d.unNumber ?? d.un),
        properShippingName: s(d.properShippingName ?? d.name),
        classDivision: s(d.class ?? d.division),
        subsidiaryRisk: s(d.subsidiaryRisk),
        packingGroup: (s(d.packingGroup) as DGDItem['packingGroup']) || '',
        quantity: s(d.quantity),
        packingInstruction: s(d.packingInstruction ?? d.packingInst),
        authorization: s(d.authorization),
      }))
    : defaultDGDData.items

  return {
    ...defaultDGDData,
    isDraft: false,
    shipperNameAndAddress: partyBlock(row.shipperName, row.shipperAddress, row.shipper),
    consigneeNameAndAddress: partyBlock(row.consigneeName, row.consigneeAddress, row.consignee),
    awbNo: s(row.awbNumber),
    airportOfDeparture: s(row.airportOfDeparture),
    airportOfDestination: s(row.airportOfDestination),
    items,
    additionalHandling: s(row.additionalInformation ?? row.handlingInformation),
    signatoryName: s(row.shipperSignature),
    signaturePlace: s(row.executedAtPlace),
    signatureDate: s(row.shipperSignatureDate),
  }
}

export function externalIdForRow(kind: 'mawb' | 'hawb' | 'dgd', row: Record<string, unknown>): string {
  const id = s(row.externalId ?? row.id)
  if (id) return `awbeditor-${kind}-${id}`
  if (kind === 'mawb') return `awbeditor-awb-${s(row.awbNumber)}`
  if (kind === 'hawb') return `awbeditor-hawb-${s(row.hawbNumber || row.document_number)}`
  return `awbeditor-dgd-${s(row.dgdNumber)}`
}
