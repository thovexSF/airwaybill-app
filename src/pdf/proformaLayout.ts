import { ProformaData, ProformaLineItem, lineAmount, proformaTotals } from '../types/proforma'

/**
 * Fixed geometry of the proforma, in PDF points on a US Letter page. Imported
 * by both `ProformaDocument` (the PDF) and `ProformaOverlay` (the inputs laid
 * over the preview), so what is typed on screen sits exactly where it prints.
 */
export const PAGE_WIDTH = 612
export const PAGE_HEIGHT = 792
export const LEADING = 11
export const LINE_ROWS = 12
export const RED = '#8B0000'

const M = 28
const W = PAGE_WIDTH - 2 * M
const PAD = 5
const LBL = 14
const ROW_H = 15
const LOGO_RATIO = 577 / 238

export interface LogoBox { x: number; y: number; w: number; h: number }

/** The "Issued by" box; the logo lives anywhere inside it below the caption. */
export const SELLER_BOX = { x: M, y: 56, w: W * 0.48, h: 96 }
const LOGO_MIN_H = 12

/** Keeps a logo inside the seller box, below its caption, at a usable size. */
export function clampLogo(b: LogoBox): LogoBox {
  const minX = SELLER_BOX.x + 2, maxX = SELLER_BOX.x + SELLER_BOX.w - 2
  const minY = SELLER_BOX.y + LBL, maxY = SELLER_BOX.y + SELLER_BOX.h - 2
  const ratio = b.w / b.h
  let h = Math.max(LOGO_MIN_H, Math.min(b.h, maxY - minY, (maxX - minX) / ratio))
  const w = h * ratio
  h = w / ratio
  const x = Math.min(Math.max(b.x, minX), maxX - w)
  const y = Math.min(Math.max(b.y, minY), maxY - h)
  return { x, y, w, h }
}

export function logoBoxFor(data: ProformaData): LogoBox | null {
  if (!data.sellerLogo) return null
  const h = 30
  return clampLogo(data.sellerLogoBox ?? { x: SELLER_BOX.x + PAD, y: SELLER_BOX.y + LBL, w: h * LOGO_RATIO, h })
}

/** Same size and height, centred across the seller box. */
export function centeredLogo(b: LogoBox): LogoBox {
  return clampLogo({ ...b, x: SELLER_BOX.x + (SELLER_BOX.w - b.w) / 2 })
}

export interface PfBox { x: number; y: number; w: number; h: number; label?: string; fill?: string }
export interface PfCaption { x: number; y: number; text: string; size?: number; bold?: boolean; align?: 'left' | 'right'; w?: number }
export interface PfLine { x: number; y: number; w: number }
export interface PfField {
  key: string
  x: number; y: number; w: number; h: number
  fontSize?: number
  bold?: boolean
  multiline?: boolean
  align?: 'left' | 'center' | 'right'
  /** Computed by the PDF (amounts, totals); the overlay never draws it. */
  readOnly?: boolean
  placeholder?: string
}

export interface ProformaLayout {
  boxes: PfBox[]
  captions: PfCaption[]
  lines: PfLine[]
  fields: PfField[]
  logo: LogoBox | null
}

export type ProformaLang = 'en' | 'es'

