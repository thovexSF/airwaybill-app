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

/** 203 dpi, 100 × 150 mm. One ^XA per sticker so they print in order. */
export function buildShipperLabelZpl(d: DGDData, includeOverpack = !!d.overpack): string {
  return shipperStickers(d, includeOverpack).map(sticker => {
    const out: string[] = ['^XA', '^PW800', '^LL1200', '^LH0,0', '^CI28']
    const block = (x: number, y: number, h: number, text: string, step: number, max: number) => {
      linesOf(text, max).forEach((line, i) => {
        out.push(`^FO${x},${y + i * step}^A0N,${h},${h}^FD${zplEsc(line)}^FS`)
      })
    }
    out.push('^FO24,24^A0N,26,26^FDSHIPPER:^FS')
    block(24, 58, 30, sticker.shipper.toUpperCase(), 36, 4)
    out.push('^FO24,230^A0N,26,26^FDCONSIGNEE:^FS')
    block(24, 264, 30, sticker.consignee.toUpperCase(), 36, 4)
    if (sticker.overpack) {
      out.push('^FO0,560^A0N,78,78^FB800,1,0,C^FDOVERPACK^FS')
      block(24, 900, 28, sticker.footer, 36, 6)
    } else {
      block(24, 520, 40, sticker.title.toUpperCase(), 48, 4)
      if (sticker.un) out.push(`^FO24,1040^A0N,64,64^FD${zplEsc(sticker.un)}^FS`)
      if (sticker.quantity) out.push(`^FO430,1060^A0N,40,40^FD${zplEsc(sticker.quantity)}^FS`)
    }
    out.push('^XZ')
    return out.join('\n')
  }).join('\n')
}
