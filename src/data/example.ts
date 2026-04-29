import { AWBData } from '../types/awb'

// Source: examples/AWB_014-57318306.draft.pdf
export const exampleAWB: AWBData = {
  awbPrefix: '014',
  awbSerial: '57318306',

  carrierName: 'AIR CANADA',
  carrierAddress: 'AIR CANADA CENTER 271, COTE VERTU OUEST, QUEBEC, CANADA',

  shipperAccountNumber: '',
  shipperNameAndAddress:
    'BANCO SECURITY\nAPOQUINDO #3150\nLAS CONDES, SANTIAGO\nCHILE-RUT: 97.053.000-2',

  consigneeAccountNumber: '',
  consigneeNameAndAddress:
    'RAIFFEISEN SWITZERLAND\nCASH CENTER, FREIGHT WEST\nCH-8058 ZURICH AIRPORT\nZURICH - SUIZA\nPH: +41 44 275 70 00',

  agentNameAndCity:
    'B2B EXPRESS S.A. RUT: 99.515.150-2\nCOLO COLO 521, BODEGA 11A\nQUILICURA - SANTIAGO PH: +56224810261',
  agentIataCode: '75-1-9012/0014',
  agentAccountNumber: '',

  accountingInformation:
    'FREIGHT PREPAID\nNOTIFY:\nSIMONE KENNEL\nPHONE +41 44 226 7485\nSIMONE.KENNEL@RAIFFEISEN.CH',

  referenceNumber: '',
  optionalShippingInfo: '',

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
    'SIMONE KENNEL WILL BE HANDLING THIS SHIPMENT AT ZURICH AIRPORT\nBAC-3420964',
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
      natureAndQuantity: 'BANK NOTES\nBAC-3420964\n30X30X50CM/1',
    },
  ],

  otherCharges: [
    { id: '1', description: 'B2B FEE',              amount: '250.00',  entitlement: 'DUE AGENT' },
    { id: '2', description: 'AWB FEE',              amount: '150.00',  entitlement: 'DUE AGENT' },
    { id: '3', description: 'TERMINAL',             amount: '217.00',  entitlement: 'DUE AGENT' },
    { id: '4', description: 'HABILITACION TERMINAL',amount: '672.35',  entitlement: 'DUE AGENT' },
    { id: '5', description: 'HABILITACION B2B',     amount: '150.00',  entitlement: 'DUE AGENT' },
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
  signatureShipper: 'BANCO SECURITY',

  isDraft: true,
  copyNumber: 2,
  copyLabel: 'Original 2 (for Consignee)',
}
