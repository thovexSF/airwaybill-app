import { DGDData, DGDItem } from '../types/dgd'

/**
 * The shipper's package sticker, the same job as the NiceLabel "UN …" templates:
 * shipper, consignee, proper shipping name, UN number and quantity on one
 * 10×15 cm label (the Zebra stock). OVERPACK is one more label after the
 * packages, with the word required by the DGR and the text typed at the bottom.
 */
export interface ShipperSticker {
  shipper: string
  consignee: string
  overpack: boolean
  /** Proper shipping name. Empty on an overpack label. */
  title: string
  un: string
  quantity: string
  /** Editable bottom text. Only the overpack label prints it. */
  footer: string
}

function unLine(un: string): string {
  const t = un.trim().toUpperCase()
  if (!t) return ''
  if (/^(UN|ID)\d/.test(t)) return t.replace(/^(UN|ID)/, '$1 ')
  return /^(UN|ID)\b/.test(t) ? t : `UN ${t}`
}

function filled(item: DGDItem): boolean {
  return !!(item.unIdNo.trim() || item.properShippingName.trim() || item.quantity.trim())
}

export function suggestOverpackText(d: DGDData): string {
  return d.items
    .filter(filled)
    .map(it => [unLine(it.unIdNo), it.properShippingName.trim(), it.quantity.trim()].filter(Boolean).join(' '))
    .join('\n')
}

/** Item labels, plus the OVERPACK sheet when `includeOverpack` is set. */
export function shipperStickers(d: DGDData, includeOverpack = !!d.overpack): ShipperSticker[] {
  const shipper = d.shipperNameAndAddress || ''
  const consignee = d.consigneeNameAndAddress || ''
  const items = d.items.filter(filled)
  const stickers: ShipperSticker[] = items.map(it => ({
    shipper,
    consignee,
    overpack: false,
    title: (it.properShippingName || '').trim(),
    un: unLine(it.unIdNo || ''),
    quantity: (it.quantity || '').trim(),
    footer: '',
  }))
  if (!stickers.length && !includeOverpack) {
    stickers.push({ shipper, consignee, overpack: false, title: '', un: '', quantity: '', footer: '' })
  }
  if (includeOverpack) {
    stickers.push({
      shipper,
      consignee,
      overpack: true,
      title: '',
      un: '',
      quantity: '',
      footer: (d.overpackText || '').trim() || suggestOverpackText(d),
    })
  }
  return stickers
}

function zplEsc(s: string): string {
  return String(s || '').replace(/\\/g, '\\\\').replace(/\^/g, ' ').replace(/~/g, ' ')
}

function linesOf(s: string, max: number): string[] {
  return s.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, max)
}

export type QuarterTurn = 0 | 90 | 180 | 270

/** A 10×15 cm sticker the operator can edit before it goes to the Zebra. */
export interface EditableSticker extends ShipperSticker {
  id: string
  /** Included in the print. The card itself is the control — there is no checkbox. */
  selected: boolean
  fontScale: number
  /** 0 keeps the design horizontal on the 10×15 stock. */
  labelTurn: QuarterTurn
  textTurn: QuarterTurn
}

let stickerSeq = 0
export function stickerId(): string {
  stickerSeq += 1
  return `lbl-${Date.now().toString(36)}-${stickerSeq}`
}

export function toEditable(s: ShipperSticker, selected = true): EditableSticker {
  return { ...s, id: stickerId(), selected, fontScale: 1, labelTurn: 0, textTurn: 0 }
}

export function blankEditable(from?: Partial<ShipperSticker>): EditableSticker {
  return toEditable({
    shipper: from?.shipper || '',
    consignee: from?.consignee || '',
    overpack: !!from?.overpack,
    title: from?.title || '',
    un: from?.un || '',
    quantity: from?.quantity || '',
    footer: from?.footer || '',
  }, true)
}

const ORI = ['N', 'R', 'I', 'B'] as const

/** 203 dpi. Stock is always 10×15 cm (800×1200). Turn 0 lays the design along the 15 cm side. */
export function buildStickersZpl(stickers: EditableSticker[]): string {
  return stickers.filter(s => s.selected).map(stickerZpl).join('\n')
}

function stickerZpl(s: EditableSticker): string {
  const sc = Math.min(2, Math.max(0.7, s.fontScale || 1))
  const h = (n: number) => Math.max(12, Math.round(n * sc))
  // 0: text reads along the 15 cm (^A0R). 90: across the 10 cm, the old portrait.
  const wide = s.labelTurn === 0 || s.labelTurn === 180
  const ori = ORI[((wide ? 1 : 0) + (s.labelTurn === 180 || s.labelTurn === 270 ? 2 : 0) + s.textTurn / 90) % 4]
  const out: string[] = ['^XA', '^PW800', '^LL1200', '^LH0,0', '^CI28']
  const put = (dx: number, dy: number, size: number, text: string) => {
    const t = text.trim()
    if (!t) return
    // Design is 1200 along the length and 800 across. On the wide stock ^A0R runs in +Y.
    const x = wide ? Math.round(s.labelTurn === 180 ? 800 - dy : dy) : Math.round(dx * 800 / 1200)
    const y = wide ? Math.round(s.labelTurn === 180 ? 1200 - dx : dx) : Math.round(dy * 1200 / 800)
    out.push(`^FO${Math.max(0, x)},${Math.max(0, y)}^A0${ori},${size},${size}^FD${zplEsc(t)}^FS`)
  }
  const block = (dx: number, dy: number, size: number, text: string, step: number, max: number) => {
    linesOf(text, max).forEach((line, i) => put(dx, dy + i * step, size, line))
  }
  put(24, 16, h(20), 'SHIPPER:')
  block(24, 42, h(24), s.shipper.toUpperCase(), h(28), 3)
  put(24, 150, h(20), 'CONSIGNEE:')
  block(24, 176, h(24), s.consignee.toUpperCase(), h(28), 3)
  if (s.overpack) {
    put(280, 400, h(64), 'OVERPACK')
    block(24, 620, h(22), s.footer, h(26), 5)
  } else {
    block(80, 390, h(36), s.title.toUpperCase(), h(42), 3)
    put(24, 680, h(48), s.un)
    put(640, 700, h(28), s.quantity)
  }
  out.push('^XZ')
  return out.join('\n')
}

/** 203 dpi, 100 × 150 mm. One ^XA per sticker so they print in order. */
export function buildShipperLabelZpl(d: DGDData, includeOverpack = !!d.overpack): string {
  return buildStickersZpl(shipperStickers(d, includeOverpack).map(s => toEditable(s)))
}