/** Printed captions. Only the form's own words change language; what was typed is printed as typed. */
const LABELS = {
  en: {
    title: 'PROFORMA INVOICE', seller: 'Issued by (seller)', date: 'Date', number: 'Proforma invoice number',
    refs: 'Other references', shipper: 'Shipper', consignee: 'Consignee', buyer: 'Bill to (buyer)',
    origin: 'Origin', destination: 'Destination', currency: 'Currency', transport: 'Transport details',
    terms: 'Terms of delivery and payment', incoterms: 'Incoterms', payment: 'Payment terms',
    heads: ['Description', 'Quantity', 'Unit price/rate', 'Tax', 'Amount'],
    totals: ['Subtotal', 'Tax', 'Total'], sellerAuth: "Seller's authentication", buyerAuth: "Buyer's acceptance",
    authCols: ['date', 'place', 'signature'], bank: 'Bank:', notes: 'Notes:',
  },
  es: {
    title: 'FACTURA PROFORMA', seller: 'Emitida por (vendedor)', date: 'Fecha', number: 'N° de factura proforma',
    refs: 'Otras referencias', shipper: 'Embarcador', consignee: 'Consignatario', buyer: 'Facturar a (comprador)',
    origin: 'Origen', destination: 'Destino', currency: 'Moneda', transport: 'Detalles del transporte',
    terms: 'Condiciones de entrega y pago', incoterms: 'Incoterms', payment: 'Condiciones de pago',
    heads: ['Descripción', 'Cantidad', 'Precio unitario', 'Impuesto', 'Monto'],
    totals: ['Subtotal', 'Impuesto', 'Total'], sellerAuth: 'Autenticación del vendedor', buyerAuth: 'Aceptación del comprador',
    authCols: ['fecha', 'lugar', 'firma'], bank: 'Banco:', notes: 'Notas:',
  },
}

export const proformaLabels = (data: ProformaData) => LABELS[data.language === 'es' ? 'es' : 'en']

// Helvetica capitals run about 0.6 em; erring wide only ever adds a blank line to a row.
const CHAR_EM = 0.6
const ITEM_FS = 9

/** Lines a cell takes once wrapped to its width; a row is as tall as its tallest cell. */
function wrappedLines(text: string, width: number): number {
  const perLine = Math.max(1, Math.floor(width / (CHAR_EM * ITEM_FS)))
  return String(text ?? '').split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0)
}

const COLS = (() => {
  const widths = [0.46, 0.12, 0.16, 0.12, 0.14].map(p => p * W)
  let x = M
  return widths.map(w => { const c = { x, w }; x += w; return c })
})()

