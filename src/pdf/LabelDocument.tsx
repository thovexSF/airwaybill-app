import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { LabelData, labelAwbNumber } from '../types/label'
import { awbBarcodePayload, formatAwbDisplay } from '../lib/barcode'

/**
 * IATA air cargo identification label — 4" × 5" at 72 pt/in, so the page IS
 * the label. One label per piece; the piece number drives the barcode
 * payload's trailing 4 digits.
 */
const LABEL_W = 288
const LABEL_H = 360

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 150, left: 40, fontSize: 48, color: 'rgba(180,0,0,0.10)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  band:      { borderWidth: 1.2, borderColor: '#000', borderStyle: 'solid', borderBottomWidth: 0 },
  row:       { flexDirection: 'row' },
  lbl:       { fontSize: 6.5 },
  big:       { fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  mono:      { fontFamily: 'Courier', fontSize: 8, textAlign: 'center' },
})

export function LabelDocument({ data, barcodeSrc }: { data: LabelData; barcodeSrc?: string }) {
  const awb = labelAwbNumber(data)
  const payload = awbBarcodePayload(awb, data.pieceNumber)
  const awbDisplay = formatAwbDisplay(awb)

  const otherInfo = [
    data.transit ? `TRANSIT: ${data.transit.toUpperCase()}` : '',
    data.agent ? `AGENT: ${data.agent}` : '',
    data.mawbPackages || data.mawbWeight
      ? `MAWB: ${data.mawbPackages || '—'} pcs / ${data.mawbWeight || '—'} kg`
      : '',
    data.identifyPackages && data.hawbNumber ? `HAWB: ${data.hawbNumber}` : '',
    data.identifyPackages && (data.hawbPackages || data.hawbWeight)
      ? `HAWB: ${data.hawbPackages || '—'} pcs / ${data.hawbWeight || '—'} kg`
      : '',
    data.optionalInformation,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Document>
      <Page size={[LABEL_W, LABEL_H]} style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        {/* ── AIRLINE ── */}
        <View style={[s.band, { height: 52, padding: 6 }]}>
          <Text style={s.lbl}>Airline</Text>
          <Text style={[s.big, { fontSize: 16, marginTop: 4 }]}>{(data.airline || '').toUpperCase()}</Text>
        </View>

        {/* ── BARCODE ── */}
        <View style={[s.band, { height: 88, paddingTop: 8, alignItems: 'center' }]}>
          {barcodeSrc
            ? <Image src={barcodeSrc} style={{ width: 220, height: 58 }} />
            : <Text style={[s.mono, { fontSize: 9 }]}>*{payload}*</Text>}
          <View style={[s.row, { width: '100%', paddingHorizontal: 8, marginTop: 4 }]}>
            <Text style={{ flex: 1, fontSize: 8 }}>{payload}</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>
              {data.pieceNumber || '1'} of {data.totalPieces || '1'}
            </Text>
          </View>
        </View>

        {/* ── AWB NUMBER ── */}
        <View style={[s.band, { height: 56, padding: 6 }]}>
          <Text style={s.lbl}>Air Waybill Number</Text>
          <Text style={[s.big, { fontSize: 22, marginTop: 6 }]}>{awbDisplay}</Text>
        </View>

        {/* ── DESTINATION | DEPARTURE ── */}
        <View style={[s.band, s.row, { height: 52 }]}>
          <View style={{ flex: 1, padding: 6, borderRightWidth: 1.2, borderColor: '#000', borderStyle: 'solid' }}>
            <Text style={s.lbl}>Destination</Text>
            <Text style={[s.big, { fontSize: 20, marginTop: 4 }]}>{(data.destination || '').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, padding: 6 }}>
            <Text style={s.lbl}>Departure</Text>
            <Text style={[s.big, { fontSize: 20, marginTop: 4 }]}>{(data.departure || '').toUpperCase()}</Text>
          </View>
        </View>

        {/* ── OTHER INFORMATION ── */}
        <View style={{ borderWidth: 1.2, borderColor: '#000', borderStyle: 'solid', flex: 1, padding: 6 }}>
          <Text style={[s.lbl, { marginBottom: 4 }]}>Other Information</Text>
          <Text style={{ fontSize: 8, lineHeight: 1.3 }}>{otherInfo}</Text>
        </View>
      </Page>
    </Document>
  )
}
