import React, { useMemo, useState } from 'react'
import { defaultLabelData, LabelData, labelAwbNumber } from '../types/label'
import { LabelDocument } from '../pdf/LabelDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check } from '../components/DocForm'
import { useDocEditor } from '../lib/useDocEditor'
import { awbBarcodePayload, barcodeDataUrl } from '../lib/barcode'
import { buildLabelZpl, sendLabelToZebra } from '../lib/labelZpl'
import { track } from '../lib/analytics'

export function LabelPage() {
  const { data, set, saving, saveMsg, save } = useDocEditor<LabelData>('label', defaultLabelData, '/label')
  const [zplMsg, setZplMsg] = useState<string | null>(null)

  const awb = labelAwbNumber(data)

  // Rasterising the barcode is the expensive part of each preview pass, so it
  // only re-runs when the payload it encodes actually changes.
  const barcodeSrc = useMemo(
    () => barcodeDataUrl(awbBarcodePayload(awb, data.pieceNumber), { width: 2, height: 70 }),
    [awb, data.pieceNumber],
  )

  async function handleZebra() {
    setZplMsg(null)
    try {
      const where = await sendLabelToZebra(buildLabelZpl(data), `Label_${awb || 'draft'}.zpl`)
      setZplMsg(where === 'browser-print' ? 'Sent to Zebra' : 'ZPL downloaded')
      track('label_zpl_printed')
    } catch {
      setZplMsg('ZPL error')
    }
    setTimeout(() => setZplMsg(null), 3000)
  }

  const pieces = parseInt(data.totalPieces) || 1

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <LabelDocument data={d} barcodeSrc={barcodeSrc} />}
      subtitle="Air Cargo Label (4×5″)"
      accent="#3a1a5c"
      fileName={`Label_${awb || 'draft'}_${data.pieceNumber || '1'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg ?? zplMsg}
      onDownload={() => track('label_downloaded')}
      extraActions={
        <button className="btn-example" onClick={handleZebra} title="Send ZPL to a Zebra printer, or download the .zpl file">
          ⎙ Print to Zebra
        </button>
      }
    >
      <Section title="Carrier & AWB">
        <Row>
          <Field label="Airline" value={data.airline} onChange={set('airline')} placeholder="LATAM CARGO" />
        </Row>
        <Row>
          <Field label="AWB Prefix" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="045" />
          <Field label="AWB Serial" value={data.awbSerial} onChange={set('awbSerial')} placeholder="11148211" />
        </Row>
      </Section>

      <Section title="Routing">
        <Row>
          <Field label="Departure" value={data.departure} onChange={set('departure')} placeholder="SCL" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} placeholder="MIA" />
          <Field label="Transit" value={data.transit} onChange={set('transit')} placeholder="LIM" />
        </Row>
      </Section>

      <Section title="Master Shipment">
        <Row>
          <Field label="Agent" value={data.agent} onChange={set('agent')} placeholder="Forwarder name" />
        </Row>
        <Row>
          <Field label="MAWB Packages" value={data.mawbPackages} onChange={set('mawbPackages')} placeholder="12" />
          <Field label="MAWB Weight (kg)" value={data.mawbWeight} onChange={set('mawbWeight')} placeholder="248.5" />
        </Row>
      </Section>

      <Section title="House Shipment">
        <Row>
          <Check label="Identify house packages on the label" checked={data.identifyPackages} onChange={set('identifyPackages')} />
        </Row>
        {data.identifyPackages && (
          <Row>
            <Field label="HAWB Number" value={data.hawbNumber} onChange={set('hawbNumber')} placeholder="SCLB2B158" />
            <Field label="HAWB Packages" value={data.hawbPackages} onChange={set('hawbPackages')} placeholder="3" />
            <Field label="HAWB Weight (kg)" value={data.hawbWeight} onChange={set('hawbWeight')} placeholder="62.0" />
          </Row>
        )}
      </Section>

      <Section title="Piece Numbering">
        <Row>
          <Field label="Piece Number" value={data.pieceNumber} onChange={set('pieceNumber')} placeholder="1" />
          <Field label="Total Pieces" value={data.totalPieces} onChange={set('totalPieces')} placeholder="12" />
        </Row>
        {pieces > 1 && (
          <div style={{ padding: '0 12px 10px', fontSize: 11, color: '#888' }}>
            One label per piece — change the piece number and download or print again for each of the {pieces}.
          </div>
        )}
      </Section>

      <Section title="Other Information">
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Free text (printed at the bottom of the label)" value={data.optionalInformation} onChange={set('optionalInformation')} rows={4} placeholder="PERISHABLE — KEEP COOL" />
        </div>
        <Row>
          <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
        </Row>
      </Section>
    </DocEditorShell>
  )
}