export function proformaLayout(data: ProformaData): ProformaLayout {
  const logo = logoBoxFor(data)
  const L = proformaLabels(data)
  const boxes: PfBox[] = []
  const captions: PfCaption[] = []
  const lines: PfLine[] = []
  const fields: PfField[] = []
  const box = (b: PfBox) => { boxes.push(b); return b }
  const one = LEADING + 2

  // ── Seller | date / number / references ──
  const sellerW = W * 0.48
  const rightX = M + sellerW
  const rightW = W - sellerW
  const seller = box({ ...SELLER_BOX, label: L.seller })
  // The seller's text starts under the logo wherever it was put, keeping at least one line.
  const sellerTop = Math.min(Math.max(seller.y + LBL, logo ? logo.y + logo.h + 4 : 0), seller.y + seller.h - PAD - LEADING)
  fields.push({ key: 'seller', x: seller.x + PAD, y: sellerTop, w: seller.w - 2 * PAD, h: seller.y + seller.h - PAD - sellerTop, multiline: true })

  const date = box({ x: rightX, y: 56, w: rightW / 2, h: 48, label: L.date })
  fields.push({ key: 'issueDate', x: date.x + PAD, y: date.y + LBL + 2, w: date.w - 2 * PAD, h: one, fontSize: 10, placeholder: 'YYYY-MM-DD' })
  const num = box({ x: rightX + rightW / 2, y: 56, w: rightW / 2, h: 48, label: L.number })
  fields.push({ key: 'proformaNumber', x: num.x + PAD, y: num.y + LBL + 2, w: num.w - 2 * PAD, h: one, fontSize: 11, bold: true })

  const refs = box({ x: rightX, y: 104, w: rightW, h: 48, label: L.refs })
  captions.push({ x: refs.x + PAD, y: refs.y + LBL + 2, text: 'AWB', size: 7, bold: true })
  fields.push({ key: 'awbNumber', x: refs.x + PAD + 24, y: refs.y + LBL, w: refs.w - 2 * PAD - 24, h: one })
  fields.push({ key: 'otherReferences', x: refs.x + PAD, y: refs.y + LBL + one + 2, w: refs.w - 2 * PAD, h: one })

  // ── Shipper / consignee | buyer ──
  for (const [key, label, y] of [['shipper', L.shipper, 152], ['consignee', L.consignee, 240]] as const) {
    const b = box({ x: M, y, w: sellerW, h: 88, label })
    fields.push({ key, x: b.x + PAD, y: b.y + LBL, w: b.w - 2 * PAD, h: b.h - LBL - PAD, multiline: true })
  }
  const buyer = box({ x: rightX, y: 152, w: rightW, h: 176, label: L.buyer })
  fields.push({ key: 'buyer', x: buyer.x + PAD, y: buyer.y + LBL, w: buyer.w - 2 * PAD, h: buyer.h - LBL - PAD, multiline: true })

  // ── Origin / destination / currency ──
  let x = M
  for (const [key, label, pct] of [['origin', L.origin, 0.4], ['destination', L.destination, 0.4], ['currency', L.currency, 0.2]] as const) {
    const b = box({ x, y: 328, w: W * pct, h: 34, label })
    fields.push({ key, x: b.x + PAD, y: b.y + LBL + 2, w: b.w - 2 * PAD, h: one, fontSize: 10 })
    x += b.w
  }

  // ── Transport / terms ──
  const transport = box({ x: M, y: 362, w: W / 2, h: 46, label: L.transport })
  fields.push({ key: 'transportDetails', x: transport.x + PAD, y: transport.y + LBL, w: transport.w - 2 * PAD, h: transport.h - LBL - PAD, multiline: true })
  const terms = box({ x: M + W / 2, y: 362, w: W / 2, h: 46, label: L.terms })
  fields.push({ key: 'incoterms', x: terms.x + PAD, y: terms.y + LBL, w: terms.w - 2 * PAD, h: one, placeholder: L.incoterms })
  fields.push({ key: 'paymentTerms', x: terms.x + PAD, y: terms.y + LBL + one, w: terms.w - 2 * PAD, h: one, placeholder: L.payment })

  // ── Line items ──
  const headY = 408
  const bodyY = headY + 18
  const bodyH = LINE_ROWS * ROW_H + 4
  COLS.forEach((c, i) => {
    box({ x: c.x, y: headY, w: c.w, h: 18, label: L.heads[i], fill: '#faf0f0' })
    box({ x: c.x, y: bodyY, w: c.w, h: bodyH })
  })
  // Every cell is free text: Enter breaks the line and the item's row grows to
  // its tallest cell. One empty row follows the last item to start the next.
  const [desc, qty, rate, tax, amt] = COLS
  const cellW = { description: desc.w - 8, quantity: qty.w / 2 - 4, unit: qty.w / 2 - 6, unitPrice: rate.w - 8, tax: tax.w - 8 }
  const bodyEnd = bodyY + bodyH - 2
  let y = bodyY + 2
  for (let r = 0; r <= Math.min(data.lineItems.length, LINE_ROWS - 1); r++) {
    const item = data.lineItems[r]
    const n = item ? Math.max(...(Object.keys(cellW) as (keyof typeof cellW)[]).map(k => wrappedLines(item[k], cellW[k]))) : 1
    const h = Math.min(n * LEADING + 2, bodyEnd - y)
    if (h < LEADING) break
    const row = (k: keyof ProformaLineItem | 'amount') => `lineItems.${r}.${k}`
    fields.push({ key: row('description'), x: desc.x + 4, y, w: cellW.description, h, multiline: true })
    fields.push({ key: row('quantity'), x: qty.x + 4, y, w: cellW.quantity, h, align: 'right', multiline: true })
    fields.push({ key: row('unit'), x: qty.x + qty.w / 2 + 2, y, w: cellW.unit, h, multiline: true })
    fields.push({ key: row('unitPrice'), x: rate.x + 4, y, w: cellW.unitPrice, h, align: 'right', multiline: true })
    fields.push({ key: row('tax'), x: tax.x + 4, y, w: cellW.tax, h, align: 'right', multiline: true })
    fields.push({ key: row('amount'), x: amt.x + 4, y, w: amt.w - 8, h: one, align: 'right', readOnly: true })
    y += h + 4
  }

  // ── Totals ──
  const totalsY = bodyY + bodyH
  const totW = W * 0.38
  const totX = M + W - totW
  ;(['Subtotal', 'Tax', 'Total'] as const).forEach((k, i) => {
    const y = totalsY + i * ROW_H
    box({ x: totX, y, w: totW * 0.55, h: ROW_H })
    box({ x: totX + totW * 0.55, y, w: totW * 0.45, h: ROW_H })
    captions.push({ x: totX + 4, y: y + 3, text: L.totals[i], size: 9, bold: k === 'Total' })
    fields.push({ key: `total.${k}`, x: totX + totW * 0.55 + 4, y: y + 2, w: totW * 0.45 - 8, h: one, align: 'right', bold: k === 'Total', readOnly: true })
  })

  // ── Authentication ──
  const authY = totalsY + 3 * ROW_H + 8
  const authH = 64
  ;([['seller', L.sellerAuth], ['buyer', L.buyerAuth]] as const).forEach(([who, label], i) => {
    const b = box({ x: M + i * W / 2, y: authY, w: W / 2, h: authH, label })
    const inner = b.w - 2 * PAD
    const valY = b.y + 30
    lines.push({ x: b.x + PAD, y: valY + one + 1, w: inner })
    // A date is short; the signature (usually a company name) gets the room.
    let cx = b.x + PAD
    ;([['AuthDate', 0.24], ['AuthPlace', 0.28], ['Signature', 0.48]] as const).forEach(([suffix, pct], c) => {
      fields.push({ key: `${who}${suffix}`, x: cx, y: valY, w: inner * pct - 4, h: one })
      captions.push({ x: cx, y: valY + one + 3, text: L.authCols[c], size: 7 })
      cx += inner * pct
    })
  })

  // ── Bank / notes ──
  const footY = authY + authH + 6
  captions.push({ x: M, y: footY + 1, text: L.bank, size: 8, bold: true })
  fields.push({ key: 'bankDetails', x: M + 34, y: footY, w: W - 34, h: one, fontSize: 8 })
  captions.push({ x: M, y: footY + one + 1, text: L.notes, size: 8, bold: true })
  fields.push({ key: 'notes', x: M + 34, y: footY + one, w: W - 34, h: PAGE_HEIGHT - 20 - footY - one, fontSize: 8, multiline: true })

  return { boxes, captions, lines, fields, logo }
}

