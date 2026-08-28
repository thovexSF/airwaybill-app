import type { AWBData, OtherCharge, RateItem } from '../types/awb'
import type { HawbFormData } from '../components/structured/HawbManifestForms'
import { entityToHawb } from '../components/structured/HawbManifestForms'
import type { MawbFormData, RateLine } from '../components/structured/types'
import { entityToMawbForm } from '../components/structured/types'

function rateItemToLine(r: RateItem): RateLine {
  return {
    pieces: Number(r.pieces) || 0,
    grossWeight: Number(r.grossWeight) || 0,
    weightUnit: r.weightUnit || 'K',
    rateClass: r.rateClass || '',
    itemNo: r.commodityItemNo || '',
    chargeableWeight: Number(r.chargeableWeight) || 0,
    rate: Number(r.rateCharge) || 0,
    total: Number(r.total) || 0,
    natureAndQuantity: r.natureAndQuantity || '',
    dimensions: r.dimensions as RateLine['dimensions'],
    autoCalc: r.autoCalc,
  }
}

function lineToRateItem(line: RateLine, prev?: RateItem): RateItem {
  return {
    id: prev?.id || Math.random().toString(36).slice(2, 8),
    pieces: String(line.pieces || ''),
    grossWeight: String(line.grossWeight || ''),
    weightUnit: (line.weightUnit === 'L' ? 'L' : 'K') as 'K' | 'L',
    rateClass: line.rateClass || '',
    commodityItemNo: line.itemNo || '',
    chargeableWeight: String(line.chargeableWeight || ''),
    rateCharge: String(line.rate || ''),
    total: String(line.total || ''),
    natureAndQuantity: line.natureAndQuantity || '',
    dimensions: line.dimensions as RateItem['dimensions'],
    autoCalc: line.autoCalc,
  }
}

/** AWBData → entidad que entiende entityToMawbForm. */
export function awbDataToMawbEntity(data: AWBData, documentKey?: string | null): Record<string, unknown> {
  const optionalShippingInformation = [data.optionalShippingInfo1, data.optionalShippingInfo2, data.optionalShippingInfo3]
    .filter(Boolean)
    .join('\n')
  return {
    ...data,
    id: documentKey || undefined,
    formPayload: data,
    awbNumber1: data.awbPrefix,
    awbNumber2: data.awbSerial,
    optionalShippingInformation: optionalShippingInformation || data.optionalShippingInfo || '',
    weightValuationCharges: data.wtValPPD ? 'PPD' : 'COLL',
    otherChargesCode: data.otherPPD ? 'PPD' : 'COLL',
    valueForCarriage: data.declaredValueCarriage,
    valueForCustoms: data.declaredValueCustoms,
    departureDisplay: data.airportOfDeparture,
    destinationDisplay: data.airportOfDestination,
    rateLines: data.rateItems?.length ? data.rateItems.map(rateItemToLine) : undefined,
    otherCharges: data.otherCharges?.map((c) => ({
      description: c.description,
      amount: Number(c.amount) || 0,
      entitlement: c.entitlement,
    })),
    weightChargePrepaid: Number(data.weightChargePPD) || 0,
    weightChargeCollect: Number(data.weightChargeCOLL) || 0,
    valuationChargePrepaid: Number(data.valuationChargePPD) || 0,
    valuationChargeCollect: Number(data.valuationChargeCOLL) || 0,
    taxPrepaid: Number(data.taxPPD) || 0,
    taxCollect: Number(data.taxCOLL) || 0,
    totalOtherDueAgentPrepaid: Number(data.totalOtherChargesDueAgent) || 0,
    totalOtherDueCarrierCollect: Number(data.totalOtherChargesDueCarrier) || 0,
    totalPrepaid: Number(data.totalPrepaid) || 0,
    totalCollect: Number(data.totalCollect) || 0,
    signatureOfShipperOrAgent: data.signatureShipper,
    signatureOfIssuingCarrierOrAgent: data.signatureCarrier,
    status: data.isDraft ? 'draft' : 'final',
    natureAndQuantityOfGoods: data.rateItems?.[0]?.natureAndQuantity || '',
  }
}

export function awbDataToMawbForm(data: AWBData): MawbFormData {
  return entityToMawbForm(awbDataToMawbEntity(data))
}

