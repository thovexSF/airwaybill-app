/**
 * IATA Cargo-IMP FWB/17 from a MAWB (ported from B2B FwbCargoImpService).
 * Segments: SMI → AWB → FLT → RTG → SHP/CNE → AGT → CVD → RTD → … → ISU.
 * No EOM line (message ends after ISU / optional REF).
 */

import { parseParty, parseAgentCode, otherChargeCode, type FwbParty } from './fwbParties'

export type EAwbStatus = 'none' | 'generated' | 'invalid' | 'sent' | 'accepted' | 'rejected'

export interface FwbRateLine {
  pieces?: number
  grossWeight?: number
  weightUnit?: string
  rateClass?: string
  itemNo?: string
  chargeableWeight?: number
  rate?: number
  total?: number
  natureAndQuantity?: string
}

export interface FwbOtherCharge {
  description?: string
  amount?: number
  entitlement?: string
}

export interface FwbInput {
  awbPrefix?: string
  awbSerial?: string
  awbNumber?: string
  airportOfDeparture?: string
  airportOfDestination?: string
  departureDisplay?: string
  destinationDisplay?: string
  numberOfPieces?: number
  pieces?: number
  grossWeight?: number
  weightUnit?: string
  flightNumber?: string
  flightDate?: string
  flightNumber2?: string
  flightDate2?: string
  requestedFlightsDates?: string
  routeTo1?: string
  routeBy1?: string
  routeTo2?: string
  routeBy2?: string
  routeTo3?: string
  routeBy3?: string
  shipperAccountNumber?: string
  shipperName?: string
  shipperAddress?: string
  shipperCity?: string
  shipperCountry?: string
  shipperPostalCode?: string
  shipperNameAndAddress?: string
  consigneeAccountNumber?: string
  consigneeName?: string
  consigneeAddress?: string
  consigneeCity?: string
  consigneeCountry?: string
  consigneePostalCode?: string
  consigneeNameAndAddress?: string
  agentNameAndCity?: string
  agentIataCode?: string
  agentAccountNumber?: string
  currency?: string
  chgsCode?: string
  weightValuationCharges?: string
  otherChargesCode?: string
  valueForCarriage?: string
  valueForCustoms?: string
  insuranceAmount?: string
  handlingInformation?: string
  sci?: string
  sphCodes?: string[]
  rateLines?: FwbRateLine[]
  otherCharges?: FwbOtherCharge[]
  natureAndQuantityOfGoods?: string
  weightChargePrepaid?: number
  weightChargeCollect?: number
  totalOtherDueAgentPrepaid?: number
  totalOtherDueCarrierPrepaid?: number
  totalOtherDueAgentCollect?: number
  totalOtherDueCarrierCollect?: number
  totalPrepaid?: number
  totalCollect?: number
  executedOnDate?: string
  executedAtPlace?: string
  signatureOfIssuingCarrierOrAgent?: string
  issuedBy?: string
  referenceNumber?: string
}

export interface FwbBuildResult {
  message: string
  errors: string[]
  warnings: string[]
  ok: boolean
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function cleanImp(s: string, max?: number): string {
  let out = String(s || '')
    .toUpperCase()
    .replace(/\r\n/g, '\n')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (max && out.length > max) out = out.slice(0, max)
  return out
}

function lineClean(s: string, max: number): string {
  return cleanImp(s.replace(/\n/g, ' '), max)
}

export function validateAwbCheckDigitFwb(awbNumber: string): boolean {
  const cleaned = awbNumber.replace(/\s/g, '')
  const m = cleaned.match(/^(\d{3})-?(\d{8})$/)
  if (!m) return false
  const serial7 = parseInt(m[2].slice(0, 7), 10)
  const check = parseInt(m[2].slice(7), 10)
  return serial7 % 7 === check
}

export function extractAirportCode(display?: string): string | undefined {
  return airportCodes(display)[0]
}

/** IATA codes a display carries: "MDZ", or the "(SCL/MDZ)" an agent writes after the airport name. */
function airportCodes(display?: string): string[] {
  const t = String(display ?? '').trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(t)) return [t]
  const paren = /\(([A-Z]{3}(?:\s*[\/\-]\s*[A-Z]{3})*)\)/.exec(t)
  return paren ? paren[1].split(/\s*[\/\-]\s*/) : []
}

