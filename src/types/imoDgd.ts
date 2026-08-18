export interface IMODGDItem {
  id: string
  unIdNo: string
  properShippingName: string
  classDivision: string
  subsidiaryRisk: string
  packingGroup: 'I' | 'II' | 'III' | ''
  flashPoint: string
  marinePollutant: boolean
  emsNumber: string
  packagesAndType: string
  netQuantity: string
  grossMass: string
}

export interface IMODGDData {
  docType: 'imo_dgd'

  // Header — IMO/IMDG Dangerous Goods Declaration (FAL form 7 layout)
  referenceNumber: string
  bookingNumber: string
  blNumber: string

  shipperNameAndAddress: string
  consigneeNameAndAddress: string
  carrier: string
  freightForwarder: string

  // Transport
  vesselVoyageNo: string
  portOfLoading: string
  portOfDischarge: string
  destination: string
  containerNumber: string
  sealNumber: string
  containerType: string

  // Dangerous goods
  items: IMODGDItem[]
  additionalHandling: string

  // Certification
  signatoryName: string
  signatoryTitle: string
  signaturePlace: string
  signatureDate: string
  notes: string

  // Meta
  isDraft: boolean
}

export const emptyIMODGDItem = (id: string): IMODGDItem => ({
  id,
  unIdNo: '',
  properShippingName: '',
  classDivision: '',
  subsidiaryRisk: '',
  packingGroup: '',
  flashPoint: '',
  marinePollutant: false,
  emsNumber: '',
  packagesAndType: '',
  netQuantity: '',
  grossMass: '',
})

export const defaultIMODGDData: IMODGDData = {
  docType: 'imo_dgd',
  referenceNumber: '',
  bookingNumber: '',
  blNumber: '',
  shipperNameAndAddress: '',
  consigneeNameAndAddress: '',
  carrier: '',
  freightForwarder: '',
  vesselVoyageNo: '',
  portOfLoading: '',
  portOfDischarge: '',
  destination: '',
  containerNumber: '',
  sealNumber: '',
  containerType: '',
  items: [emptyIMODGDItem('1')],
  additionalHandling: '',
  signatoryName: '',
  signatoryTitle: '',
  signaturePlace: '',
  signatureDate: '',
  notes: '',
  isDraft: true,
}
