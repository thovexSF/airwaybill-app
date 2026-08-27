/**
 * IATA Cargo-IMP FWB/17 from a MAWB (ported from B2B FwbCargoImpService).
 * Segments: SMI → AWB → FLT → RTG → SHP/CNE → AGT → CVD → RTD → … → ISU.
 * No EOM line (message ends after ISU / optional REF).
 */

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
  if (!display) return undefined
  const t = String(display).trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(t)) return t
  const paren = t.match(/\(([A-Z]{3})(?:[\/\-][A-Z]{3})*\)/)
  if (paren) return paren[1]
  const bare = t.match(/\b([A-Z]{3})\b/)
  if (bare && t.length <= 24) return bare[1]
  return undefined
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

function splitPartyBlock(
  nameAndAddress?: string,
  name?: string,
  address?: string,
  city?: string,
  country?: string,
  postal?: string,
): { name: string; street: string; place: string; country: string; postCode: string } {
  if (nameAndAddress && String(nameAndAddress).trim()) {
    const lines = String(nameAndAddress)
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    const n = lines[0] || ''
    const rest = lines.slice(1)
    let streetOut = ''
    let placeOut = city || ''
    if (rest.length === 1) {
      streetOut = rest[0]
      placeOut = city || ''
    } else if (rest.length >= 2) {
      streetOut = rest.slice(0, -1).join(' ')
      placeOut = rest[rest.length - 1]
    }
    return {
      name: n,
      street: streetOut || address || '',
      place: placeOut || city || '',
      country: (country || '').toUpperCase().slice(0, 2),
      postCode: postal || '',
    }
  }
  return {
    name: name || '',
    street: address || '',
    place: city || '',
    country: (country || '').toUpperCase().slice(0, 2),
    postCode: postal || '',
  }
}