export function originOf(input: FwbInput): string | undefined {
  return extractAirportCode(input.airportOfDeparture) || extractAirportCode(input.departureDisplay)
}

/** Destination as typed, else the second code of "(SCL/MDZ)", else the last routed airport. */
export function destinationOf(input: FwbInput): string | undefined {
  const origin = originOf(input)
  const direct = extractAirportCode(input.airportOfDestination) || extractAirportCode(input.destinationDisplay)
  if (direct) return direct
  const pair = [...airportCodes(input.airportOfDeparture), ...airportCodes(input.departureDisplay)].filter(c => c !== origin)
  if (pair.length) return pair[pair.length - 1]
  const routed = [input.routeTo3, input.routeTo2, input.routeTo1].map(r => extractAirportCode(r)).find(c => c && c !== origin)
  return routed
}

/** Airlines usually typed with their ICAO designator on the paper form. */
const ICAO_TO_IATA: Record<string, string> = {
  LAN: 'LA', TAM: 'JJ', LPE: 'LP', LNE: 'XL', ARG: 'AR', AAL: 'AA', DAL: 'DL', UAL: 'UA', IBE: 'IB',
  KLM: 'KL', AFR: 'AF', DLH: 'LH', AVA: 'AV', CMP: 'CM', SKU: 'H2', JAT: 'JA', AMX: 'AM', BAW: 'BA',
}

function carrierCode(raw: string | undefined, prefix: string): string {
  const r = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (r.length === 2) return r
  if (ICAO_TO_IATA[r]) return ICAO_TO_IATA[r]
  return prefix === '045' ? 'LA' : r.slice(0, 2) || 'XX'
}

function parseAwbParts(input: FwbInput): { prefix: string; serial: string; number: string } | null {
  let prefix = String(input.awbPrefix || '').replace(/\D/g, '').slice(0, 3)
  let serial = String(input.awbSerial || '').replace(/\D/g, '')
  const raw = String(input.awbNumber || '').replace(/\s/g, '')
  if ((!prefix || !serial) && raw) {
    const m = raw.match(/^(\d{3})-?(\d{8})$/)
    if (m) {
      prefix = m[1]
      serial = m[2]
    }
  }
  if (prefix.length !== 3 || serial.length !== 8) return null
  return { prefix, serial, number: `${prefix}-${serial}` }
}

function partyOf(block: string | undefined, name?: string, address?: string, city?: string, country?: string, postal?: string): FwbParty {
  const typed = (country || '').toUpperCase().slice(0, 2)
  if (block && block.trim()) {
    const p = parseParty(block, typed)
    return { ...p, country: typed || p.country, postCode: postal || p.postCode, place: p.place || city || '' }
  }
  return { name: name || '', street: address || '', place: city || '', country: typed, postCode: postal || '', phone: '', taxId: '' }
}

