import React from 'react'
import { Document, Page, View, Text, StyleSheet, Svg, Line } from '@react-pdf/renderer'
import { DGDData, DGDItem } from '../types/dgd'

/**
 * IATA Shipper's Declaration for Dangerous Goods, drawn to match the same form
 * the sister `b2b` app produces (`pdf/stampDgdPdf.ts`) so a shipment looks the
 * same whichever app issued it: black rules on white with the red/white
 * candy-stripe borders that identify the form, rather than app-branded colour.
 *
 * Coordinates are in PDF points on US Letter, top-origin, carried over from
 * that renderer.
 */

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 36
const BAND = 14          // width of the hatched border stripe
const RED = '#D90D0D'
const GRAY = '#595959'

const LEFT = MARGIN + 16
const RIGHT = PAGE_W - MARGIN - 16
const CONTENT_W = RIGHT - LEFT
const MID = LEFT + CONTENT_W * 0.52

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  abs:       { position: 'absolute' },
  bold:      { fontFamily: 'Helvetica-Bold' },
  caption:   { fontSize: 7, color: GRAY },
  watermark: { position: 'absolute', top: 320, left: 120, fontSize: 96, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
})

/** A bordered box in top-origin coordinates. */
function Box({ x, top, w, h, thickness = 0.8 }: { x: number; top: number; w: number; h: number; thickness?: number }) {
  return (
    <View style={[s.abs, {
      left: x, top, width: w, height: h,
      borderWidth: thickness, borderColor: '#111', borderStyle: 'solid',
    }]} />
  )
}

function Caption({ x, top, children, size = 7 }: { x: number; top: number; children: React.ReactNode; size?: number }) {
  return <Text style={[s.abs, { left: x, top, fontSize: size, color: GRAY }]}>{children}</Text>
}

function Value({ x, top, children, size = 9, width }: { x: number; top: number; children: React.ReactNode; size?: number; width?: number }) {
  return (
    <Text style={[s.abs, s.bold, { left: x, top, fontSize: size, width }]}>{children}</Text>
  )
}

/** The red/white diagonal candy stripes down both edges of the IATA form. */
function HatchBorder({ x }: { x: number }) {
  const h = PAGE_H - MARGIN * 2
  const step = 6
  const lines: React.ReactNode[] = []
  for (let i = -Math.ceil(BAND / step); i * step < h + BAND; i++) {
    const y = i * step
    lines.push(<Line key={i} x1={0} y1={y} x2={BAND} y2={y + BAND} strokeWidth={3.2} stroke={RED} />)
  }
  return (
    <View style={[s.abs, { left: x, top: MARGIN, width: BAND, height: h, overflow: 'hidden' }]}>
      <Svg width={BAND} height={h}>{lines}</Svg>
    </View>
  )
}

/**
 * One of the form's mutually exclusive choices. The convention on the paper
 * form is to strike out what does not apply, so the unselected box is crossed.
 */
function OptionBox({ x, top, w, h, lines, selected }: {
  x: number; top: number; w: number; h: number; lines: string[]; selected: boolean
}) {
  const pad = 3
  return (
    <>
      <Box x={x} top={top} w={w} h={h} thickness={0.7} />
      {lines.map((line, i) => (
        <Text key={i} style={[s.abs, { left: x + 4, top: top + 5 + i * 9, fontSize: 7 }]}>{line}</Text>
      ))}
      {!selected && (
        <View style={[s.abs, { left: x, top, width: w, height: h }]}>
          <Svg width={w} height={h}>
            <Line x1={pad} y1={pad} x2={w - pad} y2={h - pad} strokeWidth={0.9} stroke="#111" />
            <Line x1={pad} y1={h - pad} x2={w - pad} y2={pad} strokeWidth={0.9} stroke="#111" />
          </Svg>
        </View>
      )}
    </>
  )
}

const DECLARATION = [
  'I hereby declare that the contents of this consignment are fully and',
  'accurately described above by the proper shipping name, and are',
  'classified, packaged, marked and labelled/placarded, and are in all',
  'respects in proper condition for transport according to applicable',
  'International and National Governmental Regulations.',
]

const WARNING =
  'Failure to comply in all respects with the applicable Dangerous Goods Regulations may be in breach of the applicable law, subject to legal penalties.'

/** Column edges of the dangerous-goods table. */
const COL = [LEFT, LEFT + 48, LEFT + 220, LEFT + 270, LEFT + 310, LEFT + 430, LEFT + 480, RIGHT]
const HEADERS = ['UN or ID No.', 'Proper Shipping Name', 'Class / Div.', 'PG', 'Qty & packaging', 'P.Inst.', 'Auth.']

