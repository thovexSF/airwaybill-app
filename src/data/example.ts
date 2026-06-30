import { AWBData } from '../types/awb'

// Fictional demo data. Do not use real shipper, consignee, or cargo details here.
export const exampleAWB: AWBData = {
  awbPrefix: '999',
  awbAirportCode: 'SCL',
  awbSerial: '12345675',

  carrierName: 'GLOBAL AIR CARGO',
  carrierAddress: '100 SKYWAY AVENUE, TORONTO, ON, CANADA',

  shipperAccountNumber: '',
  shipperNameAndAddress:
    'ANDES EXPORTS SPA\nAV. LOS CERROS 1234\nLAS CONDES, SANTIAGO\nCHILE',

  consigneeAccountNumber: '',
  consigneeNameAndAddress:
    'ALPINE IMPORTS AG\nWAREHOUSE 7, CARGO CENTER WEST\nCH-8058 ZURICH AIRPORT\nZURICH, SWITZERLAND\nPH: +41 44 000 0000',

  agentNameAndCity:
    'PACIFIC FREIGHT AGENCY\nCARGO TERMINAL 4\nSANTIAGO, CHILE PH: +56 2 2000 0000',
  agentIataCode: '75-1-1234/0000',
  agentAccountNumber: '',

  accountingInformation:
    'FREIGHT PREPAID\nNOTIFY:\nALEX MORGAN\nPHONE +41 44 000 0001\nALEX.MORGAN@EXAMPLE.COM',

  referenceNumber: '',
  optionalShippingInfo1: '',
  optionalShippingInfo2: '',
  optionalShippingInfo3: '',

  airportOfDeparture: 'SANTIAGO DE CHILE (SCL/ZRH)',
  routeTo1: 'YYZ',
  routeBy1: 'AC',
  routeTo2: 'ZRH',
  routeBy2: 'AC',
  routeTo3: '',
  routeBy3: '',

  airportOfDestination: 'ZURICH',
  flightNumber: 'AC093/02-NOV AC880/02-NOV',
  flightDate: '',

  currency: 'USD',
  wtValPPD: true,
  wtValCOLL: false,
  otherPPD: true,
  otherCOLL: false,
  declaredValueCarriage: 'NVD',
  declaredValueCustoms: 'NCV',
  insuranceAmount: 'XXX',

  handlingInformation:
    'ALEX MORGAN WILL BE HANDLING THIS SHIPMENT AT ZURICH AIRPORT\nREF-DEMO-2024',
  sci: '',

  rateItems: [
    {
      id: '1',
      pieces: '1',
      grossWeight: '10',
      weightUnit: 'K',
      rateClass: 'M',
      commodityItemNo: '',
      chargeableWeight: '10',
      rateCharge: '400.00',
      total: '400.00',
      natureAndQuantity: 'PRINTED BROCHURES\nREF-DEMO-2024\n30X30X50CM/1',
    },
  ],

  otherCharges: [
    { id: '1', description: 'SERVICE FEE',          amount: '250.00',  entitlement: 'DUE AGENT' },
    { id: '2', description: 'AWB FEE',              amount: '150.00',  entitlement: 'DUE AGENT' },
    { id: '3', description: 'TERMINAL',             amount: '217.00',  entitlement: 'DUE AGENT' },
    { id: '4', description: 'HABILITACION TERMINAL',amount: '672.35',  entitlement: 'DUE AGENT' },
    { id: '5', description: 'DOCUMENTATION FEE',     amount: '150.00',  entitlement: 'DUE AGENT' },
  ],

  weightChargePPD: '400.00',
  weightChargeCOLL: '',
  valuationChargePPD: '',
  valuationChargeCOLL: '',
  taxPPD: '',
  taxCOLL: '',
  totalOtherChargesDueAgent: '1439.35',
  totalOtherChargesDueCarrier: '',
  totalPrepaid: '1839.35',
  totalCollect: '',

  currencyConversionRates: '',
  ccChargesInDestCurrency: '',
  chargesAtDestination: '',
  totalCollectCharges: '',

  executedOnDate: '02-NOV-2023',
  executedAtPlace: 'SANTIAGO',
  signatureShipper: 'ANDES EXPORTS SPA',
  signatureCarrier: '',

  isDraft: true,
  copyNumber: 2,
  copyLabel: 'Original 2 (for Consignee)',
}
