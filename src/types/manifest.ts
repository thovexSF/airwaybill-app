export interface ManifestRow {
  id: string
  awbNumber: string
  shipperName: string
  consigneeName: string
  pieces: string
  grossWeight: string
  chargeableWeight: string
  natureOfGoods: string
  specialHandling: string
}

export interface ManifestData {
  docType: 'manifest'

  // Flight header
  flightNumber: string
  airline: string
  flightDate: string
  originStation: string
  destinationStation: string

  // AWB rows
  rows: ManifestRow[]

  // Prepared by
  preparedBy: string
  preparedDate: string

  // Meta
  isDraft: boolean
}

export const defaultManifestData: ManifestData = {
  docType: 'manifest',
  flightNumber: '',
  airline: '',
  flightDate: '',
  originStation: '',
  destinationStation: '',
  rows: [
    { id: '1', awbNumber: '', shipperName: '', consigneeName: '', pieces: '', grossWeight: '', chargeableWeight: '', natureOfGoods: '', specialHandling: '' },
  ],
  preparedBy: '',
  preparedDate: '',
  isDraft: true,
}
