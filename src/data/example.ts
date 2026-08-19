import { AWBData } from '../types/awb'

/**
 * Demo shipment: a temperature-controlled pharma consignment moving Frankfurt →
 * Singapore on Lufthansa Cargo, which owns AWB prefix 020 — so the carrier
 * block here is exactly what `applyAirlineForPrefix` resolves from the prefix.
 *
 * The shipper, consignee and agent are invented. Never put a real company's
 * details in here: this data ships to every visitor of the public demo.
 *
 * The serial's last digit is the IATA check digit (the first seven digits mod
 * 7), so the number validates the way a real one does: 4567890 mod 7 = 5.
 */
export const exampleAWB: AWBData = {
  awbPrefix: '020',
  awbAirportCode: 'FRA',
  awbSerial: '45678905',

  carrierName: 'LUFTHANSA CARGO AG',
  carrierAddress: 'FLUGHAFEN FRANKFURT, 60546 FRANKFURT AM MAIN, GERMANY',

  shipperAccountNumber: '',
  shipperNameAndAddress:
    'NORDLICHT PHARMA GMBH\nINDUSTRIESTRASSE 47\n65479 RAUNHEIM\nGERMANY',

  consigneeAccountNumber: '',
  consigneeNameAndAddress:
    'MERIDIAN HEALTHCARE PTE LTD\n12 AIRLINE ROAD, CARGO AGENT BUILDING C\nSINGAPORE 819834\nSINGAPORE\nPH: +65 6000 0000',

  agentNameAndCity:
    'RHEIN AIR LOGISTICS GMBH\nCARGO CITY SUED, GEBAEUDE 556\nFRANKFURT, GERMANY PH: +49 69 000 0000',
  agentIataCode: '81-2-4471/0006',
  agentAccountNumber: '',

  accountingInformation:
    'FREIGHT PREPAID\nNOTIFY: MERIDIAN HEALTHCARE PTE LTD\nPHONE +65 6000 0001\nOPS@EXAMPLE.COM',

  referenceNumber: 'NLP-2026-0413',
  optionalShippingInfo1: '',
  optionalShippingInfo2: '',
  optionalShippingInfo3: '',

  airportOfDeparture: 'FRANKFURT AM MAIN (FRA)',
  routeTo1: 'SIN',
  routeBy1: 'LH',
  routeTo2: '',
  routeBy2: '',
  routeTo3: '',
  routeBy3: '',

  airportOfDestination: 'SINGAPORE CHANGI',
  flightNumber: 'LH778/14-MAR',
  flightDate: '',

  currency: 'EUR',
  wtValPPD: true,
  wtValCOLL: false,
  otherPPD: true,
  otherCOLL: false,
  declaredValueCarriage: 'NVD',
  declaredValueCustoms: 'NCV',
  insuranceAmount: 'XXX',

  handlingInformation:
    'TEMPERATURE CONTROLLED +2C/+8C - DO NOT FREEZE\nACTIVE COOL CONTAINER - KEEP UPRIGHT\nSHIPPER REF NLP-2026-0413',
  sci: '',

  rateItems: [
    {
      id: '1',
      pieces: '6',
      grossWeight: '148.0',
      weightUnit: 'K',
      rateClass: 'M',
      commodityItemNo: '',
      chargeableWeight: '210.0',
      rateCharge: '4.85',
      total: '1018.50',
      natureAndQuantity: 'PHARMACEUTICAL PRODUCTS, NON-HAZARDOUS\nACTIVE COOL CONTAINER\n120X100X162CM/2',
    },
  ],

  otherCharges: [
    { id: '1', description: 'AWB FEE',             amount: '45.00',  entitlement: 'DUE AGENT' },
    { id: '2', description: 'SECURITY SCREENING',  amount: '88.20',  entitlement: 'DUE CARRIER' },
    { id: '3', description: 'COOL CHAIN HANDLING', amount: '240.00', entitlement: 'DUE CARRIER' },
    { id: '4', description: 'FUEL SURCHARGE',      amount: '189.00', entitlement: 'DUE CARRIER' },
  ],

  weightChargePPD: '1018.50',
  weightChargeCOLL: '',
  valuationChargePPD: '',
  valuationChargeCOLL: '',
  taxPPD: '',
  taxCOLL: '',
  totalOtherChargesDueAgent: '45.00',
  totalOtherChargesDueCarrier: '517.20',
  totalPrepaid: '1580.70',
  totalCollect: '',

  currencyConversionRates: '',
  ccChargesInDestCurrency: '',
  chargesAtDestination: '',
  totalCollectCharges: '',

  executedOnDate: '14-MAR-2026',
  executedAtPlace: 'FRANKFURT',
  signatureShipper: 'NORDLICHT PHARMA GMBH',
  signatureCarrier: '',

  isDraft: true,
  copyNumber: 2,
  copyLabel: 'Original 2 (for Consignee)',
}