function money(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Value the PDF prints for a field. Money columns are formatted; the overlay edits the raw string instead. */
export function printedValue(data: ProformaData, key: string): string {
  const total = /^total\.(.+)$/.exec(key)
  if (total) {
    const t = proformaTotals(data)
    return money({ Subtotal: t.subtotal, Tax: t.tax, Total: t.total }[total[1]] ?? 0)
  }
  const row = /^lineItems\.(\d+)\.(.+)$/.exec(key)
  if (row) {
    const item = data.lineItems[Number(row[1])]
    if (!item) return ''
    if (row[2] === 'amount') return money(lineAmount(item))
    // A plain number prints as money; anything else typed in the cell prints as typed.
    if (row[2] === 'unitPrice' || row[2] === 'tax') {
      const v = item[row[2]].trim()
      return /^-?\d+([.,]\d+)?$/.test(v) ? money(parseFloat(v.replace(',', '.'))) : v
    }
    return item[row[2] as keyof ProformaLineItem] ?? ''
  }
  return rawValue(data, key)
}

export function rawValue(data: ProformaData, key: string): string {
  const row = /^lineItems\.(\d+)\.(.+)$/.exec(key)
  if (row) return data.lineItems[Number(row[1])]?.[row[2] as keyof ProformaLineItem] ?? ''
  return String((data as unknown as Record<string, unknown>)[key] ?? '')
}

export function setValue(data: ProformaData, key: string, value: string, newId: () => string): ProformaData {
  const row = /^lineItems\.(\d+)\.(.+)$/.exec(key)
  if (!row) return { ...data, [key]: value }
  const index = Number(row[1])
  const items = [...data.lineItems]
  // Typing into an empty row further down the sheet creates the rows above it.
  while (items.length <= index) {
    items.push({ id: newId(), description: '', quantity: '', unit: '', unitPrice: '', tax: '' })
  }
  items[index] = { ...items[index], [row[2]]: value }
  return { ...data, lineItems: items }
}
