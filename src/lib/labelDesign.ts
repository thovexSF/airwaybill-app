/**
 * Zebra label designs drawn by one engine. The same canvas is the editor's
 * preview and the bitmap sent to the printer (^GFA), so what the operator sees
 * is what prints — no second renderer with its own fonts, wrapping or limits.
 *
 * Coordinates are printer dots at 203 dpi (8/mm). The stock is 10×15 cm
 * (800×1200); a landscape design is 1200×800 and is turned a quarter clockwise
 * onto the stock when printed.
 */

export type LabelField = 'shipper' | 'consignee' | 'title' | 'un' | 'quantity' | 'footer' | 'text'
export type Align = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'middle' | 'bottom'
export type Orientation = 'landscape' | 'portrait'

export interface LabelBlock {
  id: string
  field: LabelField
  /** Content when `field` is 'text'. */
  text?: string
  x: number
  y: number
  w: number
  h: number
  /** Font height in dots. */
  size: number
  align: Align
  valign: VAlign
  bold: boolean
  upper: boolean
}

export interface LabelDesign {
  orientation: Orientation
  blocks: LabelBlock[]
}

export type LabelValues = Partial<Record<Exclude<LabelField, 'text'>, string>>

export const FIELD_LABEL: Record<LabelField, string> = {
  shipper: 'Shipper',
  consignee: 'Consignee',
  title: 'Producto',
  un: 'UN',
  quantity: 'Cantidad',
  footer: 'Texto inferior',
  text: 'Texto fijo',
}

export const STOCK_W = 800
export const STOCK_H = 1200

export function designSize(d: LabelDesign): { w: number; h: number } {
  return d.orientation === 'landscape' ? { w: STOCK_H, h: STOCK_W } : { w: STOCK_W, h: STOCK_H }
}

let seq = 0
export function blockId(): string {
  seq += 1
  return `b-${Date.now().toString(36)}-${seq}`
}

function block(p: Omit<LabelBlock, 'id' | 'align' | 'valign' | 'bold' | 'upper'> & Partial<LabelBlock>): LabelBlock {
  return { id: blockId(), align: 'left', valign: 'top', bold: true, upper: true, ...p }
}

function header(): LabelBlock[] {
  return [
    block({ field: 'text', text: 'SHIPPER:', x: 40, y: 30, w: 500, h: 30, size: 24 }),
    block({ field: 'shipper', x: 40, y: 62, w: 1120, h: 130, size: 32 }),
    block({ field: 'text', text: 'CONSIGNEE:', x: 40, y: 205, w: 500, h: 30, size: 24 }),
    block({ field: 'consignee', x: 40, y: 237, w: 1120, h: 130, size: 32 }),
  ]
}

export function defaultItemDesign(): LabelDesign {
  return {
    orientation: 'landscape',
    blocks: [
      ...header(),
      block({ field: 'title', x: 80, y: 390, w: 1040, h: 200, size: 52, align: 'center', valign: 'middle' }),
      block({ field: 'un', x: 40, y: 640, w: 480, h: 120, size: 80, valign: 'bottom' }),
      block({ field: 'quantity', x: 560, y: 630, w: 600, h: 130, size: 34, valign: 'bottom', upper: false }),
    ],
  }
}

export function defaultOverpackDesign(): LabelDesign {
  return {
    orientation: 'landscape',
    blocks: [
      ...header(),
      block({ field: 'text', text: 'OVERPACK', x: 40, y: 390, w: 1120, h: 130, size: 110, align: 'center', valign: 'middle' }),
      block({ field: 'footer', x: 40, y: 540, w: 1120, h: 230, size: 30, upper: false }),
    ],
  }
}

export function cloneDesign(d: LabelDesign): LabelDesign {
  return { orientation: d.orientation, blocks: d.blocks.map(b => ({ ...b, id: blockId() })) }
}

export function blockText(b: LabelBlock, values: LabelValues): string {
  const raw = b.field === 'text' ? b.text || '' : values[b.field] || ''
  return b.upper ? raw.toUpperCase() : raw
}

function font(b: LabelBlock): string {
  return `${b.bold ? 'bold ' : ''}${b.size}px Arial, Helvetica, sans-serif`
}

