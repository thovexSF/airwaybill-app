import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { IMODGDData } from '../types/imoDgd'

/**
 * IMO / IMDG Multimodal Dangerous Goods Form — the sea-freight counterpart of
 * the IATA Shipper's Declaration rendered by DGDDocument. Drawn as vectors on
 * an A4 page, matching the layout of the IMO FAL form 7 grid.
 */

const RED = '#8B0000'
const K = 0.9

const s = StyleSheet.create({
  page:      { padding: 18 * K, fontFamily: 'Helvetica', fontSize: 7 * K, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 260, left: 70, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  titleBar:  { backgroundColor: RED, padding: '5 8', marginBottom: 2 },
  titleTxt:  { color: '#fff', fontSize: 11 * K, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  warnTxt:   { fontSize: 5.5 * K, color: '#555', textAlign: 'center', marginBottom: 3 },

  row:       { flexDirection: 'row' },
  lbl:       { fontSize: 5.5 * K, color: RED },
  txt:       { fontSize: 7.5 * K },
  bold:      { fontFamily: 'Helvetica-Bold' },
  cell:      { borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3 },
  cellNoTop: { borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3 },

  tblHead:   { flexDirection: 'row', borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', backgroundColor: '#faf0f0' },
  tblHCell:  { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 2, justifyContent: 'center' },
  tblRow:    { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', minHeight: 22 * K },
  tblCell:   { borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 3, justifyContent: 'center' },

  certBox:   { borderWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 5 },
  certTxt:   { fontSize: 6 * K, lineHeight: 1.5, color: '#333' },

  sigRow:    { flexDirection: 'row', borderTopWidth: 0, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', minHeight: 28 * K },
  sigCell:   { flex: 1, borderRightWidth: 0.5, borderColor: RED, borderStyle: 'solid', padding: 4 },
  sigLine:   { borderBottomWidth: 0.5, borderColor: '#000', borderStyle: 'solid', marginTop: 14 * K },

  footer:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footerTxt: { fontSize: 5.5 * K, color: '#999' },
})

const WARNING =
  'This form may be used as a dangerous goods declaration as it meets the requirements of SOLAS 74 chapter VII, regulation 5; MARPOL Annex III, regulation 4. Failure to comply in all respects with the applicable IMDG Code requirements may be in breach of the applicable law.'

const CERTIFICATION =
  'I hereby declare that the contents of this consignment are fully and accurately described above by the Proper Shipping Name, and are classified, packaged, marked and labelled/placarded, and are in all respects in proper condition for transport according to the applicable international and national governmental regulations.'

const COL_UN    = { width: 34 * K }
const COL_PSN   = { flex: 2.1 }
const COL_CLASS = { width: 32 * K }
const COL_PG    = { width: 22 * K }
const COL_FP    = { width: 32 * K }
const COL_MP    = { width: 24 * K }
const COL_EMS   = { width: 34 * K }
const COL_PKG   = { flex: 1.4 }
const COL_NET   = { width: 40 * K }
const COL_GROSS = { width: 40 * K }

export function IMODGDDocument({ data }: { data: IMODGDData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        {/* ── TITLE ── */}
        <View style={s.titleBar}>
          <Text style={s.titleTxt}>Multimodal Dangerous Goods Form — IMO / IMDG Code</Text>
        </View>
        <Text style={s.warnTxt}>{WARNING}</Text>

        {/* ── ROW 1: Shipper | References ── */}
        <View style={s.row}>
          <View style={[s.cell, { flex: 2 }]}>
            <Text style={s.lbl}>1. Shipper / Consignor</Text>
            <Text style={s.txt}>{data.shipperNameAndAddress}</Text>
          </View>
          <View style={[s.cell, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>2. Transport document number</Text>
            <Text style={[s.txt, s.bold]}>{data.referenceNumber}</Text>
            <Text style={[s.lbl, { marginTop: 3 }]}>Booking number</Text>
            <Text style={s.txt}>{data.bookingNumber}</Text>
          </View>
          <View style={[s.cell, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>3. B/L number</Text>
            <Text style={s.txt}>{data.blNumber}</Text>
            <Text style={[s.lbl, { marginTop: 3 }]}>Freight forwarder</Text>
            <Text style={s.txt}>{data.freightForwarder}</Text>
          </View>
        </View>

        {/* ── ROW 2: Consignee | Carrier ── */}
        <View style={s.row}>
          <View style={[s.cellNoTop, { flex: 2 }]}>
            <Text style={s.lbl}>4. Consignee</Text>
            <Text style={s.txt}>{data.consigneeNameAndAddress}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 2, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>5. Carrier</Text>
            <Text style={s.txt}>{data.carrier}</Text>
          </View>
        </View>

        {/* ── ROW 3: Voyage ── */}
        <View style={s.row}>
          <View style={[s.cellNoTop, { flex: 1 }]}>
            <Text style={s.lbl}>6. Vessel / Voyage No.</Text>
            <Text style={s.txt}>{data.vesselVoyageNo}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>7. Port of loading</Text>
            <Text style={s.txt}>{data.portOfLoading}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>8. Port of discharge</Text>
            <Text style={s.txt}>{data.portOfDischarge}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>9. Destination</Text>
            <Text style={s.txt}>{data.destination}</Text>
          </View>
        </View>

        {/* ── ROW 4: Container ── */}
        <View style={s.row}>
          <View style={[s.cellNoTop, { flex: 1 }]}>
            <Text style={s.lbl}>10. Container / vehicle No.</Text>
            <Text style={s.txt}>{data.containerNumber}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>11. Seal number(s)</Text>
            <Text style={s.txt}>{data.sealNumber}</Text>
          </View>
          <View style={[s.cellNoTop, { flex: 1, borderLeftWidth: 0 }]}>
            <Text style={s.lbl}>12. Container / vehicle size and type</Text>
            <Text style={s.txt}>{data.containerType}</Text>
          </View>
        </View>

        {/* ── DANGEROUS GOODS TABLE ── */}
        <View style={[s.tblHead, { marginTop: 4 }]}>
          <View style={[s.tblHCell, COL_UN]}><Text style={s.lbl}>UN No.</Text></View>
          <View style={[s.tblHCell, COL_PSN]}><Text style={s.lbl}>Proper Shipping Name</Text></View>
          <View style={[s.tblHCell, COL_CLASS]}><Text style={s.lbl}>Class / Div.</Text></View>
          <View style={[s.tblHCell, COL_PG]}><Text style={s.lbl}>PG</Text></View>
          <View style={[s.tblHCell, COL_FP]}><Text style={s.lbl}>Flash pt. (°C c.c.)</Text></View>
          <View style={[s.tblHCell, COL_MP]}><Text style={s.lbl}>Mar. Poll.</Text></View>
          <View style={[s.tblHCell, COL_EMS]}><Text style={s.lbl}>EmS</Text></View>
          <View style={[s.tblHCell, COL_PKG]}><Text style={s.lbl}>No. and kind of packages</Text></View>
          <View style={[s.tblHCell, COL_NET]}><Text style={s.lbl}>Net quantity</Text></View>
          <View style={[s.tblHCell, COL_GROSS, { borderRightWidth: 0 }]}><Text style={s.lbl}>Gross mass (kg)</Text></View>
        </View>
        {data.items.map(item => (
          <View key={item.id} style={s.tblRow} wrap={false}>
            <View style={[s.tblCell, COL_UN]}><Text style={s.txt}>{item.unIdNo}</Text></View>
            <View style={[s.tblCell, COL_PSN]}>
              <Text style={s.txt}>
                {item.properShippingName}
                {item.subsidiaryRisk ? ` (${item.subsidiaryRisk})` : ''}
              </Text>
            </View>
            <View style={[s.tblCell, COL_CLASS]}><Text style={s.txt}>{item.classDivision}</Text></View>
            <View style={[s.tblCell, COL_PG]}><Text style={s.txt}>{item.packingGroup}</Text></View>
            <View style={[s.tblCell, COL_FP]}><Text style={s.txt}>{item.flashPoint}</Text></View>
            <View style={[s.tblCell, COL_MP]}><Text style={s.txt}>{item.marinePollutant ? 'YES' : ''}</Text></View>
            <View style={[s.tblCell, COL_EMS]}><Text style={s.txt}>{item.emsNumber}</Text></View>
            <View style={[s.tblCell, COL_PKG]}><Text style={s.txt}>{item.packagesAndType}</Text></View>
            <View style={[s.tblCell, COL_NET]}><Text style={s.txt}>{item.netQuantity}</Text></View>
            <View style={[s.tblCell, COL_GROSS, { borderRightWidth: 0 }]}><Text style={s.txt}>{item.grossMass}</Text></View>
          </View>
        ))}

        {/* ── ADDITIONAL HANDLING ── */}
        <View style={[s.cell, { marginTop: 4, minHeight: 28 * K }]}>
          <Text style={s.lbl}>Additional handling information</Text>
          <Text style={s.txt}>{data.additionalHandling}</Text>
        </View>

        {/* ── CERTIFICATION ── */}
        <View style={[s.certBox, { borderTopWidth: 0 }]}>
          <Text style={s.lbl}>Shipper's declaration</Text>
          <Text style={s.certTxt}>{CERTIFICATION}</Text>
        </View>

        {/* ── SIGNATURE ── */}
        <View style={s.sigRow}>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Name and title of signatory</Text>
            <Text style={s.txt}>{[data.signatoryName, data.signatoryTitle].filter(Boolean).join(' — ')}</Text>
          </View>
          <View style={s.sigCell}>
            <Text style={s.lbl}>Place and date</Text>
            <Text style={s.txt}>{[data.signaturePlace, data.signatureDate].filter(Boolean).join(' — ')}</Text>
          </View>
          <View style={[s.sigCell, { borderRightWidth: 0 }]}>
            <Text style={s.lbl}>Signature of shipper</Text>
            <View style={s.sigLine} />
          </View>
        </View>

        {!!data.notes && <Text style={{ fontSize: 6 * K, marginTop: 4, color: '#555' }}>{data.notes}</Text>}

        <View style={s.footer}>
          <Text style={s.footerTxt}>IMO / IMDG Code multimodal dangerous goods form</Text>
          <Text style={s.footerTxt}>{data.referenceNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}
