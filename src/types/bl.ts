export interface BLGoodsItem {
  id: string
  marks: string
  packages: string
  description: string
  weight: string
  measurement: string
}

export interface BLData {
  docType: 'bl'

  // Document identity
  blNumber: string
  documentNumber: string
  negotiable: 'Negotiable' | 'Non-Negotiable'
  numberOfOriginals: string

  // References
  carrierBookingNo: string
  exportReferences: string

  // Parties
  shipper: string
  consignee: string
  notifyParty: string
  agent: string
  carrierName: string

  // Carriage
  preCarriageBy: string
  vesselVoyageNo: string
  placeOfReceipt: string
  portOfLoading: string
  portOfDischarge: string
  placeOfDelivery: string

  // Goods
  goodsItems: BLGoodsItem[]

  // Charges
  freightAndCharges: string
  currency: string
  declaredValue: string

  // Issue
  placeOfIssue: string
  dateOfIssue: string
  notes: string

  // Meta
  isDraft: boolean
}

export const emptyBLGoodsItem = (id: string): BLGoodsItem => ({
  id,
  marks: '',
  packages: '',
  description: '',
  weight: '',
  measurement: '',
})

export const defaultBLData: BLData = {
  docType: 'bl',
  blNumber: '',
  documentNumber: '',
  negotiable: 'Negotiable',
  numberOfOriginals: '3',
  carrierBookingNo: '',
  exportReferences: '',
  shipper: '',
  consignee: '',
  notifyParty: '',
  agent: '',
  carrierName: '',
  preCarriageBy: '',
  vesselVoyageNo: '',
  placeOfReceipt: '',
  portOfLoading: '',
  portOfDischarge: '',
  placeOfDelivery: '',
  goodsItems: [emptyBLGoodsItem('1')],
  freightAndCharges: '',
  currency: 'USD',
  declaredValue: '',
  placeOfIssue: '',
  dateOfIssue: '',
  notes: '',
  isDraft: true,
}

export function blTotals(data: BLData): { weight: number; measurement: number } {
  return {
    weight: data.goodsItems.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0),
    measurement: data.goodsItems.reduce((s, i) => s + (parseFloat(i.measurement) || 0), 0),
  }
}
