import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image, Svg, Line, Polygon } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'
import {
  AWB_BOXES, STATIC_TEXT_BLOCKS, AWB_BANNERS, PAGE_PADDING, PAGE_WIDTH,
  FieldDef, BoxDef, BannerDef, getFieldDefs,
} from './awbLayout'

const RED = '#8B0000'

const styles = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  box: { position: 'absolute', borderColor: RED, borderStyle: 'solid' },
  field: { position: 'absolute' },
  watermark: { position: 'absolute', top: 260, left: 70, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
  footer: { position: 'absolute', left: PAGE_PADDING, right: PAGE_PADDING, bottom: PAGE_PADDING, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerBrand: { fontSize: 6, color: '#666' },
  footerCopy: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: RED, textAlign: 'center' },
})

/** Each box is a fixed-size bordered frame — only the requested edges are drawn, so adjacent
 *  boxes don't double up on shared borders (mirrors the original grid's border-collapse look). */
function Box({ b }: { b: BoxDef }) {
  return (
    <View
      style={[
        styles.box,
        {
          left: b.x, top: b.y, width: b.width, height: b.height,
          borderTopWidth: b.borderTop ? 0.5 : 0,
          borderBottomWidth: b.borderBottom ? 0.5 : 0,
          borderLeftWidth: b.borderLeft ? 0.5 : 0,
          borderRightWidth: b.borderRight ? 0.5 : 0,
        },
      ]}
    />
  )
}

/**
 * Renders a field's value inside its fixed box: auto-shrinks the font size in
 * 0.5pt steps down to a 5pt floor to fit the available width/height, then lets
 * the PDF clip whatever still overflows (`overflow: hidden`). This mirrors how
 * real airline systems fit data into fixed-size AWB boxes — the form never
 * reflows; data is fit to it. The HTML overlay shows the untruncated value.
 */
function renderFieldText(value: string, def: FieldDef) {
  if (!value) return null
  const lines = def.multiline ? value.split('\n') : [value]
  const longestLine = lines.reduce((a, b) => (b.length > a.length ? b : a), '')

  let fontSize = def.fontSize
  const floor = 5
  // Rough width estimate for Helvetica: ~0.52 * fontSize per character
  while (fontSize > floor && longestLine.length * fontSize * 0.52 > def.width) {
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
        color: '#000',
      }}
    >
      {visibleText}
    </Text>
  )
}

/** Diagonal separator line drawn from bottom-left to top-right within a cell. */
function Diagonal({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <Svg style={{ position: 'absolute', left: x, top: y, width, height }}>
      <Line x1={0} y1={height} x2={width} y2={0} stroke={RED} strokeWidth={0.5} />
    </Svg>
  )
}

const NOTCH_INSET = 8
const NOTCH_DROP = 9
const NOTCH_CLEARANCE = 7 // flat (untapered) zone at the top of the notch, sized to clear the label text
const BANNER_FONT_SIZE = 5

/** Rough Helvetica-Bold width estimate, used to size a banner's notch to its label. */
function textWidth(text: string, fontSize = BANNER_FONT_SIZE) {
  return text.length * fontSize * 0.68
}

/** Shrinks the banner font (down to a floor) so long labels fit their available width. */
function fitFontSize(text: string, maxWidth: number) {
  let fontSize = BANNER_FONT_SIZE
  while (fontSize > 3.6 && textWidth(text, fontSize) > maxWidth) fontSize -= 0.2
  return Math.round(fontSize * 10) / 10
}

/**
 * Chamfers a box corner into a diagonal notch, replacing the sharp 90° corner
 * it would otherwise have — the pennant/banner style real AWBs use for charge
 * and total row headers so label text never crosses a border line. The notch
 * stays full-width for `clearance` pt below the top border (room for the
 * label), then tapers down to the true corner by `drop` pt, where the wall
 * resumes straight. `inset` defaults to a small fixed chamfer but widens to
 * fit the label on banners that straddle a shared divider (see `Banner`).
 */
function CornerCut({ cx, cy, corner, inset = NOTCH_INSET, drop = NOTCH_DROP, clearance = 0 }: {
  cx: number; cy: number; corner: 'tl' | 'tr'; inset?: number; drop?: number; clearance?: number
}) {
  const left = corner === 'tr' ? cx - inset : cx
  const localCx = corner === 'tr' ? inset : 0
  const localSx = corner === 'tr' ? 0 : inset
  return (
    <Svg style={{ position: 'absolute', left, top: cy, width: inset, height: drop }}>
      <Polygon points={`${localCx},0 ${localSx},0 ${localSx},${clearance} ${localCx},${drop}`} fill="#fff" />
      <Line x1={localSx} y1={clearance} x2={localCx} y2={drop} stroke={RED} strokeWidth={0.5} />
    </Svg>
  )
}

