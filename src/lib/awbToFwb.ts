import type { AWBData } from '../types/awb'
import type { FwbInput } from './fwbCargoImp'
import { buildFwb17, type FwbBuildResult } from './fwbCargoImp'

/** Map editor AWBData → FwbInput for FWB/17. */
export function awbDataToFwbInput(data: AWBData): FwbInput {
  const first = data.rateItems?.[0]
  return {
    awbPrefix: data.awbPrefix,
    awbSerial: data.awbSerial,
    airportOfDeparture: data.airportOfDeparture || data.awbAirportCode,
    airportOfDestination: data.airportOfDestination,
    departureDisplay: data.airportOfDeparture || data.awbAirportCode,
    destinationDisplay: data.airportOfDestination,
    numberOfPieces: Number(first?.pieces) || 0,
    grossWeight: Number(first?.grossWeight) || 0,
    weightUnit: first?.weightUnit || 'K',
    flightNumber: data.flightNumber,
    flightDate: data.flightDate,
    flightNumber2: data.flightNumber2,
    flightDate2: data.flightDate2,
    routeTo1: data.routeTo1,
    routeBy1: data.routeBy1,
    routeTo2: data.routeTo2,
    routeBy2: data.routeBy2,
    routeTo3: data.routeTo3,
    routeBy3: data.routeBy3,
    shipperAccountNumber: data.shipperAccountNumber,
    shipperNameAndAddress: data.shipperNameAndAddress,
    shipperCountry: data.shipperCountry,
    consigneeAccountNumber: data.consigneeAccountNumber,
    consigneeNameAndAddress: data.consigneeNameAndAddress,
    consigneeCountry: data.consigneeCountry,
    agentNameAndCity: data.agentNameAndCity,
    agentIataCode: data.agentIataCode,
    agentAccountNumber: data.agentAccountNumber,
    currency: data.currency,
    chgsCode: data.wtValCOLL ? 'CC' : 'PP',
    weightValuationCharges: data.wtValCOLL ? 'CC' : data.wtValPPD ? 'PP' : 'PP',
    valueForCarriage: data.declaredValueCarriage,
    valueForCustoms: data.declaredValueCustoms,
    insuranceAmount: data.insuranceAmount || 'XXX',
    handlingInformation: data.handlingInformation,
    sci: data.sci,
    sphCodes: data.sphCodes || [],
    rateLines: (data.rateItems || []).map((row) => ({
      pieces: Number(row.pieces) || 0,
      grossWeight: Number(row.grossWeight) || 0,
      weightUnit: row.weightUnit || 'K',
      rateClass: row.rateClass,
      itemNo: row.commodityItemNo,
      chargeableWeight: Number(row.chargeableWeight) || 0,
      rate: Number(row.rateCharge) || 0,
      total: Number(row.total) || 0,
      natureAndQuantity: row.natureAndQuantity,
    })),
    otherCharges: (data.otherCharges || []).map((c) => ({
      description: c.description,
      amount: Number(c.amount) || 0,
      entitlement: c.entitlement,
    })),
    natureAndQuantityOfGoods: first?.natureAndQuantity || '',
    weightChargePrepaid: Number(data.weightChargePPD) || 0,
    weightChargeCollect: Number(data.weightChargeCOLL) || 0,
    totalPrepaid: Number(data.totalPrepaid) || 0,
    totalCollect: Number(data.totalCollect) || 0,
    executedOnDate: data.executedOnDate,
    executedAtPlace: data.executedAtPlace,
    signatureOfIssuingCarrierOrAgent: data.signatureCarrier || data.agentNameAndCity?.split('\n')[0],
    referenceNumber: data.referenceNumber,
  }
}

export function buildFwbFromAwb(data: AWBData): FwbBuildResult {
  return buildFwb17(awbDataToFwbInput(data))
}

export function applyEAwbResult(data: AWBData, result: FwbBuildResult): AWBData {
  if (!result.ok) {
    return {
      ...data,
      eAwbStatus: 'invalid',
      eAwbGeneratedAt: new Date().toISOString(),
      eAwbLastMessage: '',
      eAwbLastError: result.errors.join('; '),
    }
  }
  return {
    ...data,
    eAwbStatus: 'generated',
    eAwbGeneratedAt: new Date().toISOString(),
    eAwbLastMessage: result.message,
    eAwbLastError: '',
  }
}
