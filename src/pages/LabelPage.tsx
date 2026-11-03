import React, { useEffect, useMemo, useState } from 'react'
import { defaultLabelData, LabelData, labelAwbNumber } from '../types/label'
import { LabelDocument } from '../pdf/LabelDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check } from '../components/DocForm'
import { useDocEditor } from '../lib/useDocEditor'
import { awbBarcodePayload, barcodeDataUrl } from '../lib/barcode'
import { buildLabelZpl, buildCalibrationZpl, sendLabelToZebra, DOTS_PER_MM } from '../lib/labelZpl'
import { LabelPreviewDialog } from '../components/LabelPreviewDialog'
import { pdf } from '@react-pdf/renderer'
import { track } from '../lib/analytics'

// Printer alignment lives in the browser: it's a property of the physical
// printer, not the document, so it applies to every label on this machine.
function zplResultMessage(where: 'browser-print' | 'printer-error' | 'blocked' | 'download', kind: 'print' | 'calibrate') {
  if (where === 'browser-print') return kind === 'print' ? 'Sent to Zebra' : 'Calibrating…'
  if (where === 'printer-error') return 'Browser Print is running, but the printer rejected the job — ZPL downloaded'
  if (where === 'blocked') return 'Chrome blocked Browser Print. Allow local network access for this site and try again — ZPL downloaded'
  return kind === 'print' ? 'Browser Print not found — ZPL downloaded' : 'Browser Print not found'
}

const OFFSET_KEY = 'zebraPrintOffsetMm'
function loadOffset(): { x: number; y: number } {
  try {
    const v = JSON.parse(localStorage.getItem(OFFSET_KEY) || '{}')
    return { x: Number(v.x) || 0, y: Number(v.y) || 0 }
  } catch {
    return { x: 0, y: 0 }
  }
}

export function LabelPage() {
  const { data, set, saving, saveMsg, save, authorizeDownload, atLimit } = useDocEditor<LabelData>('label', defaultLabelData, '/label')
  const [zplMsg, setZplMsg] = useState<string | null>(null)
  const [offset, setOffset] = useState(loadOffset)
  const [labelOpen, setLabelOpen] = useState(false)
  const [labelBlob, setLabelBlob] = useState<Blob | null>(null)
  const [labelPrinting, setLabelPrinting] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(OFFSET_KEY, JSON.stringify(offset)) } catch { /* private mode */ }
  }, [offset])

  const awb = labelAwbNumber(data)

  // Rasterising the barcode is the expensive part of each preview pass, so it
  // only re-runs when the payload it encodes actually changes.
  const barcodeSrc = useMemo(
    () => barcodeDataUrl(awbBarcodePayload(awb, data.pieceNumber), { width: 2, height: 70 }),
    [awb, data.pieceNumber],
  )

  async function handleZebra() {
    setZplMsg(null)
    setLabelBlob(null)
    setLabelOpen(true)
    try {
      const blob = await pdf(<LabelDocument data={data} barcodeSrc={barcodeSrc} />).toBlob()
      setLabelBlob(blob)
    } catch {
      setLabelOpen(false)
      setZplMsg('ZPL error')
    }
  }

  async function confirmZebra() {
    setLabelPrinting(true)
    setZplMsg(null)
    try {
      const where = await sendLabelToZebra(buildLabelZpl(data, offset.x * DOTS_PER_MM, offset.y * DOTS_PER_MM), `Label_${awb || 'draft'}.zpl`)
      setZplMsg(zplResultMessage(where, 'print'))
      track('label_zpl_printed')
      setLabelOpen(false)
    } catch {
      setZplMsg('ZPL error')
    } finally {
      setLabelPrinting(false)
    }
    setTimeout(() => setZplMsg(null), 3000)
  }

  async function handleCalibrate() {
    setZplMsg(null)
    try {
      const where = await sendLabelToZebra(buildCalibrationZpl(), 'calibrate.zpl')
      setZplMsg(zplResultMessage(where, 'calibrate'))
    } catch {
      setZplMsg('ZPL error')
    }
    setTimeout(() => setZplMsg(null), 3000)
  }

  const pieces = parseInt(data.totalPieces) || 1

  return (
    <>
    <DocEditorShell
      data={data}
      renderDocument={d => <LabelDocument data={d} barcodeSrc={barcodeSrc} />}
      subtitle="Air Cargo Label (10×15 cm)"
      accent="#3a1a5c"
      fileName={`Label_${awb || 'draft'}_${data.pieceNumber || '1'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg ?? zplMsg}
      authorizeDownload={authorizeDownload}
      forceWatermark={atLimit}
      onDownload={() => track('label_downloaded')}
      extraActions={
        <>
          <button
            className="btn-example"
            onClick={handleCalibrate}
            title="Sends a one-time media calibration to the Zebra printer (gap + 10×15 cm length), so it registers to each label. Requires Zebra Browser Print running."
          >
            ⚙ Calibrar
          </button>
          <button
            className="btn-example"
            onClick={handleZebra}
            title="Preview the label, then print it on the Zebra. Requires Zebra Browser Print. Without it, the .zpl file is downloaded."
          >
            ⎙ Print to Zebra
          </button>
        </>
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

      <Section title="Zebra alignment">
        <div style={{ padding: '10px 12px', fontSize: 11, color: '#888' }}>
          Only affects printing to Zebra. Trial and error: shift the whole label to fit your roll. X: + right / − left · Y: + down / − up. Saved on this computer.
        </div>
        <Row>
          <div className="field">
            <label>Horizontal (mm)</label>
            <input
              type="number"
              step={0.5}
              min={-2.5}
              max={2.5}
              value={offset.x}
              onChange={e => setOffset(o => ({ ...o, x: Math.max(-2.5, Math.min(2.5, Number(e.target.value) || 0)) }))}
            />
          </div>
          <div className="field">
            <label>Vertical (mm)</label>
            <input
              type="number"
              step={0.5}
              min={-2.5}
              max={2.5}
              value={offset.y}
              onChange={e => setOffset(o => ({ ...o, y: Math.max(-2.5, Math.min(2.5, Number(e.target.value) || 0)) }))}
            />
          </div>
        </Row>
      </Section>
    </DocEditorShell>
    <LabelPreviewDialog
      open={labelOpen}
      title="Air cargo label"
      blob={labelBlob}
      onClose={() => setLabelOpen(false)}
      onPrint={confirmZebra}
      printing={labelPrinting}
    />
    </>
  )
}
