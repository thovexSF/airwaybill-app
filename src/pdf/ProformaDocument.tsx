import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { ProformaData, lineAmount, proformaTotals } from '../types/proforma'

const RED = '#8B0000'

const s = StyleSheet.create({
  page:      { padding: 28, fontFamily: 'Helvetica', fontSize: 8, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 300, left: 90, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  titleRow:  { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  title:     { fontSize: 14, fontFamily: 'Helvetica-Bold', color: RED },

  row:       { flexDirection: 'row' },
  box:       { borderWidth: 0.7, borderColor: '#111', borderStyle: 'solid', padding: 5 },
  lbl:       { fontSize: 6, color: RED, marginBottom: 2 },
  txt:       { fontSize: 8 },

  thRow:     { flexDirection: 'row', borderWidth: 0.7, borderColor: '#111', borderStyle: 'solid', backgroundColor: '#faf0f0' },
  th:        { padding: 4, borderLeftWidth: 0.7, borderColor: '#111', borderStyle: 'solid' },
  thFirst:   { padding: 4 },
  bodyRow:   { flexDirection: 'row', borderWidth: 0.7, borderTopWidth: 0, borderColor: '#111', borderStyle: 'solid', minHeight: 200 },
  bodyCol:   { padding: 4, borderLeftWidth: 0.7, borderColor: '#111', borderStyle: 'solid' },
  bodyColFirst: { padding: 4 },
  cellTxt:   { fontSize: 8, marginBottom: 6 },
})

const COL_DESC = { width: '46%' }
const COL_QTY  = { width: '12%' }
const COL_RATE = { width: '16%' }
const COL_TAX  = { width: '12%' }
const COL_AMT  = { width: '14%' }

function money(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ProformaDocument({ data }: { data: ProformaData }) {
  const { subtotal, tax, total } = proformaTotals(data)
  const items = data.lineItems.length ? data.lineItems : []

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        <View style={s.titleRow}>
          <Text style={s.title}>PROFORMA INVOICE</Text>
        </View>

        {/* ── SELLER | DATE / NUMBER / REFS ── */}
        <View style={s.row}>
          <View style={[s.box, { width: '48%', minHeight: 70 }]}>
            <Text style={s.lbl}>Issued by (seller)</Text>
            <Text style={s.txt}>{data.seller}</Text>
          </View>
          <View style={{ width: '52%' }}>
            <View style={s.row}>
              <View style={[s.box, { width: '50%', minHeight: 36 }]}>
                <Text style={s.lbl}>Date</Text>
                <Text style={{ fontSize: 9 }}>{data.issueDate}</Text>
              </View>
              <View style={[s.box, { width: '50%', minHeight: 36 }]}>
                <Text style={s.lbl}>Proforma invoice number</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{data.proformaNumber}</Text>
              </View>
            </View>
            <View style={[s.box, { minHeight: 34 }]}>
              <Text style={s.lbl}>Other references</Text>
              <Text style={s.txt}>{data.otherReferences || data.awbNumber}</Text>
            </View>
          </View>
        </View>

        {/* ── SHIPPER / CONSIGNEE | BUYER ── */}
        <View style={s.row}>
          <View style={{ width: '48%' }}>
            <View style={[s.box, { minHeight: 88 }]}>
              <Text style={s.lbl}>Shipper</Text>
              <Text style={s.txt}>{data.shipper}</Text>
            </View>
            <View style={[s.box, { minHeight: 88 }]}>
              <Text style={s.lbl}>Consignee</Text>
              <Text style={s.txt}>{data.consignee}</Text>
            </View>
          </View>
          <View style={[s.box, { width: '52%', minHeight: 176 }]}>
            <Text style={s.lbl}>Bill to (buyer)</Text>
            <Text style={s.txt}>{data.buyer}</Text>
          </View>
        </View>

        {/* ── ORIGIN / DESTINATION / CURRENCY ── */}
        <View style={s.row}>
          <View style={[s.box, { width: '40%', minHeight: 32 }]}>
            <Text style={s.lbl}>Origin</Text>
            <Text style={{ fontSize: 9 }}>{data.origin}</Text>
          </View>
          <View style={[s.box, { width: '40%', minHeight: 32 }]}>
            <Text style={s.lbl}>Destination</Text>
            <Text style={{ fontSize: 9 }}>{data.destination}</Text>
          </View>
          <View style={[s.box, { width: '20%', minHeight: 32 }]}>
            <Text style={s.lbl}>Currency</Text>
            <Text style={{ fontSize: 9 }}>{data.currency || 'USD'}</Text>
          </View>
        </View>

        {/* ── TRANSPORT / TERMS ── */}
        <View style={s.row}>
          <View style={[s.box, { width: '50%', minHeight: 46 }]}>
            <Text style={s.lbl}>Transport details</Text>
            <Text style={s.txt}>{data.transportDetails}</Text>
          </View>
          <View style={[s.box, { width: '50%', minHeight: 46 }]}>
            <Text style={s.lbl}>Terms of delivery and payment</Text>
            <Text style={s.txt}>{[data.incoterms, data.paymentTerms].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>

        {/* ── LINE ITEMS ── */}
        <View style={s.thRow}>
          <View style={[s.thFirst, COL_DESC]}><Text style={s.lbl}>Description</Text></View>
          <View style={[s.th, COL_QTY]}><Text style={s.lbl}>Quantity</Text></View>
          <View style={[s.th, COL_RATE]}><Text style={s.lbl}>Unit price/rate</Text></View>
          <View style={[s.th, COL_TAX]}><Text style={s.lbl}>Tax</Text></View>
          <View style={[s.th, COL_AMT]}><Text style={s.lbl}>Amount</Text></View>
        </View>
        <View style={s.bodyRow}>
          <View style={[s.bodyColFirst, COL_DESC]}>
            {items.map(i => <Text key={i.id} style={s.cellTxt}>{i.description}</Text>)}
          </View>
          <View style={[s.bodyCol, COL_QTY]}>
            {items.map(i => (
              <Text key={i.id} style={[s.cellTxt, { textAlign: 'center' }]}>
                {[i.quantity, i.unit].filter(Boolean).join(' ')}
              </Text>
            ))}
          </View>
          <View style={[s.bodyCol, COL_RATE]}>
            {items.map(i => <Text key={i.id} style={[s.cellTxt, { textAlign: 'right' }]}>{money(parseFloat(i.unitPrice) || 0)}</Text>)}
          </View>
          <View style={[s.bodyCol, COL_TAX]}>
            {items.map(i => <Text key={i.id} style={[s.cellTxt, { textAlign: 'right' }]}>{money(parseFloat(i.tax) || 0)}</Text>)}
          </View>
          <View style={[s.bodyCol, COL_AMT]}>
            {items.map(i => <Text key={i.id} style={[s.cellTxt, { textAlign: 'right' }]}>{money(lineAmount(i))}</Text>)}
          </View>
        </View>

        {/* ── TOTALS ── */}
        <View style={[s.row, { justifyContent: 'flex-end' }]}>
          <View style={{ width: '38%' }}>
            {([['Subtotal', subtotal], ['Tax', tax], ['Total', total]] as [string, number][]).map(([k, v]) => (
              <View
                key={k}
                style={[s.row, {
                  borderWidth: 0.7, borderColor: '#111', borderStyle: 'solid',
                  borderTopWidth: k === 'Subtotal' ? 0.7 : 0,
                }]}
              >
                <View style={{ width: '55%', padding: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: k === 'Total' ? 'Helvetica-Bold' : 'Helvetica' }}>{k}</Text>
                </View>
                <View style={{ width: '45%', padding: 4, borderLeftWidth: 0.7, borderColor: '#111', borderStyle: 'solid' }}>
                  <Text style={{ fontSize: 9, textAlign: 'right', fontFamily: k === 'Total' ? 'Helvetica-Bold' : 'Helvetica' }}>
                    {money(v)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── AUTHENTICATION ── */}
        <View style={[s.row, { marginTop: 8 }]}>
          {([
            ["Seller's authentication", data.sellerAuthDate, data.sellerAuthPlace, data.sellerSignature],
            ["Buyer's acceptance", data.buyerAuthDate, data.buyerAuthPlace, data.buyerSignature],
          ] as [string, string, string, string][]).map(([title, date, place, sig]) => (
            <View key={title} style={[s.box, { width: '50%', minHeight: 70, padding: 6 }]}>
              <Text style={s.lbl}>{title}</Text>
              <View style={[s.row, { marginTop: 26, borderTopWidth: 0.5, borderColor: '#999', borderStyle: 'solid', paddingTop: 2 }]}>
                <Text style={{ width: '33%', fontSize: 6, color: '#555' }}>date</Text>
                <Text style={{ width: '33%', fontSize: 6, color: '#555' }}>place</Text>
                <Text style={{ width: '34%', fontSize: 6, color: '#555' }}>signature</Text>
              </View>
              <View style={s.row}>
                <Text style={{ width: '33%', fontSize: 8 }}>{date}</Text>
                <Text style={{ width: '33%', fontSize: 8 }}>{place}</Text>
                <Text style={{ width: '34%', fontSize: 8 }}>{sig}</Text>
              </View>
            </View>
          ))}
        </View>

        {!!(data.bankDetails || data.notes) && (
          <View style={{ marginTop: 8 }}>
            {!!data.bankDetails && <Text style={{ fontSize: 7, marginBottom: 2 }}>Bank: {data.bankDetails}</Text>}
            {!!data.notes && <Text style={{ fontSize: 7 }}>Notes: {data.notes}</Text>}
          </View>
        )}
      </Page>
    </Document>
  )
}
