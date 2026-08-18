import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { BLManifestData, blManifestTotals } from '../types/blManifest'

const RED = '#8B0000'

const s = StyleSheet.create({
  page:      { padding: 28, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 300, left: 90, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  headRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title:     { fontSize: 12, fontFamily: 'Helvetica-Bold', color: RED, marginBottom: 4 },
  mono:      { fontFamily: 'Courier', fontSize: 9 },

  row:       { flexDirection: 'row' },
  box:       { borderWidth: 0.8, borderColor: '#111', borderStyle: 'solid', padding: 5 },
  lbl:       { fontSize: 6, color: RED, marginBottom: 2 },
  txt:       { fontSize: 8 },

  thRow:     { flexDirection: 'row', borderTopWidth: 0.8, borderBottomWidth: 0.8, borderColor: '#111', borderStyle: 'solid', paddingVertical: 3, marginTop: 8 },
  th:        { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  tdRow:     { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.4, borderColor: '#999', borderStyle: 'solid' },
  td:        { fontSize: 8 },
})

const COL_HBL   = { width: '16%' }
const COL_MARKS = { width: '22%' }
const COL_PKGS  = { width: '32%' }
const COL_WT    = { width: '15%' }
const COL_MEAS  = { width: '15%' }

export function BLManifestDocument({ data }: { data: BLManifestData }) {
  const totals = blManifestTotals(data)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        <View style={s.headRow}>
          <View>
            <Text style={s.title}>B/L CONSOLIDATION MANIFEST</Text>
            <Text style={s.mono}>{data.manifestDate}</Text>
          </View>
          <View>
            <Text style={[s.mono, { textAlign: 'right' }]}>{data.masterBl}</Text>
            <Text style={{ fontSize: 8, textAlign: 'right' }}>{data.items.length} house B/L(s)</Text>
          </View>
        </View>

        {/* ── PARTIES ── */}
        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={[s.box, { flex: 1, marginRight: 6, minHeight: 66 }]}>
            <Text style={s.lbl}>Shipper</Text>
            <Text style={s.txt}>{data.shipper}</Text>
          </View>
          <View style={[s.box, { flex: 1, minHeight: 66 }]}>
            <Text style={s.lbl}>Consignee</Text>
            <Text style={s.txt}>{data.consignee}</Text>
          </View>
        </View>

        {/* ── VOYAGE ── */}
        <View style={[s.row, { marginBottom: 6 }]}>
          <Text style={[s.mono, { width: '50%' }]}>
            Origin {data.origin}{'\n'}
            Destination {data.destination}{'\n'}
            Vessel/Voyage {data.vesselVoyageNo}
          </Text>
          <Text style={[s.mono, { width: '50%' }]}>
            Master B/L {data.masterBl}{'\n'}
            Carrier {data.carrier}{'\n'}
            Weight {totals.weight.toFixed(2)} kg
          </Text>
        </View>

        {/* ── ITEMS ── */}
        <View style={s.thRow}>
          <Text style={[s.th, COL_HBL]}>HBL</Text>
          <Text style={[s.th, COL_MARKS]}>Marks / Container No.</Text>
          <Text style={[s.th, COL_PKGS]}>Packages / Description</Text>
          <Text style={[s.th, COL_WT]}>Gross Weight</Text>
          <Text style={[s.th, COL_MEAS]}>Measurement</Text>
        </View>
        {data.items.map(item => (
          <View key={item.id} style={s.tdRow} wrap={false}>
            <Text style={[s.td, COL_HBL, { fontFamily: 'Courier' }]}>{item.hbl}</Text>
            <Text style={[s.td, COL_MARKS]}>{item.marks}</Text>
            <Text style={[s.td, COL_PKGS]}>{item.packages}</Text>
            <Text style={[s.td, COL_WT, { textAlign: 'right' }]}>{item.weight}</Text>
            <Text style={[s.td, COL_MEAS, { textAlign: 'right' }]}>{item.measurement}</Text>
          </View>
        ))}
        <View style={[s.thRow, { marginTop: 4 }]}>
          <Text style={[s.th, COL_HBL]}>Total</Text>
          <Text style={[s.th, COL_MARKS]} />
          <Text style={[s.th, COL_PKGS]} />
          <Text style={[s.th, COL_WT, { textAlign: 'right' }]}>{totals.weight.toFixed(2)}</Text>
          <Text style={[s.th, COL_MEAS, { textAlign: 'right' }]}>{totals.measurement.toFixed(3)}</Text>
        </View>

        {!!data.notes && <Text style={{ fontSize: 7, marginTop: 10, color: '#555' }}>{data.notes}</Text>}
      </Page>
    </Document>
  )
}
