import React from 'react'
import { defaultIMODGDData, emptyIMODGDItem, IMODGDData, IMODGDItem } from '../types/imoDgd'
import { IMODGDDocument } from '../pdf/IMODGDDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check, GridTable, GridRow } from '../components/DocForm'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { track } from '../lib/analytics'

const COLS = '70px 1.6fr 60px 46px 60px 44px 60px 1fr 80px 80px 24px'

export function IMODGDPage() {
  const { data, setData, set, saving, saveMsg, save } =
    useDocEditor<IMODGDData>('imo_dgd', defaultIMODGDData, '/imo-dgd')

  const updateItem = (id: string, key: keyof IMODGDItem, value: string | boolean) =>
    setData(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, [key]: value } : i) }))

  const addItem = () => setData(d => ({ ...d, items: [...d.items, emptyIMODGDItem(newRowId())] }))
  const removeItem = (id: string) => setData(d => ({ ...d, items: d.items.filter(i => i.id !== id) }))

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <IMODGDDocument data={d} />}
      subtitle="IMO / IMDG Dangerous Goods Form"
      accent="#7a3a00"
      fileName={`IMO_DGD_${data.referenceNumber || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      onDownload={() => track('imo_dgd_downloaded')}
    >
      <Section title="References">
        <Row>
          <Field label="Transport Document No." value={data.referenceNumber} onChange={set('referenceNumber')} />
          <Field label="Booking Number" value={data.bookingNumber} onChange={set('bookingNumber')} />
          <Field label="B/L Number" value={data.blNumber} onChange={set('blNumber')} />
        </Row>
      </Section>

      <Section title="Parties">
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Shipper / Consignor" value={data.shipperNameAndAddress} onChange={set('shipperNameAndAddress')} rows={4} />
          <TextArea label="Consignee" value={data.consigneeNameAndAddress} onChange={set('consigneeNameAndAddress')} rows={4} />
        </div>
        <Row>
          <Field label="Carrier" value={data.carrier} onChange={set('carrier')} />
          <Field label="Freight Forwarder" value={data.freightForwarder} onChange={set('freightForwarder')} />
        </Row>
      </Section>

      <Section title="Voyage">
        <Row>
          <Field label="Vessel / Voyage No." value={data.vesselVoyageNo} onChange={set('vesselVoyageNo')} placeholder="MSC LORETO / 421W" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} />
        </Row>
        <Row>
          <Field label="Port of Loading" value={data.portOfLoading} onChange={set('portOfLoading')} placeholder="SAN ANTONIO" />
          <Field label="Port of Discharge" value={data.portOfDischarge} onChange={set('portOfDischarge')} placeholder="MIAMI" />
        </Row>
      </Section>

      <Section title="Container / Vehicle">
        <Row>
          <Field label="Container / Vehicle No." value={data.containerNumber} onChange={set('containerNumber')} placeholder="MSCU1234567" />
          <Field label="Seal Number(s)" value={data.sealNumber} onChange={set('sealNumber')} />
          <Field label="Size and Type" value={data.containerType} onChange={set('containerType')} placeholder="40' HC" />
        </Row>
      </Section>

      <Section title="Dangerous Goods">
        <GridTable
          columns={COLS}
          headers={['UN No.', 'Proper Shipping Name', 'Class', 'PG', 'Flash pt.', 'MP', 'EmS', 'Packages', 'Net qty.', 'Gross (kg)', '']}
          minWidth={980}
          onAdd={addItem}
          addLabel="+ Add dangerous good"
        >
          {data.items.map(item => (
            <GridRow key={item.id} columns={COLS}>
              <input value={item.unIdNo} onChange={e => updateItem(item.id, 'unIdNo', e.target.value)} placeholder="UN1263" />
              <input value={item.properShippingName} onChange={e => updateItem(item.id, 'properShippingName', e.target.value)} placeholder="PAINT" />
              <input value={item.classDivision} onChange={e => updateItem(item.id, 'classDivision', e.target.value)} placeholder="3" style={{ textAlign: 'center' }} />
              <input value={item.packingGroup} onChange={e => updateItem(item.id, 'packingGroup', e.target.value as IMODGDItem['packingGroup'])} placeholder="II" style={{ textAlign: 'center' }} />
              <input value={item.flashPoint} onChange={e => updateItem(item.id, 'flashPoint', e.target.value)} placeholder="23" style={{ textAlign: 'center' }} />
              <input
                type="checkbox"
                checked={item.marinePollutant}
                onChange={e => updateItem(item.id, 'marinePollutant', e.target.checked)}
                style={{ justifySelf: 'center', alignSelf: 'center' }}
                title="Marine pollutant"
              />
              <input value={item.emsNumber} onChange={e => updateItem(item.id, 'emsNumber', e.target.value)} placeholder="F-E S-E" />
              <input value={item.packagesAndType} onChange={e => updateItem(item.id, 'packagesAndType', e.target.value)} placeholder="4 drums" />
              <input value={item.netQuantity} onChange={e => updateItem(item.id, 'netQuantity', e.target.value)} placeholder="200 L" style={{ textAlign: 'right' }} />
              <input value={item.grossMass} onChange={e => updateItem(item.id, 'grossMass', e.target.value)} placeholder="240" style={{ textAlign: 'right' }} />
              <button className="btn-remove" onClick={() => removeItem(item.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Additional Handling Information" value={data.additionalHandling} onChange={set('additionalHandling')} rows={3} />
        </div>
      </Section>

      <Section title="Certification">
        <Row>
          <Field label="Name of Signatory" value={data.signatoryName} onChange={set('signatoryName')} />
          <Field label="Title of Signatory" value={data.signatoryTitle} onChange={set('signatoryTitle')} />
        </Row>
        <Row>
          <Field label="Place" value={data.signaturePlace} onChange={set('signaturePlace')} placeholder="SANTIAGO" />
          <Field label="Date" value={data.signatureDate} onChange={set('signatureDate')} placeholder="2026-08-18" />
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
