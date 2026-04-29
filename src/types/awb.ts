export interface RateItem {
  id: string
  pieces: string
  grossWeight: string
  weightUnit: 'K' | 'L'
  rateClass: string
  commodityItemNo: string
  chargeableWeight: string
  rateCharge: string
  total: string
  natureAndQuantity: string
}

export interface OtherCharge {
  id: string
  description: string
  amount: string
  entitlement: 'DUE AGENT' | 'DUE CARRIER'
}

export interface AWBData {
  // Header
  awbPrefix: string
  awbSerial: string

  // Carrier (shown in Not Negotiable box)
  carrierName: string
  carrierAddress: string

  // Shipper
  shipperAccountNumber: string
  shipperNameAndAddress: string

  // Consignee
  consigneeAccountNumber: string
  consigneeNameAndAddress: string

  // Agent
  agentNameAndCity: string
  agentIataCode: string
  agentAccountNumber: string

  // Accounting & Reference
  accountingInformation: string
  referenceNumber: string
  optionalShippingInfo: string

  // Routing
  airportOfDeparture: string
  routeTo1: string
  routeBy1: string
  routeTo2: string
  routeBy2: string
  routeTo3: string
  routeBy3: string

  // Destination & Flight
  airportOfDestination: string
  flightNumber: string
  flightDate: string

  // Charges declaration
  currency: string
  wtValPPD: boolean
  wtValCOLL: boolean
  otherPPD: boolean
  otherCOLL: boolean
  declaredValueCarriage: string
  declaredValueCustoms: string
  insuranceAmount: string

  // Handling
  handlingInformation: string
  sci: string

  // Rate items
  rateItems: RateItem[]

  // Other charges
  otherCharges: OtherCharge[]

  // Charges summary
  weightChargePPD: string
  weightChargeCOLL: string
  valuationChargePPD: string
  valuationChargeCOLL: string
  taxPPD: string
  taxCOLL: string
  totalOtherChargesDueAgent: string
  totalOtherChargesDueCarrier: string
  totalPrepaid: string
  totalCollect: string

  // Currency conversion
  currencyConversionRates: string
  ccChargesInDestCurrency: string
  chargesAtDestination: string
  totalCollectCharges: string

  // Execution
  executedOnDate: string
  executedAtPlace: string
  signatureShipper: string

  // Meta
  isDraft: boolean
  copyNumber: 1 | 2 | 3
  copyLabel: string
  carrierLogoUrl?: string  // base64 or https URL
}

export const defaultAWBData: AWBData = {
  awbPrefix: '',
  awbSerial: '',
  carrierName: '',
  carrierAddress: '',
  shipperAccountNumber: '',
  shipperNameAndAddress: '',
  consigneeAccountNumber: '',
  consigneeNameAndAddress: '',
  agentNameAndCity: '',
  agentIataCode: '',
  agentAccountNumber: '',
  accountingInformation: '',
  referenceNumber: '',
  optionalShippingInfo: '',
  airportOfDeparture: '',
  routeTo1: '',
  routeBy1: '',
  routeTo2: '',
  routeBy2: '',
  routeTo3: '',
  routeBy3: '',
  airportOfDestination: '',
  flightNumber: '',
  flightDate: '',
  currency: 'USD',
  wtValPPD: false,
  wtValCOLL: false,
  otherPPD: false,
  otherCOLL: false,
  declaredValueCarriage: 'NVD',
  declaredValueCustoms: 'NCV',
  insuranceAmount: '',
  handlingInformation: '',
  sci: '',
  rateItems: [
    {
      id: '1',
      pieces: '',
      grossWeight: '',
      weightUnit: 'K',
      rateClass: '',
      commodityItemNo: '',
      chargeableWeight: '',
      rateCharge: '',
      total: '',
      natureAndQuantity: '',
    },
  ],
  otherCharges: [],
  weightChargePPD: '',
  weightChargeCOLL: '',
  valuationChargePPD: '',
  valuationChargeCOLL: '',
  taxPPD: '',
  taxCOLL: '',
  totalOtherChargesDueAgent: '',
  totalOtherChargesDueCarrier: '',
  totalPrepaid: '',
  totalCollect: '',
  currencyConversionRates: '',
  ccChargesInDestCurrency: '',
  chargesAtDestination: '',
  totalCollectCharges: '',
  executedOnDate: '',
  executedAtPlace: '',
  signatureShipper: '',
  isDraft: true,
  copyNumber: 1,
  copyLabel: 'Original 1 (for Issuing Carrier)',
}
