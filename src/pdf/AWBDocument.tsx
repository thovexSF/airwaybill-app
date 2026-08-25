import React from 'react'
import { Document, Page, View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'
import {
  PAGE_WIDTH, PAGE_HEIGHT, DATA_SIZE, LEADING,
  FieldDef, getFieldDefs,
} from './awbLayout'
import { awbCopyTheme } from './awbCopyTheme'
import { airlineLogoSrc } from '../lib/airlines'
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
function fittedLines(value: string, def: FieldDef): string[] {
  const perLine = Math.max(1, Math.floor((def.width - 1) / (def.fontSize * GLYPH)))
  const maxLines = Math.max(1, Math.round(def.height / LEADING))
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
  return out.slice(0, maxLines)
}

function Field({ def, value, ink }: { def: FieldDef; value: string; ink: string }) {
  if (!value) return null
  return (
    <View style={[styles.field, { left: def.x, top: def.y, width: def.width, height: def.height, overflow: 'hidden' }]}>
      {fittedLines(value, def).map((line, i) => (
        <Text
          key={i}
          style={{ position: 'absolute', top: i * LEADING, width: def.width, fontSize: def.fontSize, textAlign: def.align ?? 'left', color: ink }}
        >
          {line}
        </Text>
      ))}
    </View>
  )
}

const num = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0

function fieldValue(data: AWBData, def: FieldDef, awbFull: string, awbLeft: string): string {
  const key = def.key

  const rate = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rate) {
    const item = data.rateItems[Number(rate[1])]
    if (!item) return ''
    const value = String(item[rate[2] as keyof typeof item] ?? '')
    // The gross weight column carries its unit, as it does on a typed waybill.
    if (rate[2] === 'grossWeight' && value) return `${value} ${(item.weightUnit || 'K').charAt(0)}`
    return value
  }
  const charge = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (charge) {
    const item = data.otherCharges[Number(charge[1])]
    return item ? String(item[charge[2] as keyof typeof item] ?? '') : ''
  }

  switch (key) {
    case 'awbNumberLeft': return awbLeft
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
      const unit = (data.rateItems[0]?.weightUnit || 'K').charAt(0)
      return total ? `${total.toFixed(1)} ${unit}` : ''
    }
    case 'rateGrandTotal': {
      const total = data.rateItems.reduce((s, r) => s + num(r.total), 0)
      return total ? total.toFixed(2) : ''
    }
    default:
      return String((data as unknown as Record<string, unknown>)[key] ?? '')
  }
}

/** The number as it reads at the top left: prefix, origin airport, serial. */
function awbLeftDisplay(data: AWBData): string {
  const prefix = data.awbPrefix?.trim() ?? ''
  const serial = data.awbSerial?.trim() ?? ''
  if (!prefix && !serial) return ''
  const origin = (data.awbAirportCode || data.airportOfDeparture || '').toUpperCase().match(/\b([A-Z]{3})\b/)?.[1]
  return prefix && origin && serial ? `${prefix} ${origin} ${serial}` : [prefix, serial].filter(Boolean).join('-')
}

/**
 * One printed sheet of the waybill, on the blank form for its copy.
 *
 * Each copy is issued on its own colour of paper and printed in its own ink,
 * so the background is that copy's sheet and every typed value takes the same
 * ink — otherwise the data reads as an overprint on somebody else's form.
 *
 * `hideValues` draws the blank form with nothing on it. The live editor uses it
 * while the HTML overlay is up: the overlay already shows every value, and
 * drawing them here too made each one appear twice.
 */
