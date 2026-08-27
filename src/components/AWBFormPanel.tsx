import React, { useState } from 'react'
import { AWBData, RateItem, OtherCharge } from '../types/awb'
import { validateAWBSerial, computeCheckDigit } from '../lib/awbCheckDigit'
import { applyAutoCalc } from '../lib/rateVolume'
import { recalculateCharges } from '../lib/recalculateCharges'
import { RateItemDialog } from './RateItemDialog'

interface Props {
  data: AWBData
  onChange: (data: AWBData) => void
  lockDraftWatermark?: boolean
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
  label, value, onChange, type = 'text', rows, placeholder, style, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; rows?: number; placeholder?: string; style?: React.CSSProperties; required?: boolean
}) {
  return (
    <div className="field" style={style}>
      <label>{label}{required && <span style={{ color: '#c00', marginLeft: 2 }}>*</span>}</label>
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

export function AWBFormPanel({ data, onChange, lockDraftWatermark }: Props) {
  const [rateEditId, setRateEditId] = useState<string | null>(null)

  const commit = (next: AWBData) => onChange(recalculateCharges(next))

  const set = (key: keyof AWBData) => (val: string | boolean) =>
    commit({ ...data, [key]: val })

  const uid = () => Math.random().toString(36).slice(2, 8)

  function updateRateItem(id: string, key: keyof RateItem, val: string) {
    const rateItems = data.rateItems.map((r) => {
      if (r.id !== id) return r
      return applyAutoCalc({ ...r, [key]: val })
    })
    commit({ ...data, rateItems })
  }

  function addRateItem() {
    commit({
      ...data,
      rateItems: [
        ...data.rateItems,
        {
          id: uid(),
          pieces: '',
          grossWeight: '',
          weightUnit: 'K',
          rateClass: '',
          commodityItemNo: '',
          chargeableWeight: '',
          rateCharge: '',
          total: '',
          natureAndQuantity: '',
          autoCalc: 'total',
          dimensions: [],
        },
      ],
    })
  }

  function removeRateItem(id: string) {
    commit({ ...data, rateItems: data.rateItems.filter((r) => r.id !== id) })
  }

  function addOtherCharge() {
    commit({
      ...data,
      otherCharges: [...data.otherCharges, { id: uid(), description: '', amount: '', entitlement: 'DUE AGENT' }],
    })
  }

  function updateOtherCharge(id: string, key: keyof OtherCharge, val: string) {
    commit({
      ...data,
      otherCharges: data.otherCharges.map((c) => (c.id === id ? { ...c, [key]: val } : c)),
    })
  }

  function removeOtherCharge(id: string) {
    commit({ ...data, otherCharges: data.otherCharges.filter((c) => c.id !== id) })
  }

  const isHawb = data.docType === 'hawb'
  const editingItem = rateEditId ? data.rateItems.find((r) => r.id === rateEditId) || null : null

  return (
    <div className="form-panel">

      {/* AWB / HAWB NUMBER */}
      <Section title={isHawb ? 'HAWB Number' : 'AWB Number'}>
        {isHawb ? (
          <>
            <Field label="HAWB Number" value={data.hawbNumber ?? ''} onChange={set('hawbNumber')} placeholder="HB-2024-001" />
            <Field label="MAWB Reference (Master AWB)" value={data.mawbReference ?? ''} onChange={set('mawbReference')} placeholder="999-12345675" />
          </>
        ) : (
          <Row>
            <Field label="Prefix (airline code)" value={data.awbPrefix} onChange={set('awbPrefix')} placeholder="999" required />
            <Field label="Airport Code" value={data.awbAirportCode} onChange={set('awbAirportCode')} placeholder="SCL" />
            <div className="field">
              <label>Serial Number<span style={{ color: '#c00', marginLeft: 2 }}>*</span></label>
              <input
                value={data.awbSerial}
                onChange={(e) => set('awbSerial')(e.target.value)}
                placeholder="12345675"
                style={{ borderColor: data.awbSerial.length === 8 ? (validateAWBSerial(data.awbSerial) ? '#2a7a2a' : '#c00') : undefined }}
              />
              {data.awbSerial.length >= 7 && data.awbSerial.length < 8 && (
                <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  Check digit: <strong>{computeCheckDigit(data.awbSerial)}</strong>
                </span>
              )}
              {data.awbSerial.length === 8 && !validateAWBSerial(data.awbSerial) && (
                <span style={{ fontSize: 11, color: '#c00', marginTop: 2 }}>
                  ✗ Check digit inválido (esperado: {computeCheckDigit(data.awbSerial.slice(0, 7))})
                </span>
              )}
              {data.awbSerial.length === 8 && validateAWBSerial(data.awbSerial) && (
                <span style={{ fontSize: 11, color: '#2a7a2a', marginTop: 2 }}>✓ Válido</span>
              )}
            </div>
          </Row>
        )}
        <Row>
          {!lockDraftWatermark && (
          <div className="field">
            <label>Draft watermark</label>
            <label className="toggle">
              <input type="checkbox" checked={data.isDraft} onChange={(e) => set('isDraft')(e.target.checked)} />
              <span>Show DRAFT</span>
            </label>
          </div>
          )}
          {!isHawb && (
          <div className="field">
            <label>Número AWB</label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={Boolean(data.assignOnSave)}
                onChange={(e) => set('assignOnSave')(e.target.checked)}
              />
              <span>Asignar al guardar (si serial vacío → DRAFT-…)</span>
            </label>
          </div>
          )}
          <div className="field">
            <label>Copy</label>
            <select value={data.copyNumber} onChange={(e) => {
              const n = parseInt(e.target.value) as 1 | 2 | 3
              const hawbLabels = ['Original 1 (for Consignee)', 'Original 2 (for Issuing Agent)', 'Original 3 (for Shipper)']
              const awbLabels  = ['Original 1 (for Issuing Carrier)', 'Original 2 (for Consignee)', 'Original 3 (for Shipper)']
              commit({ ...data, copyNumber: n, copyLabel: (isHawb ? hawbLabels : awbLabels)[n - 1] })
            }}>
              {isHawb ? (
                <>
                  <option value={1}>Original 1 (for Consignee)</option>
                  <option value={2}>Original 2 (for Issuing Agent)</option>
                  <option value={3}>Original 3 (for Shipper)</option>
                </>
              ) : (
                <>
                  <option value={1}>Original 1 (for Issuing Carrier)</option>
                  <option value={2}>Original 2 (for Consignee)</option>
                  <option value={3}>Original 3 (for Shipper)</option>
                </>
              )}
            </select>
          </div>
        </Row>
      </Section>

      {/* CARRIER */}
      <Section title="Issuing Carrier">
        <Field label="Carrier Name" value={data.carrierName} onChange={set('carrierName')} placeholder="AIR CANADA" />
        <Field label="Carrier Address" value={data.carrierAddress} onChange={set('carrierAddress')} rows={2} placeholder="AIR CANADA CENTER 271, COTE VERTU OUEST, QUEBEC, CANADA" />
        <div className="field">
          <label>Carrier Logo <span style={{ fontWeight: 400, color: '#888' }}>(Starter+)</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.carrierLogoUrl && (
              <img src={data.carrierLogoUrl} alt="logo" style={{ height: 32, objectFit: 'contain', border: '1px solid #eee', borderRadius: 4, padding: 2 }} />
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ fontSize: 12 }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = (ev) => commit({ ...data, carrierLogoUrl: ev.target?.result as string })
                reader.readAsDataURL(file)
              }}
            />
            {data.carrierLogoUrl && (
              <button type="button" onClick={() => commit({ ...data, carrierLogoUrl: '' })}
                style={{ fontSize: 11, color: '#c00', background: 'none', border: 'none', cursor: 'pointer' }}>
                Quitar
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* SHIPPER */}
      <Section title="Shipper">
        <Field label="Account Number" value={data.shipperAccountNumber} onChange={set('shipperAccountNumber')} />
        <Field label="Name and Address" value={data.shipperNameAndAddress} onChange={set('shipperNameAndAddress')} rows={3} required />
      </Section>

      {/* CONSIGNEE */}
      <Section title="Consignee">
        <Field label="Account Number" value={data.consigneeAccountNumber} onChange={set('consigneeAccountNumber')} />
        <Field label="Name and Address" value={data.consigneeNameAndAddress} onChange={set('consigneeNameAndAddress')} rows={3} required />
      </Section>

      {/* AGENT */}
      <Section title="Issuing Carrier's Agent">
        <Field label="Name and City" value={data.agentNameAndCity} onChange={set('agentNameAndCity')} rows={2} />
        <Row>
          <Field label="IATA Code" value={data.agentIataCode} onChange={set('agentIataCode')} placeholder="75-1-1234/0000" />
          <Field label="Account No." value={data.agentAccountNumber} onChange={set('agentAccountNumber')} />
        </Row>
      </Section>

      {/* ACCOUNTING / REFERENCE */}
      <Section title="Accounting & Reference">
        <Field label="Accounting Information" value={data.accountingInformation} onChange={set('accountingInformation')} rows={3} placeholder="FREIGHT PREPAID" />
        <Row>
          <Field label="Reference Number" value={data.referenceNumber} onChange={set('referenceNumber')} />
        </Row>
        <Row>
          <Field label="Optional Shipping Info 1" value={data.optionalShippingInfo1} onChange={set('optionalShippingInfo1')} />
          <Field label="Optional Shipping Info 2" value={data.optionalShippingInfo2} onChange={set('optionalShippingInfo2')} />
          <Field label="Optional Shipping Info 3" value={data.optionalShippingInfo3} onChange={set('optionalShippingInfo3')} />
        </Row>
      </Section>

      {/* ROUTING */}
      <Section title="Routing">
        <Field label="Airport of Departure" value={data.airportOfDeparture} onChange={set('airportOfDeparture')} placeholder="SANTIAGO DE CHILE (SCL/ZRH)" required />
        <Row>
          <Field label="To (1)" style={{ flex: '0 0 56px' }} value={data.routeTo1} onChange={set('routeTo1')} placeholder="YYZ" />
          <Field label="By (1)" style={{ flex: '0 0 56px' }} value={data.routeBy1} onChange={set('routeBy1')} placeholder="AC" />
          <Field label="To (2)" style={{ flex: '0 0 56px' }} value={data.routeTo2} onChange={set('routeTo2')} placeholder="ZRH" />
          <Field label="By (2)" style={{ flex: '0 0 56px' }} value={data.routeBy2} onChange={set('routeBy2')} placeholder="AC" />
        </Row>
        <Row>
          <Field label="To (3)" style={{ flex: '0 0 56px' }} value={data.routeTo3} onChange={set('routeTo3')} />
          <Field label="By (3)" style={{ flex: '0 0 56px' }} value={data.routeBy3} onChange={set('routeBy3')} />
        </Row>
        <Row>
          <Field label="Airport of Destination" value={data.airportOfDestination} onChange={set('airportOfDestination')} placeholder="ZURICH" required />
        </Row>
        <Row>
          <Field label="Flight Number" value={data.flightNumber} onChange={set('flightNumber')} placeholder="LA600/15-08" />
          <Field label="Flight Date" value={data.flightDate} onChange={set('flightDate')} placeholder="2026-08-15" />
        </Row>
        <Row>
          <Field label="Flight 2" value={data.flightNumber2 || ''} onChange={set('flightNumber2')} placeholder="LA501" />
          <Field label="Flight 2 Date" value={data.flightDate2 || ''} onChange={set('flightDate2')} placeholder="2026-08-16" />
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
        <Row>
          <Field label="Shipper country (ISO-2)" value={data.shipperCountry || ''} onChange={set('shipperCountry')} placeholder="CL" />
          <Field label="Consignee country (ISO-2)" value={data.consigneeCountry || ''} onChange={set('consigneeCountry')} placeholder="US" />
        </Row>
        <div className="field">
          <label>SPH (eAWB)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(['EAW', 'EAP', 'PER', 'XPS', 'COL', 'AVI', 'PES'] as const).map((code) => {
              const selected = (data.sphCodes || []).includes(code)
              return (
                <label key={code} className="toggle">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      const prev = data.sphCodes || []
                      const next = e.target.checked
                        ? [...prev.filter((c) => c !== code), code]
                        : prev.filter((c) => c !== code)
                      // EAP and EAW are mutually exclusive for e-AWB paper mode
                      const cleaned =
                        code === 'EAP' && e.target.checked
                          ? next.filter((c) => c !== 'EAW')
                          : code === 'EAW' && e.target.checked
                            ? next.filter((c) => c !== 'EAP')
                            : next
                      onChange({ ...data, sphCodes: cleaned })
                    }}
                  />
                  <span>{code}</span>
                </label>
              )
            })}
          </div>
          {data.eAwbStatus && data.eAwbStatus !== 'none' && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              eAWB: {data.eAwbStatus}
              {data.eAwbGeneratedAt ? ` · ${new Date(data.eAwbGeneratedAt).toLocaleString('es-CL')}` : ''}
            </div>
          )}
        </div>
      </Section>

      {/* RATE ITEMS */}
      <Section title="Rate Description">
        <div className="rate-table">
          <div className="rate-inner">
            <div className="rate-header">
              <span>Pcs</span><span>Gross Wt</span><span>Unit</span><span>Rate Class</span>
              <span>Commodity</span><span>Chg. Wt</span><span>Rate</span><span>Total</span>
              <span className="col-nature">Nature &amp; Quantity</span>
              <span style={{ width: 52, flexShrink: 0 }}>Dims</span>
              <span style={{ width: 20, flexShrink: 0 }}></span>
            </div>
            {data.rateItems.map((item) => (
              <div key={item.id} className="rate-row">
                <input value={item.pieces} onChange={(e) => updateRateItem(item.id, 'pieces', e.target.value)} placeholder="1" />
                <input value={item.grossWeight} onChange={(e) => updateRateItem(item.id, 'grossWeight', e.target.value)} placeholder="10" />
                <select className="col-unit" value={item.weightUnit} onChange={(e) => updateRateItem(item.id, 'weightUnit', e.target.value)}>
                  <option value="K">K</option>
                  <option value="L">L</option>
                </select>
                <input value={item.rateClass} onChange={(e) => updateRateItem(item.id, 'rateClass', e.target.value)} placeholder="M" />
                <input value={item.commodityItemNo} onChange={(e) => updateRateItem(item.id, 'commodityItemNo', e.target.value)} />
                <input value={item.chargeableWeight} onChange={(e) => updateRateItem(item.id, 'chargeableWeight', e.target.value)} placeholder="10" />
                <input value={item.rateCharge} onChange={(e) => updateRateItem(item.id, 'rateCharge', e.target.value)} placeholder="400.00" />
                <input value={item.total} onChange={(e) => updateRateItem(item.id, 'total', e.target.value)} placeholder="400.00" />
                <input className="col-nature" value={item.natureAndQuantity} onChange={(e) => updateRateItem(item.id, 'natureAndQuantity', e.target.value)} placeholder="PRINTED BROCHURES / 30x30x50cm" />
                <button
                  type="button"
                  className="btn-add"
                  style={{ padding: '2px 6px', fontSize: 11, width: 52, flexShrink: 0 }}
                  title="Dimensiones / peso volumétrico"
                  onClick={() => setRateEditId(item.id)}
                >
                  {item.dimensions?.length ? `⧉${item.dimensions.length}` : '⧉'}
                </button>
                <button type="button" className="btn-remove" onClick={() => removeRateItem(item.id)}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add" onClick={addRateItem}>+ Add Row</button>
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
              <button type="button" className="btn-remove" onClick={() => removeOtherCharge(c.id)}>×</button>
            </div>
          ))}
          <button type="button" className="btn-add" onClick={addOtherCharge}>+ Add Charge</button>
        </div>
      </Section>

      {/* CHARGES SUMMARY */}
      <Section title="Charges Summary">
        <button
          type="button"
          className="btn-add"
          style={{ marginBottom: 8 }}
          onClick={() => onChange(recalculateCharges(data))}
        >
          Recalcular totales
        </button>
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
        <Field label="Signature of Issuing Carrier or Agent" value={data.signatureCarrier} onChange={set('signatureCarrier')} />
      </Section>

      <RateItemDialog
        open={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setRateEditId(null)}
        onAccept={(next) => {
          commit({
            ...data,
            rateItems: data.rateItems.map((r) => (r.id === next.id ? next : r)),
          })
        }}
      />
    </div>
  )
}
