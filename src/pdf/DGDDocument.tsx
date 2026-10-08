import React from 'react'
import { Document, Page, View, Text, StyleSheet, Svg, Path, Line, Text as SvgText } from '@react-pdf/renderer'
import { DGDData, DGDItem } from '../types/dgd'
import { DGD_FORM } from './dgdForm'

/**
 * IATA Shipper's Declaration for Dangerous Goods (DGR 8.1): English wording with Spanish
 * translation, black and red on white, red hatching down both margins.
 *
 * The sheet itself — rules, dotted lines, hatching, captions — is `dgdForm.ts`, measured from a
 * reference sheet by `scripts/extract-dgd-form.py` and redrawn here as vectors (no embedded
 * artwork). This file only places the values into that sheet's boxes.
 *
 * Coordinates are PDF points on US Letter, top origin.
 */

const PAGE_W = DGD_FORM.width
const PAGE_H = DGD_FORM.height

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  abs:       { position: 'absolute' },
  value:     { position: 'absolute', fontFamily: 'Helvetica-Bold', color: '#000' },
  watermark: { position: 'absolute', top: 320, left: 120, fontSize: 96, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
})

/** Vertical offset from a text box's top edge to its baseline, as a fraction of font size. */
const BASELINE = 0.92

/** Text whose baseline sits at `y`, so values line up with the captions of the sheet. */
function At({ x, y, size = 9, width, children }: { x: number; y: number; size?: number; width?: number; children: React.ReactNode }) {
  return <Text style={[s.value, { left: x, top: y - size * BASELINE, fontSize: size, width }]}>{children}</Text>
}

/** Table geometry, read off the sheet: column rules, header bottom and the dotted footer rule. */
const COL = [48.5, 86, 239.5, 277.5, 312, 442, 477.5, 558]
const BODY_TOP = 405
const BODY_BOTTOM = 605
const ROW_H = 20
export const DGD_ROWS = Math.floor((BODY_BOTTOM - BODY_TOP - 4) / ROW_H)

function itemCells(item: DGDItem): string[] {
  const classDiv = item.subsidiaryRisk ? `${item.classDivision} (${item.subsidiaryRisk})` : item.classDivision
  return [item.unIdNo, item.properShippingName, classDiv, item.packingGroup, item.quantity, item.packingInstruction, item.authorization]
}

/** The sheet itself: filled shapes and every caption, in the form's own positions. */
function Sheet() {
  return (
    <Svg width={PAGE_W} height={PAGE_H} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} style={s.abs}>
      {DGD_FORM.paths.map((p, i) => (
        <Path key={i} d={p.d} fill={p.fill} fillRule={p.evenOdd ? 'evenodd' : 'nonzero'} />
      ))}
      {DGD_FORM.strokes.map((st, i) => (
        <Path key={`s${i}`} d={st.d} stroke={st.stroke} strokeWidth={st.width} fill="none" />
      ))}
      {DGD_FORM.words.map((w, i) => (
        <SvgText key={`w${i}`} x={w.x} y={w.y} style={{ fontFamily: w.bold ? 'Helvetica-Bold' : 'Helvetica', fontSize: w.size }} fill="#000">
          {w.text}
        </SvgText>
      ))}
    </Svg>
  )
}

/** Strike-through across an option the shipment does not use (the paper form is struck by hand). */
function Strike({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <Svg width={PAGE_W} height={PAGE_H} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} style={s.abs}>
      <Line x1={x1 + 2} y1={y1 + 2} x2={x2 - 2} y2={y2 - 2} stroke="#000" strokeWidth={1} />
      <Line x1={x1 + 2} y1={y2 - 2} x2={x2 - 2} y2={y1 + 2} stroke="#000" strokeWidth={1} />
    </Svg>
  )
}

// Option boxes (x1, y1, x2, y2).
const PASSENGER_BOX = [54, 265, 116, 292.5]
const CARGO_ONLY_BOX = [116, 265, 175.5, 292.5]
const NON_RADIOACTIVE_BOX = [318.5, 307.5, 408.5, 322.5]
const RADIOACTIVE_BOX = [408.5, 307.5, 476.5, 322.5]

