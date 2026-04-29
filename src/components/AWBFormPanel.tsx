import React from 'react'
import { AWBData, RateItem, OtherCharge } from '../types/awb'

interface Props {
  data: AWBData
  onChange: (data: AWBData) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', rows, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; rows?: number; placeholder?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function AWBFormPanel({ data, onChange }: Props) {
  const set = (key: keyof AWBData) => (val: string | boolean) =>
    onChange({ ...data, [key]: val })

  const uid = () => Math.random().toString(36).slice(2, 8)

  function updateRateItem(id: string, key: keyof RateItem, val: string) {
    onChange({
      ...data,
      rateItems: data.rateItems.map((r) => (r.id === id ? { ...r, [key]: val } : r)),
    })
  }

  function addRateItem() {
    onChange({
      ...data,
      rateItems: [
        ...data.rateItems,
        { id: uid(), pieces: '', grossWeight: '', weightUnit: 'K', rateClass: '', commodityItemNo: '', chargeableWeight: '', rateCharge: '', total: '', natureAndQuantity: '' },
      ],
    })
  }

  function removeRateItem(id: string) {
    onChange({ ...data, rateItems: data.rateItems.filter((r) => r.id !== id) })
  }

  function addOtherCharge() {
    onChange({
      ...data,
      otherCharges: [...data.otherCharges, { id: uid(), description: '', amount: '', entitlement: 'DUE AGENT' }],
    })
  }

  function updateOtherCharge(id: string, key: keyof OtherCharge, val: string) {
    onChange({
      ...data,
      otherCharges: data.otherCharges.map((c) => (c.id === id ? { ...c, [key]: val } : c)),
    })
  }

  function removeOtherCharge(id: string) {
    onChange({ ...data, otherCharges: data.otherCharges.filter((c) => c.id !== id) })
  }

