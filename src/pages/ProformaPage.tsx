import React from 'react'
import {
  defaultProformaData,
  emptyProformaLine,
  lineAmount,
  proformaTotals,
  ProformaData,
  ProformaLineItem,
} from '../types/proforma'
import { ProformaDocument } from '../pdf/ProformaDocument'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check, GridTable, GridRow } from '../components/DocForm'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { track } from '../lib/analytics'

const COLS = '1fr 60px 60px 80px 70px 80px 24px'

export function ProformaPage() {
  const { data, setData, set, saving, saveMsg, save } =
    useDocEditor<ProformaData>('proforma', defaultProformaData, '/proforma')

  const { subtotal, tax, total } = proformaTotals(data)

  const updateLine = (id: string, key: keyof ProformaLineItem, value: string) =>
    setData(d => ({ ...d, lineItems: d.lineItems.map(l => l.id === id ? { ...l, [key]: value } : l) }))

  const addLine = () =>
    setData(d => ({ ...d, lineItems: [...d.lineItems, emptyProformaLine(newRowId())] }))

  const removeLine = (id: string) =>
    setData(d => ({ ...d, lineItems: d.lineItems.filter(l => l.id !== id) }))

  const money = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <DocEditorShell
      data={data}
      renderDocument={d => <ProformaDocument data={d} />}
      subtitle="Proforma Invoice"
      accent="#5c3a1a"
      fileName={`Proforma_${data.proformaNumber || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      onDownload={() => track('proforma_downloaded')}
    >
      <Section title="Invoice Header">
        <Row>
          <Field label="Proforma No." value={data.proformaNumber} onChange={set('proformaNumber')} placeholder="PI-2026-018" />
          <Field label="Issue Date" value={data.issueDate} onChange={set('issueDate')} placeholder="2026-08-18" />
          <Field label="Due Date" value={data.dueDate} onChange={set('dueDate')} placeholder="2026-09-18" />
        </Row>
        <Row>
          <Field label="AWB Number" value={data.awbNumber} onChange={set('awbNumber')} placeholder="045-11148211" />
          <Field label="Other References" value={data.otherReferences} onChange={set('otherReferences')} />
        </Row>
      </Section>

      <Section title="Parties">
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Seller (issued by)" value={data.seller} onChange={set('seller')} rows={4} />
          <TextArea label="Buyer (bill to)" value={data.buyer} onChange={set('buyer')} rows={4} />
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
          <TextArea label="Shipper" value={data.shipper} onChange={set('shipper')} rows={4} />
          <TextArea label="Consignee" value={data.consignee} onChange={set('consignee')} rows={4} />
        </div>
      </Section>

      <Section title="Shipment & Terms">
        <Row>
          <Field label="Origin" value={data.origin} onChange={set('origin')} placeholder="SCL" />
          <Field label="Destination" value={data.destination} onChange={set('destination')} placeholder="MIA" />
          <Field label="Currency" value={data.currency} onChange={set('currency')} placeholder="USD" />
        </Row>
        <Row>
          <Field label="Transport Details" value={data.transportDetails} onChange={set('transportDetails')} placeholder="Air freight LA504" />
        </Row>
        <Row>
          <Field label="Incoterms" value={data.incoterms} onChange={set('incoterms')} placeholder="FCA SANTIAGO" />
          <Field label="Payment Terms" value={data.paymentTerms} onChange={set('paymentTerms')} placeholder="30 days" />
        </Row>
      </Section>

      <Section title="Line Items">
        <GridTable
          columns={COLS}
          headers={['Description', 'Qty', 'Unit', 'Unit price', 'Tax', 'Amount', '']}
          minWidth={620}
          onAdd={addLine}
          addLabel="+ Add line"
        >
          {data.lineItems.map(item => (
            <GridRow key={item.id} columns={COLS}>
              <input value={item.description} onChange={e => updateLine(item.id, 'description', e.target.value)} placeholder="Description of goods" />
              <input value={item.quantity} onChange={e => updateLine(item.id, 'quantity', e.target.value)} placeholder="1" style={{ textAlign: 'center' }} />
              <input value={item.unit} onChange={e => updateLine(item.id, 'unit', e.target.value)} placeholder="pcs" style={{ textAlign: 'center' }} />
              <input value={item.unitPrice} onChange={e => updateLine(item.id, 'unitPrice', e.target.value)} placeholder="0.00" style={{ textAlign: 'right' }} />
              <input value={item.tax} onChange={e => updateLine(item.id, 'tax', e.target.value)} placeholder="0.00" style={{ textAlign: 'right' }} />
              <span style={{ fontSize: 11, textAlign: 'right', alignSelf: 'center', color: '#555' }}>{money(lineAmount(item))}</span>
              <button className="btn-remove" onClick={() => removeLine(item.id)}>×</button>
            </GridRow>
          ))}
        </GridTable>
        <Row>
          <Field label="Additional Tax" value={data.tax} onChange={set('tax')} placeholder="0.00" />
        </Row>
        <div style={{ padding: '4px 12px 12px', display: 'flex', justifyContent: 'flex-end', gap: 18, fontSize: 12, color: '#1a3a5c' }}>
          <span>Subtotal <strong>{money(subtotal)}</strong></span>
          <span>Tax <strong>{money(tax)}</strong></span>
          <span style={{ fontWeight: 700 }}>Total <strong>{money(total)}</strong> {data.currency}</span>
        </div>
      </Section>

      <Section title="Authentication">
        <Row>
          <Field label="Seller — Date" value={data.sellerAuthDate} onChange={set('sellerAuthDate')} />
          <Field label="Seller — Place" value={data.sellerAuthPlace} onChange={set('sellerAuthPlace')} />
          <Field label="Seller — Signature" value={data.sellerSignature} onChange={set('sellerSignature')} />
        </Row>
        <Row>
          <Field label="Buyer — Date" value={data.buyerAuthDate} onChange={set('buyerAuthDate')} />
          <Field label="Buyer — Place" value={data.buyerAuthPlace} onChange={set('buyerAuthPlace')} />
          <Field label="Buyer — Signature" value={data.buyerSignature} onChange={set('buyerSignature')} />
        </Row>
      </Section>

      <Section title="Footer">
        <div style={{ padding: '10px 12px' }}>
          <TextArea label="Bank Details" value={data.bankDetails} onChange={set('bankDetails')} rows={2} />
        </div>
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
