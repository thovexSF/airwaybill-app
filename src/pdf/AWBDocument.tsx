import React from 'react'
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import { AWBData } from '../types/awb'
import { PAGE_PADDING, PAGE_WIDTH, PAGE_HEIGHT, FieldDef, getFieldDefs } from './awbLayout'

/** Millimetres → PDF points, for the few marks placed directly on the sheet. */
const MM = 2.834646
const mm = (v: number) => v * MM

const RED = '#8B0000'

const styles = StyleSheet.create({
  page: { padding: PAGE_PADDING, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  // A hair under the true page height: at exactly PAGE_HEIGHT react-pdf's layout
  // rounds the absolute image past the page and pushes every sibling to page 2.
  sheet: { position: 'absolute', top: 0, left: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT - 0.5 },
  box: { position: 'absolute', borderColor: RED, borderStyle: 'solid' },
  field: { position: 'absolute' },
  watermark: { position: 'absolute', top: 330, left: 95, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
  footer: { position: 'absolute', left: PAGE_PADDING, right: PAGE_PADDING, bottom: PAGE_PADDING, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerBrand: { fontSize: 6, color: '#666' },
  footerCopy: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: RED, textAlign: 'center' },
})

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

/**
 * A value placed on the form. `def.label` is not drawn here — the blank sheet
 * already prints every caption; the label exists so the HTML overlay can show
 * one while editing.
 */
function Field({ def, value }: { def: FieldDef; value: string }) {
  return (
    <View style={[styles.field, { left: def.x, top: def.y, width: def.width, height: def.height, overflow: 'hidden' }]}>
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

export function AWBDocument({ data }: { data: AWBData; userScale?: 'sm' | 'md' | 'lg' }) {
  const isHawb = data.docType === 'hawb'
  const awbFull = isHawb
    ? (data.hawbNumber || '')
    : (data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : '')

  const fieldDefs = getFieldDefs(data.rateItems.length, data.otherCharges.length)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* The blank IATA form supplies every box, rule and caption. */}
        <Image src="/awb-template-bg.png" style={styles.sheet} />

        {data.isDraft && <Text style={styles.watermark}>DRAFT</Text>}

        {fieldDefs.map((def, i) => {
          if (def.readOnly) {
            return <StaticText key={i} x={def.x} y={def.y} width={def.width} height={def.height} fontSize={def.fontSize} lineHeight={1.2} text={def.staticText ?? ''} />
          }
          return <Field key={i} def={def} value={fieldValue(data, def)} />
        })}

        {/* Carrier logo, above the carrier name in the "Issued by" block */}
        {data.carrierLogoUrl ? (
          <Image
            src={data.carrierLogoUrl}
            style={{ position: 'absolute', left: mm(150), top: mm(21.9), width: mm(49), height: mm(4.2), objectFit: 'contain' }}
          />
        ) : null}

        {/* Master AWB number repeated in the CUSTOMS REF band, top right */}
        {awbFull ? (
          <Text style={[styles.field, {
            left: mm(112), top: mm(14), width: mm(87),
            fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'right',
          }]}>{awbFull}</Text>
        ) : null}

        {/* Copy label + repeated number, below the form */}
        <View style={{ position: 'absolute', left: mm(105), top: mm(283), width: mm(95), alignItems: 'center' }}>
          <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: RED, textAlign: 'center' }}>{data.copyLabel}</Text>
          {awbFull ? <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: RED, marginTop: 2 }}>{awbFull}</Text> : null}
        </View>

        <Text style={{ position: 'absolute', left: mm(15.1), top: mm(287), fontSize: 6, color: '#666' }}>AIRWAYBILL APP</Text>
      </Page>
    </Document>
  )
}