/** Renders a pennant/banner row-header label per `BannerDef` (see awbLayout.ts). */
function Banner({ b }: { b: BannerDef }) {
  if (b.kind === 'divider') {
    const inset = Math.max(NOTCH_INSET, textWidth(b.text) / 2 + 3)
    const drop = NOTCH_CLEARANCE + 7
    return (
      <>
        <CornerCut cx={b.cx} cy={b.y} corner="tr" inset={inset} drop={drop} clearance={NOTCH_CLEARANCE} />
        <CornerCut cx={b.cx} cy={b.y} corner="tl" inset={inset} drop={drop} clearance={NOTCH_CLEARANCE} />
        <Text style={{ position: 'absolute', left: b.cx - 60, top: b.y + 1, width: 120, textAlign: 'center', fontSize: BANNER_FONT_SIZE, fontFamily: 'Helvetica-Bold', color: '#000' }}>
          {b.text}
        </Text>
      </>
    )
  }
  const clear = NOTCH_INSET + 3 // keep label text clear of the cut corner's widest (top) point
  const left = b.x + (b.cutSide === 'left' ? clear : 4)
  const right = b.x + b.width - (b.cutSide === 'right' ? clear : 4)
  return (
    <>
      <CornerCut cx={b.cutSide === 'right' ? b.x + b.width : b.x} cy={b.y} corner={b.cutSide === 'right' ? 'tr' : 'tl'} />
      <Text style={{ position: 'absolute', left, top: b.y + 1, width: right - left, fontSize: fitFontSize(b.text, right - left), fontFamily: 'Helvetica-Bold', color: '#000' }}>
        {b.text}
      </Text>
    </>
  )
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={{ fontSize: 5.5, color: RED, marginBottom: 1 }}>{text}</Text>
}

function Field({ def, value }: { def: FieldDef; value: string }) {
  return (
    <View style={[styles.field, { left: def.x, top: def.y, width: def.width, height: def.height, overflow: 'hidden' }]}>
      {def.label && <FieldLabel text={def.label} />}
      {renderFieldText(value, def)}
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
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{text.slice(idx)}</Text>
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
    if (prop === 'grossWeight') return item.grossWeight ? `${item.grossWeight} ${item.weightUnit}` : ''
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
    case 'flightNumber':
      return data.flightNumber && data.flightDate ? `${data.flightNumber}/${data.flightDate}` : (data.flightNumber || data.flightDate || '')
    default:
      return String((data as unknown as Record<string, unknown>)[key] ?? '')
  }
}

export function AWBDocument({ data }: { data: AWBData; userScale?: 'sm' | 'md' | 'lg' }) {
  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || '')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : '')

  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {data.isDraft && <Text style={styles.watermark}>DRAFT</Text>}

        {AWB_BOXES.map((b, i) => <Box key={i} b={b} />)}
        {STATIC_TEXT_BLOCKS.map(({ key, ...t }) => <StaticText key={key} {...t} />)}

        {fieldDefs.map((def, i) => {
          if (def.readOnly) {
            return <StaticText key={i} x={def.x} y={def.y} width={def.width} height={def.height} fontSize={def.fontSize} lineHeight={1.2} text={def.staticText ?? ''} />
          }
          return <Field key={i} def={def} value={fieldValue(data, def)} />
        })}

        {/* Diagonal separator lines — visual signature of real AWBs */}
        {/* Rate / Charge header diagonal */}
        <Diagonal x={338} y={366} width={94} height={24} />
        {/* Pennant/banner row headers — Weight/Valuation/Tax Charge, Total Other Charges,
            Total Prepaid/Collect, Currency Conversion, Charges at Destination */}
        {AWB_BANNERS.map((b, i) => <Banner key={i} b={b} />)}

        {/* Carrier logo in the Air Waybill header area */}
        {data.carrierLogoUrl ? (
          <Image
            src={data.carrierLogoUrl}
            style={{
              position: 'absolute',
              left: 505,
              top: 33,
              width: 80,
              height: 35,
              objectFit: 'contain',
            }}
          />
        ) : null}

        {/* Full AWB number displayed prominently on the right side of the header bar */}
        {awbFull ? (
          <Text style={[styles.field, {
            left: 420, top: 16, width: 165,
            fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'right',
          }]}>{awbFull}</Text>
        ) : null}

        {/* Copy label + repeated AWB number in the bottom-right cell (x 360–590, y 750–774) */}
        <View style={{ position: 'absolute', left: 362, top: 752, width: 226, alignItems: 'center' }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: RED, textAlign: 'center' }}>{data.copyLabel}</Text>
          {awbFull ? <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: RED, marginTop: 2 }}>{awbFull}</Text> : null}
        </View>

        {/* App brand bottom-left */}
        <Text style={{ position: 'absolute', left: 57, top: 778, fontSize: 6, color: '#666' }}>AIRWAYBILL APP</Text>
      </Page>
    </Document>
  )
}
