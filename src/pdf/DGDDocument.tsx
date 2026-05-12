import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DGDData } from '../types/dgd'

const RED = '#8B0000'
const K = 0.9

const s = StyleSheet.create({
  page:       { padding: 18 * K, fontFamily: 'Helvetica', fontSize: 7 * K, backgroundColor: '#fff' },
  watermark:  { position: 'absolute', top: 260, left: 70, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  // Title
  titleBar:   { backgroundColor: RED, padding: '5 8', marginBottom: 2 },
  titleTxt:   { color: '#fff', fontSize: 11 * K, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  warnTxt:    { fontSize: 5.5 * K, color: '#555', textAlign: 'center', marginBottom: 3 },

  // Generic
  row:        { flexDirection: 'row' },
  lbl:        { fontSize: 5.5 * K, color: RED },
  txt:        { fontSize: 7.5 * K },
  bold:       { fontFamily: 'Helvetica-Bold' },
  cell:       { borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3 },
  cellNoTop:  { borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3 },
  cellRight:  { borderTopWidth: 0.5, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 3 },
  cellRightNoTop: { borderTopWidth: 0, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderLeftWidth: 0, borderColor: RED, borderStyle: 'solid', padding: 3 },

  // Table
  tblHead:    { flexDirection: 'row', borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', backgroundColor: '#faf0f0' },
  tblHCell:   { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 2, justifyContent: 'center', alignItems: 'center' },
  tblRow:     { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', minHeight: 22 * K },
  tblCell:    { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3, justifyContent: 'center' },

  // Certification
  certBox:    { borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 5, marginTop: 0 },
  certTxt:    { fontSize: 6 * K, lineHeight: 1.5, color: '#333' },

  // Signature
  sigRow:     { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', minHeight: 28 * K },
  sigCell:    { flex: 1, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 4 },
  sigLine:    { borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid', marginTop: 14 * K },

  // Footer
  footer:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footerTxt:  { fontSize: 5.5 * K, color: '#999' },
})

const WARNING =
  'WARNING – Failure to comply in all respects with the applicable Dangerous Goods Regulations may be in breach of the applicable law, subject to legal penalties. This declaration must not, in any circumstances, be completed and/or signed by a consolidator, a freight forwarder or IATA cargo agent.'

const RADIOACTIVE_WARNING =
  'THIS DECLARATION MUST NOT BE USED FOR RADIOACTIVE MATERIALS OR FOR DRY ICE USED AS A COOLANT (see Note at foot of form)'

const CERTIFICATION =
  'I hereby declare that the contents of this consignment are fully and accurately described above by the Proper Shipping Name, and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport according to applicable international and national governmental regulations. I declare that all of the applicable air transport requirements have been met.'

const COL_UN      = { width: 38 * K }
const COL_PSN     = { flex: 2.2 }
const COL_CLASS   = { width: 36 * K }
const COL_PG      = { width: 24 * K }
const COL_QTY     = { flex: 1.5 }
const COL_PI      = { width: 36 * K }
const COL_AUTH    = { flex: 1 }

export function DGDDocument({ data }: { data: DGDData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        {/* ── TITLE ── */}
        <View style={s.titleBar}>
          <Text style={s.titleTxt}>Shipper's Declaration for Dangerous Goods</Text>
        </View>
        <Text style={s.warnTxt}>{WARNING}</Text>

        {/* ── ROW 1: Shipper | AWB No + Page ── */}
        <View style={s.row}>
          <View style={[s.cell, { flex: 2 }]}>
            <Text style={s.lbl}>Shipper</Text>
            <Text style={s.txt}>{data.shipperNameAndAddress}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={[s.cellRight, { flex: 1 }]}>
              <Text style={s.lbl}>Air Waybill No.</Text>
              <Text style={[s.txt, s.bold]}>{data.awbNo}</Text>
            </View>
            <View style={[s.cellRightNoTop, { flex: 1 }]}>
              <Text style={s.lbl}>Page of Pages</Text>
              <Text style={s.txt}>{data.pageOf}</Text>
            </View>
          </View>
        </View>

        {/* ── ROW 2: Consignee | Shipper's Reference ── */}
        <View style={s.row}>
          <View style={[s.cellNoTop, { flex: 2 }]}>
            <Text style={s.lbl}>Consignee</Text>
            <Text style={s.txt}>{data.consigneeNameAndAddress}</Text>
          </View>
          <View style={[s.cellRightNoTop, { flex: 1 }]}>
            <Text style={s.lbl}>Shipper's Reference Number (optional)</Text>
            <Text style={s.txt}>{data.shipperReference}</Text>
          </View>
        </View>

        {/* ── RADIOACTIVE WARNING ── */}
        <View style={{ borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', borderTopWidth: 0, padding: '3 5', backgroundColor: '#fff8f8' }}>
          <Text style={{ fontSize: 6 * K, color: RED, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>{RADIOACTIVE_WARNING}</Text>
        </View>

        {/* ── TRANSPORT DETAILS ── */}
        <View style={[s.row, { marginTop: 0 }]}>
          <View style={[s.cellNoTop, { flex: 1 }]}>
            <Text style={s.lbl}>Airport of Departure</Text>
            <Text style={s.txt}>{data.airportOfDeparture}</Text>
          </View>
          <View style={[s.cellRightNoTop, { flex: 1 }]}>
            <Text style={s.lbl}>Airport of Destination</Text>
            <Text style={s.txt}>{data.airportOfDestination}</Text>
          </View>
          <View style={[s.cellRightNoTop, { flex: 1.2 }]}>
            <Text style={s.lbl}>Shipment type (delete non-applicable)</Text>
            <View style={[s.row, { marginTop: 3, gap: 12 }]}>
              <Text style={[s.txt, { fontFamily: data.shipmentType === 'passenger_and_cargo' ? 'Helvetica-Bold' : 'Helvetica' }]}>
                {data.shipmentType === 'passenger_and_cargo' ? '☑' : '☐'} PASSENGER AND CARGO AIRCRAFT
              </Text>
              <Text style={[s.txt, { fontFamily: data.shipmentType === 'cargo_only' ? 'Helvetica-Bold' : 'Helvetica' }]}>
                {data.shipmentType === 'cargo_only' ? '☑' : '☐'} CARGO AIRCRAFT ONLY
              </Text>
            </View>
          </View>
        </View>

        {/* ── DANGEROUS GOODS TABLE ── */}
        <View style={s.tblHead}>
          {[
            { w: COL_UN,    label: 'UN or\nID No.' },
            { w: COL_PSN,   label: 'Proper Shipping Name' },
            { w: COL_CLASS, label: 'Class or\nDivision\n(Sub. Risk)' },
            { w: COL_PG,    label: 'Packing\nGroup' },
            { w: COL_QTY,   label: 'Quantity and\nType of Packing' },
            { w: COL_PI,    label: 'Packing\nInst.' },
            { w: COL_AUTH,  label: 'Authorization' },
          ].map((col, i, arr) => (
            <View key={i} style={[s.tblHCell, col.w, i === arr.length - 1 ? { borderRightWidth: 0 } : {}]}>
              <Text style={[s.lbl, { textAlign: 'center' }]}>{col.label}</Text>
            </View>
          ))}
        </View>

        {data.items.map((item) => (
          <View key={item.id} style={s.tblRow}>
            <View style={[s.tblCell, COL_UN]}>
              <Text style={[s.txt, s.bold, { textAlign: 'center' }]}>{item.unIdNo}</Text>
            </View>
            <View style={[s.tblCell, COL_PSN]}>
              <Text style={s.txt}>{item.properShippingName}</Text>
            </View>
            <View style={[s.tblCell, COL_CLASS]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.classDivision}</Text>
              {item.subsidiaryRisk ? <Text style={[s.lbl, { textAlign: 'center' }]}>({item.subsidiaryRisk})</Text> : null}
            </View>
            <View style={[s.tblCell, COL_PG]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.packingGroup}</Text>
            </View>
            <View style={[s.tblCell, COL_QTY]}>
              <Text style={s.txt}>{item.quantity}</Text>
            </View>
            <View style={[s.tblCell, COL_PI]}>
              <Text style={[s.txt, { textAlign: 'center' }]}>{item.packingInstruction}</Text>
            </View>
            <View style={[s.tblCell, COL_AUTH, { borderRightWidth: 0 }]}>
              <Text style={s.txt}>{item.authorization}</Text>
            </View>
          </View>
        ))}

        {/* Empty filler rows */}
        {Array.from({ length: Math.max(0, 4 - data.items.length) }).map((_, i) => (
          <View key={`e${i}`} style={[s.tblRow, { height: 18 * K }]}>
            {[COL_UN, COL_PSN, COL_CLASS, COL_PG, COL_QTY, COL_PI].map((w, j) => (
              <View key={j} style={[s.tblCell, w]}><Text> </Text></View>
            ))}
            <View style={[s.tblCell, COL_AUTH, { borderRightWidth: 0 }]}><Text> </Text></View>
          </View>
        ))}

        {/* ── ADDITIONAL HANDLING INFO ── */}
        <View style={{ borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 4, minHeight: 28 * K }}>
          <Text style={s.lbl}>Additional Handling Information</Text>
          <Text style={[s.txt, { marginTop: 2 }]}>{data.additionalHandling}</Text>
        </View>

        {/* ── CERTIFICATION ── */}
        <View style={s.certBox}>
          <Text style={s.certTxt}>{CERTIFICATION}</Text>
        </View>

        {/* ── SIGNATURE BLOCK ── */}
        <View style={s.sigRow}>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Name/Title of Signatory</Text>
            <Text style={[s.txt, { marginTop: 2 }]}>{data.signatoryName}</Text>
            {data.signatoryTitle ? <Text style={s.lbl}>{data.signatoryTitle}</Text> : null}
            <View style={s.sigLine} />
          </View>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Place and Date</Text>
            <Text style={s.txt}>{data.signaturePlace}{data.signaturePlace && data.signatureDate ? ', ' : ''}{data.signatureDate}</Text>
            <View style={s.sigLine} />
          </View>
          <View style={[s.sigCell, { borderRightWidth: 0 }]}>
            <Text style={s.lbl}>Signature (see warning above)</Text>
            <View style={s.sigLine} />
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>AIRWAYBILL APP</Text>
          <Text style={[s.footerTxt, { color: RED, fontFamily: 'Helvetica-Bold' }]}>
            Shipper's Declaration for Dangerous Goods
          </Text>
        </View>
      </Page>
    </Document>
  )
}
