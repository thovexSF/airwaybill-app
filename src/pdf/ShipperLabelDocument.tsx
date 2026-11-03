import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { ShipperSticker } from '../lib/shipperLabel'

/** 15 × 10 cm at 72 pt/in: the 10×15 stock, held horizontal. */
const W = 425
const H = 283

const s = StyleSheet.create({
  page: { padding: 16, fontFamily: 'Helvetica', backgroundColor: '#fff' },
  cap: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  addr: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  overpack: { fontSize: 28, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 2 },
  un: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  qty: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  footer: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
})

function Sticker({ sticker }: { sticker: ShipperSticker }) {
  return (
    <Page size={[W, H]} style={s.page}>
      <Text style={s.cap}>SHIPPER:</Text>
      <Text style={s.addr}>{(sticker.shipper || '').toUpperCase()}</Text>
      <Text style={[s.cap, { marginTop: 14 }]}>CONSIGNEE:</Text>
      <Text style={s.addr}>{(sticker.consignee || '').toUpperCase()}</Text>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}>
        {sticker.overpack
          ? <Text style={s.overpack}>OVERPACK</Text>
          : <Text style={s.title}>{(sticker.title || '').toUpperCase()}</Text>}
      </View>
      {sticker.overpack ? (
        <Text style={s.footer}>{sticker.footer}</Text>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={s.un}>{sticker.un}</Text>
          <Text style={s.qty}>{sticker.quantity}</Text>
        </View>
      )}
    </Page>
  )
}

export function ShipperLabelDocument({ stickers }: { stickers: ShipperSticker[] }) {
  return (
    <Document>
      {stickers.map((sticker, i) => <Sticker key={i} sticker={sticker} />)}
    </Document>
  )
}
