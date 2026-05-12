import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { ManifestData } from '../types/manifest'

const NAVY = '#1a3a5c'
const K = 0.9

const s = StyleSheet.create({
  page:       { padding: 16 * K, fontFamily: 'Helvetica', fontSize: 7 * K, backgroundColor: '#fff' },
  watermark:  { position: 'absolute', top: 200, left: 120, fontSize: 100, color: 'rgba(0,40,100,0.06)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  titleBar:   { backgroundColor: NAVY, padding: '5 8', marginBottom: 4 },
  titleTxt:   { color: '#fff', fontSize: 12 * K, fontFamily: 'Helvetica-Bold', textAlign: 'center' },

  row:        { flexDirection: 'row' },
  lbl:        { fontSize: 5.5 * K, color: NAVY },
  txt:        { fontSize: 7.5 * K },
  bold:       { fontFamily: 'Helvetica-Bold' },
  cell:       { borderWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', padding: 3 },
  cellRight:  { borderTopWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: NAVY, borderStyle: 'solid', padding: 3 },

  tblHead:    { flexDirection: 'row', borderWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', backgroundColor: '#eef2f8' },
  tblHCell:   { borderRightWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', padding: '3 4', justifyContent: 'center', alignItems: 'center' },
  tblRow:     { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', minHeight: 18 * K },
  tblCell:    { borderRightWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', padding: '2 4', justifyContent: 'center' },
  tblRowAlt:  { backgroundColor: '#f8fafc' },

  totals:     { flexDirection: 'row', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', backgroundColor: '#eef2f8', minHeight: 18 * K },

  sigRow:     { flexDirection: 'row', borderWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', minHeight: 28 * K, marginTop: 6 },
  sigCell:    { flex: 1, borderRightWidth: 0.5, borderColor: NAVY, borderStyle: 'solid', padding: 4 },
  sigLine:    { borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid', marginTop: 14 * K },

  footer:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footerTxt:  { fontSize: 5.5 * K, color: '#999' },
})

const COL_AWB   = { width: 80 * K }
const COL_SHP   = { flex: 1.5 }
const COL_CNE   = { flex: 1.5 }
const COL_PCS   = { width: 36 * K }
const COL_GWT   = { width: 46 * K }
const COL_CWT   = { width: 46 * K }
const COL_NAT   = { flex: 2 }
const COL_SPH   = { width: 60 * K }

export function ManifestDocument({ data }: { data: ManifestData }) {
  const totalPieces = data.rows.reduce((s, r) => s + (parseInt(r.pieces) || 0), 0)
  const totalGross  = data.rows.reduce((s, r) => s + (parseFloat(r.grossWeight) || 0), 0)
  const totalCharg  = data.rows.reduce((s, r) => s + (parseFloat(r.chargeableWeight) || 0), 0)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        {/* Title */}
        <View style={s.titleBar}>
          <Text style={s.titleTxt}>Air Cargo Manifest</Text>
        </View>

        {/* Flight header */}
        <View style={s.row}>
          <View style={[s.cell, { flex: 1 }]}>
            <Text style={s.lbl}>Flight No.</Text>
            <Text style={[s.txt, s.bold]}>{data.flightNumber || '—'}</Text>
          </View>
          <View style={[s.cellRight, { flex: 1 }]}>
            <Text style={s.lbl}>Airline</Text>
            <Text style={s.txt}>{data.airline || '—'}</Text>
          </View>
          <View style={[s.cellRight, { flex: 1 }]}>
            <Text style={s.lbl}>Date</Text>
            <Text style={s.txt}>{data.flightDate || '—'}</Text>
          </View>
          <View style={[s.cellRight, { flex: 1 }]}>
            <Text style={s.lbl}>Origin</Text>
            <Text style={[s.txt, s.bold]}>{data.originStation || '—'}</Text>
          </View>
          <View style={[s.cellRight, { flex: 1 }]}>
            <Text style={s.lbl}>Destination</Text>
            <Text style={[s.txt, s.bold]}>{data.destinationStation || '—'}</Text>
          </View>
          <View style={[s.cellRight, { width: 60 * K }]}>
            <Text style={s.lbl}>Total AWBs</Text>
            <Text style={[s.txt, s.bold, { textAlign: 'center' }]}>{data.rows.length}</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={[s.tblHead, { marginTop: 6 }]}>
          {[
            { w: COL_AWB, label: 'AWB Number' },
            { w: COL_SHP, label: 'Shipper' },
            { w: COL_CNE, label: 'Consignee' },
            { w: COL_PCS, label: 'Pcs' },
            { w: COL_GWT, label: 'Gross Wt\n(kg)' },
            { w: COL_CWT, label: 'Chg Wt\n(kg)' },
            { w: COL_NAT, label: 'Nature of Goods' },
            { w: COL_SPH, label: 'Special\nHandling' },
          ].map((col, i, arr) => (
            <View key={i} style={[s.tblHCell, col.w, i === arr.length - 1 ? { borderRightWidth: 0 } : {}]}>
              <Text style={[s.lbl, { textAlign: 'center' }]}>{col.label}</Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        {data.rows.map((row, idx) => (
          <View key={row.id} style={[s.tblRow, idx % 2 === 1 ? s.tblRowAlt : {}]}>
            <View style={[s.tblCell, COL_AWB]}>
              <Text style={[s.txt, s.bold]}>{row.awbNumber}</Text>
            </View>
            <View style={[s.tblCell, COL_SHP]}>
              <Text style={s.txt}>{row.shipperName}</Text>
            </View>
            <View style={[s.tblCell, COL_CNE]}>
              <Text style={s.txt}>{row.consigneeName}</Text>
            </View>
            <View style={[s.tblCell, COL_PCS]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{row.pieces}</Text>
            </View>
            <View style={[s.tblCell, COL_GWT]}>
              <Text style={[s.txt, { textAlign: 'right' }]}>{row.grossWeight}</Text>
            </View>
            <View style={[s.tblCell, COL_CWT]}>
              <Text style={[s.txt, { textAlign: 'right' }]}>{row.chargeableWeight}</Text>
            </View>
            <View style={[s.tblCell, COL_NAT]}>
              <Text style={s.txt}>{row.natureOfGoods}</Text>
            </View>
            <View style={[s.tblCell, COL_SPH, { borderRightWidth: 0 }]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{row.specialHandling}</Text>
            </View>
          </View>
        ))}

        {/* Totals row */}
        <View style={s.totals}>
          <View style={[s.tblCell, COL_AWB]}>
            <Text style={[s.lbl, s.bold]}>TOTALS</Text>
          </View>
          <View style={[s.tblCell, COL_SHP]}><Text> </Text></View>
          <View style={[s.tblCell, COL_CNE]}><Text> </Text></View>
          <View style={[s.tblCell, COL_PCS]}>
            <Text style={[s.txt, s.bold, { textAlign: 'center' }]}>{totalPieces || '—'}</Text>
          </View>
          <View style={[s.tblCell, COL_GWT]}>
            <Text style={[s.txt, s.bold, { textAlign: 'right' }]}>{totalGross ? totalGross.toFixed(1) : '—'}</Text>
          </View>
          <View style={[s.tblCell, COL_CWT]}>
            <Text style={[s.txt, s.bold, { textAlign: 'right' }]}>{totalCharg ? totalCharg.toFixed(1) : '—'}</Text>
          </View>
          <View style={[s.tblCell, COL_NAT]}><Text> </Text></View>
          <View style={[s.tblCell, COL_SPH, { borderRightWidth: 0 }]}><Text> </Text></View>
        </View>

        {/* Signature */}
        <View style={s.sigRow}>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Prepared by</Text>
            <Text style={[s.txt, { marginTop: 2 }]}>{data.preparedBy}</Text>
            <View style={s.sigLine} />
          </View>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Date</Text>
            <Text style={s.txt}>{data.preparedDate}</Text>
            <View style={s.sigLine} />
          </View>
          <View style={[s.sigCell, { borderRightWidth: 0 }]}>
            <Text style={s.lbl}>Signature</Text>
            <View style={s.sigLine} />
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>AIRWAYBILL APP</Text>
          <Text style={[s.footerTxt, { color: NAVY, fontFamily: 'Helvetica-Bold' }]}>Air Cargo Manifest</Text>
        </View>
      </Page>
    </Document>
  )
}
