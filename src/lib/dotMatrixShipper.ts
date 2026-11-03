import { DGDData, DGDItem } from '../types/dgd'

/**
 * Excel laid out for the preprinted Shipper's Declaration on the OKI Microline.
 * Column widths, row heights, paper (Legal) and zero margins are the registration
 * of that form: text starts in the same cells as the office template, so it lands
 * in the boxes when printed at 100% with no margins. Do not resize the grid.
 */
const COLS = 29
const COL_WIDTH = 3.453125

// Twips, one per row 1..56, measured from the office template.
const ROW_TWIPS = [
  250, 250, 250, 250, 250, 330,
  250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250, 250,
  450,
  250, 250, 250, 250, 250,
  150,
  250, 250, 250, 250,
  15,
  250, 260, 250, 260, 260, 250, 260, 260, 250, 250,
  250, 250, 250, 250, 250,
  570, 225, 120, 240, 120,
  250, 250, 250,
]

const GOODS_FIRST = 34
const GOODS_LAST = 45

type Style = number

// 0 Arial 10 left, 1 Arial 10 center, 2 Arial 8 center, 3 Arial 9 right,
// 4 Arial 9 left, 5 Arial 8 bold left, 6 Arial 9 center, 7 Arial 10 center + date m/d/yy
const S = { body: 0, center: 1, depart: 2, dest: 3, note: 4, sign: 5, place: 6, date: 7 }

interface Cell { r: number; c: string; v: string | number; s: Style; date?: boolean }

function lines(s: string): string[] {
  return s.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
}

function wrap(s: string, width: number): string[] {
  const out: string[] = []
  for (const raw of lines(s)) {
    let rest = raw
    while (rest.length > width) {
      let cut = rest.lastIndexOf(' ', width)
      if (cut < 8) cut = width
      out.push(rest.slice(0, cut).trim())
      rest = rest.slice(cut).trim()
    }
    if (rest) out.push(rest)
  }
  return out
}

function splitUn(raw: string): { prefix: string; num: string } {
  const t = raw.trim()
  const m = t.match(/^(UN|ID)\s*([0-9A-Za-z]+)$/i)
  if (m) return { prefix: m[1].toUpperCase(), num: m[2] }
  if (/^\d/.test(t)) return { prefix: 'UN', num: t }
  return { prefix: t, num: '' }
}

