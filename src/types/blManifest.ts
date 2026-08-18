export interface BLManifestItem {
  id: string
  hbl: string
  marks: string
  packages: string
  weight: string
  measurement: string
}

export interface BLManifestData {
  docType: 'bl_manifest'

  masterBl: string
  carrier: string
  vesselVoyageNo: string
  manifestDate: string

  shipper: string
  consignee: string

  origin: string
  destination: string

  items: BLManifestItem[]
  notes: string

  // Meta
  isDraft: boolean
}

export const emptyBLManifestItem = (id: string): BLManifestItem => ({
  id,
  hbl: '',
  marks: '',
  packages: '',
  weight: '',
  measurement: '',
})

export const defaultBLManifestData: BLManifestData = {
  docType: 'bl_manifest',
  masterBl: '',
  carrier: '',
  vesselVoyageNo: '',
  manifestDate: '',
  shipper: '',
  consignee: '',
  origin: '',
  destination: '',
  items: [emptyBLManifestItem('1')],
  notes: '',
  isDraft: true,
}

export function blManifestTotals(data: BLManifestData): { weight: number; measurement: number } {
  return {
    weight: data.items.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0),
    measurement: data.items.reduce((s, i) => s + (parseFloat(i.measurement) || 0), 0),
  }
}
