import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'
import {
  PAGE_PADDING, PAGE_HEIGHT, SHEET_LEFT, SHEET_WIDTH, sheetX, sheetY,
  FieldDef, getFieldDefs,
} from './awbLayout'
import { airlineForPrefix } from '../lib/airlines'
import { copyStyle } from './awbCopies'
import {
  CONDITIONS, CONDITIONS_NOTICE, CONDITIONS_NOTICE_TITLE, CONDITIONS_TITLE,
} from './awbConditions'

const RED = '#8B0000'

const styles = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Courier', fontSize: 8 },
  // A hair under the true page height: at exactly PAGE_HEIGHT react-pdf's layout
  // rounds the absolute image past the page and pushes every sibling to page 2.
  sheet: { position: 'absolute', top: 0, left: SHEET_LEFT, width: SHEET_WIDTH, height: PAGE_HEIGHT - 0.5 },
  box: { position: 'absolute', borderColor: RED, borderStyle: 'solid' },
  field: { position: 'absolute' },
  watermark: { position: 'absolute', top: 330, left: 95, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
})

/**
 * Renders a field's value inside its fixed box: auto-shrinks the font size in
 * 0.5pt steps down to a 5pt floor to fit the available width/height, then lets
 * the PDF clip whatever still overflows (`overflow: hidden`). This mirrors how
 * real airline systems fit data into fixed-size AWB boxes — the form never
 * reflows; data is fit to it. The HTML overlay shows the untruncated value.
 */
function renderFieldText(value: string, def: FieldDef, ink?: { color: string; bold?: boolean }) {
  if (!value) return null
  const lines = def.multiline ? value.split('\n') : [value]
  const longestLine = lines.reduce((a, b) => (b.length > a.length ? b : a), '')

  let fontSize = def.fontSize
  const floor = 5
  // Courier is monospaced: every glyph advances exactly 0.6 em, so this is
  // the real width, not an estimate.
  while (fontSize > floor && longestLine.length * fontSize * 0.6 > def.width) {
    fontSize -= 0.5
  }
  const lineHeight = 1.15
  const maxLines = def.maxLines ?? Math.max(1, Math.floor(def.height / (fontSize * lineHeight)))
  const visibleText = def.multiline ? lines.slice(0, maxLines).join('\n') : value

  return (
    <Text
      style={{
        fontSize,
        lineHeight,
        textAlign: def.align ?? 'left',
        color: ink?.color ?? '#000',
        ...(ink?.bold ? { fontFamily: 'Courier-Bold' } : null),
      }}
    >
      {visibleText}
    </Text>
  )
}

/**
 * A value placed on the form. `def.label` is not drawn here — the blank sheet
 * already prints every caption; the label exists so the HTML overlay can show
 * one while editing.
 */
function Field({ def, value, ink }: { def: FieldDef; value: string; ink?: { color: string; bold?: boolean } }) {
  return (
    <View style={[styles.field, { left: def.x, top: def.y, width: def.width, height: def.height, overflow: 'hidden' }]}>
      {renderFieldText(value, def, ink)}
    </View>
  )
}

function StaticText({ x, y, width, height, fontSize, lineHeight, text, boldFrom }: { x: number; y: number; width: number; height: number; fontSize: number; lineHeight: number; text: string; boldFrom?: string }) {
  const idx = boldFrom ? text.indexOf(boldFrom) : -1
  return (
    <Text style={[styles.field, { left: x, top: y, width, height, fontSize, lineHeight, overflow: 'hidden' }]}>
      {idx >= 0 ? (
        <>
          {text.slice(0, idx)}
          <Text style={{ fontFamily: 'Courier-Bold' }}>{text.slice(idx)}</Text>
        </>
      ) : (
        text
      )}
    </Text>
  )
}

function fieldValue(data: AWBData, def: FieldDef): string {
  const key = def.key as string

  const rateMatch = /^rateItems\.(\d+)\.(.+)$/.exec(key)
  if (rateMatch) {
    const item = data.rateItems[Number(rateMatch[1])]
    if (!item) return ''
    const prop = rateMatch[2] as keyof typeof item
    return String(item[prop] ?? '')
  }

  const chargeMatch = /^otherCharges\.(\d+)\.(.+)$/.exec(key)
  if (chargeMatch) {
    const item = data.otherCharges[Number(chargeMatch[1])]
    if (!item) return ''
    const prop = chargeMatch[2] as keyof typeof item
    return String(item[prop] ?? '')
  }

  switch (key) {
    case 'wtValPPD': return data.wtValPPD ? 'X' : ''
    case 'wtValCOLL': return data.wtValCOLL ? 'X' : ''
    case 'otherPPD': return data.otherPPD ? 'X' : ''
    case 'otherCOLL': return data.otherCOLL ? 'X' : ''
    default:
      return String((data as unknown as Record<string, unknown>)[key] ?? '')
  }
}
/**
 * One printed sheet of the waybill.
 *
 * `hideValues` draws the blank form with no field value on it. The live editor
 * uses it while the HTML overlay is up: the overlay already shows every value,
 * and drawing them here too made each one appear twice — the inputs sit on a
 * transparent background, so the PDF's own copy, wrapped to a different width,
 * showed through underneath. The overlay owns the values on screen; download
 * and print always regenerate with `hideValues` off.
 */
