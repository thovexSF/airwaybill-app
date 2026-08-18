export interface LabelData {
  docType: 'label'

  // Carrier
  airline: string

  // AWB reference
  awbPrefix: string
  awbSerial: string

  // Routing
  departure: string
  destination: string
  transit: string

  // Master shipment totals
  agent: string
  mawbPackages: string
  mawbWeight: string

  // House shipment (only printed when identifyPackages is on)
  identifyPackages: boolean
  hawbNumber: string
  hawbPackages: string
  hawbWeight: string

  // Piece numbering — one label per piece
  totalPieces: string
  pieceNumber: string

  optionalInformation: string

  // Meta
  isDraft: boolean
}

export const defaultLabelData: LabelData = {
  docType: 'label',
  airline: '',
  awbPrefix: '',
  awbSerial: '',
  departure: '',
  destination: '',
  transit: '',
  agent: '',
  mawbPackages: '',
  mawbWeight: '',
  identifyPackages: false,
  hawbNumber: '',
  hawbPackages: '',
  hawbWeight: '',
  totalPieces: '1',
  pieceNumber: '1',
  optionalInformation: '',
  isDraft: true,
}

/** "180" + "13723124" → "180-13723124" (empty parts are dropped). */
export function labelAwbNumber(data: Pick<LabelData, 'awbPrefix' | 'awbSerial'>): string {
  return [data.awbPrefix, data.awbSerial].filter(Boolean).join('-')
}
