import React, { useState } from 'react'
import {
  defaultFwbData, defaultFhlData, defaultFfrData,
  emptyFfrDimension, emptyFfrUld, emptyFfrFlight,
  FwbData, FhlData, FfrData, SPH_CODES,
} from '../types/edi'
import { EDIDocument } from '../pdf/EDIDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check, CodeChecks, GridTable, GridRow } from '../components/DocForm'
import { PartyFields } from '../components/PartyFields'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { buildEdiMessage, downloadEdiMessage } from '../lib/ediMessage'
import { track } from '../lib/analytics'

const EDI_ACCENT = '#33305c'

/** Read-only view of the generated Cargo-IMP body, so it can be checked before sending. */
function MessagePreview({ data }: { data: FwbData | FhlData | FfrData }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="form-section">
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Cargo-IMP Message</span>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 11 }}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open && (
        <div style={{ padding: '10px 12px' }}>
          <pre style={{ margin: 0, padding: 10, background: '#f7f7f7', border: '1px solid #ddd', borderRadius: 4, fontSize: 11, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {buildEdiMessage(data)}
          </pre>
          <p style={{ fontSize: 10, color: '#888', marginTop: 6, marginBottom: 0 }}>
            Draft message body — Cargo-IMP grammar varies by carrier. Validate against the
            receiving airline's implementation guide before sending it to a Type B queue.
          </p>
        </div>
      )}
    </div>
  )
}

function DownloadMessageButton({ data, filename }: { data: FwbData | FhlData | FfrData; filename: string }) {
  return (
    <button
      className="btn-example"
      onClick={() => { downloadEdiMessage(data, filename); track('edi_message_downloaded', { message_type: data.docType }) }}
      title="Download the Cargo-IMP message body as a .txt file"
    >
      ↓ Message .txt
    </button>
  )
}

/* ───────────────────────── FWB ───────────────────────── */