/** Word wrap to `max` px; a word longer than the box breaks by character. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  for (const para of text.replace(/\r/g, '').split('\n')) {
    let line = ''
    for (const word of para.split(/ +/)) {
      const tryLine = line ? `${line} ${word}` : word
      if (ctx.measureText(tryLine).width <= max) { line = tryLine; continue }
      if (line) out.push(line)
      line = ''
      let rest = word
      while (ctx.measureText(rest).width > max && rest.length > 1) {
        let n = rest.length - 1
        while (n > 1 && ctx.measureText(rest.slice(0, n)).width > max) n--
        out.push(rest.slice(0, n))
        rest = rest.slice(n)
      }
      line = rest
    }
    out.push(line)
  }
  while (out.length && !out[out.length - 1]) out.pop()
  return out
}

export const LINE_HEIGHT = 1.18

/** Draws the design at the context's origin. Returns the ids of blocks whose text doesn't fit. */
export function drawDesign(ctx: CanvasRenderingContext2D, design: LabelDesign, values: LabelValues): Set<string> {
  const overflow = new Set<string>()
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'top'
  for (const b of design.blocks) {
    const text = blockText(b, values)
    if (!text.trim()) continue
    ctx.font = font(b)
    const lines = wrap(ctx, text, b.w)
    const lh = Math.round(b.size * LINE_HEIGHT)
    const fit = Math.max(1, Math.floor((b.h + lh - b.size) / lh))
    if (lines.length > fit) overflow.add(b.id)
    const shown = lines.slice(0, fit)
    const used = (shown.length - 1) * lh + b.size
    const top = b.valign === 'middle' ? b.y + (b.h - used) / 2 : b.valign === 'bottom' ? b.y + b.h - used : b.y
    shown.forEach((line, i) => {
      const width = ctx.measureText(line).width
      const x = b.align === 'center' ? b.x + (b.w - width) / 2 : b.align === 'right' ? b.x + b.w - width : b.x
      ctx.fillText(line, Math.round(x), Math.round(top + i * lh))
    })
  }
  return overflow
}

/** Thermal heads print dots, not grey: threshold so the preview shows the same pixels. */
function threshold(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 < 128 ? 0 : 255
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

/** The design as the editor shows it (not turned onto the stock). */
export function renderDesign(canvas: HTMLCanvasElement, design: LabelDesign, values: LabelValues): Set<string> {
  const { w, h } = designSize(design)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  const overflow = drawDesign(ctx, design, values)
  threshold(ctx, w, h)
  return overflow
}

/** The design on the 800×1200 stock, as the printer receives it. `offset` is the printer alignment in dots. */
export function renderStock(design: LabelDesign, values: LabelValues, offset = { x: 0, y: 0 }): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = STOCK_W
  c.height = STOCK_H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, STOCK_W, STOCK_H)
  ctx.save()
  ctx.translate(offset.x, offset.y)
  if (design.orientation === 'landscape') {
    ctx.translate(STOCK_W, 0)
    ctx.rotate(Math.PI / 2)
  }
  drawDesign(ctx, design, values)
  ctx.restore()
  threshold(ctx, STOCK_W, STOCK_H)
  return c
}

/** ZPL ACS run-length counts: G..Y = 1..19, g..z = 20..400. */
function runCount(n: number): string {
  if (n === 1) return ''
  let s = ''
  while (n >= 400) { s += 'z'; n -= 400 }
  if (n >= 20) { s += String.fromCharCode(102 + Math.floor(n / 20)); n %= 20 }
  if (n > 0) s += String.fromCharCode(70 + n)
  return s
}

function compressRow(hex: string, prev: string | null): string {
  if (hex === prev) return ':'
  let end = hex.length
  while (end > 0 && hex[end - 1] === '0') end--
  if (end === 0) return ','
  let out = ''
  let i = 0
  while (i < end) {
    let j = i
    while (j < end && hex[j] === hex[i]) j++
    out += runCount(j - i) + hex[i]
    i = j
  }
  return end < hex.length ? `${out},` : out
}

/** One ^XA…^XZ label holding the canvas as a compressed 1-bit graphic. */
export function canvasToZpl(c: HTMLCanvasElement): string {
  const w = c.width
  const h = c.height
  const d = c.getContext('2d')!.getImageData(0, 0, w, h).data
  const bpr = Math.ceil(w / 8)
  const HEX = '0123456789ABCDEF'
  let data = ''
  let prev: string | null = null
  for (let y = 0; y < h; y++) {
    let row = ''
    for (let bx = 0; bx < bpr; bx++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit
        if (x < w && d[(y * w + x) * 4] < 128) byte |= 0x80 >> bit
      }
      row += HEX[byte >> 4] + HEX[byte & 15]
    }
    data += compressRow(row, prev)
    prev = row
  }
  const total = bpr * h
  return `^XA^PW${w}^LL${h}^LH0,0^FO0,0^GFA,${total},${total},${bpr},${data}^FS^XZ`
}