function formatImpDate(iso?: string): string {
  if (!iso) {
    const d = new Date()
    return `${String(d.getUTCDate()).padStart(2, '0')}${MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`
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

function parseFlights(input: FwbInput): string[] {
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

function agentLines(input: FwbInput): string[] {
  const iata = String(input.agentIataCode || '').trim()
  const m = iata.match(/(\d{2,4})[-\s]?(\d)[-\s]?(\d{4})(?:\/(\d+))?/)
  const cass = m ? m[3] : String(input.agentAccountNumber || '').replace(/\D/g, '').slice(0, 7) || ''
  const account = m?.[4] || ''
  const lines = input.agentNameAndCity
    ? String(input.agentNameAndCity)
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    : ['ISSUING AGENT']
  const name = lineClean(lines[0] || 'ISSUING AGENT', 35)
  const place = lineClean(lines[1] || 'XXX', 17)
  const head = cass ? `AGT//${cass}${account ? `/${account}` : ''}` : 'AGT'
  return [head, `/${name}`, `/${place}`]
}

function partySegment(
  tag: 'SHP' | 'CNE',
  account: string | undefined,
  party: { name: string; street: string; place: string; country: string; postCode: string },
): string[] {
  const lines: string[] = [tag]
  if (account) lines.push(`/${lineClean(account, 14)}`)
  lines.push(`NAM/${lineClean(party.name, 35)}`)
  if (party.street) lines.push(`ADR/${lineClean(party.street, 35)}`)
  const loc = lineClean(party.place, 17)
  lines.push(`LOC/${loc || 'UNKNOWN'}`)
  const country = party.country || ''
  const post = lineClean(party.postCode, 9)
  if (country || post) {
    lines.push(`/${country || 'XX'}/${post || ''}`)
  }
  return lines
}

function wrapNg(text: string, maxLines = 9): string[] {
  const clean = cleanImp(text).replace(/\n/g, ' ')
  if (!clean) return ['/NG/CONSOLIDATED']
  const chunks: string[] = []
  let rest = clean
  while (rest.length && chunks.length < maxLines) {
    chunks.push(`/NG/${rest.slice(0, 20)}`)
    rest = rest.slice(20)
  }
  return chunks
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

  const origin =
    extractAirportCode(input.airportOfDeparture) || extractAirportCode(input.departureDisplay)
  const dest =
    extractAirportCode(input.airportOfDestination) || extractAirportCode(input.destinationDisplay)
  if (!origin) errors.push('Falta aeropuerto de origen (código IATA 3 letras)')
  if (!dest) errors.push('Falta aeropuerto de destino (código IATA 3 letras)')

  const pieces = Number(input.numberOfPieces || input.pieces || 0)
  const weight = Number(input.grossWeight || 0)
  if (!(pieces > 0)) errors.push('Piezas debe ser mayor a 0')
  if (!(weight > 0)) errors.push('Peso bruto debe ser mayor a 0')

  const shipper = splitPartyBlock(
    input.shipperNameAndAddress,
    input.shipperName,
    input.shipperAddress,
    input.shipperCity,
    input.shipperCountry,
    input.shipperPostalCode,
  )
  const consignee = splitPartyBlock(
    input.consigneeNameAndAddress,
    input.consigneeName,
    input.consigneeAddress,
    input.consigneeCity,
    input.consigneeCountry,
    input.consigneePostalCode,
  )
  if (!shipper.name) errors.push('Falta nombre del shipper')
  if (!consignee.name) errors.push('Falta nombre del consignee')

  if (parts && parts.prefix !== '045') {
    warnings.push('Prefix distinto de 045 (LATAM Cargo); eAWB LATAM solo aplica a AWB emitidas por ellos')
  }
  if (!shipper.country || shipper.country.length !== 2) {
    warnings.push('Shipper sin código de país ISO-2; se usará XX en el FWB')
  }
  if (!consignee.country || consignee.country.length !== 2) {
    warnings.push('Consignee sin código de país ISO-2; se usará XX en el FWB')
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
  const origin =
    extractAirportCode(input.airportOfDeparture) || extractAirportCode(input.departureDisplay)!
  const dest =
    extractAirportCode(input.airportOfDestination) || extractAirportCode(input.destinationDisplay)!

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

  const to1 = extractAirportCode(input.routeTo1) || dest
  const byCode = (() => {
    const r = String(input.routeBy1 || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    if (r.length >= 2) return r.slice(0, 2)
    if (parts.prefix === '045') return 'LA'
    return 'XX'
  })()
  lines.push(`RTG/${to1}/${byCode}`)

  const shipper = splitPartyBlock(
    input.shipperNameAndAddress,
    input.shipperName,
    input.shipperAddress,
    input.shipperCity,
    input.shipperCountry,
    input.shipperPostalCode,
  )
  const consignee = splitPartyBlock(
    input.consigneeNameAndAddress,
    input.consigneeName,
    input.consigneeAddress,
    input.consigneeCity,
    input.consigneeCountry,
    input.consigneePostalCode,
  )
  lines.push(...partySegment('SHP', input.shipperAccountNumber, shipper))
  lines.push(...partySegment('CNE', input.consigneeAccountNumber, consignee))
  lines.push(...agentLines(input))

  if (input.handlingInformation) {
    const h = lineClean(input.handlingInformation, 65)
    if (h) lines.push(`SSR/${h}`)
  }

  const currency = cleanImp(String(input.currency || 'USD'), 3) || 'USD'
  const wtVal = ppCc(input.chgsCode, input.weightValuationCharges)
  const dvc = cleanImp(String(input.valueForCarriage || 'NVD'), 12) || 'NVD'
  const dvt = cleanImp(String(input.valueForCustoms || 'NCV'), 12) || 'NCV'
  const ins = cleanImp(String(input.insuranceAmount || 'XXX'), 12) || 'XXX'
  lines.push(`CVD/${currency}/${wtVal}/${dvc}/${dvt}/${ins}`)

  const rateLines = input.rateLines?.length
    ? input.rateLines
    : [
        {
          pieces,
          grossWeight: weight,
          weightUnit: wUnit,
          rateClass: 'Q',
          chargeableWeight: weight,
          rate: 0,
          total: 0,
          natureAndQuantity: input.natureAndQuantityOfGoods || '',
        },
      ]

  rateLines.forEach((rl, idx) => {
    const p = Math.round(Number(rl.pieces) || pieces)
    const gw = Number(rl.grossWeight) || weight
    const wu = String(rl.weightUnit || wUnit).toUpperCase().startsWith('L') ? 'L' : 'K'
    const rc = cleanImp(String(rl.rateClass || 'Q'), 1) || 'Q'
    const cw = Number(rl.chargeableWeight) || gw
    const rate = Number(rl.rate) || 0
    const total = Number(rl.total) || 0
    const n = idx + 1
    let rtd = `RTD/${n}/P${p}/${wu}${formatNum(gw)}/C${rc}/W${formatNum(cw)}`
    if (rate > 0) rtd += `/R${formatNum(rate, 2)}`
    if (total > 0) rtd += `/T${formatNum(total, 2)}`
    lines.push(rtd)
    const nature = rl.natureAndQuantity || input.natureAndQuantityOfGoods || ''
    lines.push(...wrapNg(nature))
    lines.push('/ND//NDA')
  })

  const allOth = (input.otherCharges || []).filter((c) => Number(c.amount) > 0)
  if (allOth.length) {
    const first = allOth[0]
    const code = lineClean(String(first.description || 'OC').replace(/\s+/g, ''), 3).slice(0, 3) || 'OC'
    const amt = formatNum(Number(first.amount), 2)
    const side = wtVal === 'CC' ? 'C' : 'P'
    lines.push(`OTH/${side}/${code}${amt}`)
  }

  const wtCharge =
    Number(input.weightChargePrepaid) ||
    Number(input.weightChargeCollect) ||
    Number(rateLines[0]?.total) ||
    0
  if (wtVal === 'CC') {
    if (wtCharge > 0) lines.push(`CLL/WT${formatNum(wtCharge, 2)}`)
  } else if (wtCharge > 0) {
    lines.push(`PPD/WT${formatNum(wtCharge, 2)}`)
  }

  const sph = new Set((input.sphCodes || []).map((c) => cleanImp(c, 3)).filter(Boolean))
  if (!sph.has('EAP')) sph.add('EAW')
  lines.push(`SPH/${[...sph].join('/')}`)

  if (input.sci) {
    const sci = lineClean(input.sci, 14)
    if (sci) lines.push(`SCI/${sci}`)
  }

  const isuDate = formatImpDate(input.executedOnDate)
  const isuPlace = lineClean(String(input.executedAtPlace || origin), 17) || origin
  const issuer = lineClean(
    String(input.signatureOfIssuingCarrierOrAgent || input.issuedBy || 'ISSUING AGENT'),
    35,
  )
  lines.push(`ISU/${isuDate}/${isuPlace}/${issuer}`)

  if (input.referenceNumber) {
    lines.push(`REF///AGT/${lineClean(String(input.referenceNumber), 14)}`)
  }

  return {
    message: lines.join('\n'),
    errors: [],
    warnings,
    ok: true,
  }
}
