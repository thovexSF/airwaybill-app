/**
 * Smoke-check for FWB/17 builder (no Jest in this repo).
 * Run: npx tsx scripts/check-fwb.ts
 */
import { buildFwb17, validateAwbCheckDigitFwb } from '../src/lib/fwbCargoImp'

const SAMPLE = {
  awbPrefix: '045',
  awbSerial: '11148060',
  airportOfDeparture: 'SCL',
  airportOfDestination: 'MIA',
  numberOfPieces: 10,
  grossWeight: 250,
  weightUnit: 'K',
  flightNumber: 'LA600/15-08',
  routeTo1: 'MIA',
  routeBy1: 'LA',
  shipperNameAndAddress: 'VYS VIVOS SPA\nAV PROVIDENCIA 100\nSANTIAGO',
  shipperCountry: 'CL',
  consigneeNameAndAddress: 'ACME LOGISTICS\n100 NW 25TH ST\nMIAMI FL',
  consigneeCountry: 'US',
  agentNameAndCity: 'B2B EXPRESS S.A.\nSCL',
  agentIataCode: '75-1-9012/0014',
  currency: 'USD',
  chgsCode: 'PP',
  valueForCarriage: 'NVD',
  valueForCustoms: 'NCV',
  insuranceAmount: 'XXX',
  natureAndQuantityOfGoods: 'PERISHABLE CARGO LIVE',
  rateLines: [
    {
      pieces: 10,
      grossWeight: 250,
      weightUnit: 'K',
      rateClass: 'Q',
      chargeableWeight: 250,
      rate: 2.5,
      total: 625,
      natureAndQuantity: 'PERISHABLE CARGO LIVE',
    },
  ],
  weightChargePrepaid: 625,
  executedOnDate: '2026-08-15',
  executedAtPlace: 'SANTIAGO',
  signatureOfIssuingCarrierOrAgent: 'B2B EXPRESS S.A.',
}

let failed = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else {
    console.log('ok:', msg)
  }
}

assert(validateAwbCheckDigitFwb('045-11148060'), 'check digit ok')
assert(!validateAwbCheckDigitFwb('045-11148061'), 'check digit bad')

const result = buildFwb17(SAMPLE)
assert(result.ok, 'build ok')
assert(result.message.startsWith('FWB/17'), 'starts FWB/17')
assert(result.message.includes('045-11148060SCLMIA/T10K250'), 'consignment')
assert(result.message.includes('EAW'), 'SPH EAW')
assert(result.message.includes('ISU/'), 'ISU')
assert(result.message.includes('NAM/VYS VIVOS SPA'), 'shipper name')

const bad = buildFwb17({ awbPrefix: '045', awbSerial: '11148060' })
assert(!bad.ok, 'blocks incomplete')

if (failed) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll FWB checks passed')