function AWBFacePage({ data, hideValues, copyKey }: { data: AWBData; hideValues?: boolean; copyKey?: string }) {
  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || '')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : '')

  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)
  const airline = airlineForPrefix(data.awbPrefix)
  const copy = copyStyle(copyKey ?? data.copyNumber)
  // A hand-typed label wins over the stock caption for this copy number.
  const copyLabel = copyKey ? copy.label : (data.copyLabel || copy.label)

  return (
    <Page size="LETTER" style={[styles.page, { backgroundColor: copy.paper }]}>
      {/* The blank IATA form supplies every box, rule and caption. Its raster is
          ink-on-transparent (see scripts/make-transparent-template.mjs), so the
          copy's paper colour behind it reaches the whole sheet the way coloured
          stock does — not just a stripe at the foot of the page. */}
      <Image src="/awb-template-line.png" style={styles.sheet} />

      {data.isDraft && <Text style={styles.watermark}>DRAFT</Text>}

      {fieldDefs.map((def, i) => {
        if (def.readOnly) {
          return <StaticText key={i} x={def.x} y={def.y} width={def.width} height={def.height} fontSize={def.fontSize} lineHeight={1.2} text={def.staticText ?? ''} />
        }
        // The overlay covers exactly the editable fields, so these are the
        // ones to leave out when it is showing them.
        if (hideValues) return null
        // The carrier's name carries its brand colour, which doubles as the
        // carrier's mark when no licensed logo image has been uploaded.
        const ink = def.key === 'carrierName' && airline ? { color: airline.color, bold: true } : undefined
        return <Field key={i} def={def} value={fieldValue(data, def)} ink={ink} />
      })}

      {/* Carrier mark: an uploaded logo if there is one, otherwise the airline's
          two-letter designator in its brand colour. */}
      {data.carrierLogoUrl ? (
        <Image
          src={data.carrierLogoUrl}
          style={{ position: 'absolute', left: sheetX(150), top: sheetY(21.9), width: sheetY(49), height: sheetY(4.2), objectFit: 'contain' }}
        />
      ) : airline ? (
        <View style={{
          position: 'absolute', left: sheetX(150), top: sheetY(21.6),
          backgroundColor: airline.color, borderRadius: 1.5,
          paddingHorizontal: 3, paddingVertical: 1.2,
        }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.6 }}>{airline.code}</Text>
        </View>
      ) : null}

      {/* Master AWB number repeated in the CUSTOMS REF band, top right */}
      {awbFull ? (
        <Text style={[styles.field, {
          left: sheetX(112), top: sheetY(14), width: sheetY(87),
          fontSize: 11, fontFamily: 'Courier-Bold', textAlign: 'right',
        }]}>{awbFull}</Text>
      ) : null}

      {/* Colour band below the form, standing in for the coloured paper each
          copy is printed on. */}
      <View style={{
        position: 'absolute', left: SHEET_LEFT, top: sheetY(282.5),
        width: SHEET_WIDTH, height: sheetY(6.4),
        backgroundColor: copy.color,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 8,
      }}>
        <Text style={{ fontSize: 6, color: copy.ink }}>AIRWAYBILL APP</Text>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: copy.ink }}>{copyLabel}</Text>
        <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: copy.ink }}>{awbFull}</Text>
      </View>
    </Page>
  )
}

/**
 * The reverse of the sheet: IATA Resolution 600b, set in two columns the way it
 * is printed on real stationery. Typeset from `awbConditions.ts` rather than
 * dropped in as a picture of somebody else's printed page, for the same reason
 * the face is drawn from measured coordinates.
 */
function AwbConditionsPage({ copyKey, paper }: { copyKey?: string; paper: string }) {
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
    <Page size="LETTER" style={[styles.page, { backgroundColor: paper, paddingHorizontal: 26, paddingVertical: 22 }]}>
      <Text style={conditions.noticeTitle}>{CONDITIONS_NOTICE_TITLE}</Text>
      <Text style={conditions.notice}>{CONDITIONS_NOTICE}</Text>
      <Text style={conditions.title}>{CONDITIONS_TITLE}</Text>
      <View style={conditions.columns}>
        {column(CONDITIONS.slice(0, split))}
        {column(CONDITIONS.slice(split))}
      </View>
      {copyKey ? <Text style={conditions.foot}>{copyStyle(copyKey).label}</Text> : null}
    </Page>
  )
}

// Sized to fill the sheet the way the printed reverse does. Small, but this is
// the one page nobody reads until something goes wrong, and then it has to be
// readable — hence 6.8pt rather than the 5pt the source PDF crams it into.
const conditions = StyleSheet.create({
  noticeTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center', marginBottom: 3 },
  notice: { fontFamily: 'Helvetica', fontSize: 6.8, lineHeight: 1.3, textAlign: 'justify', marginBottom: 7 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginBottom: 6 },
  columns: { flexDirection: 'row', gap: 16, flex: 1 },
  column: { flex: 1 },
  clause: { flexDirection: 'row', marginBottom: 3 },
  number: { fontFamily: 'Helvetica-Bold', fontSize: 6.8, width: 30 },
  text: { fontFamily: 'Helvetica', fontSize: 6.8, lineHeight: 1.32, textAlign: 'justify', flex: 1 },
  foot: { fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center', marginTop: 6, color: '#555' },
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
      {withConditions && <AwbConditionsPage paper={copyStyle(data.copyNumber).paper} />}
    </Document>
  )
}

/**
 * The same waybill issued as several numbered copies. Each copy is a face page
 * followed by its own reverse, so printing double-sided gives every sheet its
 * contract — "hoja por medio" — instead of one contract for the whole stack.
 */
export function AWBCopiesDocument({ data, copies }: { data: AWBData; copies: string[] }) {
  return (
    <Document>
      {copies.map((key) => (
        <React.Fragment key={key}>
          <AWBFacePage data={data} copyKey={key} />
          <AwbConditionsPage copyKey={key} paper={copyStyle(key).paper} />
        </React.Fragment>
      ))}
    </Document>
  )
}
