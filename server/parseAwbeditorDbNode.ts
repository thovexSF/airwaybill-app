import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execFileSync } from 'node:child_process'
import Database from 'better-sqlite3'
import { XMLParser } from 'fast-xml-parser'
import type { AwbEditorParseResult } from './importAwbeditorDb'

const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true })

function decode(blob: Buffer | null | undefined): string {
  if (!blob) return ''
  for (const enc of ['utf8', 'latin1'] as BufferEncoding[]) {
    try {
      return blob.toString(enc)
    } catch {
      /* next */
    }
  }
  return blob.toString('latin1')
}

function clean(s: unknown): string {
  if (s == null) return ''
  return String(s).replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
}

function txt(node: Record<string, unknown> | undefined, tag: string): string {
  if (!node) return ''
  const v = node[tag]
  if (v == null) return ''
  if (typeof v === 'object' && v !== null && '#text' in (v as object)) return clean((v as { '#text': string })['#text'])
  return clean(v)
}

function firstLine(s: string): string {
  return clean(s).split('\n')[0]?.trim() || ''
}

function restLines(s: string): string {
  const parts = clean(s).split('\n')
  return parts.length > 1 ? parts.slice(1).join('\n').trim() : ''
}

function num(v: unknown, fallback = 0): number {
  if (v == null || v === '') return fallback
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

function parseDate(s: string): string | null {
  const t = clean(s)
  if (!t) return null
  const dmy = t.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  const iso = t.match(/^(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : null
}

function awbNumber(prefix: string, serial: string, fallback = ''): string {
  const p = clean(prefix)
  const s = clean(serial).replace(/\s+/g, '')
  if (p && s) return `${p}-${s}`
  return s || clean(fallback)
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

function findChild(node: Record<string, unknown>, tag: string): Record<string, unknown> | undefined {
  const v = node[tag]
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
  return undefined
}

function parseAwbXml(root: Record<string, unknown>, dtype: number, meta: Record<string, unknown>) {
  const prefix = txt(root, 'airline-prefix')
  const serial = txt(root, 'awb-serial-number')
  const hawb = txt(root, 'hawb')
  const number = awbNumber(prefix, serial, String(meta.document_number || ''))
  const shipper = txt(root, 'shipper-details') || String(meta.shipper || '')
  const consignee = txt(root, 'consignee-details') || String(meta.consignee || '')

  const flights = asArray(findChild(root, 'requested-flight')?.string ?? root['requested-flight'])
    .map((x) => clean(x))
    .filter(Boolean)
  const routesTo = asArray(root['route-to']).map((x) => clean(x)).filter(Boolean)
  const routesBy = asArray(root['route-by']).map((x) => clean(x)).filter(Boolean)

  const itemsNode = findChild(root, 'items')
  const rateLines = asArray(itemsNode?.['awb-item']).map((it) => {
    const item = it as Record<string, unknown>
    const dimsWrap = findChild(item, 'dimensions')
    const dims = asArray(dimsWrap?.FWBRateDescriptionDimensions).map((d) => {
      const dim = d as Record<string, unknown>
      return {
        pieces: num(txt(dim, 'numbeOfPieces'), 0),
        length: num(txt(dim, 'length')),
        width: num(txt(dim, 'widht')),
        height: num(txt(dim, 'height')),
        unit: txt(dim, 'unitCode') || 'CMT',
        weight: num(txt(dim, 'weight')),
        weightUnit: txt(dim, 'weightCode') || 'K',
      }
    })
    return {
      pieces: num(txt(item, 'pieces'), 0),
      grossWeight: num(txt(item, 'gross-weight'), 0),
      weightUnit: txt(item, 'scale') || 'K',
      rateClass: txt(item, 'rate-class'),
      itemNo: txt(item, 'item-number'),
      chargeableWeight: num(txt(item, 'chargeable-weight'), 0),
      rate: num(txt(item, 'rate-charge'), 0),
      total: num(txt(item, 'total'), 0),
      natureAndQuantity: txt(item, 'nature'),
      dimensions: dims,
    }
  })

  const ocWrap = findChild(root, 'other-charges')
  const otherCharges = asArray(ocWrap?.['awb-other-charges']).map((oc) => {
    const row = oc as Record<string, unknown>
    const due = (txt(row, 'due') || txt(row, 'code')).toUpperCase()
    return {
      description: clean(txt(row, 'code') || txt(row, 'due')),
      amount: num(txt(row, 'amount') || txt(row, 'charges'), 0),
      entitlement: due.includes('CARRIER') ? 'DUE CARRIER' : 'DUE AGENT',
    }
  })

  const wtPay = (txt(root, 'weight-payment-type') || 'PREPAID').toUpperCase()
  const otherPay = (txt(root, 'other-charges-payment-type') || 'PREPAID').toUpperCase()
  const issue = parseDate(txt(root, 'carrier-date')) || (meta.document_date as string | null)

  const payload: Record<string, unknown> = {
    externalId: meta.id,
    awbNumber: dtype === 101 ? number : undefined,
    hawbNumber: dtype === 102 ? hawb || meta.document_number : undefined,
    masterAwbNumber: dtype === 102 ? number : undefined,
    awbPrefix: prefix,
    awbSerial: serial,
    issueDate: issue,
    referenceNumber: txt(root, 'reference-number') || meta.reference_number || '',
    issuer: firstLine(txt(root, 'issued-by-details')),
    issuedBy: txt(root, 'issued-by-details'),
    shipperName: firstLine(shipper),
    shipperAddress: restLines(shipper),
    consigneeName: firstLine(consignee),
    consigneeAddress: restLines(consignee),
    agentNameAndCity: txt(root, 'agent-details'),
    agentIataCode: txt(root, 'agent-iata-cargo-numeric-code'),
    airportOfDeparture: txt(root, 'airport-city-code-departure') || txt(root, 'airport-departure') || meta.origin || '',
    airportOfDestination: txt(root, 'airport-destination') || meta.destination || '',
    flightNumber: flights[0] || '',
    requestedFlightsDates: flights.join(' / '),
    routeTo1: routesTo[0] || '',
    routeBy1: routesBy[0] || '',
    currency: txt(root, 'currency') || 'USD',
    weightValuationCharges: wtPay.includes('COLLECT') ? 'COLL' : 'PPD',
    otherChargesCode: otherPay.includes('COLLECT') ? 'COLL' : 'PPD',
    valueForCarriage: txt(root, 'value-carrier') || 'NVD',
    valueForCustoms: txt(root, 'value-customs') || 'NCV',
    insuranceAmount: txt(root, 'insurance') || 'XXX',
    handlingInformation: txt(root, 'handling-information'),
    sci: txt(root, 'sci'),
    rateLines,
    numberOfPieces: num(txt(root, 'item-pieces'), 0),
    grossWeight: num(txt(root, 'item-weight'), 0),
    weightUnit: txt(root, 'item-weight-scale') || 'K',
    totalCharge: num(txt(root, 'item-total'), 0),
    natureAndQuantityOfGoods: rateLines[0]?.natureAndQuantity || '',
    otherCharges,
    totalPrepaid: num(txt(root, 'total-prepaid'), 0),
    totalCollect: num(txt(root, 'total-collect'), 0),
    executedOnDate: issue,
    executedAtPlace: txt(root, 'carrier-place'),
    signatureOfShipperOrAgent: txt(root, 'shipper-signature'),
    signatureOfIssuingCarrierOrAgent: txt(root, 'carrier-signature'),
    notes: txt(root, 'notes'),
    status: 'completed',
  }
  if (rateLines[0]) {
    payload.chargeableWeight = rateLines[0].chargeableWeight
    payload.rateCharge = rateLines[0].rate
    payload.rateClass = rateLines[0].rateClass
    payload.commodityItemNumber = rateLines[0].itemNo
  }
  return payload
}

function parseDgdXml(root: Record<string, unknown>, meta: Record<string, unknown>) {
  const shipper = txt(root, 'shipper') || String(meta.shipper || '')
  const consignee = txt(root, 'consignee') || String(meta.consignee || '')
  const awb = awbNumber(txt(root, 'awbAirlinePrefix'), txt(root, 'awbSerialNumber'), String(meta.document_number || ''))
  const itemsWrap = findChild(root, 'items')
  const dangerous = asArray(itemsWrap?.items).map((it) => {
    const row = it as Record<string, unknown>
    return {
      unNumber: txt(row, 'un'),
      properShippingName: txt(row, 'name'),
      class: txt(row, 'division'),
      packingGroup: txt(row, 'packingGroup'),
      quantity: txt(row, 'quantity'),
      packingInstruction: txt(row, 'packingInst'),
      authorization: txt(row, 'authorization'),
    }
  })

  return {
    externalId: meta.id,
    dgdNumber: meta.document_number || `DGD-AE-${meta.id}`,
    awbNumber: awb,
    shipperName: firstLine(shipper),
    shipperAddress: restLines(shipper),
    consigneeName: firstLine(consignee),
    consigneeAddress: restLines(consignee),
    airportOfDeparture: txt(root, 'airportOfDeparture') || meta.origin || '',
    airportOfDestination: txt(root, 'airportOfDestination') || meta.destination || '',
    dangerousGoods: dangerous,
    additionalInformation: txt(root, 'handlingInformation'),
    shipperSignature: txt(root, 'nameSignatory'),
    shipperSignatureDate: parseDate(txt(root, 'place')),
    status: 'completed',
  }
}

function parseDbFile(dbPath: string): AwbEditorParseResult {
  const db = new Database(dbPath, { readonly: true })
  try {
    const rows = db
      .prepare(
        `SELECT id, document_type, document_number, master_document_number, reference_number,
                shipper, consignee, origin, destination, document_date, date_created, document_data
         FROM document WHERE status = 1 ORDER BY document_type, id`,
      )
      .all() as Array<Record<string, unknown>>

    const result: AwbEditorParseResult = { mawb: [], hawb: [], dgd: [], errors: [] }
    for (const row of rows) {
      const meta = {
        id: row.id,
        document_number: row.document_number,
        master_document_number: row.master_document_number,
        reference_number: row.reference_number,
        shipper: row.shipper,
        consignee: row.consignee,
        origin: row.origin,
        destination: row.destination,
        document_date: row.document_date ? String(row.document_date).slice(0, 10) : String(row.date_created || '').slice(0, 10) || null,
      }
      const xml = decode(row.document_data as Buffer)
      if (!xml.trim()) {
        result.errors.push({ id: Number(row.id), type: Number(row.document_type), error: 'empty xml' })
        continue
      }
      let parsed: Record<string, unknown>
      try {
        parsed = xmlParser.parse(xml) as Record<string, unknown>
      } catch (e: any) {
        result.errors.push({ id: Number(row.id), type: Number(row.document_type), error: e?.message || 'xml parse error' })
        continue
      }
      const root = (parsed.awb || parsed.root || parsed) as Record<string, unknown>
      const dtype = Number(row.document_type)
      if (dtype === 101) result.mawb.push(parseAwbXml(root, 101, meta))
      else if (dtype === 102) result.hawb.push(parseAwbXml(root, 102, meta))
      else if (dtype === 401) result.dgd.push(parseDgdXml(root, meta))
    }
    return result
  } finally {
    db.close()
  }
}

export function parseAwbeditorDbFile(dbPath: string): AwbEditorParseResult {
  return parseDbFile(dbPath)
}

/** Parse awbeditor.db buffer in-process (no python3 required). */
export function parseAwbeditorDbBufferNode(buffer: Buffer, originalName = 'awbeditor.db'): AwbEditorParseResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awb-db-node-'))
  const dbPath = path.join(tmpDir, 'awbeditor.db')
  try {
    fs.writeFileSync(dbPath, buffer)
    return parseDbFile(dbPath)
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}