  return (
    <div className="form-panel">

      {/* AWB NUMBER */}
      <Section title="AWB Number">
        <Row>
          <Field label="Prefix (airline code)" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="014" />
          <Field label="Serial Number" value={data.awbSerial} onChange={set('awbSerial')} placeholder="57318306" />
        </Row>
        <Row>
          <div className="field">
            <label>Draft watermark</label>
            <label className="toggle">
              <input type="checkbox" checked={data.isDraft} onChange={(e) => set('isDraft')(e.target.checked)} />
              <span>Show DRAFT</span>
            </label>
          </div>
          <div className="field">
            <label>Copy</label>
            <select value={data.copyNumber} onChange={(e) => {
              const n = parseInt(e.target.value) as 1 | 2 | 3
              const labels = ['Original 1 (for Issuing Carrier)', 'Original 2 (for Consignee)', 'Original 3 (for Shipper)']
              onChange({ ...data, copyNumber: n, copyLabel: labels[n - 1] })
            }}>
              <option value={1}>Original 1 (for Issuing Carrier)</option>
              <option value={2}>Original 2 (for Consignee)</option>
              <option value={3}>Original 3 (for Shipper)</option>
            </select>
          </div>
        </Row>
      </Section>

      {/* CARRIER */}
      <Section title="Issuing Carrier">
        <Field label="Carrier Name" value={data.carrierName} onChange={set('carrierName')} placeholder="AIR CANADA" />
        <Field label="Carrier Address" value={data.carrierAddress} onChange={set('carrierAddress')} rows={2} placeholder="AIR CANADA CENTER 271, COTE VERTU OUEST, QUEBEC, CANADA" />
      </Section>

      {/* SHIPPER */}
      <Section title="Shipper">
        <Field label="Account Number" value={data.shipperAccountNumber} onChange={set('shipperAccountNumber')} />
        <Field label="Name and Address" value={data.shipperNameAndAddress} onChange={set('shipperNameAndAddress')} rows={3} />
      </Section>

      {/* CONSIGNEE */}
      <Section title="Consignee">
        <Field label="Account Number" value={data.consigneeAccountNumber} onChange={set('consigneeAccountNumber')} />
        <Field label="Name and Address" value={data.consigneeNameAndAddress} onChange={set('consigneeNameAndAddress')} rows={3} />
      </Section>

      {/* AGENT */}
      <Section title="Issuing Carrier's Agent">
        <Field label="Name and City" value={data.agentNameAndCity} onChange={set('agentNameAndCity')} rows={2} />
        <Row>
          <Field label="IATA Code" value={data.agentIataCode} onChange={set('agentIataCode')} placeholder="75-1-9012/0014" />
          <Field label="Account No." value={data.agentAccountNumber} onChange={set('agentAccountNumber')} />
        </Row>
      </Section>

      {/* ACCOUNTING / REFERENCE */}
      <Section title="Accounting & Reference">
        <Field label="Accounting Information" value={data.accountingInformation} onChange={set('accountingInformation')} rows={3} placeholder="FREIGHT PREPAID" />
        <Row>
          <Field label="Reference Number" value={data.referenceNumber} onChange={set('referenceNumber')} />
          <Field label="Optional Shipping Info" value={data.optionalShippingInfo} onChange={set('optionalShippingInfo')} />
        </Row>
      </Section>

      {/* ROUTING */}
      <Section title="Routing">
        <Field label="Airport of Departure" value={data.airportOfDeparture} onChange={set('airportOfDeparture')} placeholder="SANTIAGO DE CHILE (SCL/ZRH)" />
        <Row>
          <Field label="To (1)" value={data.routeTo1} onChange={set('routeTo1')} placeholder="YYZ" />
          <Field label="By (1)" value={data.routeBy1} onChange={set('routeBy1')} placeholder="AC" />
          <Field label="To (2)" value={data.routeTo2} onChange={set('routeTo2')} placeholder="ZRH" />
          <Field label="By (2)" value={data.routeBy2} onChange={set('routeBy2')} placeholder="AC" />
        </Row>
        <Row>
          <Field label="To (3)" value={data.routeTo3} onChange={set('routeTo3')} />
          <Field label="By (3)" value={data.routeBy3} onChange={set('routeBy3')} />
          <Field label="Airport of Destination" value={data.airportOfDestination} onChange={set('airportOfDestination')} placeholder="ZURICH" />
        </Row>
        <Row>
          <Field label="Flight Number" value={data.flightNumber} onChange={set('flightNumber')} placeholder="AC093" />
          <Field label="Flight Date" value={data.flightDate} onChange={set('flightDate')} placeholder="02-NOV" />
        </Row>
      </Section>

      {/* CHARGES DECLARATION */}
      <Section title="Charges Declaration">
        <Row>
          <Field label="Currency" value={data.currency} onChange={set('currency')} placeholder="USD" />
          <Field label="Declared Value for Carriage" value={data.declaredValueCarriage} onChange={set('declaredValueCarriage')} placeholder="NVD" />
          <Field label="Declared Value for Customs" value={data.declaredValueCustoms} onChange={set('declaredValueCustoms')} placeholder="NCV" />
        </Row>
        <Row>
          <div className="field">
            <label>WT/VAL</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label className="toggle">
                <input type="checkbox" checked={data.wtValPPD} onChange={(e) => set('wtValPPD')(e.target.checked)} />
                <span>PPD</span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={data.wtValCOLL} onChange={(e) => set('wtValCOLL')(e.target.checked)} />
                <span>COLL</span>
              </label>
            </div>
          </div>
          <div className="field">
            <label>Other</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label className="toggle">
                <input type="checkbox" checked={data.otherPPD} onChange={(e) => set('otherPPD')(e.target.checked)} />
                <span>PPD</span>
              </label>
              <label className="toggle">
                <input type="checkbox" checked={data.otherCOLL} onChange={(e) => set('otherCOLL')(e.target.checked)} />
                <span>COLL</span>
              </label>
            </div>
          </div>
          <Field label="Insurance Amount" value={data.insuranceAmount} onChange={set('insuranceAmount')} placeholder="XXX" />
        </Row>
      </Section>

      {/* HANDLING */}
      <Section title="Handling Information">
        <Field label="Handling Information" value={data.handlingInformation} onChange={set('handlingInformation')} rows={2} />
        <Field label="SCI" value={data.sci} onChange={set('sci')} />
      </Section>

      {/* RATE ITEMS */}
      <Section title="Rate Description">
        <div className="rate-table">
          <div className="rate-header">
            <span>Pcs</span><span>Gross Wt</span><span>Unit</span><span>Rate Class</span>
            <span>Commodity</span><span>Chg. Wt</span><span>Rate</span><span>Total</span>
            <span style={{ flex: 2 }}>Nature & Quantity</span><span></span>
          </div>
          {data.rateItems.map((item) => (
            <div key={item.id} className="rate-row">
              <input value={item.pieces} onChange={(e) => updateRateItem(item.id, 'pieces', e.target.value)} placeholder="1" />
              <input value={item.grossWeight} onChange={(e) => updateRateItem(item.id, 'grossWeight', e.target.value)} placeholder="10" />
              <select value={item.weightUnit} onChange={(e) => updateRateItem(item.id, 'weightUnit', e.target.value)}>
                <option value="K">K</option>
                <option value="L">L</option>
              </select>
              <input value={item.rateClass} onChange={(e) => updateRateItem(item.id, 'rateClass', e.target.value)} placeholder="M" />
              <input value={item.commodityItemNo} onChange={(e) => updateRateItem(item.id, 'commodityItemNo', e.target.value)} />
              <input value={item.chargeableWeight} onChange={(e) => updateRateItem(item.id, 'chargeableWeight', e.target.value)} placeholder="10" />
              <input value={item.rateCharge} onChange={(e) => updateRateItem(item.id, 'rateCharge', e.target.value)} placeholder="400.00" />
              <input value={item.total} onChange={(e) => updateRateItem(item.id, 'total', e.target.value)} placeholder="400.00" />
              <input style={{ flex: 2 }} value={item.natureAndQuantity} onChange={(e) => updateRateItem(item.id, 'natureAndQuantity', e.target.value)} placeholder="BANK NOTES / 30x30x50cm" />
              <button className="btn-remove" onClick={() => removeRateItem(item.id)}>×</button>
            </div>
          ))}
          <button className="btn-add" onClick={addRateItem}>+ Add Row</button>
        </div>
      </Section>

      {/* OTHER CHARGES */}
      <Section title="Other Charges">
        <div className="other-charges-table">
          {data.otherCharges.map((c) => (
            <div key={c.id} className="other-charge-row">
              <input style={{ flex: 2 }} value={c.description} onChange={(e) => updateOtherCharge(c.id, 'description', e.target.value)} placeholder="B2B FEE" />
              <input value={c.amount} onChange={(e) => updateOtherCharge(c.id, 'amount', e.target.value)} placeholder="250.00" />
              <select value={c.entitlement} onChange={(e) => updateOtherCharge(c.id, 'entitlement', e.target.value)}>
                <option value="DUE AGENT">Due Agent</option>
                <option value="DUE CARRIER">Due Carrier</option>
              </select>
              <button className="btn-remove" onClick={() => removeOtherCharge(c.id)}>×</button>
            </div>
          ))}
          <button className="btn-add" onClick={addOtherCharge}>+ Add Charge</button>
        </div>
      </Section>

      {/* CHARGES SUMMARY */}
      <Section title="Charges Summary">
        <div className="charges-grid">
          <div className="charges-col">
            <div className="charges-sub-title">Prepaid</div>
            <Field label="Weight Charge" value={data.weightChargePPD} onChange={set('weightChargePPD')} />
            <Field label="Valuation Charge" value={data.valuationChargePPD} onChange={set('valuationChargePPD')} />
            <Field label="Tax" value={data.taxPPD} onChange={set('taxPPD')} />
            <Field label="Due Agent" value={data.totalOtherChargesDueAgent} onChange={set('totalOtherChargesDueAgent')} />
            <Field label="Total Prepaid" value={data.totalPrepaid} onChange={set('totalPrepaid')} />
          </div>
          <div className="charges-col">
            <div className="charges-sub-title">Collect</div>
            <Field label="Weight Charge" value={data.weightChargeCOLL} onChange={set('weightChargeCOLL')} />
            <Field label="Valuation Charge" value={data.valuationChargeCOLL} onChange={set('valuationChargeCOLL')} />
            <Field label="Tax" value={data.taxCOLL} onChange={set('taxCOLL')} />
            <Field label="Due Carrier" value={data.totalOtherChargesDueCarrier} onChange={set('totalOtherChargesDueCarrier')} />
            <Field label="Total Collect" value={data.totalCollect} onChange={set('totalCollect')} />
          </div>
        </div>
        <Row>
          <Field label="Currency Conversion Rates" value={data.currencyConversionRates} onChange={set('currencyConversionRates')} />
          <Field label="CC Charges in Dest. Currency" value={data.ccChargesInDestCurrency} onChange={set('ccChargesInDestCurrency')} />
        </Row>
        <Row>
          <Field label="Charges at Destination" value={data.chargesAtDestination} onChange={set('chargesAtDestination')} />
          <Field label="Total Collect Charges" value={data.totalCollectCharges} onChange={set('totalCollectCharges')} />
        </Row>
      </Section>

      {/* EXECUTION */}
      <Section title="Execution">
        <Row>
          <Field label="Executed on (date)" value={data.executedOnDate} onChange={set('executedOnDate')} placeholder="02-NOV-2023" />
          <Field label="At (place)" value={data.executedAtPlace} onChange={set('executedAtPlace')} placeholder="SANTIAGO" />
        </Row>
        <Field label="Signature of Shipper or Agent" value={data.signatureShipper} onChange={set('signatureShipper')} />
      </Section>
    </div>
  )
}
