import type { AWBData } from '../types/awb'
import { awbDataToFwbInput } from './awbToFwb'
import { destinationOf, originOf, parseFlights, validateAwbCheckDigitFwb } from './fwbCargoImp'
import { parseAgentCode, parseParty } from './fwbParties'
import { splitAwbSerial } from './awbCheckDigit'

export interface AwbSuggestion {
  /** 'error' stops a FWB from being built; 'warn' would get it rejected or misread; 'tip' tidies it. */
  level: 'error' | 'warn' | 'tip'
  field: string
  message: string
  fix?: { label: string; patch: Partial<AWBData> }
}

const num = (v: unknown) => Number(String(v ?? '').replace(',', '.')) || 0

/**
 * How the waybill reads against what a carrier's eAWB system expects. Built on
 * the same parsers as the FWB, so every hint here is something that would
 * otherwise reach the airline wrong.
 */
export function eawbSuggestions(data: AWBData): AwbSuggestion[] {
  if (data.docType === 'hawb') return []
  const out: AwbSuggestion[] = []
  const input = awbDataToFwbInput(data)

  const prefix = String(data.awbPrefix ?? '').replace(/\D/g, '')
  const serial = data.awbSerial ? splitAwbSerial(data.awbSerial).serial : ''
  if (prefix.length === 3 && serial.length === 8 && !validateAwbCheckDigitFwb(`${prefix}-${serial}`)) {
    out.push({ level: 'error', field: 'Número AWB', message: `El dígito verificador de ${prefix}-${serial} no cuadra: revisa el número.` })
  }

  const origin = originOf(input)
  const dest = destinationOf(input)
  if (!origin) {
    out.push({ level: 'error', field: 'Aeropuerto de salida', message: 'Agrega el código IATA del aeropuerto, por ejemplo "A.MERINO.B (SCL)".' })
  }
  if (!dest) {
    out.push({ level: 'error', field: 'Aeropuerto de destino', message: 'No se deduce el código del destino: escríbelo junto al nombre ("MENDOZA (MDZ)") o en el primer "To" de la ruta.' })
  }
  if (!parseFlights(input).length) {
    out.push({ level: 'warn', field: 'Vuelo solicitado', message: 'Indica vuelo y día ("LA434/30") — las aerolíneas lo usan para reservar la carga.' })
  }

  const parties: [string, string | undefined, 'SHP' | 'CNE'][] = [
    ['Shipper', data.shipperNameAndAddress, 'SHP'],
    ['Consignee', data.consigneeNameAndAddress, 'CNE'],
  ]
  for (const [label, block, role] of parties) {
    if (!block?.trim()) {
      out.push({ level: 'error', field: label, message: 'Falta nombre y dirección.' })
      continue
    }
    const p = parseParty(block)
    if (!p.country) out.push({ level: 'warn', field: label, message: 'No se reconoce el país: termina la dirección con una línea "CIUDAD - PAÍS" (por ejemplo "SANTIAGO - CHILE").' })
    else if (!p.place) out.push({ level: 'warn', field: label, message: 'No se reconoce la ciudad: ponla en su propia línea junto al país ("PUNTA ARENAS - CHILE"), no pegada a la calle.' })
    if (!p.street) out.push({ level: 'warn', field: label, message: 'Falta la calle y número en una línea propia.' })
    if (!p.phone) out.push({ level: 'tip', field: label, message: 'Agrega un teléfono de contacto con código de país ("PH: +54 261 555 1234").' })
    if (role === 'CNE' && p.country === 'AR' && !p.taxId) {
      out.push({ level: 'warn', field: label, message: 'Argentina exige el CUIT del consignatario: agrégalo ("CUIT: 30711707545").' })
    }
    if (role === 'SHP' && p.country === 'CL' && !p.taxId) {
      out.push({ level: 'tip', field: label, message: 'Agrega el RUT del embarcador ("RUT: 76.503.774-3").' })
    }
  }

  const { iata, cass } = parseAgentCode(data.agentIataCode)
  if (data.agentIataCode && (iata.length !== 7 || (cass && cass.length !== 4))) {
    out.push({ level: 'warn', field: 'Código IATA del agente', message: 'El formato es NN-N-NNNN/NNNN (código de 7 dígitos y CASS de 4), por ejemplo 75-1-9012/0014.' })
  } else if (!data.agentIataCode) {
    out.push({ level: 'warn', field: 'Código IATA del agente', message: 'Falta el código IATA del agente: sin él la aerolínea no puede identificarlos.' })
  }

  const items = data.rateItems ?? []
  items.forEach((it, i) => {
    const row = items.length > 1 ? ` (línea ${i + 1})` : ''
    const gw = num(it.grossWeight), cw = num(it.chargeableWeight), rate = num(it.rateCharge), total = num(it.total)
    if (cw && gw && cw < gw) {
      out.push({ level: 'warn', field: `Peso cobrable${row}`, message: `El peso cobrable (${cw}) no puede ser menor que el bruto (${gw}).`, fix: { label: `Usar ${gw}`, patch: { rateItems: items.map((r, k) => k === i ? { ...r, chargeableWeight: String(gw) } : r) } } })
    }
    const expected = Math.round(rate * (cw || gw) * 100) / 100
    // A rate equal to the total is a flat charge (minimum or all-in), not a per-kilo rate.
    if (rate && total && rate !== total && it.rateClass !== 'M' && Math.abs(expected - total) > 0.01) {
      out.push({ level: 'tip', field: `Total${row}`, message: `Tarifa × peso cobrable da ${expected.toFixed(2)}, no ${total.toFixed(2)}.`, fix: { label: `Usar ${expected.toFixed(2)}`, patch: { rateItems: items.map((r, k) => k === i ? { ...r, total: expected.toFixed(2) } : r) } } })
    }
    if (!/\d+\s*X\s*\d+\s*X\s*\d+\s*(CM|IN)?\s*\/\s*\d+/i.test(it.natureAndQuantity ?? '') && (i === 0 || it.natureAndQuantity)) {
      out.push({ level: 'tip', field: `Naturaleza y cantidad${row}`, message: 'Agrega las dimensiones como "39X39X32CM/1" (largo × ancho × alto / piezas): van al FWB como volumen.' })
    }
  })

  const otherTotal = (data.otherCharges ?? []).reduce((s, c) => s + num(c.amount), 0)
  const declared = num(data.totalOtherChargesDueAgent) + num(data.totalOtherChargesDueCarrier)
  if (otherTotal && declared && Math.abs(otherTotal - declared) > 0.01) {
    out.push({ level: 'tip', field: 'Otros cargos', message: `La suma de otros cargos es ${otherTotal.toFixed(2)} y los totales declarados suman ${declared.toFixed(2)}.` })
  }

  if (data.executedOnDate && !/^\d{1,2}[-\s/]?[A-Z]{3}[-\s/]?\d{2,4}$/i.test(data.executedOnDate.trim()) && Number.isNaN(Date.parse(data.executedOnDate))) {
    out.push({ level: 'warn', field: 'Fecha de emisión', message: 'Usa el formato de la guía: "29-JUL-2026".' })
  }

  return out
}
