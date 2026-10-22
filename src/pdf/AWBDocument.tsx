import React from 'react'
import { formatCharge, CHARGE_KEYS } from '../lib/awbCharges'
import { Document, Page, View, Text, Image, Font, StyleSheet, Svg, Path, Rect } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'
import {
  PAGE_WIDTH, PAGE_HEIGHT, DATA_SIZE, LEADING,
  FieldDef, getFieldDefs,
} from './awbLayout'
import { awbCopyTheme } from './awbCopyTheme'
import { airlineLogoSrc } from '../lib/airlines'
import { SHEET_INK_PATH, SHEET_WASH } from './awbSheet'
import {
  CONDITIONS, CONDITIONS_NOTICE, CONDITIONS_NOTICE_TITLE, CONDITIONS_TITLE,
} from './awbConditions'

/**
 * Courier Prime, embedded as a TTF, rather than the built-in Courier: the
 * standard Type 1 face renders noticeably heavier in macOS Preview than in
 * Chrome, so the same waybill looked like two different documents depending on
 * who opened it. Shared with the sister `b2b` repo, which embeds the same file.
 */
Font.register({
  family: 'AwbCourier',
  fonts: [
    { src: '/awb-fonts/CourierPrime-Regular.ttf', fontWeight: 400 },
    { src: '/awb-fonts/CourierPrime-Bold.ttf', fontWeight: 700 },
  ],
})

/** A hair under 792: at exactly the page height react-pdf rounds the absolute
 *  background past the page and pushes every sibling onto page 2. */
const SHEET_HEIGHT = PAGE_HEIGHT - 0.5

const styles = StyleSheet.create({
  page: { fontFamily: 'AwbCourier', fontSize: DATA_SIZE, position: 'relative' },
  sheet: { position: 'absolute', top: 0, left: 0, width: PAGE_WIDTH, height: SHEET_HEIGHT },
  logo: { position: 'absolute', top: '4.15%', left: '71.2%', width: '17.6%', height: '3.6%', objectFit: 'contain' },
  field: { position: 'absolute' },
  // Marca de la app, en el margen en blanco que queda bajo el formulario. La
  // última regla de la hoja está en el 97,73% de la página (medido sobre
  // awb-copies/1.png), así que el sello va debajo de esa línea y no dentro del
  // recuadro. Va en la tinta de la copia y atenuado: identifica de dónde salió
  // el documento sin competir con nada de lo que el formulario imprime.
  stamp: {
    position: 'absolute',
    left: '10%',
    top: '98.15%',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.5,
    opacity: 0.65,
  },
  // Tinted with the copy's own ink: a red DRAFT on a green sheet reads as a
  // second document stamped over the first.
  watermark: {
    position: 'absolute', top: 330, left: 95, fontSize: 100,
    fontWeight: 700, opacity: 0.09, transform: 'rotate(-45deg)',
  },
})

/** Courier advances exactly 0.6 em per glyph, so this is a width, not a guess. */
const GLYPH = 0.6

/**
 * Fits a value into its fixed box the way a typewriter does: it wraps to the
 * character count the box holds and drops whatever runs past the bottom. The
 * form never reflows — data is fit to it. The HTML overlay shows the value
 * untruncated while editing.
 */
function wrapLines(value: string, def: FieldDef, fontSize: number): string[] {
  const perLine = Math.max(1, Math.floor((def.width - 1) / (fontSize * GLYPH)))
  const out: string[] = []

  for (const paragraph of String(value).split('\n')) {
    if (!def.multiline) { out.push(paragraph.slice(0, perLine)); continue }
    let rest = paragraph
    if (rest === '') { out.push(''); continue }
    while (rest.length > perLine) {
      // Break on the last space that fits, so words stay whole where they can.
      const cut = rest.lastIndexOf(' ', perLine)
      const at = cut > perLine * 0.5 ? cut : perLine
      out.push(rest.slice(0, at))
      rest = rest.slice(cut > perLine * 0.5 ? at + 1 : at)
    }
    out.push(rest)
  }
  return out
}