function formatImpDate(iso?: string): string {
  if (!iso) {
    const d = new Date()
    return `${String(d.getUTCDate()).padStart(2, '0')}${MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`
  }
  const typed = /^(\d{1,2})[-\s/]?([A-Z]{3})[-\s/]?(\d{2,4})$/i.exec(iso.trim())
  if (typed && MONTHS.includes(typed[2].toUpperCase())) {
    return `${typed[1].padStart(2, '0')}${typed[2].toUpperCase()}${typed[3].slice(-2)}`
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return formatImpDate()
  return `${String(d.getUTCDate()).padStart(2, '0')}${MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`
}

function flightToken(flight?: string, date?: string): string | null {
  const f = cleanImp(String(flight || ''), 12)
  if (!f) return null
  const m = f.match(/^([A-Z0-9]{2})\s*(\d{1,4})(?:\/(\d{1,2})[-./](\d{1,2}))?/i)
  if (m) {
    const day = m[3] || (date ? String(new Date(date).getUTCDate()).padStart(2, '0') : '')
    const body = `${m[1].toUpperCase()}${m[2]}`
    return day ? `${body}/${day}` : body
  }
  if (date) {
    const day = String(new Date(date).getUTCDate()).padStart(2, '0')
    return `${f}/${day}`
  }
  return f
}

export function parseFlights(input: FwbInput): string[] {
  const out: string[] = []
  const a = flightToken(input.flightNumber, input.flightDate)
  const b = flightToken(input.flightNumber2, input.flightDate2)
  if (a) out.push(a)
  if (b && b !== a) out.push(b)
  if (!out.length && input.requestedFlightsDates) {
    for (const part of String(input.requestedFlightsDates).split(/\s+/)) {
      const t = flightToken(part)
      if (t && !out.includes(t)) out.push(t)
    }
  }
  return out.slice(0, 2)
}

function ppCc(code?: string, weightVal?: string): string {
  const c = String(code || weightVal || 'PP').toUpperCase()
  if (c.startsWith('CC') || c === 'COLL' || c === 'C') return 'CC'
  return 'PP'
}

function formatNum(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return '0'
  const fixed = n.toFixed(decimals)
  return fixed.replace(/\.0$/, '').replace(/(\.\d)0$/, '$1')
}

/** A free-text value split into lines of `max`, breaking between words when it can. */
function wrapWords(text: string, max: number, maxLines: number): string[] {
  const out: string[] = []
  let rest = cleanImp(text).replace(/\n/g, ' ')
  while (rest && out.length < maxLines) {
    if (rest.length <= max) { out.push(rest); break }
    const cut = rest.lastIndexOf(' ', max)
    const at = cut > max * 0.5 ? cut : max
    out.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  return out
}

function agentLines(input: FwbInput): string[] {
  const { iata, cass } = parseAgentCode(input.agentIataCode)
  const party = parseParty(input.agentNameAndCity || 'ISSUING AGENT')
  const account = lineClean(input.agentAccountNumber || '', 14)
  return [
    `AGT/${account}/${iata}${cass ? `/${cass}` : ''}`,
    `/${lineClean(party.name || 'ISSUING AGENT', 35)}`,
    `/${lineClean(party.place || input.executedAtPlace || 'XXX', 17)}`,
  ]
}

function partySegment(tag: 'SHP' | 'CNE', account: string | undefined, party: FwbParty, fallbackPlace: string): string[] {
  const acct = lineClean(account || '', 14)
  const lines: string[] = [acct ? `${tag}/${acct}` : tag]
  const [name, name2] = wrapWords(party.name, 35, 2)
  lines.push(`NAM/${name || 'UNKNOWN'}`)
  if (name2) lines.push(`/${name2}`)
  const [adr, adr2] = wrapWords(party.street, 35, 2)
  lines.push(`ADR/${adr || 'UNKNOWN'}`)
  if (adr2) lines.push(`/${adr2}`)
  lines.push(`LOC/${lineClean(party.place || fallbackPlace, 17) || 'UNKNOWN'}`)
  const contact = party.phone ? `/TE/${party.phone.replace(/\D/g, '').slice(0, 25)}` : ''
  lines.push(`/${party.country || 'XX'}/${lineClean(party.postCode, 9).replace(/\s/g, '')}${contact}`)
  return lines
}

const DIMS = /(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)\s*(CM|IN)?\s*\/\s*(\d+)/gi

/** Goods text without the "39X39X32CM/1" lines, which go as /ND dimensions instead. */
function goodsAndDims(text: string): { goods: string; dims: { l: number; w: number; h: number; unit: string; pcs: number }[] } {
  const dims: { l: number; w: number; h: number; unit: string; pcs: number }[] = []
  const num = (v: string) => Math.round(Number(v.replace(',', '.')))
  const goods = String(text || '').replace(DIMS, (_m, l, w, h, unit, pcs) => {
    dims.push({ l: num(l), w: num(w), h: num(h), unit: (unit || 'CM').toUpperCase() === 'IN' ? 'INH' : 'CMT', pcs: Number(pcs) })
    return ' '
  }).replace(/\b\d+(?:[.,]\d+)?\s*(?:KG|K)\b/gi, ' ')
  return { goods: goods.replace(/\s{2,}/g, ' ').trim(), dims }
}

export function normalizeFwbInput(raw: Record<string, unknown> | FwbInput): FwbInput {
  const r = raw as Record<string, any>
  const fp = r.formPayload && typeof r.formPayload === 'object' ? r.formPayload : {}
  const src = { ...fp, ...r }
  const rateLines = src.rateLines || src.rateRows || src.rateItems
  return {
    ...src,
    numberOfPieces: Number(src.numberOfPieces ?? src.pieces ?? rateLines?.[0]?.pieces ?? 0) || 0,
    grossWeight: Number(src.grossWeight ?? rateLines?.[0]?.grossWeight ?? 0) || 0,
    weightUnit: src.weightUnit || rateLines?.[0]?.weightUnit || 'K',
    natureAndQuantityOfGoods:
      src.natureAndQuantityOfGoods || src.natureAndQuantity || rateLines?.[0]?.natureAndQuantity || '',
    rateLines: Array.isArray(rateLines)
      ? rateLines.map((row: any) => ({
          pieces: Number(row.pieces) || 0,
          grossWeight: Number(row.grossWeight) || 0,
          weightUnit: row.weightUnit || 'K',
          rateClass: row.rateClass || '',
          itemNo: row.itemNo || row.commodityItemNo || '',
          chargeableWeight: Number(row.chargeableWeight) || 0,
          rate: Number(row.rate ?? row.rateCharge) || 0,
          total: Number(row.total ?? row.charge) || 0,
          natureAndQuantity: row.natureAndQuantity || '',
        }))
      : [],
    otherCharges: Array.isArray(src.otherCharges) ? src.otherCharges : [],
    sphCodes: Array.isArray(src.sphCodes) ? src.sphCodes : [],
  }
}

export function validateFwbInput(input: FwbInput): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const parts = parseAwbParts(input)
  if (!parts) {
    errors.push('Número AWB inválido (formato 000-12345675)')
  } else if (!validateAwbCheckDigitFwb(parts.number)) {
    errors.push(`Check digit IATA inválido para ${parts.number}`)
  }

  const origin = originOf(input)
  const dest = destinationOf(input)
  if (!origin) errors.push('Falta aeropuerto de origen (código IATA 3 letras)')
  if (!dest) errors.push('Falta aeropuerto de destino (código IATA 3 letras)')

  const pieces = Number(input.numberOfPieces || input.pieces || 0)
  const weight = Number(input.grossWeight || 0)
  if (!(pieces > 0)) errors.push('Piezas debe ser mayor a 0')
  if (!(weight > 0)) errors.push('Peso bruto debe ser mayor a 0')

  const shipper = partyOf(input.shipperNameAndAddress, input.shipperName, input.shipperAddress, input.shipperCity, input.shipperCountry, input.shipperPostalCode)
  const consignee = partyOf(input.consigneeNameAndAddress, input.consigneeName, input.consigneeAddress, input.consigneeCity, input.consigneeCountry, input.consigneePostalCode)
  if (!shipper.name) errors.push('Falta nombre del shipper')
  if (!consignee.name) errors.push('Falta nombre del consignee')

  if (parts && parts.prefix !== '045') {
    warnings.push('Prefix distinto de 045 (LATAM Cargo); eAWB LATAM solo aplica a AWB emitidas por ellos')
  }
  if (!shipper.country || shipper.country.length !== 2) {
    warnings.push('No se reconoce el país del shipper: agrégalo en su dirección (p. ej. "SANTIAGO - CHILE")')
  }
  if (!consignee.country || consignee.country.length !== 2) {
    warnings.push('No se reconoce el país del consignee: agrégalo en su dirección')
  }
  if (!parseFlights(input).length) {
    warnings.push('Sin vuelo solicitado (FLT); LATAM puede rechazar en calidad')
  }

  return { errors, warnings }
}

export function buildFwb17(raw: FwbInput | Record<string, unknown>): FwbBuildResult {
  const input = normalizeFwbInput(raw as FwbInput)
  const { errors, warnings } = validateFwbInput(input)
  if (errors.length) {
    return { message: '', errors, warnings, ok: false }
  }

  const parts = parseAwbParts(input)!
  const origin = originOf(input)!
  const dest = destinationOf(input)!

  const pieces = Math.round(Number(input.numberOfPieces || input.pieces || 0))
  const weight = Number(input.grossWeight || 0)
  const wUnit = String(input.weightUnit || 'K').toUpperCase().startsWith('L') ? 'L' : 'K'

  const lines: string[] = []
  lines.push('FWB/17')
  lines.push(`${parts.number}${origin}${dest}/T${pieces}${wUnit}${formatNum(weight)}`)

  const flights = parseFlights(input)
  if (flights.length) {
    lines.push(`FLT/${flights.join('/')}`)
  }

  // RTG: each routed airport with its carrier, ending at the destination.
  const hops: [string, string][] = []
  for (const [to, by] of [[input.routeTo1, input.routeBy1], [input.routeTo2, input.routeBy2], [input.routeTo3, input.routeBy3]]) {
    const code = extractAirportCode(to)
    if (code && code !== origin && !hops.some(h => h[0] === code)) hops.push([code, carrierCode(by, parts.prefix)])
  }
  if (!hops.length || hops[hops.length - 1][0] !== dest) {
    hops.push([dest, hops.length ? hops[hops.length - 1][1] : carrierCode(input.routeBy1, parts.prefix)])
  }
  lines.push(`RTG/${hops.map(([a, c]) => `${a}${c}`).join('/')}`)

  const shipper = partyOf(input.shipperNameAndAddress, input.shipperName, input.shipperAddress, input.shipperCity, input.shipperCountry, input.shipperPostalCode)
  const consignee = partyOf(input.consigneeNameAndAddress, input.consigneeName, input.consigneeAddress, input.consigneeCity, input.consigneeCountry, input.consigneePostalCode)
  lines.push(...partySegment('SHP', input.shipperAccountNumber, shipper, origin))
  lines.push(...partySegment('CNE', input.consigneeAccountNumber, consignee, dest))
  lines.push(...agentLines(input))

  if (input.handlingInformation) {
    const ssr = wrapWords(input.handlingInformation, 65, 3)
    ssr.forEach((l, k) => lines.push(k === 0 ? `SSR/${l}` : `/${l}`))
  }

  const currency = cleanImp(String(input.currency || 'USD'), 3) || 'USD'
  const wtVal = ppCc(input.chgsCode, input.weightValuationCharges)
  const othPc = ppCc(input.otherChargesCode, input.weightValuationCharges)
  const dvc = cleanImp(String(input.valueForCarriage || 'NVD'), 12) || 'NVD'
  const dvt = cleanImp(String(input.valueForCustoms || 'NCV'), 12) || 'NCV'
  const insRaw = cleanImp(String(input.insuranceAmount || ''), 11)
  // No insurance is XXX in Cargo-IMP; agents type NIL on paper.
  const ins = !insRaw || /^(NIL|NONE|N\/A|0)$/.test(insRaw) ? 'XXX' : insRaw
  lines.push(`CVD/${currency}//${wtVal[0]}${othPc[0]}/${dvc}/${dvt}/${ins}`)

  const rateLines = input.rateLines?.length
    ? input.rateLines
    : [{ pieces, grossWeight: weight, weightUnit: wUnit, rateClass: 'Q', chargeableWeight: weight, rate: 0, total: 0, natureAndQuantity: input.natureAndQuantityOfGoods || '' }]

  rateLines.forEach((rl, idx) => {
    const p = Math.round(Number(rl.pieces) || pieces)
    const gw = Number(rl.grossWeight) || weight
    const wu = String(rl.weightUnit || wUnit).toUpperCase().startsWith('L') ? 'L' : 'K'
    const rc = cleanImp(String(rl.rateClass || 'Q'), 1) || 'Q'
    const cw = Number(rl.chargeableWeight) || gw
    const rate = Number(rl.rate) || 0
    const total = Number(rl.total) || 0
    let rtd = `RTD/${idx + 1}/P${p}/${wu}${formatNum(gw)}/C${rc}/W${formatNum(cw)}`
    if (rate > 0) rtd += `/R${formatNum(rate, 2)}`
    if (total > 0) rtd += `/T${formatNum(total, 2)}`
    lines.push(rtd)
    const { goods, dims } = goodsAndDims(rl.natureAndQuantity || input.natureAndQuantityOfGoods || '')
    const ng = wrapWords(goods || 'CONSOLIDATED', 20, 1)[0]
    lines.push(`/NG/${ng}`)
    if (dims.length) {
      for (const d of dims) lines.push(`/ND//${d.unit}${d.l}-${d.w}-${d.h}/${d.pcs}`)
      const m3 = dims.reduce((sum, d) => sum + (d.unit === 'CMT' ? d.l * d.w * d.h / 1e6 : d.l * d.w * d.h * 1.6387e-5) * d.pcs, 0)
      if (m3 > 0) lines.push(`/NV/MC${Math.max(m3, 0.01).toFixed(2)}`)
    } else {
      lines.push('/ND//NDA')
    }
  })

  // OTH: every charge as <code><A|C><amount>, wrapped under the same P/C indicator.
  const oth = (input.otherCharges || []).filter((c) => Number(c.amount) > 0).map((c) => {
    const carrier = String(c.entitlement || '').toUpperCase().includes('CARRIER')
    return `${otherChargeCode(c.description, carrier)}${carrier ? 'C' : 'A'}${formatNum(Number(c.amount), 2)}`
  })
  const othLines: string[] = []
  for (const item of oth) {
    const last = othLines[othLines.length - 1]
    if (last && last.length + item.length <= 65) othLines[othLines.length - 1] = last + item
    else othLines.push(`/${othPc[0]}/${item}`)
  }
  othLines.forEach((l, k) => lines.push(k === 0 ? `OTH${l}` : l))

  const sumBy = (carrier: boolean) => (input.otherCharges || [])
    .filter((c) => Number(c.amount) > 0 && String(c.entitlement || '').toUpperCase().includes('CARRIER') === carrier)
    .reduce((s, c) => s + Number(c.amount), 0)
  const dueAgent = sumBy(false)
  const dueCarrier = sumBy(true)
  const wtCharge = Number(input.weightChargePrepaid) || Number(input.weightChargeCollect) ||
    rateLines.reduce((s, rl) => s + (Number(rl.total) || 0), 0)
  const summary = (tag: 'PPD' | 'CLL', wt: number, oa: number, oc: number) => {
    const first = wt > 0 ? [`${tag}/WT${formatNum(wt, 2)}`] : []
    const totals = [oa > 0 ? `OA${formatNum(oa, 2)}` : '', oc > 0 ? `OC${formatNum(oc, 2)}` : '', `CT${formatNum(wt + oa + oc, 2)}`].filter(Boolean)
    return first.length ? [first[0], `/${totals.join('/')}`] : [`${tag}/${totals.join('/')}`]
  }
  const wtCol = wtVal === 'CC', othCol = othPc === 'CC'
  const ppd = summary('PPD', wtCol ? 0 : wtCharge, othCol ? 0 : dueAgent, othCol ? 0 : dueCarrier)
  const cll = summary('CLL', wtCol ? wtCharge : 0, othCol ? dueAgent : 0, othCol ? dueCarrier : 0)
  if (!wtCol || !othCol) lines.push(...ppd)
  if (wtCol || othCol) lines.push(...cll)

  const isuDate = formatImpDate(input.executedOnDate)
  const isuPlace = lineClean(String(input.executedAtPlace || origin), 17) || origin
  const issuer = lineClean(String(input.signatureOfIssuingCarrierOrAgent || input.issuedBy || 'ISSUING AGENT'), 35)
  lines.push(`ISU/${isuDate}/${isuPlace}/${issuer}`)

  if (input.referenceNumber) {
    lines.push(`REF///AGT/${lineClean(String(input.referenceNumber), 14)}`)
  }

  const sph = new Set((input.sphCodes || []).map((c) => cleanImp(c, 3)).filter(Boolean))
  if (!sph.has('EAP')) sph.add('EAW')
  lines.push(`SPH/${[...sph].join('/')}`)

  if (input.sci) {
    const sci = lineClean(input.sci, 2)
    if (sci) lines.push(`SCI/${sci}`)
  }

  // OCI: tax ids for customs (Argentina asks the consignee's CUIT).
  const oci = ([['SHP', shipper], ['CNE', consignee]] as const)
    .filter(([, p]) => p.taxId && p.country)
    .map(([role, p]) => `/${p.country}/${role}/T/${lineClean(p.taxId.replace(/[\s.]/g, ''), 35)}`)
  oci.forEach((l, k) => lines.push(k === 0 ? `OCI${l}` : l))

  return {
    message: lines.join('\n'),
    errors: [],
    warnings,
    ok: true,
  }
}