const TABLE_TOP = 290
const TABLE_H = 280
const HEADER_TOP = TABLE_TOP + 22
const ROW_H = 18
const BODY_TOP = HEADER_TOP + 28
const ROWS = Math.floor((TABLE_TOP + TABLE_H - BODY_TOP - 4) / ROW_H)

function itemCells(item: DGDItem): string[] {
  const classDiv = item.subsidiaryRisk
    ? `${item.classDivision} (${item.subsidiaryRisk})`
    : item.classDivision
  return [
    item.unIdNo,
    item.properShippingName,
    classDiv,
    item.packingGroup,
    item.quantity,
    item.packingInstruction,
    item.authorization,
  ]
}

export function DGDDocument({ data }: { data: DGDData }) {
  const cargoOnly = data.shipmentType === 'cargo_only'
  const tdTop = 182

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        <HatchBorder x={MARGIN - BAND} />
        <HatchBorder x={PAGE_W - MARGIN} />

        <Text style={[s.abs, s.bold, { left: LEFT, top: 20, fontSize: 11 }]}>
          SHIPPER'S DECLARATION FOR DANGEROUS GOODS
        </Text>

        {/* ── Shipper | Air Waybill ── */}
        <Box x={LEFT} top={40} w={MID - LEFT} h={72} />
        <Caption x={LEFT + 3} top={43}>Shipper</Caption>
        <Value x={LEFT + 4} top={53} width={MID - LEFT - 10}>{data.shipperNameAndAddress}</Value>

        <Box x={MID} top={40} w={RIGHT - MID} h={28} />
        <Caption x={MID + 3} top={43}>Air Waybill No.</Caption>
        <Value x={MID + 4} top={53} size={11}>{data.awbNo}</Value>

        <Box x={MID} top={68} w={RIGHT - MID} h={22} />
        <Caption x={MID + 3} top={71}>Page</Caption>
        <Value x={MID + 32} top={75}>{data.pageOf}</Value>

        <Box x={MID} top={90} w={RIGHT - MID} h={22} />
        <Caption x={MID + 3} top={93} size={6.5}>Shipper's Reference Number (optional)</Caption>
        <Value x={MID + 4} top={103} size={8}>{data.shipperReference}</Value>

        {/* ── Consignee | Warning ── */}
        <Box x={LEFT} top={112} w={MID - LEFT} h={70} />
        <Caption x={LEFT + 3} top={115}>Consignee</Caption>
        <Value x={LEFT + 4} top={125} width={MID - LEFT - 10}>{data.consigneeNameAndAddress}</Value>

        <Box x={MID} top={112} w={RIGHT - MID} h={70} />
        <Text style={[s.abs, s.bold, { left: MID + 3, top: 116, fontSize: 8 }]}>WARNING</Text>
        <Text style={[s.abs, { left: MID + 4, top: 129, width: RIGHT - MID - 8, fontSize: 6.5, lineHeight: 1.25 }]}>
          {WARNING}
        </Text>

        {/* ── Transport details ── */}
        <Box x={LEFT} top={tdTop} w={CONTENT_W} h={100} />
        <Text style={[s.abs, s.bold, { left: LEFT + 3, top: tdTop + 5, fontSize: 8 }]}>TRANSPORT DETAILS</Text>
        <Caption x={LEFT + 3} top={tdTop + 17}>This shipment is within the limitations prescribed for:</Caption>
        <Caption x={LEFT + 3} top={tdTop + 27} size={6.5}>(delete non-applicable)</Caption>

        <OptionBox x={LEFT + 8} top={tdTop + 40} w={88} h={36} selected={!cargoOnly}
          lines={['PASSENGER', 'AND CARGO', 'AIRCRAFT']} />
        <OptionBox x={LEFT + 102} top={tdTop + 40} w={78} h={36} selected={cargoOnly}
          lines={['CARGO', 'AIRCRAFT', 'ONLY']} />

        <Box x={LEFT + 190} top={tdTop + 40} w={100} h={28} />
        <Caption x={LEFT + 193} top={tdTop + 43} size={6}>Airport of Departure</Caption>
        <Value x={LEFT + 194} top={tdTop + 53} size={10}>{data.airportOfDeparture}</Value>

        <Box x={LEFT + 8} top={tdTop + 78} w={282} h={18} />
        <Caption x={LEFT + 11} top={tdTop + 81} size={6}>Airport of Destination</Caption>
        <Value x={LEFT + 140} top={tdTop + 83} size={10}>{data.airportOfDestination}</Value>

        <Caption x={MID + 4} top={tdTop + 17}>Shipment type: (delete non-applicable)</Caption>
        <OptionBox x={MID + 4} top={tdTop + 40} w={110} h={22} selected={!data.isRadioactive}
          lines={['NON-RADIOACTIVE']} />
        <OptionBox x={MID + 120} top={tdTop + 40} w={90} h={22} selected={!!data.isRadioactive}
          lines={['RADIOACTIVE']} />

        {/* ── Nature and quantity of dangerous goods ── */}
        <Box x={LEFT} top={TABLE_TOP} w={CONTENT_W} h={TABLE_H} thickness={1} />
        <Text style={[s.abs, s.bold, { left: LEFT + 3, top: TABLE_TOP + 7, fontSize: 8 }]}>
          NATURE AND QUANTITY OF DANGEROUS GOODS
        </Text>

        <View style={[s.abs, { left: LEFT, top: HEADER_TOP, width: CONTENT_W, height: 28, backgroundColor: '#f2f2f2' }]} />
        <Box x={LEFT} top={HEADER_TOP} w={CONTENT_W} h={28} thickness={0.6} />
        {HEADERS.map((h, i) => (
          <Text key={h} style={[s.abs, s.bold, { left: COL[i] + 3, top: HEADER_TOP + 9, fontSize: 6.5 }]}>{h}</Text>
        ))}

        {/* Column rules and row rules across the whole table body */}
        <View style={[s.abs, { left: LEFT, top: HEADER_TOP, width: CONTENT_W, height: TABLE_TOP + TABLE_H - HEADER_TOP }]}>
          <Svg width={CONTENT_W} height={TABLE_TOP + TABLE_H - HEADER_TOP}>
            {COL.slice(1, -1).map((x, i) => (
              <Line key={i} x1={x - LEFT} y1={0} x2={x - LEFT} y2={BODY_TOP - HEADER_TOP + ROWS * ROW_H}
                strokeWidth={0.4} stroke="#bbb" />
            ))}
            {Array.from({ length: ROWS }, (_, r) => {
              const y = BODY_TOP - HEADER_TOP + (r + 1) * ROW_H
              return <Line key={`r${r}`} x1={0} y1={y} x2={CONTENT_W} y2={y} strokeWidth={0.35} stroke="#b3b3b3" />
            })}
          </Svg>
        </View>

        {data.items.slice(0, ROWS).map((item, r) => (
          <React.Fragment key={item.id}>
            {itemCells(item).map((v, i) => v ? (
              <Text
                key={i}
                style={[s.abs, {
                  left: COL[i] + 3,
                  top: BODY_TOP + r * ROW_H + 6,
                  width: COL[i + 1] - COL[i] - 6,
                  fontSize: 7.5,
                  // The cell is a fixed box on the form; clip rather than wrap.
                  height: ROW_H - 6,
                  overflow: 'hidden',
                }]}
              >
                {v}
              </Text>
            ) : null)}
          </React.Fragment>
        ))}

        {/* ── Additional handling ── */}
        <Box x={LEFT} top={578} w={CONTENT_W} h={42} />
        <Caption x={LEFT + 3} top={581}>Additional Handling Information</Caption>
        <Text style={[s.abs, { left: LEFT + 4, top: 593, width: CONTENT_W - 10, fontSize: 8, lineHeight: 1.25 }]}>
          {data.additionalHandling}
        </Text>

        {/* ── Declaration + signature ── */}
        <Box x={LEFT} top={628} w={CONTENT_W * 0.58} h={118} />
        {DECLARATION.map((line, i) => (
          <Text key={i} style={[s.abs, { left: LEFT + 4, top: 638 + i * 11, fontSize: 6.5 }]}>{line}</Text>
        ))}

        <Box x={LEFT + CONTENT_W * 0.58} top={628} w={CONTENT_W * 0.42} h={40} />
        <Caption x={LEFT + CONTENT_W * 0.58 + 4} top={631} size={6.5}>Name of Signatory</Caption>
        <Value x={LEFT + CONTENT_W * 0.58 + 5} top={643} size={8}>
          {[data.signatoryName, data.signatoryTitle].filter(Boolean).join(' — ')}
        </Value>

        <Box x={LEFT + CONTENT_W * 0.58} top={668} w={CONTENT_W * 0.42} h={40} />
        <Caption x={LEFT + CONTENT_W * 0.58 + 4} top={671} size={6.5}>Place and Date</Caption>
        <Value x={LEFT + CONTENT_W * 0.58 + 5} top={683} size={8}>
          {[data.signaturePlace, data.signatureDate].filter(Boolean).join(', ')}
        </Value>

        <Box x={LEFT + CONTENT_W * 0.58} top={708} w={CONTENT_W * 0.42} h={38} />
        <Caption x={LEFT + CONTENT_W * 0.58 + 4} top={711} size={6.5}>Signature</Caption>

        <Text style={[s.abs, { left: LEFT, top: 756, fontSize: 6, color: '#999' }]}>AIRWAYBILL APP</Text>
      </Page>
    </Document>
  )
}