function AWBFacePage({ data, hideValues, copyKey }: { data: AWBData; hideValues?: boolean; copyKey?: string }) {
  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || '')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : '')
  const awbLeft = isHawb ? (data.hawbNumber || '') : awbLeftDisplay(data)

  const theme = awbCopyTheme(copyKey ?? data.copyNumber)
  const logo = airlineLogoSrc(data.awbPrefix)
  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)

  return (
    <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
      <Image src={theme.bg} style={styles.sheet} />
      {logo ? <Image src={logo} style={styles.logo} /> : null}

      {data.isDraft && <Text style={[styles.watermark, { color: theme.ink }]}>DRAFT</Text>}

      <Text style={[styles.stamp, { color: theme.ink }]}>GENERATED WITH AIRWAYBILL.APP</Text>

      {fieldDefs.map((def, i) => {
        // The overlay covers only what the user types, so the derived values —
        // the waybill number in its three places and the rate totals — stay the
        // PDF's job even while the overlay is showing everything else.
        if (hideValues && !def.readOnly) return null
        return <Field key={i} def={def} value={fieldValue(data, def, awbFull, awbLeft)} ink={theme.ink} />
      })}
    </Page>
  )
}

/**
 * The reverse of the sheet: IATA Resolution 600b, set in two columns the way it
 * is printed on real stationery, in the same ink as the face.
 */
function AwbConditionsPage({ copyKey, awbPrefix }: { copyKey?: string; awbPrefix?: string }) {
  const theme = awbCopyTheme(copyKey)
  const logo = airlineLogoSrc(awbPrefix)

  const column = (clauses: typeof CONDITIONS) => (
    <View style={conditions.column}>
      {clauses.map((c, i) => (
        <View key={i} style={conditions.clause}>
          <Text style={[conditions.number, { color: theme.ink }]}>{c.n}</Text>
          <Text style={[conditions.text, { color: theme.ink }]}>{c.text}</Text>
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
      {logo ? <Image src={logo} style={conditions.logo} /> : null}
      <Text style={[conditions.noticeTitle, { color: theme.ink }]}>{CONDITIONS_NOTICE_TITLE}</Text>
      <Text style={[conditions.notice, { color: theme.ink }]}>{CONDITIONS_NOTICE}</Text>
      <Text style={[conditions.title, { color: theme.ink }]}>{CONDITIONS_TITLE}</Text>
      <View style={conditions.columns}>
        {column(CONDITIONS.slice(0, split))}
        {column(CONDITIONS.slice(split))}
      </View>
      <Text style={[conditions.foot, { color: theme.ink }]}>{theme.label}</Text>
    </Page>
  )
}

// Helvetica here on purpose: the contract is set text, not typed data, and
// Courier at this size would not fit the page.
const conditions = StyleSheet.create({
  // El transportista se identifica también al dorso: el reverso es la otra
  // cara de la misma hoja, no un anexo suelto.
  logo: { height: 19, width: 110, objectFit: 'contain', objectPosition: 'left', marginBottom: 4 },
  noticeTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center', marginBottom: 3 },
  notice: { fontFamily: 'Helvetica', fontSize: 6.8, lineHeight: 1.3, textAlign: 'justify', marginBottom: 7 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginBottom: 6 },
  columns: { flexDirection: 'row', gap: 16, flex: 1 },
  column: { flex: 1 },
  clause: { flexDirection: 'row', marginBottom: 2.6 },
  number: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, width: 29 },
  text: { fontFamily: 'Helvetica', fontSize: 6.5, lineHeight: 1.3, textAlign: 'justify', flex: 1 },
  foot: { fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center', marginTop: 6 },
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
      {withConditions && <AwbConditionsPage copyKey={String(data.copyNumber)} awbPrefix={data.awbPrefix} />}
    </Document>
  )
}

/**
 * The same waybill issued as several numbered copies. Each copy is its own
 * coloured sheet followed by its own reverse, so printing double-sided gives
 * every sheet its contract instead of one contract for the whole stack.
 */
export function AWBCopiesDocument({ data, copies }: { data: AWBData; copies: string[] }) {
  return (
    <Document>
      {copies.map((key) => (
        <React.Fragment key={key}>
          <AWBFacePage data={data} copyKey={key} />
          <AwbConditionsPage copyKey={key} awbPrefix={data.awbPrefix} />
        </React.Fragment>
      ))}
    </Document>
  )
}