/** Smallest a name/address block is set before it starts dropping lines. */
const MIN_FIT_SIZE = 7

/**
 * A multiline block that runs past its box is set a size down, leading and
 * all, until it fits — an address that loses its last line (a phone, an email)
 * is worse than one typed a little smaller. Past MIN_FIT_SIZE it clips.
 */
function fittedLines(value: string, def: FieldDef): { lines: string[]; fontSize: number; leading: number } {
  const maxLines = Math.max(1, Math.round(def.height / LEADING))
  const perLine = (size: number) => Math.floor((def.width - 1) / (size * GLYPH))

  // A one-line cell is set smaller rather than cut ("LH778/14-MA").
  if (!def.multiline) {
    const longest = Math.max(...String(value).split('\n').map((p) => p.length))
    let size = def.fontSize
    while (size > MIN_FIT_SIZE && longest > perLine(size)) size = Math.max(MIN_FIT_SIZE, size - 0.25)
    return { lines: wrapLines(value, def, size).slice(0, maxLines), fontSize: size, leading: LEADING }
  }

  const lines = wrapLines(value, def, def.fontSize)
  if (lines.length <= maxLines) return { lines, fontSize: def.fontSize, leading: LEADING }

  for (let size = def.fontSize - 0.25; ; size = Math.max(MIN_FIT_SIZE, size - 0.25)) {
    const leading = LEADING * (size / def.fontSize)
    // Shrunk blocks fit whole lines strictly: the box is already full to its rule.
    const fit = Math.max(1, Math.floor((def.height + 1) / leading))
    const wrapped = wrapLines(value, def, size)
    if (wrapped.length <= fit || size === MIN_FIT_SIZE) return { lines: wrapped.slice(0, fit), fontSize: size, leading }
  }
}

/**
 * An other-charge description shares its line with the amount, which is set
 * flush right; the description stops one character short of wherever that
 * amount begins, so "COOL CHAIN HANDLING" never runs into "240.00".
 */
function chargeDescDef(def: FieldDef, defs: FieldDef[], data: AWBData, awbFull: string, awbLeft: AwbLeft): FieldDef {
  const m = /^otherCharges\.(\d+)\.description$/.exec(def.key)
  if (!m) return def
  const amountDef = defs.find((d) => d.key === `otherCharges.${m[1]}.amount`)
  if (!amountDef) return def
  const amount = fieldValue(data, amountDef, awbFull, awbLeft)
  const amountStart = amountDef.x + amountDef.width - amount.length * amountDef.fontSize * GLYPH
  return { ...def, width: Math.max(def.fontSize * GLYPH, amountStart - def.x - amountDef.fontSize * GLYPH) }
}

/** Typed values stay black on every copy. The sheet colour belongs to the form. */
const DATA_INK = '#000'

function Field({ def, value }: { def: FieldDef; value: string }) {
  if (!value) return null
  return (
    <View style={[styles.field, { left: def.x, top: def.y, width: def.width, height: def.height, overflow: 'hidden' }]}>
      {(({ lines, fontSize, leading }) => lines.map((line, i) => (
        <Text
          key={i}
          style={{ position: 'absolute', top: i * leading, width: def.width, fontSize, textAlign: def.align ?? 'left', color: DATA_INK, ...(def.bold ? { fontWeight: 700 } : {}) }}
        >
          {line}
        </Text>
      )))(fittedLines(value, def))}
    </View>
  )
}

const num = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0



