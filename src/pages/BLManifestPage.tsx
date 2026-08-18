import React from 'react'
import {
  defaultBLManifestData,
  emptyBLManifestItem,
  blManifestTotals,
  BLManifestData,
  BLManifestItem,
} from '../types/blManifest'
import { BLManifestDocument } from '../pdf/BLManifestDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check, GridTable, GridRow } from '../components/DocForm'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { track } from '../lib/analytics'

const COLS = '110px 1fr 1.3fr 80px 80px 24px'

export function BLManifestPage() {
  const { data, setData, set, saving, saveMsg, save, authorizeDownload } =
    useDocEditor<BLManifestData>('bl_manifest', defaultBLManifestData, '/bl-manifest')

  const totals = blManifestTotals(data)

  const updateItem = (id: string, key: keyof BLManifestItem, value: string) =>
    setData(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, [key]: value } : i) }))

  const addItem = () => setData(d => ({ ...d, items: [...d.items, emptyBLManifestItem(newRowId())] }))
  const removeItem = (id: string) => setData(d => ({ ...d, items: d.items.filter(i => i.id !== id) }))

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <BLManifestDocument data={d} />}
      subtitle="B/L Consolidation Manifest"
      accent="#1a5c4a"
      fileName={`BLManifest_${data.masterBl || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      authorizeDownload={authorizeDownload}
      onDownload={() => track('bl_manifest_downloaded')}
    >
      <Section title="Manifest Header">
        <Row>
          <Field label="Master B/L" value={data.masterBl} onChange={set('masterBl')} placeholder="MSCUSA123456" />
          <Field label="Manifest Date" value={data.manifestDate} onChange={set('manifestDate')} placeholder="2026-08-18" />
        </Row>
        <Row>
          <Field label="Carrier" value={data.carrier} onChange={set('carrier')} placeholder="MSC" />
          <Field label="Vessel / Voyage No." value={data.vesselVoyageNo} onChange={set('vesselVoyageNo')} placeholder="MSC LORETO / 421W" />
        </Row>
        <Row>
          <Field label="Origin" value={data.origin} onChange={set('origin')} placeholder="SAN ANTONIO" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} placeholder="MIAMI" />
        </Row>
      </Section>

      <Section title="Parties">
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Shipper (consolidator)" value={data.shipper} onChange={set('shipper')} rows={4} />
          <TextArea label="Consignee" value={data.consignee} onChange={set('consignee')} rows={4} />
        </div>
      </Section>

      <Section title="House Bills of Lading">
        <GridTable
          columns={COLS}
          headers={['HBL', 'Marks / Container', 'Packages / Description', 'Weight', 'Measurement', '']}
          minWidth={660}
          onAdd={addItem}
          addLabel="+ Add house B/L"
        >
          {data.items.map(item => (
            <GridRow key={item.id} columns={COLS}>
              <input value={item.hbl} onChange={e => updateItem(item.id, 'hbl', e.target.value)} placeholder="HBL-0001" />
              <input value={item.marks} onChange={e => updateItem(item.id, 'marks', e.target.value)} placeholder="MSCU1234567" />
              <input value={item.packages} onChange={e => updateItem(item.id, 'packages', e.target.value)} placeholder="12 CTN general cargo" />
              <input value={item.weight} onChange={e => updateItem(item.id, 'weight', e.target.value)} placeholder="0.00" style={{ textAlign: 'right' }} />
              <input value={item.measurement} onChange={e => updateItem(item.id, 'measurement', e.target.value)} placeholder="0.000" style={{ textAlign: 'right' }} />
              <button className="btn-remove" onClick={() => removeItem(item.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
        <div style={{ padding: '4px 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: 18, fontSize: 12, color: '#1a3a5c' }}>
          <span>{data.items.length} house B/L(s)</span>
          <span>Gross weight <strong>{totals.weight.toFixed(2)}</strong> kg</span>
          <span>Measurement <strong>{totals.measurement.toFixed(3)}</strong> m³</span>
        </div>
      </Section>

      <Section title="Footer">
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