export function mawbFormToAwbData(form: MawbFormData, prev: AWBData): AWBData {
  const opt = String(form.optionalShippingInformation || '').split('\n')
  const otherCharges: OtherCharge[] = form.otherCharges.map((c, i) => ({
    id: prev.otherCharges[i]?.id || String(i + 1),
    description: c.description,
    amount: String(c.amount ?? ''),
    entitlement: c.entitlement,
  }))
  return {
    ...prev,
    docType: 'awb',
    awbPrefix: form.awbPrefix,
    awbSerial: form.awbSerial,
    assignOnSave: form.assignOnSave,
    referenceNumber: form.referenceNumber,
    shipperAccountNumber: form.shipperAccountNumber,
    shipperNameAndAddress: form.shipperNameAndAddress,
    consigneeAccountNumber: form.consigneeAccountNumber,
    consigneeNameAndAddress: form.consigneeNameAndAddress,
    agentNameAndCity: form.agentNameAndCity,
    agentIataCode: form.agentIataCode,
    agentAccountNumber: form.agentAccountNumber,
    accountingInformation: form.accountingInformation,
    optionalShippingInfo1: opt[0] || '',
    optionalShippingInfo2: opt[1] || '',
    optionalShippingInfo3: opt[2] || '',
    airportOfDeparture: form.airportOfDeparture || form.departureDisplay,
    routeTo1: form.routeTo1,
    routeBy1: form.routeBy1,
    routeTo2: form.routeTo2,
    routeBy2: form.routeBy2,
    routeTo3: form.routeTo3,
    routeBy3: form.routeBy3,
    airportOfDestination: form.airportOfDestination || form.destinationDisplay,
    flightNumber: form.flightNumber,
    flightDate: form.flightDate,
    flightNumber2: form.flightNumber2,
    flightDate2: form.flightDate2,
    currency: form.currency,
    wtValPPD: form.weightValuationCharges === 'PPD',
    wtValCOLL: form.weightValuationCharges === 'COLL',
    otherPPD: form.otherChargesCode === 'PPD',
    otherCOLL: form.otherChargesCode === 'COLL',
    declaredValueCarriage: form.valueForCarriage,
    declaredValueCustoms: form.valueForCustoms,
    insuranceAmount: form.insuranceAmount,
    handlingInformation: form.handlingInformation,
    sci: form.sci,
    rateItems: form.rateLines.map((line, i) => lineToRateItem(line, prev.rateItems[i])),
    otherCharges,
    weightChargePPD: String(form.weightChargePrepaid || ''),
    weightChargeCOLL: String(form.weightChargeCollect || ''),
    valuationChargePPD: String(form.valuationChargePrepaid || ''),
    valuationChargeCOLL: String(form.valuationChargeCollect || ''),
    taxPPD: String(form.taxPrepaid || ''),
    taxCOLL: String(form.taxCollect || ''),
    totalOtherChargesDueAgent: String(form.totalOtherDueAgentPrepaid || ''),
    totalOtherChargesDueCarrier: String(form.totalOtherDueCarrierCollect || ''),
    totalPrepaid: String(form.totalPrepaid || ''),
    totalCollect: String(form.totalCollect || ''),
    executedOnDate: form.executedOnDate,
    executedAtPlace: form.executedAtPlace,
    signatureShipper: form.signatureOfShipperOrAgent,
    signatureCarrier: form.signatureOfIssuingCarrierOrAgent,
    isDraft: form.status !== 'final',
  }
}

export function awbDataToHawbEntity(data: AWBData, documentKey?: string | null): Record<string, unknown> {
  return {
    ...data,
    id: documentKey || undefined,
    formPayload: data,
    hawbNumber: data.hawbNumber,
    masterAwbNumber: data.mawbReference,
    flightInfo: data.flightNumber,
    rateLines: data.rateItems?.map(rateItemToLine),
    otherCharges: data.otherCharges?.map((c) => ({
      description: c.description,
      amount: Number(c.amount) || 0,
      entitlement: c.entitlement,
    })),
    weightChargePrepaid: Number(data.weightChargePPD) || 0,
    totalPrepaid: Number(data.totalPrepaid) || 0,
    totalCollect: Number(data.totalCollect) || 0,
    signatureOfShipperOrAgent: data.signatureShipper,
    signatureOfIssuingCarrierOrAgent: data.signatureCarrier,
  }
}

export function hawbFormToAwbData(form: HawbFormData, prev: AWBData): AWBData {
  const rate = form.rateLines[0]
  const otherCharges: OtherCharge[] = form.otherCharges.map((c, i) => ({
    id: prev.otherCharges[i]?.id || String(i + 1),
    description: c.description,
    amount: String(c.amount ?? ''),
    entitlement: c.entitlement,
  }))
  return {
    ...prev,
    docType: 'hawb',
    hawbNumber: form.hawbNumber,
    mawbReference: form.masterAwbNumber,
    referenceNumber: form.masterAwbNumber
      ? (form.masterAwbNumber.toUpperCase().startsWith('MAWB') ? form.masterAwbNumber : `MAWB ${form.masterAwbNumber}`)
      : prev.referenceNumber,
    shipperNameAndAddress: form.shipperNameAndAddress,
    consigneeNameAndAddress: form.consigneeNameAndAddress,
    agentNameAndCity: form.agentNameAndCity,
    agentIataCode: form.agentIataCode,
    airportOfDeparture: form.airportOfDeparture,
    airportOfDestination: form.airportOfDestination,
    flightNumber: form.flightInfo,
    handlingInformation: form.handlingInformation,
    sci: form.sci,
    rateItems: form.rateLines.map((line, i) => lineToRateItem(line, prev.rateItems[i])),
    otherCharges,
    weightChargePPD: String(form.weightChargePrepaid || ''),
    weightChargeCOLL: String(form.weightChargeCollect || ''),
    valuationChargePPD: String(form.valuationChargePrepaid || ''),
    valuationChargeCOLL: String(form.valuationChargeCollect || ''),
    taxPPD: String(form.taxPrepaid || ''),
    taxCOLL: String(form.taxCollect || ''),
    totalOtherChargesDueAgent: String(form.totalOtherDueAgentPrepaid || ''),
    totalOtherChargesDueCarrier: String(form.totalOtherDueCarrierCollect || ''),
    totalPrepaid: String(form.totalPrepaid || ''),
    totalCollect: String(form.totalCollect || ''),
    currencyConversionRates: form.currencyConvRate,
    ccChargesInDestCurrency: form.ccChargesDest,
    chargesAtDestination: form.chargesAtDest,
    totalCollectCharges: form.totalCollectDest,
    executedOnDate: form.executedOnDate,
    executedAtPlace: form.executedAtPlace,
    signatureShipper: form.signatureOfShipperOrAgent,
    signatureCarrier: form.signatureOfIssuingCarrierOrAgent,
    isDraft: prev.isDraft,
  }
}

export { entityToHawb } from '../components/structured/HawbManifestForms'
