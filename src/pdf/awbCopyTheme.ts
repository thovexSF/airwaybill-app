import { AWB_FIELD_LAYOUT_REV } from './awbFieldPositions'

/**
 * The eight IATA copies. Each is issued on its own colour of paper and printed
 * in its own ink, so the blank form comes as one rasterisation per copy —
 * `public/awb-copies/N.png`, the awbeditor "SET COMPLETO" sheets shared with
 * the sister `b2b` repo. `ink` is the colour of that sheet and of the stamp.
 * Typed values, and the contract on the reverse, stay black on every copy.
 *
 * Copies 6 to 8 are extra copies and share sheet 5, printed in black.
 */
export interface AwbCopyTheme {
  key: string
  label: string
  /** Colour of the printed form. Typed values and the contract stay black. */
  ink: string
  /** Tint of the form's shaded boxes. */
  wash: string
  /** Colour of the copy label printed at the foot of the sheet. */
  footer: string
  /** The blank sheet for this copy. */
  bg: string
  /** Coloured crop of the IATA mark. The reverse always prints the black one. */
  mark: string
}

const copyBg = (file: string) => `/awb-copies/${file}?v=${AWB_FIELD_LAYOUT_REV}`
const copyMark = (file: string) => `/awb-iata/${file}`

export const AWB_COPY_THEMES: Record<string, AwbCopyTheme> = {
  '1': { key: '1', footer: '#a00000', label: 'Original 1 (for Issuing Carrier)', ink: '#006900', wash: '#cdffcd', bg: copyBg('1.png'), mark: copyMark('1.png') },
  '2': { key: '2', footer: '#bf3660', label: 'Original 2 (for Consignee)',       ink: '#bd2a56', wash: '#ffeef9', bg: copyBg('2.png'), mark: copyMark('2.png') },
  '3': { key: '3', footer: '#ac2121', label: 'Original 3 (for Shipper)',         ink: '#00007d', wash: '#b4b4ff', bg: copyBg('3.png'), mark: copyMark('3.png') },
  '4': { key: '4', footer: '#a00000', label: 'Copy 4 (Delivery Receipt)',        ink: '#876d00', wash: '#ffffc8', bg: copyBg('4.png'), mark: copyMark('4.png') },
  '5': { key: '5', footer: '#a00000', label: 'Copy 5 (Extra Copy)',              ink: '#000000', wash: '#b4b4b4', bg: copyBg('5.png'), mark: copyMark('5.png') },
  '6': { key: '6', footer: '#a00000', label: 'Copy 6 (Extra Copy)',              ink: '#000000', wash: '#b4b4b4', bg: copyBg('5.png'), mark: copyMark('5.png') },
  '7': { key: '7', footer: '#a00000', label: 'Copy 7 (Extra Copy)',              ink: '#000000', wash: '#b4b4b4', bg: copyBg('5.png'), mark: copyMark('5.png') },
  '8': { key: '8', footer: '#a00000', label: 'Copy 8 (for Agent)',               ink: '#000000', wash: '#b4b4b4', bg: copyBg('5.png'), mark: copyMark('5.png') },
}

export const AWB_COPIES = Object.values(AWB_COPY_THEMES)
export const DEFAULT_COPIES = ['1', '2', '3']

export function awbCopyTheme(copyKey: string | number | undefined): AwbCopyTheme {
  return AWB_COPY_THEMES[String(copyKey)] ?? AWB_COPY_THEMES['1']
}