export function FWBPage() {
  const { data, setData, set, saving, saveMsg, save, authorizeDownload } = useDocEditor<FwbData>('fwb', defaultFwbData, '/edi/fwb')
  const awb = [data.awbPrefix, data.awbSerial].filter(Boolean).join('-')

  const addAccounting = () =>
    setData(d => ({ ...d, accounting: [...d.accounting, { id: newRowId(), code: 'GEN', information: '' }] }))
  const updateAccounting = (id: string, key: 'code' | 'information', value: string) =>
    setData(d => ({ ...d, accounting: d.accounting.map(a => a.id === id ? { ...a, [key]: value } : a) }))
  const removeAccounting = (id: string) =>
    setData(d => ({ ...d, accounting: d.accounting.filter(a => a.id !== id) }))

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <EDIDocument data={d} />}
      subtitle="FWB — Freight Waybill Message"
      accent={EDI_ACCENT}
      fileName={`FWB_${awb || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      authorizeDownload={authorizeDownload}
      onDownload={() => track('fwb_downloaded')}
      extraActions={<DownloadMessageButton data={data} filename={`FWB_${awb || 'draft'}.txt`} />}
    >
      <Section title="Message">
        <Row>
          <Field label="Version" value={data.version} onChange={set('version')} placeholder="FWB/17" />
          <Field label="AWB Prefix" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="045" />
          <Field label="AWB Serial" value={data.awbSerial} onChange={set('awbSerial')} placeholder="11148211" />
        </Row>
        <Row>
          <Field label="Origin" value={data.origin} onChange={set('origin')} placeholder="SCL" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} placeholder="MIA" />
        </Row>
      </Section>

      <Section title="Consignment">
        <Row>
          <Field label="Pieces" value={data.pieces} onChange={set('pieces')} placeholder="12" />
          <Field label="Weight" value={data.weight} onChange={set('weight')} placeholder="248.5" />
          <Field label="Unit" value={data.weightUnit} onChange={set('weightUnit')} placeholder="K" />
          <Field label="SLAC" value={data.slac} onChange={set('slac')} />
        </Row>
        <Row>
          <Field label="Nature of Goods" value={data.description} onChange={set('description')} placeholder="GENERAL CARGO" />
        </Row>
      </Section>

      <PartyFields title="Shipper" party={data.shipper} onChange={p => set('shipper')(p)} />
      <PartyFields title="Consignee" party={data.consignee} onChange={p => set('consignee')(p)} />

      <Section title="Agent">
        <Row>
          <Field label="Name" value={data.agentName} onChange={set('agentName')} />
          <Field label="Place" value={data.agentPlace} onChange={set('agentPlace')} placeholder="SCL" />
        </Row>
        <Row>
          <Field label="IATA Code" value={data.agentIata} onChange={set('agentIata')} placeholder="75-1 9012/0014" />
          <Field label="CASS Address" value={data.agentCass} onChange={set('agentCass')} placeholder="9012" />
          <Field label="Account" value={data.agentAccount} onChange={set('agentAccount')} />
        </Row>
      </Section>

      <Section title="Charge Declarations">
        <Row>
          <Field label="Currency" value={data.currency} onChange={set('currency')} placeholder="USD" />
          <Field label="Value for Carriage" value={data.valueCarriage} onChange={set('valueCarriage')} placeholder="NVD" />
          <Field label="Value for Customs" value={data.valueCustoms} onChange={set('valueCustoms')} placeholder="NCV" />
          <Field label="Insurance" value={data.insurance} onChange={set('insurance')} placeholder="XXX" />
        </Row>
      </Section>

      <Section title="Special Handling">
        <CodeChecks label="SPH codes" codes={SPH_CODES} selected={data.sph} onChange={set('sph')} />
        <Row>
          <Field label="Other SPH codes" value={data.sphOther} onChange={set('sphOther')} placeholder="EAP, ICE" />
        </Row>
      </Section>

      <Section title="Accounting & References">
        <GridTable
          columns="80px 1fr 24px"
          headers={['Code', 'Information', '']}
          minWidth={420}
          onAdd={addAccounting}
          addLabel="+ Add accounting line"
        >
          {data.accounting.map(a => (
            <GridRow key={a.id} columns="80px 1fr 24px">
              <input value={a.code} onChange={e => updateAccounting(a.id, 'code', e.target.value)} placeholder="GEN" />
              <input value={a.information} onChange={e => updateAccounting(a.id, 'information', e.target.value)} />
              <button className="btn-remove" onClick={() => removeAccounting(a.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
        <Row>
          <Field label="Reference Number" value={data.refNumber} onChange={set('refNumber')} />
          <Field label="Reference Code" value={data.refCode} onChange={set('refCode')} />
        </Row>
      </Section>

      <Section title="Notes">
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Other service information (OSI)" value={data.notes} onChange={set('notes')} rows={2} />
        </div>
        <Row>
          <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
        </Row>
      </Section>

      <MessagePreview data={data} />
    </DocEditorShell>
  )
}

/* ───────────────────────── FHL ───────────────────────── */

export function FHLPage() {
  const { data, setData, set, saving, saveMsg, save, authorizeDownload } = useDocEditor<FhlData>('fhl', defaultFhlData, '/edi/fhl')

  const addCustoms = () =>
    setData(d => ({ ...d, customs: [...d.customs, { id: newRowId(), country: '', infoId: '', cusId: '', information: '' }] }))
  const updateCustoms = (id: string, key: 'country' | 'infoId' | 'cusId' | 'information', value: string) =>
    setData(d => ({ ...d, customs: d.customs.map(c => c.id === id ? { ...c, [key]: value } : c) }))
  const removeCustoms = (id: string) =>
    setData(d => ({ ...d, customs: d.customs.filter(c => c.id !== id) }))

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <EDIDocument data={d} />}
      subtitle="FHL — House Waybill / Consolidation List"
      accent={EDI_ACCENT}
      fileName={`FHL_${data.hwbNumber || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      authorizeDownload={authorizeDownload}
      onDownload={() => track('fhl_downloaded')}
      extraActions={<DownloadMessageButton data={data} filename={`FHL_${data.hwbNumber || 'draft'}.txt`} />}
    >
      <Section title="Message">
        <Row>
          <Field label="Version" value={data.version} onChange={set('version')} placeholder="FHL/4" />
        </Row>
      </Section>

      <Section title="Master Consignment">
        <Row>
          <Field label="AWB Prefix" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="045" />
          <Field label="AWB Serial" value={data.awbSerial} onChange={set('awbSerial')} placeholder="11148211" />
        </Row>
        <Row>
          <Field label="Origin" value={data.mOrigin} onChange={set('mOrigin')} placeholder="SCL" />
          <Field label="Destination" value={data.mDest} onChange={set('mDest')} placeholder="MIA" />
          <Field label="Pieces" value={data.mPieces} onChange={set('mPieces')} />
          <Field label="Weight" value={data.mWeight} onChange={set('mWeight')} />
          <Field label="Unit" value={data.mWeightUnit} onChange={set('mWeightUnit')} placeholder="K" />
        </Row>
      </Section>

      <Section title="House Consignment">
        <Row>
          <Field label="House Waybill No." value={data.hwbNumber} onChange={set('hwbNumber')} placeholder="SCLB2B158" />
          <Field label="SLAC" value={data.slac} onChange={set('slac')} />
        </Row>
        <Row>
          <Field label="Origin" value={data.hOrigin} onChange={set('hOrigin')} placeholder="SCL" />
          <Field label="Destination" value={data.hDest} onChange={set('hDest')} placeholder="MIA" />
          <Field label="Pieces" value={data.hPieces} onChange={set('hPieces')} />
          <Field label="Weight" value={data.hWeight} onChange={set('hWeight')} />
          <Field label="Unit" value={data.hWeightUnit} onChange={set('hWeightUnit')} placeholder="K" />
        </Row>
        <Row>
          <Field label="Nature of Goods" value={data.description} onChange={set('description')} placeholder="GENERAL CARGO" />
        </Row>
      </Section>

      <PartyFields title="Shipper" party={data.shipper} onChange={p => set('shipper')(p)} />
      <PartyFields title="Consignee" party={data.consignee} onChange={p => set('consignee')(p)} />

      <Section title="Special Handling & Security">
        <CodeChecks label="SPH codes" codes={SPH_CODES} selected={data.sph} onChange={set('sph')} />
        <Row>
          <Field label="Other SPH codes" value={data.sphOther} onChange={set('sphOther')} />
          <Field label="Security (SSR)" value={data.security} onChange={set('security')} />
        </Row>
      </Section>

      <Section title="Charge Declarations">
        <Row>
          <Field label="Currency" value={data.currency} onChange={set('currency')} placeholder="USD" />
          <Field label="Value for Carriage" value={data.valueCarriage} onChange={set('valueCarriage')} placeholder="NVD" />
          <Field label="Value for Customs" value={data.valueCustoms} onChange={set('valueCustoms')} placeholder="NCV" />
          <Field label="Insurance" value={data.insurance} onChange={set('insurance')} placeholder="XXX" />
        </Row>
      </Section>

      <Section title="Customs">
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Extended Description of Goods" value={data.extendedDescription} onChange={set('extendedDescription')} rows={3} />
        </div>
        <Row>
          <Field label="HS Codes" value={data.hsCodes} onChange={set('hsCodes')} placeholder="0302.14 0303.13" />
        </Row>
        <GridTable
          columns="70px 70px 90px 1fr 24px"
          headers={['Country', 'Info ID', 'Customs ID', 'Information', '']}
          minWidth={520}
          onAdd={addCustoms}
          addLabel="+ Add customs line"
        >
          {data.customs.map(c => (
            <GridRow key={c.id} columns="70px 70px 90px 1fr 24px">
              <input value={c.country} onChange={e => updateCustoms(c.id, 'country', e.target.value)} placeholder="US" />
              <input value={c.infoId} onChange={e => updateCustoms(c.id, 'infoId', e.target.value)} />
              <input value={c.cusId} onChange={e => updateCustoms(c.id, 'cusId', e.target.value)} />
              <input value={c.information} onChange={e => updateCustoms(c.id, 'information', e.target.value)} />
              <button className="btn-remove" onClick={() => removeCustoms(c.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
      </Section>

      <Section title="Notes">
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Other service information (OSI)" value={data.notes} onChange={set('notes')} rows={2} />
        </div>
        <Row>
          <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
        </Row>
      </Section>

      <MessagePreview data={data} />
    </DocEditorShell>
  )
}

/* ───────────────────────── FFR ───────────────────────── */

export function FFRPage() {
  const { data, setData, set, saving, saveMsg, save, authorizeDownload } = useDocEditor<FfrData>('ffr', defaultFfrData, '/edi/ffr')
  const awb = [data.awbPrefix, data.awbSerial].filter(Boolean).join('-')

  const patchList = <K extends 'dimensions' | 'ulds' | 'flights'>(key: K) => ({
    add: (row: FfrData[K][number]) => setData(d => ({ ...d, [key]: [...d[key], row] } as FfrData)),
    update: (id: string, field: string, value: string) =>
      setData(d => ({ ...d, [key]: (d[key] as any[]).map(r => r.id === id ? { ...r, [field]: value } : r) } as FfrData)),
    remove: (id: string) =>
      setData(d => ({ ...d, [key]: (d[key] as any[]).filter(r => r.id !== id) } as FfrData)),
  })

  const dims = patchList('dimensions')
  const ulds = patchList('ulds')
  const flights = patchList('flights')

  const DIM_COLS = '70px 70px 70px 56px 60px 70px 56px 24px'
  const ULD_COLS = '70px 90px 70px 70px 70px 56px 24px'
  const FLT_COLS = '80px 50px 60px 60px 60px 60px 1fr 24px'

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <EDIDocument data={d} />}
      subtitle="FFR — Space Allocation Request"
      accent={EDI_ACCENT}
      fileName={`FFR_${awb || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      authorizeDownload={authorizeDownload}
      onDownload={() => track('ffr_downloaded')}
      extraActions={<DownloadMessageButton data={data} filename={`FFR_${awb || 'draft'}.txt`} />}
    >
      <Section title="Booking">
        <Row>
          <Field label="AWB Prefix" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="045" />
          <Field label="AWB Serial" value={data.awbSerial} onChange={set('awbSerial')} placeholder="11148211" />
        </Row>
        <Row>
          <Field label="Origin" value={data.origin} onChange={set('origin')} placeholder="SCL" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} placeholder="MIA" />
          <Field label="e-AWB" value={data.eawb} onChange={set('eawb')} placeholder="No" />
        </Row>
      </Section>

      <Section title="Flights Requested">
        <GridTable
          columns={FLT_COLS}
          headers={['Flight', 'Day', 'Month', 'From', 'To', 'Space', 'Allotment', '']}
          minWidth={620}
          onAdd={() => flights.add(emptyFfrFlight(newRowId()))}
          addLabel="+ Add flight"
        >
          {data.flights.map(f => (
            <GridRow key={f.id} columns={FLT_COLS}>
              <input value={f.flight} onChange={e => flights.update(f.id, 'flight', e.target.value)} placeholder="LA504" />
              <input value={f.day} onChange={e => flights.update(f.id, 'day', e.target.value)} placeholder="18" style={{ textAlign: 'center' }} />
              <input value={f.month} onChange={e => flights.update(f.id, 'month', e.target.value)} placeholder="AUG" style={{ textAlign: 'center' }} />
              <input value={f.origin} onChange={e => flights.update(f.id, 'origin', e.target.value)} placeholder="SCL" style={{ textAlign: 'center' }} />
              <input value={f.destination} onChange={e => flights.update(f.id, 'destination', e.target.value)} placeholder="MIA" style={{ textAlign: 'center' }} />
              <input value={f.spaceCode} onChange={e => flights.update(f.id, 'spaceCode', e.target.value)} placeholder="XX" style={{ textAlign: 'center' }} />
              <input value={f.allotment} onChange={e => flights.update(f.id, 'allotment', e.target.value)} />
              <button className="btn-remove" onClick={() => flights.remove(f.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
      </Section>

      <Section title="Shipment">
        <Row>
          <Field label="Description" value={data.shipmentDesc} onChange={set('shipmentDesc')} placeholder="Total" />
          <Field label="Pieces" value={data.pieces} onChange={set('pieces')} />
          <Field label="Total Pieces" value={data.totalPieces} onChange={set('totalPieces')} />
        </Row>
        <Row>
          <Field label="Weight" value={data.weight} onChange={set('weight')} />
          <Field label="Unit" value={data.weightUnit} onChange={set('weightUnit')} placeholder="K" />
          <Field label="Volume" value={data.volume} onChange={set('volume')} />
          <Field label="Volume Unit" value={data.volumeUnit} onChange={set('volumeUnit')} placeholder="MC" />
          <Field label="Density Group" value={data.densityGroup} onChange={set('densityGroup')} />
        </Row>
        <Row>
          <Field label="Nature of Goods" value={data.description} onChange={set('description')} placeholder="GENERAL CARGO" />
        </Row>
        <Row>
          <Field label="Rate Class" value={data.rateClass} onChange={set('rateClass')} />
          <Field label="Service Code" value={data.serviceCode} onChange={set('serviceCode')} />
        </Row>
      </Section>

      <Section title="Dimensions">
        <GridTable
          columns={DIM_COLS}
          headers={['Length', 'Width', 'Height', 'Unit', 'Pieces', 'Weight', 'Unit', '']}
          minWidth={560}
          onAdd={() => dims.add(emptyFfrDimension(newRowId()))}
          addLabel="+ Add dimension"
        >
          {data.dimensions.map(d => (
            <GridRow key={d.id} columns={DIM_COLS}>
              <input value={d.length} onChange={e => dims.update(d.id, 'length', e.target.value)} style={{ textAlign: 'right' }} />
              <input value={d.width} onChange={e => dims.update(d.id, 'width', e.target.value)} style={{ textAlign: 'right' }} />
              <input value={d.height} onChange={e => dims.update(d.id, 'height', e.target.value)} style={{ textAlign: 'right' }} />
              <input value={d.unit} onChange={e => dims.update(d.id, 'unit', e.target.value)} placeholder="cm" style={{ textAlign: 'center' }} />
              <input value={d.pieces} onChange={e => dims.update(d.id, 'pieces', e.target.value)} style={{ textAlign: 'center' }} />
              <input value={d.weight} onChange={e => dims.update(d.id, 'weight', e.target.value)} style={{ textAlign: 'right' }} />
              <input value={d.weightUnit} onChange={e => dims.update(d.id, 'weightUnit', e.target.value)} placeholder="K" style={{ textAlign: 'center' }} />
              <button className="btn-remove" onClick={() => dims.remove(d.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
      </Section>

      <Section title="ULDs">
        <GridTable
          columns={ULD_COLS}
          headers={['Type', 'Serial', 'Owner', 'Loading', 'Weight', 'Unit', '']}
          minWidth={520}
          onAdd={() => ulds.add(emptyFfrUld(newRowId()))}
          addLabel="+ Add ULD"
        >
          {data.ulds.map(u => (
            <GridRow key={u.id} columns={ULD_COLS}>
              <input value={u.type} onChange={e => ulds.update(u.id, 'type', e.target.value)} placeholder="AKE" />
              <input value={u.serial} onChange={e => ulds.update(u.id, 'serial', e.target.value)} placeholder="12345" />
              <input value={u.owner} onChange={e => ulds.update(u.id, 'owner', e.target.value)} placeholder="LA" />
              <input value={u.loadingIndicator} onChange={e => ulds.update(u.id, 'loadingIndicator', e.target.value)} />
              <input value={u.weight} onChange={e => ulds.update(u.id, 'weight', e.target.value)} style={{ textAlign: 'right' }} />
              <input value={u.weightUnit} onChange={e => ulds.update(u.id, 'weightUnit', e.target.value)} placeholder="K" style={{ textAlign: 'center' }} />
              <button className="btn-remove" onClick={() => ulds.remove(u.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
      </Section>

      <div style={{ padding: '0 12px 8px', fontSize: 11, color: '#888' }}>
        The parties below are stored with the booking but are not emitted in the FFR message —
        the space request carries the agent and the shipment. They carry over to the FWB/FHL.
      </div>
      <PartyFields title="Shipper" party={data.shipper} onChange={p => set('shipper')(p)} />
      <PartyFields title="Consignee" party={data.consignee} onChange={p => set('consignee')(p)} />

      <Section title="Agent">
        <Row>
          <Field label="Name" value={data.agentName} onChange={set('agentName')} />
          <Field label="Place" value={data.agentPlace} onChange={set('agentPlace')} placeholder="SCL" />
        </Row>
        <Row>
          <Field label="IATA Code" value={data.agentIata} onChange={set('agentIata')} />
          <Field label="CASS Address" value={data.agentCass} onChange={set('agentCass')} />
          <Field label="Account" value={data.agentAccount} onChange={set('agentAccount')} />
        </Row>
      </Section>

      <Section title="Special Handling & Service">
        <CodeChecks label="SPH codes" codes={SPH_CODES} selected={data.sph} onChange={set('sph')} />
        <Row>
          <Field label="Other SPH codes" value={data.sphOther} onChange={set('sphOther')} />
          <Field label="Security" value={data.security} onChange={set('security')} />
        </Row>
        <Row>
          <Field label="SSR" value={data.ssr} onChange={set('ssr')} />
          <Field label="OSI" value={data.osi} onChange={set('osi')} />
        </Row>
      </Section>

      <Section title="References">
        <Row>
          <Field label="Reference Number" value={data.refNumber} onChange={set('refNumber')} />
          <Field label="Reference Info 1" value={data.refInfo1} onChange={set('refInfo1')} />
          <Field label="Reference Info 2" value={data.refInfo2} onChange={set('refInfo2')} />
        </Row>
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Notes" value={data.notes} onChange={set('notes')} rows={2} />
        </div>
        <Row>
          <Check label="Show DRAFT watermark" checked={data.isDraft} onChange={set('isDraft')} />
        </Row>
      </Section>

      <MessagePreview data={data} />
    </DocEditorShell>
  )
}
