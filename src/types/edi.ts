/**
 * IATA Cargo-IMP message data models (FWB — freight waybill, FHL — house
 * manifest, FFR — space allocation request), ported from the B2B AWB suite.
 *
 * The forms capture the message fields; `src/lib/ediMessage.ts` serialises
 * them to the Cargo-IMP text body that is handed to the airline.
 */

export type EdiMessageType = 'fwb' | 'fhl' | 'ffr'

export interface PartyContact {
  type: string
  value: string
}

export const CONTACT_TYPES = ['TE', 'FX', 'EM', 'TLX'] as const

export interface Party {
  accountNumber: string
  name: string
  street: string
  place: string
  state: string
  country: string
  postCode: string
  contacts: PartyContact[]
}

export const emptyParty = (): Party => ({
  accountNumber: '',
  name: '',
  street: '',
  place: '',
  state: '',
  country: '',
  postCode: '',
  contacts: [{ type: 'TE', value: '' }],
})

export const SPH_CODES = [
  { code: 'PER', label: 'PER — Perishable cargo' },
  { code: 'XPS', label: 'XPS — Priority small package' },
  { code: 'COL', label: 'COL — Cool goods' },
  { code: 'AVI', label: 'AVI — Live animal' },
  { code: 'PES', label: 'PES — Fish / seafood' },
  { code: 'CAT', label: 'CAT — Cargo attendant accompanying shipment' },
] as const

export interface AccountingEntry {
  id: string
  code: string
  information: string
}

export interface CustomsEntry {
  id: string
  country: string
  infoId: string
  cusId: string
  information: string
}

/* ───────────────────────── FWB ───────────────────────── */

export interface FwbData {
  docType: 'fwb'
  version: string

  awbPrefix: string
  awbSerial: string

  origin: string
  destination: string

  shipper: Party
  consignee: Party

  agentName: string
  agentPlace: string
  agentIata: string
  agentCass: string
  agentAccount: string

  pieces: string
  weight: string
  weightUnit: string
  slac: string
  description: string

  accounting: AccountingEntry[]
  refNumber: string
  refCode: string

  currency: string
  valueCarriage: string
  valueCustoms: string
  insurance: string

  sph: string[]
  sphOther: string

  notes: string
  isDraft: boolean
}

export const defaultFwbData: FwbData = {
  docType: 'fwb',
  version: 'FWB/17',
  awbPrefix: '',
  awbSerial: '',
  origin: '',
  destination: '',
  shipper: emptyParty(),
  consignee: emptyParty(),
  agentName: '',
  agentPlace: '',
  agentIata: '',
  agentCass: '',
  agentAccount: '',
  pieces: '',
  weight: '',
  weightUnit: 'K',
  slac: '',
  description: '',
  accounting: [],
  refNumber: '',
  refCode: '',
  currency: 'USD',
  valueCarriage: 'NVD',
  valueCustoms: 'NCV',
  insurance: 'XXX',
  sph: [],
  sphOther: '',
  notes: '',
  isDraft: true,
}

/* ───────────────────────── FHL ───────────────────────── */

export interface FhlData {
  docType: 'fhl'
  version: string

  awbPrefix: string
  awbSerial: string
  mOrigin: string
  mDest: string
  mPieces: string
  mWeight: string
  mWeightUnit: string

  hwbNumber: string
  hOrigin: string
  hDest: string
  hPieces: string
  hWeight: string
  hWeightUnit: string
  slac: string
  description: string

  shipper: Party
  consignee: Party

  sph: string[]
  sphOther: string
  security: string

  currency: string
  valueCarriage: string
  valueCustoms: string
  insurance: string

  extendedDescription: string
  hsCodes: string
  customs: CustomsEntry[]

  notes: string
  isDraft: boolean
}

export const defaultFhlData: FhlData = {
  docType: 'fhl',
  version: 'FHL/4',
  awbPrefix: '',
  awbSerial: '',
  mOrigin: '',
  mDest: '',
  mPieces: '',
  mWeight: '',
  mWeightUnit: 'K',
  hwbNumber: '',
  hOrigin: '',
  hDest: '',
  hPieces: '',
  hWeight: '',
  hWeightUnit: 'K',
  slac: '',
  description: '',
  shipper: emptyParty(),
  consignee: emptyParty(),
  sph: [],
  sphOther: '',
  security: '',
  currency: 'USD',
  valueCarriage: 'NVD',
  valueCustoms: 'NCV',
  insurance: 'XXX',
  extendedDescription: '',
  hsCodes: '',
  customs: [],
  notes: '',
  isDraft: true,
}

/* ───────────────────────── FFR ───────────────────────── */

export interface FfrFlight {
  id: string
  flight: string
  day: string
  month: string
  origin: string
  destination: string
  spaceCode: string
  allotment: string
}

export interface FfrUld {
  id: string
  type: string
  serial: string
  owner: string
  loadingIndicator: string
  weight: string
  weightUnit: string
}

export interface FfrDimension {
  id: string
  length: string
  width: string
  height: string
  unit: string
  pieces: string
  weight: string
  weightUnit: string
}

export interface FfrData {
  docType: 'ffr'

  awbPrefix: string
  awbSerial: string

  shipper: Party
  consignee: Party

  agentName: string
  agentPlace: string
  agentIata: string
  agentCass: string
  agentAccount: string

  origin: string
  destination: string

  shipmentDesc: string
  pieces: string
  totalPieces: string
  weight: string
  weightUnit: string
  volume: string
  volumeUnit: string
  densityGroup: string
  description: string

  refNumber: string
  refInfo1: string
  refInfo2: string
  eawb: string
  security: string

  sph: string[]
  sphOther: string
  ssr: string
  osi: string
  serviceCode: string
  rateClass: string

  dimensions: FfrDimension[]
  ulds: FfrUld[]
  flights: FfrFlight[]

  notes: string
  isDraft: boolean
}

export const emptyFfrDimension = (id: string): FfrDimension => ({
  id,
  length: '',
  width: '',
  height: '',
  unit: 'cm',
  pieces: '',
  weight: '',
  weightUnit: 'K',
})

export const emptyFfrUld = (id: string): FfrUld => ({
  id,
  type: '',
  serial: '',
  owner: '',
  loadingIndicator: '',
  weight: '',
  weightUnit: 'K',
})

export const emptyFfrFlight = (id: string): FfrFlight => ({
  id,
  flight: '',
  day: '',
  month: '',
  origin: '',
  destination: '',
  spaceCode: 'XX',
  allotment: '',
})

export const defaultFfrData: FfrData = {
  docType: 'ffr',
  awbPrefix: '',
  awbSerial: '',
  shipper: emptyParty(),
  consignee: emptyParty(),
  agentName: '',
  agentPlace: '',
  agentIata: '',
  agentCass: '',
  agentAccount: '',
  origin: '',
  destination: '',
  shipmentDesc: 'Total',
  pieces: '',
  totalPieces: '',
  weight: '',
  weightUnit: 'K',
  volume: '',
  volumeUnit: 'MC',
  densityGroup: '',
  description: '',
  refNumber: '',
  refInfo1: '',
  refInfo2: '',
  eawb: 'No',
  security: '',
  sph: [],
  sphOther: '',
  ssr: '',
  osi: '',
  serviceCode: '',
  rateClass: '',
  dimensions: [emptyFfrDimension('1')],
  ulds: [],
  flights: [emptyFfrFlight('1')],
  notes: '',
  isDraft: true,
}

export type EdiData = FwbData | FhlData | FfrData
