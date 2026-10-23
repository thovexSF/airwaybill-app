import React, { useState } from 'react'
import {
  defaultProformaData,
  emptyProformaLine,
  lineAmount,
  proformaTotals,
  ProformaData,
  ProformaLineItem,
  B2B_EXPRESS_LOGO,
} from '../types/proforma'
import { ProformaDocument } from '../pdf/ProformaDocument'
import { LINE_ROWS, rawValue, setValue } from '../pdf/proformaLayout'
import { translateTexts } from '../lib/translateApi'
import { ProformaOverlay, LogoMenu } from '../components/ProformaOverlay'
import { useAuth } from '../auth/AuthContext'
import { DraftToggle } from '../components/DraftToggle'
import { DocEditorShell } from '../components/DocEditorShell'
import { Section, Row, Field, TextArea, Check, GridTable, GridRow } from '../components/DocForm'
import { useDocEditor, newRowId } from '../lib/useDocEditor'
import { track } from '../lib/analytics'

const COLS = '1fr 60px 60px 80px 70px 80px 24px'

export function ProformaPage() {
  const { user } = useAuth()
  const isB2b = user?.email?.toLowerCase().endsWith('@b2bx.cl')
  const { data, setData, set, saving, saveMsg, save, authorizeDownload, atLimit } =
    useDocEditor<ProformaData>('proforma', { ...defaultProformaData, sellerLogo: isB2b ? B2B_EXPRESS_LOGO : '' }, '/proforma')

  const { subtotal, tax, total } = proformaTotals(data)
  const [translating, setTranslating] = useState(false)
  const [translateMsg, setTranslateMsg] = useState<string | null>(null)

  // Captions switch at once; what was typed is translated by the server, and
  // the captions still switch if that fails (e.g. in the demo, signed out).
  async function toggleLanguage() {
    const target = data.language === 'es' ? 'en' : 'es'
    const keys = [
      'transportDetails', 'paymentTerms', 'notes', 'origin', 'destination',
      ...data.lineItems.flatMap((_, i) => [`lineItems.${i}.description`, `lineItems.${i}.quantity`]),
    ]
    const fields = Object.fromEntries(keys.map(k => [k, rawValue(data, k)]).filter(([, v]) => v.trim()))
    setTranslateMsg(null)
    setTranslating(true)
    try {
      const out = Object.keys(fields).length ? await translateTexts(fields, target) : {}
      setData(d => Object.entries(out).reduce<ProformaData>((acc, [k, v]) => setValue(acc, k, v, newRowId), { ...d, language: target }))
    } catch (e: any) {
      setData(d => ({ ...d, language: target }))
      setTranslateMsg(e?.message ?? 'No se pudo traducir el contenido.')
      setTimeout(() => setTranslateMsg(null), 6000)
    } finally {
      setTranslating(false)
    }
  }

  const updateLine = (id: string, key: keyof ProformaLineItem, value: string) =>
    setData(d => ({ ...d, lineItems: d.lineItems.map(l => l.id === id ? { ...l, [key]: value } : l) }))

  // The sheet has a fixed number of rows; anything past them would not print.
  const addLine = () =>
    setData(d => d.lineItems.length >= LINE_ROWS ? d : ({ ...d, lineItems: [...d.lineItems, emptyProformaLine(newRowId())] }))

  const removeLine = (id: string) =>
    setData(d => ({ ...d, lineItems: d.lineItems.filter(l => l.id !== id) }))

  const money = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <DocEditorShell
      data={data}
      renderDocument={(d, opts) => <ProformaDocument data={d} hideValues={opts.hideValues} />}
      toolbarExtra={
        <>
          <DraftToggle checked={data.isDraft} onChange={set('isDraft')} locked={atLimit} />
          <button
            type="button"
            title={data.language === 'es' ? 'Traducir la proforma al inglés' : 'Traducir la proforma al español'}
            onClick={toggleLanguage}
            disabled={translating}
            style={{ background: '#333', border: 'none', color: '#ddd', padding: '0 10px', height: 26, borderRadius: 4, cursor: translating ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700 }}
          >
            {translating ? 'Traduciendo…' : data.language === 'es' ? 'ES → EN' : 'EN → ES'}
          </button>
          {translateMsg && <span style={{ color: '#f3b6b6', fontSize: 11 }}>{translateMsg}</span>}
        </>
      }
      overlay={pageWidthPx => <ProformaOverlay data={data} onChange={setData} pageWidthPx={pageWidthPx} />}
      subtitle="Proforma Invoice"
      accent="#5c3a1a"
      fileName={`Proforma_${data.proformaNumber || 'draft'}.pdf`}
      onSave={save}
      saving={saving}
      saveMsg={saveMsg}
      authorizeDownload={authorizeDownload}
      forceWatermark={atLimit}
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
        <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Logo (issued by)</span>
          {data.sellerLogo
            ? <img src={data.sellerLogo} alt="" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
            : <span style={{ fontSize: 12, color: '#999' }}>Sin logo</span>}
          <LogoMenu value={data.sellerLogo ?? ''} onChange={v => setData(d => ({ ...d, sellerLogo: v }))} style={{ position: 'relative' }} menuAlign="left" />
        </div>
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
          addLabel={data.lineItems.length >= LINE_ROWS ? `Máximo ${LINE_ROWS} líneas` : '+ Add line'}
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
          <Check
            label="Show DRAFT watermark"
            checked={data.isDraft || atLimit}
            onChange={set('isDraft')}
            disabled={atLimit}
            hint={atLimit ? 'Plan gratis: alcanzaste el límite de documentos del mes, el PDF lleva DRAFT hasta que actualices el plan.' : undefined}
          />
        </Row>
      </Section>
    </DocEditorShell>
  )
}