/** "369-76920196" → "369 - 7692 0196", the spacing the form box was ruled for. */
function formatAwb(awb: string): string {
  const d = awb.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)} - ${d.slice(3, 7)} ${d.slice(7)}`
  return awb.trim()
}

function excelSerial(s: string): number | null {
  const months = 'janfebmaraprmayjunjulaugsepoctnovdec'
  let y: number, m: number, d: number
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  const named = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[\s-](\d{2,4})/)
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3] }
  else if (named) {
    const mi = months.indexOf(named[2].toLowerCase())
    if (mi < 0) return null
    d = +named[1]; m = mi / 3 + 1; y = +named[3]
  } else if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3] }
  else return null
  if (y < 100) y += 2000
  const utc = Date.UTC(y, m - 1, d)
  if (Number.isNaN(utc)) return null
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000)
}

function filled(item: DGDItem): boolean {
  return !!(item.unIdNo.trim() || item.properShippingName.trim() || item.quantity.trim())
}

function put(cells: Cell[], r: number, c: string, v: string | number, s: Style, date = false) {
  if (v === '' || v === undefined) return
  cells.push({ r, c, v, s, date })
}

/** Cells in the same places as the office xls, filled from the open declaration. */
export function dotMatrixCells(d: DGDData): Cell[] {
  const cells: Cell[] = []
  const shipper = lines(d.shipperNameAndAddress || '')
  const shipperAt: [number, string][] = [[1, 'E'], [2, 'C'], [3, 'C'], [4, 'C']]
  shipper.slice(0, 4).forEach((line, i) => put(cells, shipperAt[i][0], shipperAt[i][1], line, S.body))

  const consignee = lines(d.consigneeNameAndAddress || '')
  const consigneeAt: [number, string][] = [[7, 'E'], [8, 'F'], [9, 'F'], [10, 'F'], [11, 'F']]
  consignee.slice(0, 5).forEach((line, i) => put(cells, consigneeAt[i][0], consigneeAt[i][1], line, S.body))

  put(cells, 1, 'X', formatAwb(d.awbNo || ''), S.body)
  put(cells, 5, 'X', (d.shipperReference || '').trim(), S.body)

  const page = (d.pageOf || '').match(/(\d+)\s*of\s*(\d+)/i)
  if (page) {
    put(cells, 3, 'S', page[1], S.center)
    put(cells, 3, 'V', page[2], S.center)
  }

  const dep = lines(d.airportOfDeparture || '')
  if (dep[0]) put(cells, 20, 'I', dep[0], S.depart)
  if (dep[1]) put(cells, 21, 'I', dep[1], S.depart)
  put(cells, 23, 'F', (d.airportOfDestination || '').trim(), S.dest)

  let row = GOODS_FIRST
  for (const item of d.items.filter(filled)) {
    if (row > GOODS_LAST) break
    const un = splitUn(item.unIdNo)
    const psn = wrap(item.properShippingName, 26)
    const qty = wrap(item.quantity, 22)
    const n = Math.max(psn.length, qty.length, un.num ? 2 : 1)
    for (let i = 0; i < n && row <= GOODS_LAST; i++, row++) {
      if (i === 0 && un.prefix) put(cells, row, 'B', un.prefix, S.center)
      if (i === 1 && un.num) put(cells, row, 'B', un.num, S.center)
      if (psn[i]) put(cells, row, 'E', psn[i], S.body)
      if (qty[i]) put(cells, row, 'Q', qty[i], S.body)
      if (i === 0) {
        put(cells, row, 'M', item.classDivision.trim(), S.center)
        put(cells, row, 'O', item.packingGroup.trim(), S.center)
        put(cells, row, 'X', item.packingInstruction.trim(), S.center)
      }
    }
  }
  if (d.overpack) {
    for (const line of lines(d.overpackText || '')) {
      if (row > GOODS_LAST) break
      put(cells, row, 'Q', line, S.body)
      row++
    }
  }

  put(cells, 47, 'M', (d.additionalHandling || '').trim(), S.note)

  const sign = [d.signatoryName, d.signatoryTitle].map(s => (s || '').trim()).filter(Boolean).join('  ')
  put(cells, 50, 'T', sign, S.sign)
  const serial = excelSerial(d.signatureDate || '')
  if (serial != null) put(cells, 52, 'Y', serial, S.date, true)
  else put(cells, 52, 'Y', (d.signatureDate || '').trim(), S.place)
  put(cells, 54, 'Y', (d.signaturePlace || '').trim(), S.place)

  return cells
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sheetXml(cells: Cell[]): string {
  const byRow = new Map<number, Cell[]>()
  for (const cell of cells) {
    const list = byRow.get(cell.r) || []
    list.push(cell)
    byRow.set(cell.r, list)
  }
  const rows: string[] = []
  for (let r = 1; r <= ROW_TWIPS.length; r++) {
    const ht = (ROW_TWIPS[r - 1] / 20).toFixed(2)
    const list = (byRow.get(r) || []).sort((a, b) => a.c.charCodeAt(0) - b.c.charCodeAt(0))
    const cols = list.map(cell => {
      if (cell.date) return `<c r="${cell.c}${r}" s="${cell.s}"><v>${cell.v}</v></c>`
      return `<c r="${cell.c}${r}" s="${cell.s}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(cell.v))}</t></is></c>`
    }).join('')
    rows.push(`<row r="${r}" ht="${ht}" customHeight="1">${cols}</row>`)
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetFormatPr defaultRowHeight="12.5"/>
<cols><col min="1" max="${COLS}" width="${COL_WIDTH}" customWidth="1"/></cols>
<sheetData>${rows.join('')}</sheetData>
<pageMargins left="0" right="0" top="0" bottom="0" header="0" footer="0"/>
<pageSetup paperSize="5" scale="100" orientation="portrait"/>
</worksheet>`
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="10"/><name val="Arial"/></font>
<font><sz val="8"/><name val="Arial"/></font>
<font><sz val="9"/><name val="Arial"/></font>
<font><b/><sz val="8"/><name val="Arial"/></font>
<font><sz val="10"/><name val="Arial"/></font>
</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="14" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
</cellXfs>
</styleSheet>`

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Shipper" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

function crc32(data: Uint8Array): number {
  let c = ~0
  for (let i = 0; i < data.length; i++) {
    c ^= data[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}
function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

/** Stored (uncompressed) zip. Excel opens it; nothing else has to. */
function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  const enc = new TextEncoder()
  for (const file of files) {
    const name = enc.encode(file.name)
    const crc = crc32(file.data)
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), name, file.data,
    ])
    locals.push(local)
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]))
    offset += local.length
  }
  const central = concat(centrals)
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0),
  ])
  return concat([...locals, central, end])
}

export function buildDotMatrixShipperXlsx(d: DGDData): Blob {
  const enc = new TextEncoder()
  const files = [
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(WORKBOOK) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(dotMatrixCells(d))) },
  ]
  const bytes = zip(files)
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return new Blob([copy], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function dotMatrixFileName(d: DGDData): string {
  const un = d.items.map(it => it.unIdNo.replace(/\s+/g, '')).find(Boolean) || 'DGD'
  const dest = (d.airportOfDestination || '').trim().split('\n')[0] || 'shipper'
  return `UN ${un} ${dest}.xlsx`.replace(/[^\w.\- ]+/g, '')
}