function fieldValue(data: AWBData, def: FieldDef, awbFull: string, awbLeft: AwbLeft): string {
  const key = def.key

  const rate = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rate) {
    const item = data.rateItems[Number(rate[1])]
    if (!item) return ''
    // The unit has a column of its own on the sheet, beside the gross weight.
    if (rate[2] === 'weightUnitMark') return item.grossWeight ? (item.weightUnit || 'K').charAt(0) : ''
    const value = String(item[rate[2] as keyof typeof item] ?? '')
    if (rate[2] === 'total') return formatCharge(value, data.currency)
    return value
  }
  const charge = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (charge) {
    const item = data.otherCharges[Number(charge[1])]
    if (!item) return ''
    const value = item[charge[2] as keyof typeof item]
    return charge[2] === 'amount' ? formatCharge(value, data.currency) : String(value ?? '')
  }

  switch (key) {
    case 'awbNumberLeft': return awbLeft.single
    case 'awbNumberPrefix': return awbLeft.prefix
    case 'awbNumberAirport': return awbLeft.airport
    case 'awbNumberSerial': return awbLeft.serial
    case 'carrierAddress': {
      // The issued-by block already prints the carrier name on its first row.
      const [first, ...rest] = String(data.carrierAddress ?? '').split('\n')
      return first.trim().toUpperCase() === (data.carrierName ?? '').trim().toUpperCase() ? rest.join('\n') : String(data.carrierAddress ?? '')
    }
    case 'awbNumberTop':
    case 'awbNumberBottom': return awbFull
    case 'wtValPPD': return data.wtValPPD ? 'X' : ''
    case 'wtValCOLL': return data.wtValCOLL ? 'X' : ''
    case 'otherPPD': return data.otherPPD ? 'X' : ''
    case 'otherCOLL': return data.otherCOLL ? 'X' : ''
    case 'ratePiecesTotal': {
      const total = data.rateItems.reduce((s, r) => s + num(r.pieces), 0)
      return total ? String(total) : ''
    }
    case 'rateGrossTotal': {
      const total = data.rateItems.reduce((s, r) => s + num(r.grossWeight), 0)
      // The total carries as many decimals as the lines it adds up ("148.0", not "148").
      const decimals = Math.min(2, Math.max(0, ...data.rateItems.map((r) => (String(r.grossWeight ?? '').split(/[.,]/)[1] ?? '').length)))
      return total ? total.toFixed(decimals) : ''
    }
    case 'rateGrossUnit': {
      const total = data.rateItems.reduce((s, r) => s + num(r.grossWeight), 0)
      return total ? (data.rateItems[0]?.weightUnit || 'K').charAt(0) : ''
    }
    case 'rateGrandTotal': {
      const total = data.rateItems.reduce((s, r) => s + num(r.total), 0)
      return total ? formatCharge(total, data.currency) : ''
    }
    case 'referenceNumber':
      if (data.docType === 'hawb' && data.mawbReference) {
        const ref = String(data.referenceNumber || '').trim()
        if (ref) return ref
        return data.mawbReference.toUpperCase().startsWith('MAWB') ? data.mawbReference : `MAWB ${data.mawbReference}`
      }
      return String(data.referenceNumber ?? '')
    default: {
      const v = (data as unknown as Record<string, unknown>)[key]
      if (CHARGE_KEYS.has(key)) return formatCharge(v, data.currency)
      if (v != null && typeof v === 'object') return ''
      return String(v ?? '')
    }
  }
}

interface AwbLeft { single: string; prefix: string; airport: string; serial: string }

/** The number's three printed cells at the top left (prefix | origin | serial), or the HAWB number whole. */
function awbLeftParts(data: AWBData, isHawb: boolean): AwbLeft {
  if (isHawb) return { single: data.hawbNumber || '', prefix: '', airport: '', serial: '' }
  const prefix = awbPrefix3(data)
  const serial = data.awbSerial?.trim() ?? ''
  const origin = (data.awbAirportCode || data.airportOfDeparture || '').toUpperCase().match(/\b([A-Z]{3})\b/)?.[1] ?? ''
  return { single: '', prefix, airport: origin, serial }
}

/** IATA prefixes are three digits ("006"); an old document may hold "6". */
function awbPrefix3(data: AWBData): string {
  const p = data.awbPrefix?.trim() ?? ''
  return /^\d{1,3}$/.test(p) ? p.padStart(3, '0') : p
}

