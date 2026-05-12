export interface DGDItem {
  id: string
  unIdNo: string
  properShippingName: string
  classDivision: string
  subsidiaryRisk: string
  packingGroup: 'I' | 'II' | 'III' | ''
  quantity: string
  packingInstruction: string
  authorization: string
}

export interface DGDData {
  docType: 'dgd'

  // Header
  shipperNameAndAddress: string
  consigneeNameAndAddress: string
  awbNo: string
  pageOf: string
  shipperReference: string

  // Transport
  airportOfDeparture: string
  airportOfDestination: string
  shipmentType: 'passenger_and_cargo' | 'cargo_only'

  // Dangerous goods table
  items: DGDItem[]

  // Additional handling
  additionalHandling: string

  // Certification / signature
  signatoryName: string
  signatoryTitle: string
  signaturePlace: string
  signatureDate: string

  // Meta
  isDraft: boolean
}

export const defaultDGDData: DGDData = {
  docType: 'dgd',
  shipperNameAndAddress: '',
  consigneeNameAndAddress: '',
  awbNo: '',
  pageOf: '1 of 1',
  shipperReference: '',
  airportOfDeparture: '',
  airportOfDestination: '',
  shipmentType: 'cargo_only',
  items: [
    { id: '1', unIdNo: '', properShippingName: '', classDivision: '', subsidiaryRisk: '', packingGroup: '', quantity: '', packingInstruction: '', authorization: '' },
  ],
  additionalHandling: '',
  signatoryName: '',
  signatoryTitle: '',
  signaturePlace: '',
  signatureDate: '',
  isDraft: true,
}
