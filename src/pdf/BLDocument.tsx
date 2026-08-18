import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { BLData, blTotals } from '../types/bl'

const RED = '#8B0000'

const s = StyleSheet.create({
  page:      { padding: 20, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 300, left: 90, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  headRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 3 },
  title:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: RED },
  sub:       { fontSize: 7, marginBottom: 6, color: '#555' },

  row:       { flexDirection: 'row' },
  cell:      { borderWidth: 0.6, borderColor: '#111', borderStyle: 'solid', padding: 4, minHeight: 34 },
  lbl:       { fontSize: 6, color: RED, marginBottom: 2 },
  txt:       { fontSize: 8 },

  thRow:     { flexDirection: 'row', borderWidth: 0.6, borderColor: '#111', borderStyle: 'solid', backgroundColor: '#faf0f0' },
  th:        { padding: 3, borderLeftWidth: 0.6, borderColor: '#111', borderStyle: 'solid' },
  thFirst:   { padding: 3 },
  tdRow:     { flexDirection: 'row', borderWidth: 0.6, borderTopWidth: 0, borderColor: '#111', borderStyle: 'solid', minHeight: 20 },
  td:        { padding: 3, borderLeftWidth: 0.6, borderColor: '#111', borderStyle: 'solid' },
  tdFirst:   { padding: 3 },
})

const COL_MARKS = { width: '22%' }
const COL_PKGS  = { width: '14%' }
const COL_DESC  = { width: '38%' }
const COL_WT    = { width: '13%' }
const COL_MEAS  = { width: '13%' }

function Cell({ label, value, style }: { label: string; value: string; style?: any }) {
  return (
    <View style={[s.cell, style]}>
      <Text style={s.lbl}>{label}</Text>
      <Text style={s.txt}>{value}</Text>
    </View>
  )
}

export function BLDocument({ data }: { data: BLData }) {
  const totals = blTotals(data)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        <View style={s.headRow}>
          <Text style={s.title}>HOUSE BILL OF LADING</Text>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
            {data.negotiable.toUpperCase()}
            {data.numberOfOriginals ? ` · ${data.numberOfOriginals} ORIGINAL(S)` : ''}
          </Text>
        </View>
        <Text style={s.sub}>FOR MULTIMODAL TRANSPORT OR PORT TO PORT SHIPMENT</Text>

        {/* ── PARTIES | DOCUMENT REFS ── */}
        <View style={s.row}>
          <View style={{ width: '55%' }}>
            <Cell label="Shipper" value={data.shipper} style={{ minHeight: 55 }} />
            <Cell label="Consignee" value={data.consignee} style={{ minHeight: 55 }} />
            <Cell label="Notify Party" value={data.notifyParty} style={{ minHeight: 45 }} />
          </View>
          <View style={{ width: '45%' }}>
            <View style={s.row}>
              <Cell label="Document Number" value={data.documentNumber} style={{ width: '50%' }} />
              <Cell label="B/L Number" value={data.blNumber} style={{ width: '50%' }} />
            </View>
            <Cell label="Carrier Booking No." value={data.carrierBookingNo} />
            <Cell label="Export References" value={data.exportReferences} />
            <Cell label="Agent" value={data.agent} style={{ minHeight: 50 }} />
          </View>
        </View>

        {/* ── CARRIAGE ── */}
        <View style={s.row}>
          <Cell label="Pre-Carriage By" value={data.preCarriageBy} style={{ width: '25%' }} />
          <Cell label="Vessel / Voyage No." value={data.vesselVoyageNo} style={{ width: '35%' }} />
          <Cell label="Place of Receipt" value={data.placeOfReceipt} style={{ width: '40%' }} />
        </View>
        <View style={s.row}>
          <Cell label="Port of Loading" value={data.portOfLoading} style={{ width: '33%' }} />
          <Cell label="Port of Discharge" value={data.portOfDischarge} style={{ width: '33%' }} />
          <Cell label="Place of Delivery" value={data.placeOfDelivery} style={{ width: '34%' }} />
        </View>

        {/* ── GOODS ── */}
        <View style={[s.thRow, { marginTop: 6 }]}>
          <View style={[s.thFirst, COL_MARKS]}><Text style={s.lbl}>Marks and Nos. / Container No.</Text></View>
          <View style={[s.th, COL_PKGS]}><Text style={s.lbl}>No. and Kind of Packages</Text></View>
          <View style={[s.th, COL_DESC]}><Text style={s.lbl}>Description of Goods</Text></View>
          <View style={[s.th, COL_WT]}><Text style={s.lbl}>Gross Weight</Text></View>
          <View style={[s.th, COL_MEAS]}><Text style={s.lbl}>Measurement</Text></View>
        </View>
        {data.goodsItems.map(item => (
          <View key={item.id} style={s.tdRow} wrap={false}>
            <View style={[s.tdFirst, COL_MARKS]}><Text style={s.txt}>{item.marks}</Text></View>
            <View style={[s.td, COL_PKGS]}><Text style={s.txt}>{item.packages}</Text></View>
            <View style={[s.td, COL_DESC]}><Text style={s.txt}>{item.description}</Text></View>
            <View style={[s.td, COL_WT]}><Text style={[s.txt, { textAlign: 'right' }]}>{item.weight}</Text></View>
            <View style={[s.td, COL_MEAS]}><Text style={[s.txt, { textAlign: 'right' }]}>{item.measurement}</Text></View>
          </View>
        ))}
        <View style={[s.tdRow, { backgroundColor: '#faf0f0' }]}>
          <View style={[s.tdFirst, COL_MARKS]}><Text style={[s.txt, { fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text></View>
          <View style={[s.td, COL_PKGS]}><Text style={s.txt} /></View>
          <View style={[s.td, COL_DESC]}><Text style={s.txt} /></View>
          <View style={[s.td, COL_WT]}>
            <Text style={[s.txt, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {totals.weight ? totals.weight.toFixed(2) : ''}
            </Text>
          </View>
          <View style={[s.td, COL_MEAS]}>
            <Text style={[s.txt, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
              {totals.measurement ? totals.measurement.toFixed(3) : ''}
            </Text>
          </View>
        </View>

        {/* ── CHARGES ── */}
        <View style={[s.row, { marginTop: 6 }]}>
          <Cell label="Freight & Charges" value={data.freightAndCharges} style={{ width: '40%' }} />
          <Cell label="Currency" value={data.currency} style={{ width: '15%' }} />
          <Cell label="Declared Value" value={data.declaredValue} style={{ width: '20%' }} />
          <Cell label="No. of Original B(s)/L" value={data.numberOfOriginals} style={{ width: '25%' }} />
        </View>

        {/* ── ISSUE ── */}
        <View style={[s.row, { marginTop: 8 }]}>
          <Cell label="Place of Issue" value={data.placeOfIssue} style={{ width: '33%' }} />
          <Cell label="Date of Issue" value={data.dateOfIssue} style={{ width: '33%' }} />
          <Cell label="Carrier" value={data.carrierName} style={{ width: '34%' }} />
        </View>

        {!!data.notes && (
          <Text style={{ fontSize: 7, marginTop: 6, color: '#555' }}>{data.notes}</Text>
        )}

        <View style={{ marginTop: 16, borderBottomWidth: 0.8, borderColor: '#111', borderStyle: 'solid', paddingBottom: 4 }}>
          <Text style={s.lbl}>As agent of the carrier</Text>
          <Text style={s.txt}>{data.agent}</Text>
        </View>
      </Page>
    </Document>
  )
}
