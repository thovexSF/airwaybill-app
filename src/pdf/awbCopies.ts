/**
 * The set of sheets an air waybill is issued in. On pre-printed IATA stationery
 * each one comes on its own colour of paper — that colour is how a handler
 * tells them apart on a counter, so we print it rather than relying on the
 * caption alone.
 *
 * Copies 5 to 8 are plain white on real stock; they get a neutral grey here so
 * the band stays visible on screen and on a black-and-white printer.
 */
export interface CopyStyle {
  key: string
  label: string
  /** Paper colour of the pre-printed original. */
  color: string
  /** Text colour that stays legible on `color`. */
  ink: string
}

export const AWB_COPIES: CopyStyle[] = [
  { key: '1', label: 'ORIGINAL 1 (FOR ISSUING CARRIER)', color: '#1E7A46', ink: '#FFFFFF' },
  { key: '2', label: 'ORIGINAL 2 (FOR CONSIGNEE)',       color: '#E8A0B4', ink: '#3A0E1C' },
  { key: '3', label: 'ORIGINAL 3 (FOR SHIPPER)',         color: '#2E6BB8', ink: '#FFFFFF' },
  { key: '4', label: 'COPY 4 (DELIVERY RECEIPT)',        color: '#E8C33A', ink: '#3A2E00' },
  { key: '5', label: 'COPY 5 (AIRPORT OF DESTINATION)',  color: '#D9D9D9', ink: '#222222' },
  { key: '6', label: 'COPY 6 (THIRD CARRIER)',           color: '#D9D9D9', ink: '#222222' },
  { key: '7', label: 'COPY 7 (SECOND CARRIER)',          color: '#D9D9D9', ink: '#222222' },
  { key: '8', label: 'COPY 8 (FOR AGENT)',               color: '#D9D9D9', ink: '#222222' },
]

export const DEFAULT_COPIES = ['1', '2', '3']

export function copyStyle(key: string | number | undefined): CopyStyle {
  return AWB_COPIES.find((c) => c.key === String(key)) ?? AWB_COPIES[0]
}