function pageNumbers(data: DGDData, index: number, total: number): [string, string] {
  if (total > 1) return [String(index + 1), String(total)]
  const m = /^\s*(\S+)\s+of\s+(\S+)\s*$/i.exec(data.pageOf || '')
  return m ? [m[1], m[2]] : ['1', '1']
}

function DeclarationPage({ data, items, index, total }: { data: DGDData; items: DGDItem[]; index: number; total: number }) {
  const cargoOnly = data.shipmentType === 'cargo_only'
  const [pageNo, pageTotal] = pageNumbers(data, index, total)
  const strikeBox = (b: number[]) => <Strike x1={b[0]} y1={b[1]} x2={b[2]} y2={b[3]} />
  const sign = [data.signatoryName, data.signatoryTitle].filter(Boolean).join(' — ')

  return (
    <Page size="LETTER" style={s.page}>
      {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}
      <Sheet />

      {/* Header */}
      <At x={53.3} y={64} size={9} width={236}>{data.shipperNameAndAddress}</At>
      <At x={420} y={53} size={10}>{data.awbNo}</At>
      <At x={338} y={74} size={10}>{pageNo}</At>
      <At x={380} y={74} size={10}>{pageTotal}</At>
      <At x={470} y={100} size={8} width={86}>{data.shipperReference}</At>
      <At x={53.3} y={145} size={9} width={236}>{data.consigneeNameAndAddress}</At>

      {/* Transport details */}
      <At x={186.2} y={268} size={10}>{data.airportOfDeparture}</At>
      <At x={182} y={313} size={10}>{data.airportOfDestination}</At>
      {cargoOnly ? strikeBox(PASSENGER_BOX) : strikeBox(CARGO_ONLY_BOX)}
      {data.isRadioactive ? strikeBox(NON_RADIOACTIVE_BOX) : strikeBox(RADIOACTIVE_BOX)}

      {/* Nature and quantity of dangerous goods */}
      {items.map((item, r) => (
        <React.Fragment key={item.id}>
          {itemCells(item).map((v, i) => v ? (
            <Text
              key={i}
              style={[s.value, {
                left: COL[i] + 3, top: BODY_TOP + 4 + r * ROW_H, width: COL[i + 1] - COL[i] - 6,
                // Two lines fit: dangerous-goods names are long. Anything past that is clipped.
                height: ROW_H - 2, fontSize: 7.2, lineHeight: 1.1, overflow: 'hidden',
                fontFamily: i === 1 ? 'Helvetica-Bold' : 'Helvetica',
              }]}
            >
              {v}
            </Text>
          ) : null)}
        </React.Fragment>
      ))}

      {/* Additional handling + certification */}
      <View style={[s.abs, { left: 53.3, top: 634, width: 500, height: 22 }]}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 8, lineHeight: 1.2 }}>{data.additionalHandling}</Text>
      </View>
      <At x={359.3} y={694} size={8.5} width={196}>{sign}</At>
      <At x={456} y={709} size={9} width={100}>{[data.signaturePlace, data.signatureDate].filter(Boolean).join(', ')}</At>

      <Text style={[s.abs, { left: 48.1, top: 768, fontSize: 5, color: '#999' }]}>AIRWAYBILL APP</Text>
    </Page>
  )
}

export function DGDDocument({ data }: { data: DGDData }) {
  // The table box is fixed on the sheet; more lines continue on further sheets that repeat the
  // hatching, the AWB number and "Page n of N", as DGR 8.1 requires for extension pages.
  const chunks: DGDItem[][] = []
  for (let i = 0; i < data.items.length; i += DGD_ROWS) chunks.push(data.items.slice(i, i + DGD_ROWS))
  if (!chunks.length) chunks.push([])

  return (
    <Document>
      {chunks.map((items, i) => (
        <DeclarationPage key={i} data={data} items={items} index={i} total={chunks.length} />
      ))}
    </Document>
  )
}
