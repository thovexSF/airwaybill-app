import type { AWBData, OtherCharge, RateItem } from '../src/types/awb'
import { defaultAWBData } from '../src/types/awb'
import type { DGDData, DGDItem } from '../src/types/dgd'
import { defaultDGDData } from '../src/types/dgd'

function s(v: unknown): string {
  if (v == null || v === '') return ''
  return String(v).trim()
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
    rateCharge: s(r.rate ?? r.rateCharge),
    total: s(r.total),
    natureAndQuantity: s(r.natureAndQuantity ?? r.nature),
  }))
}

function otherChargesFrom(lines: unknown): OtherCharge[] {
  if (!Array.isArray(lines)) return []
  return lines.map((oc: Record<string, unknown>, i) => ({
    id: String(i + 1),
    description: s(oc.description ?? oc.code),
    amount: s(oc.amount ?? oc.charges),
    entitlement: String(oc.entitlement || '').includes('AGENT') ? 'DUE AGENT' : 'DUE CARRIER',
  }))
}

function partyBlock(name?: unknown, address?: unknown, fallback?: unknown): string {
  const parts = [s(name), s(address)].filter(Boolean)
  if (parts.length) return parts.join('\n')
  return s(fallback)
}

function baseAwbFields(row: Record<string, unknown>): AWBData {
  const wtVal = s(row.weightValuationCharges).toUpperCase()
  const otherPay = s(row.otherChargesCode).toUpperCase()
  return {
    ...defaultAWBData,
    isDraft: false,
    awbPrefix: s(row.awbPrefix),
    awbSerial: s(row.awbSerial),
    carrierName: s(row.issuer) || partyBlock(row.issuedBy, '', '').split('\n')[0],
    carrierAddress: s(row.issuedBy),
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
    airportOfDeparture: s(row.airportOfDeparture),
    airportOfDestination: s(row.airportOfDestination),
    routeTo1: s(row.routeTo1),
    routeBy1: s(row.routeBy1),
    routeTo2: s(row.routeTo2),
    routeBy2: s(row.routeBy2),
    routeTo3: s(row.routeTo3),
    routeBy3: s(row.routeBy3),
    flightNumber: s(row.flightNumber),
    flightDate: s(row.requestedFlightsDates).split('/')[1]?.trim() || '',
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
    totalPrepaid: s(row.totalPrepaid),
    totalCollect: s(row.totalCollect),
    executedOnDate: s(row.executedOnDate || row.issueDate),
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
