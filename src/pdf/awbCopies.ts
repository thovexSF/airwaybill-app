/**
 * The set of sheets an air waybill is issued in. On pre-printed IATA stationery
 * each one comes on its own colour of paper — that colour is how a handler
 * tells them apart on a counter, so we print it rather than relying on the
 * caption alone.
 *
 * Copies 5 to 8 are plain white on real stock, so their paper stays white and
 * only the footer band carries a neutral grey.
 */
export interface CopyStyle {
  key: string
  label: string
  /** The sheet's own colour — what the whole page is printed on. */
  paper: string
  /** Saturated version of it, for the footer band and the picker's swatch. */
  color: string
  /** Text colour that stays legible on `color`. */
  ink: string
}

export const AWB_COPIES: CopyStyle[] = [
  { key: '1', label: 'ORIGINAL 1 (FOR ISSUING CARRIER)', paper: '#DCEEE2', color: '#1E7A46', ink: '#FFFFFF' },
  { key: '2', label: 'ORIGINAL 2 (FOR CONSIGNEE)',       paper: '#FBE1E9', color: '#C4587E', ink: '#FFFFFF' },
  { key: '3', label: 'ORIGINAL 3 (FOR SHIPPER)',         paper: '#DCE7F6', color: '#2E6BB8', ink: '#FFFFFF' },
  { key: '4', label: 'COPY 4 (DELIVERY RECEIPT)',        paper: '#FBF2CE', color: '#B99320', ink: '#FFFFFF' },
  { key: '5', label: 'COPY 5 (AIRPORT OF DESTINATION)',  paper: '#FFFFFF', color: '#D9D9D9', ink: '#222222' },
  { key: '6', label: 'COPY 6 (THIRD CARRIER)',           paper: '#FFFFFF', color: '#D9D9D9', ink: '#222222' },
  { key: '7', label: 'COPY 7 (SECOND CARRIER)',          paper: '#FFFFFF', color: '#D9D9D9', ink: '#222222' },
  { key: '8', label: 'COPY 8 (FOR AGENT)',               paper: '#FFFFFF', color: '#D9D9D9', ink: '#222222' },
]

export const DEFAULT_COPIES = ['1', '2', '3']

export function copyStyle(key: string | number | undefined): CopyStyle {
  return AWB_COPIES.find((c) => c.key === String(key)) ?? AWB_COPIES[0]
}