/** The footer label's centre and the baselines of its two rows, in pt, measured on the printed sheet. */
const LABEL_CENTRE_X = 416.5
const LABEL_BASELINES = [762.4, 771.4]
const LABEL_SIZE = 9
/** Courier Prime's ascent: the distance from a line's top edge down to its baseline. */
const ASCENT = 0.855

/**
 * The blank IATA sheet, drawn as vectors so every rule and caption stays sharp
 * at any zoom. The geometry is traced from `public/awb-copies/1.png` by
 * `scripts/trace-awb-sheet.py`; the ink and the shaded boxes take the copy's
 * colours, and the copy label at the foot is typeset rather than traced.
 */
function AwbSheet({ ink, wash, label, footer }: { ink: string; wash: string; label: string; footer: string }) {
  const [first, ...rest] = label.split(' (')
  const rows = [first, rest.length ? `(${rest.join(' (')}` : '']
  return (
    <>
      <Svg viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`} preserveAspectRatio="none" style={styles.sheet}>
        {SHEET_WASH.map(([x, y, w, h], i) => <Rect key={i} x={x} y={y} width={w} height={h} fill={wash} />)}
      </Svg>
      <Svg viewBox={`0 0 ${PAGE_WIDTH * 20} ${PAGE_HEIGHT * 20}`} preserveAspectRatio="none" style={styles.sheet}>
        <Path d={SHEET_INK_PATH} fill={ink} fillRule="evenodd" />
      </Svg>
      {rows.map((row, i) => row ? (
        <Text
          key={i}
          style={{
            position: 'absolute', left: LABEL_CENTRE_X - 200, width: 400, textAlign: 'center',
            top: LABEL_BASELINES[i] - LABEL_SIZE * ASCENT, fontSize: LABEL_SIZE, fontWeight: 700, color: footer,
          }}
        >
          {row}
        </Text>
      ) : null)}
    </>
  )
}

/**
 * One printed sheet of the waybill, on the blank form for its copy.
 *
 * Each copy is issued on its own colour of paper, so the background is that
 * copy's sheet. The values typed onto it stay black on every copy.
 *
 * `hideValues` draws the blank form with nothing on it. The live editor uses it
 * while the HTML overlay is up: the overlay already shows every value, and
 * drawing them here too made each one appear twice.
 */
function AWBFacePage({ data, hideValues, copyKey }: { data: AWBData; hideValues?: boolean; copyKey?: string }) {
  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || '')
    : (data.awbPrefix && data.awbSerial ? `${awbPrefix3(data)}-${data.awbSerial}` : '')
  const awbLeft = awbLeftParts(data, isHawb)

  const theme = awbCopyTheme(copyKey ?? data.copyNumber)
  const logo = airlineLogoSrc(data.awbPrefix)
  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
      <AwbSheet ink={theme.ink} wash={theme.wash} label={theme.label} footer={theme.footer} />
      {logo ? <Image src={logo} style={styles.logo} /> : null}

      {data.isDraft && <Text style={[styles.watermark, { color: theme.ink }]}>DRAFT</Text>}

      <Text style={[styles.stamp, { color: theme.ink }]}>GENERATED WITH AIRWAYBILL.APP</Text>

      {fieldDefs.map((def, i) => {
        // The overlay covers only what the user types, so the derived values —
        // the waybill number in its three places and the rate totals — stay the
        // PDF's job even while the overlay is showing everything else.
        if (hideValues && !def.readOnly) return null
        return <Field key={i} def={chargeDescDef(def, fieldDefs, data, awbFull, awbLeft)} value={fieldValue(data, def, awbFull, awbLeft)} />
      })}
    </Page>
  )
}

/**
 * The reverse of the sheet: IATA Resolution 600b, set in two columns the way it
 * is printed on real stationery. The face keeps the copy's colour; this side,
 * logo included, is black on every copy.
 */
function AwbConditionsPage() {
  const column = (clauses: typeof CONDITIONS) => (
    <View style={conditions.column}>
      {clauses.map((c, i) => (
        <View key={i} style={conditions.clause}>
          <Text style={conditions.number}>{c.n}</Text>
          <Text style={conditions.text}>{c.text}</Text>
        </View>
      ))}
    </View>
  )

  // Split near the middle by character count, on a clause boundary, so the two
  // columns come out roughly level whatever the wording does.
  const total = CONDITIONS.reduce((sum, c) => sum + c.text.length, 0)
  let running = 0
  let split = CONDITIONS.length
  for (let i = 0; i < CONDITIONS.length; i++) {
    running += CONDITIONS[i].text.length
    if (running >= total / 2) { split = i + 1; break }
  }

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} wrap={false} style={[styles.page, { paddingHorizontal: 26, paddingVertical: 18 }]}>
      <Image src="/awb-iata/5.png" style={conditions.mark} />
      <Text style={conditions.noticeTitle}>{CONDITIONS_NOTICE_TITLE}</Text>
      <Text style={conditions.notice}>{CONDITIONS_NOTICE}</Text>
      <Text style={conditions.title}>{CONDITIONS_TITLE}</Text>
      <View style={conditions.columns}>
        {column(CONDITIONS.slice(0, split))}
        {column(CONDITIONS.slice(split))}
      </View>
    </Page>
  )
}

// Helvetica here on purpose: the contract is set text, not typed data, and
// Courier at this size would not fit the page.
const conditions = StyleSheet.create({
  // El globo alado de la IATA, en negro, como en el reverso del set de referencia.
  mark: { height: 26, width: 38, objectFit: 'contain', alignSelf: 'center', marginBottom: 5 },
  noticeTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center', marginBottom: 3, color: DATA_INK },
  notice: { fontFamily: 'Helvetica', fontSize: 6.8, lineHeight: 1.3, textAlign: 'justify', marginBottom: 7, color: DATA_INK },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginBottom: 6, color: DATA_INK },
  columns: { flexDirection: 'row', gap: 16, flex: 1 },
  column: { flex: 1 },
  clause: { flexDirection: 'row', marginBottom: 2.6 },
  number: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, width: 29, color: DATA_INK },
  text: { fontFamily: 'Helvetica', fontSize: 6.5, lineHeight: 1.3, textAlign: 'justify', flex: 1, color: DATA_INK },
})

/**
 * One waybill. `withConditions` puts the contract on the back of the sheet, as
 * it is on paper; the live editor leaves it off so a keystroke only re-lays out
 * the page being edited.
 */
export function AWBDocument({ data, hideValues, withConditions }: {
  data: AWBData
  userScale?: 'sm' | 'md' | 'lg'
  hideValues?: boolean
  withConditions?: boolean
}) {
  return (
    <Document>
      <AWBFacePage data={data} hideValues={hideValues} />
      {withConditions && <AwbConditionsPage />}
    </Document>
  )
}

/**
 * The same waybill issued as several numbered copies. Each copy is its own
 * coloured sheet followed by its own reverse, so printing double-sided gives
 * every sheet its contract instead of one contract for the whole stack.
 */
export type AwbCopySides = 'both' | 'face' | 'conditions'

/**
 * `sides` lets the contract go to the printer on its own: one reverse per
 * selected copy, so a stack printed face-only can be turned over and fed back.
 */
export function AWBCopiesDocument({ data, copies, sides = 'both' }: { data: AWBData; copies: string[]; sides?: AwbCopySides }) {
  return (
    <Document>
      {copies.map((key) => (
        <React.Fragment key={key}>
          {sides !== 'conditions' && <AWBFacePage data={data} copyKey={key} />}
          {sides !== 'face' && <AwbConditionsPage />}
        </React.Fragment>
      ))}
    </Document>
  )
}
