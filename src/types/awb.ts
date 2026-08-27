export interface RateDimension {
  length: string
  width: string
  height: string
  unit: 'cm' | 'in'
  pieces: string
  weight: string
  weightUnit: 'kg' | 'lb'
}

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
  dimensions?: RateDimension[]
  autoCalc?: 'total' | 'rate' | 'none'
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
  awbAirportCode: string  // 3-letter airport code shown between prefix and serial (e.g. "SCL")
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
  optionalShippingInfo1: string
  optionalShippingInfo2: string
  optionalShippingInfo3: string
  optionalShippingInfo?: string  // legacy — migrated to 1/2/3 on load

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
  flightNumber2?: string
  flightDate2?: string

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
  /** Special handling codes for FWB SPH (EAW / EAP / …). */
  sphCodes?: string[]
  /** ISO-2 country hints for FWB party LOC (optional). */
  shipperCountry?: string
  consigneeCountry?: string

  // eAWB / FWB lifecycle (persisted in document JSON)
  eAwbStatus?: 'none' | 'generated' | 'invalid' | 'sent' | 'accepted' | 'rejected'
  eAwbGeneratedAt?: string
  eAwbLastMessage?: string
  eAwbLastError?: string

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
  signatureCarrier: string

  // Meta
  isDraft: boolean
  /** If true and serial empty on save, keep a DRAFT- placeholder until a real number is assigned. */
  assignOnSave?: boolean
  copyNumber: 1 | 2 | 3
  copyLabel: string
  carrierLogoUrl?: string  // base64 or https URL

  // HAWB-specific (only set when docType === 'hawb')
  docType?: 'awb' | 'hawb'
  hawbNumber?: string
  mawbReference?: string
}

export const defaultAWBData: AWBData = {
  awbPrefix: '',
  awbAirportCode: '',
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
  optionalShippingInfo1: '',
  optionalShippingInfo2: '',
  optionalShippingInfo3: '',
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
  flightNumber2: '',
  flightDate2: '',
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
  sphCodes: [],
  shipperCountry: '',
  consigneeCountry: '',
  eAwbStatus: 'none',
  eAwbGeneratedAt: '',
  eAwbLastMessage: '',
  eAwbLastError: '',
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
  signatureCarrier: '',
  isDraft: true,
  assignOnSave: false,
  copyNumber: 1,
  copyLabel: 'Original 1 (for Issuing Carrier)',
  docType: 'awb',
  hawbNumber: '',
  mawbReference: '',
}
