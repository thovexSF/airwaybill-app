import { DGDData, DGDItem } from '../types/dgd'
import { LabelDesign, LabelValues, canvasToZpl, cloneDesign, defaultItemDesign, defaultOverpackDesign, renderStock } from './labelDesign'
import { DOTS_PER_MM, loadPrintOffsetMm } from './labelZpl'

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

/** A 10×15 cm sticker the operator can edit before it goes to the Zebra. */
export interface EditableSticker extends ShipperSticker {
  id: string
  /** Included in the print. */
  selected: boolean
  design: LabelDesign
  /** Organization template the design came from, if any. */
  templateId?: string
}

let stickerSeq = 0
export function stickerId(): string {
  stickerSeq += 1
  return `lbl-${Date.now().toString(36)}-${stickerSeq}`
}

export function toEditable(s: ShipperSticker, selected = true, design?: LabelDesign): EditableSticker {
  const base = design ?? (s.overpack ? defaultOverpackDesign() : defaultItemDesign())
  return { ...s, id: stickerId(), selected, design: cloneDesign(base) }
}

export function blankEditable(from?: Partial<ShipperSticker>, design?: LabelDesign): EditableSticker {
  return toEditable({
    shipper: from?.shipper || '',
    consignee: from?.consignee || '',
    overpack: !!from?.overpack,
    title: from?.title || '',
    un: from?.un || '',
    quantity: from?.quantity || '',
    footer: from?.footer || '',
  }, true, design)
}

export function stickerValues(s: ShipperSticker): LabelValues {
  return { shipper: s.shipper, consignee: s.consignee, title: s.title, un: s.un, quantity: s.quantity, footer: s.footer }
}

/** One ^XA per sticker so they print in order, each the exact bitmap the editor shows. */
export function buildStickersZpl(stickers: EditableSticker[]): string {
  const mm = loadPrintOffsetMm()
  const offset = { x: Math.round(mm.x * DOTS_PER_MM), y: Math.round(mm.y * DOTS_PER_MM) }
  return stickers
    .filter(s => s.selected)
    .map(s => canvasToZpl(renderStock(s.design, stickerValues(s), offset)))
    .join('\n')
}
