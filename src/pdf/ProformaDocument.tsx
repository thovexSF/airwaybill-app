import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { ProformaData } from '../types/proforma'
import { LEADING, RED, proformaLayout, printedValue, proformaLabels } from './proformaLayout'

const s = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#fff', position: 'relative' },
  watermark: { position: 'absolute', top: 300, left: 90, fontSize: 100, color: 'rgba(180,0,0,0.07)', fontFamily: 'Helvetica-Bold', transform: 'rotate(-45deg)' },
  title:     { position: 'absolute', top: 28, right: 28, fontSize: 16, fontFamily: 'Helvetica-Bold', color: RED },
  box:       { position: 'absolute', borderWidth: 0.7, borderColor: '#111', borderStyle: 'solid' },
  lbl:       { position: 'absolute', fontSize: 8, fontFamily: 'Helvetica-Bold', color: RED },
})

/**
 * @param hideValues Leaves the editable fields blank so the overlay's inputs are
 *   the only copy of each value on screen. Download/print never set it.
 */
export function ProformaDocument({ data, hideValues = false }: { data: ProformaData; hideValues?: boolean }) {
  const layout = proformaLayout(data)

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {data.isDraft && <Text style={s.watermark}>DRAFT</Text>}
        <Text style={s.title}>{proformaLabels(data).title}</Text>

        {layout.boxes.map((b, i) => (
          <View key={`b${i}`} style={[s.box, { left: b.x, top: b.y, width: b.w, height: b.h, backgroundColor: b.fill }]} />
        ))}
        {layout.boxes.filter(b => b.label).map((b, i) => (
          <Text key={`l${i}`} style={[s.lbl, { left: b.x + 5, top: b.y + 4 }]}>{b.label}</Text>
        ))}
        {layout.captions.map((c, i) => (
          <Text
            key={`c${i}`}
            style={{ position: 'absolute', left: c.x, top: c.y, fontSize: c.size ?? 8, color: c.size === 7 ? '#555' : '#111', fontFamily: c.bold ? 'Helvetica-Bold' : 'Helvetica' }}
          >
            {c.text}
          </Text>
        ))}
        {layout.lines.map((l, i) => (
          <View key={`r${i}`} style={{ position: 'absolute', left: l.x, top: l.y, width: l.w, borderTopWidth: 0.5, borderColor: '#999', borderStyle: 'solid' }} />
        ))}

        {/* Under the overlay the logo is drawn (and dragged) by the overlay itself. */}
        {layout.logo && data.sellerLogo && !hideValues && (
          <Image src={data.sellerLogo} style={{ position: 'absolute', left: layout.logo.x, top: layout.logo.y, width: layout.logo.w, height: layout.logo.h, objectFit: 'contain' }} />
        )}

        {layout.fields.filter(f => !hideValues || f.readOnly).map(f => {
          const value = printedValue(data, f.key)
          if (!value) return null
          const fontSize = f.fontSize ?? 9
          const leading = Math.max(LEADING, fontSize + 2)
          return (
            <Text
              key={f.key}
              style={{
                position: 'absolute', left: f.x, top: f.y + 1, width: f.w,
                fontSize, lineHeight: leading / fontSize,
                fontFamily: f.bold ? 'Helvetica-Bold' : 'Helvetica',
                textAlign: f.align ?? 'left',
                // Fixed boxes: overflow is cut at the box instead of pushing the layout.
                maxLines: Math.max(1, Math.floor(f.h / leading)),
                textOverflow: 'ellipsis',
              }}
            >
              {value}
            </Text>
          )
        })}
      </Page>
    </Document>
  )
}
