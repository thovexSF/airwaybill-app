import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { FwbData, FhlData, FfrData } from '../types/edi'
import { buildEdiMessage } from '../lib/ediMessage'

/**
 * Printable record of a Cargo-IMP message. The message itself is plain text
 * sent to a Type B queue — this page exists so the editor has the same
 * preview/print/save flow as every other document in the suite.
 */

const RED = '#8B0000'

const TITLES: Record<string, string> = {
  fwb: 'FWB — Freight Waybill Message',
  fhl: 'FHL — House Waybill / Consolidation List',
  ffr: 'FFR — Space Allocation Request',
}

const s = StyleSheet.create({
  page:      { padding: 34, fontFamily: 'Courier', fontSize: 9, backgroundColor: '#fff' },
  watermark: { position: 'absolute', top: 300, left: 90, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1, borderColor: RED, borderStyle: 'solid', paddingBottom: 5, marginBottom: 10 },
  title:     { fontSize: 12, fontFamily: 'Helvetica-Bold', color: RED },
  meta:      { fontSize: 8, fontFamily: 'Helvetica', color: '#555' },

  body:      { borderWidth: 0.6, borderColor: '#111', borderStyle: 'solid', padding: 10 },
  line:      { fontSize: 9, lineHeight: 1.45 },

  note:      { fontSize: 7, fontFamily: 'Helvetica', color: '#777', marginTop: 12, lineHeight: 1.4 },
})

export function EDIDocument({ data }: { data: FwbData | FhlData | FfrData }) {
  const message = buildEdiMessage(data)
  const awb = [data.awbPrefix, data.awbSerial].filter(Boolean).join('-')

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}

        <View style={s.header}>
          <Text style={s.title}>{TITLES[data.docType]}</Text>
          <Text style={s.meta}>{awb}</Text>
        </View>

        <View style={s.body}>
          {message.split('\n').map((line, i) => (
            <Text key={i} style={s.line}>{line}</Text>
          ))}
        </View>

        <Text style={s.note}>
          Draft Cargo-IMP message body. Cargo-IMP grammar varies by carrier — validate this
          against the receiving airline's implementation guide before sending it to a Type B queue.
        </Text>
      </Page>
    </Document>
  )
}
