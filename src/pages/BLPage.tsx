import React from 'react'
import { defaultBLData, emptyBLGoodsItem, blTotals, BLData, BLGoodsItem } from '../types/bl'
import { BLDocument } from '../pdf/BLDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Select, Check, GridTable, GridRow } from '../components/DocForm'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { track } from '../lib/analytics'

const COLS = '1fr 90px 1.4fr 80px 80px 24px'

export function BLPage() {
  const { data, setData, set, saving, saveMsg, save } = useDocEditor<BLData>('bl', defaultBLData, '/bl')
  const totals = blTotals(data)

  const updateItem = (id: string, key: keyof BLGoodsItem, value: string) =>
    setData(d => ({ ...d, goodsItems: d.goodsItems.map(i => i.id === id ? { ...i, [key]: value } : i) }))

  const addItem = () => setData(d => ({ ...d, goodsItems: [...d.goodsItems, emptyBLGoodsItem(newRowId())] }))
  const removeItem = (id: string) => setData(d => ({ ...d, goodsItems: d.goodsItems.filter(i => i.id !== id) }))

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <BLDocument data={d} />}
      subtitle="House Bill of Lading"
      accent="#1a4a5c"
      fileName={`BL_${data.blNumber || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      onDownload={() => track('bl_downloaded')}
    >
      <Section title="Document">
        <Row>
          <Field label="B/L Number" value={data.blNumber} onChange={set('blNumber')} placeholder="SCLB2B0158" />
          <Field label="Document Number" value={data.documentNumber} onChange={set('documentNumber')} />
        </Row>
        <Row>
          <Select
            label="Negotiability"
            value={data.negotiable}
            onChange={v => set('negotiable')(v as BLData['negotiable'])}
            options={[
              { value: 'Negotiable', label: 'Negotiable' },
              { value: 'Non-Negotiable', label: 'Non-Negotiable' },
            ]}
          />
          <Field label="No. of Originals" value={data.numberOfOriginals} onChange={set('numberOfOriginals')} placeholder="3" />
        </Row>
        <Row>
          <Field label="Carrier Booking No." value={data.carrierBookingNo} onChange={set('carrierBookingNo')} />
          <Field label="Export References" value={data.exportReferences} onChange={set('exportReferences')} />
        </Row>
      </Section>

      <Section title="Parties">
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Shipper" value={data.shipper} onChange={set('shipper')} rows={4} />
          <TextArea label="Consignee" value={data.consignee} onChange={set('consignee')} rows={4} />
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Notify Party" value={data.notifyParty} onChange={set('notifyParty')} rows={3} />
          <TextArea label="Agent" value={data.agent} onChange={set('agent')} rows={3} />
        </div>
        <Row>
          <Field label="Carrier" value={data.carrierName} onChange={set('carrierName')} />
        </Row>
      </Section>

      <Section title="Carriage">
        <Row>
          <Field label="Pre-Carriage By" value={data.preCarriageBy} onChange={set('preCarriageBy')} />
          <Field label="Vessel / Voyage No." value={data.vesselVoyageNo} onChange={set('vesselVoyageNo')} placeholder="MSC LORETO / 421W" />
        </Row>
        <Row>
          <Field label="Place of Receipt" value={data.placeOfReceipt} onChange={set('placeOfReceipt')} />
          <Field label="Port of Loading" value={data.portOfLoading} onChange={set('portOfLoading')} placeholder="SAN ANTONIO" />
        </Row>
        <Row>
          <Field label="Port of Discharge" value={data.portOfDischarge} onChange={set('portOfDischarge')} placeholder="MIAMI" />
          <Field label="Place of Delivery" value={data.placeOfDelivery} onChange={set('placeOfDelivery')} />
        </Row>
      </Section>

      <Section title="Goods">
        <GridTable
          columns={COLS}
          headers={['Marks / Container', 'Packages', 'Description', 'Weight', 'Measurement', '']}
          minWidth={640}
          onAdd={addItem}
          addLabel="+ Add goods line"
        >
          {data.goodsItems.map(item => (
            <GridRow key={item.id} columns={COLS}>
              <input value={item.marks} onChange={e => updateItem(item.id, 'marks', e.target.value)} placeholder="MSCU1234567" />
              <input value={item.packages} onChange={e => updateItem(item.id, 'packages', e.target.value)} placeholder="12 CTN" />
              <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description of goods" />
              <input value={item.weight} onChange={e => updateItem(item.id, 'weight', e.target.value)} placeholder="0.00" style={{ textAlign: 'right' }} />
              <input value={item.measurement} onChange={e => updateItem(item.id, 'measurement', e.target.value)} placeholder="0.000" style={{ textAlign: 'right' }} />
              <button className="btn-remove" onClick={() => removeItem(item.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
        <div style={{ padding: '4px 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: 18, fontSize: 12, color: '#1a3a5c' }}>
          <span>Gross weight <strong>{totals.weight.toFixed(2)}</strong> kg</span>
          <span>Measurement <strong>{totals.measurement.toFixed(3)}</strong> m³</span>
        </div>
      </Section>

      <Section title="Charges & Issue">
        <Row>
          <Field label="Freight & Charges" value={data.freightAndCharges} onChange={set('freightAndCharges')} placeholder="FREIGHT PREPAID" />
          <Field label="Currency" value={data.currency} onChange={set('currency')} placeholder="USD" />
          <Field label="Declared Value" value={data.declaredValue} onChange={set('declaredValue')} />
        </Row>
        <Row>
          <Field label="Place of Issue" value={data.placeOfIssue} onChange={set('placeOfIssue')} placeholder="SANTIAGO" />
          <Field label="Date of Issue" value={data.dateOfIssue} onChange={set('dateOfIssue')} placeholder="2026-08-18" />
        </Row>
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Notes" value={data.notes} onChange={set('notes')} rows={2} />
        </div>
        <Row>
          <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
        </Row>
      </Section>
    </DocEditorShell>
  )
}
