import * as XLSX from 'xlsx'
import { AWBData, defaultAWBData, RateItem } from '../types/awb'
import { saveAWB } from './awbService'

export interface ImportRow {
  date: string
  awbNumber: string
  house: string
  reference: string
  issuer: string
  shipper: string
  consignee: string
  departure: string
  destination: string
  flights: string
  pieces: string
  grossWeight: string
  prepaid: string
  collect: string
  nature: string
  notes: string
}

export interface ImportPreviewRow extends ImportRow {
  awbPrefix: string
  awbSerial: string
  depIata: string
  destIata: string
  flightNo: string
  flightDt: string
  isHawb: boolean
}

function parseAwbNumber(awb: string): { prefix: string; serial: string } {
  const parts = (awb || '').split('-')
  if (parts.length === 2) return { prefix: parts[0].trim(), serial: parts[1].trim() }
  return { prefix: '', serial: awb || '' }
}

function extractIata(departure: string): { depIata: string; destIata: string } {
  // e.g. "A. MERINO . B (SCL/JFK)" or "A.MERINO.B (SCL-LAX)"
  const match = departure.match(/\(([A-Z]{3})[/-]([A-Z]{3})/)
  if (match) return { depIata: match[1], destIata: match[2] }
  const single = departure.match(/\(([A-Z]{3})\)/)
  if (single) return { depIata: single[1], destIata: '' }
  return { depIata: '', destIata: '' }
}

function parseFlights(flights: string): { flightNo: string; flightDt: string } {
  // e.g. "LA532/13-01" or "UC1501/07-02-26 XX8884/09-02-26"
  const first = (flights || '').split(' ')[0]
  const parts = first.split('/')
  if (parts.length === 2) return { flightNo: parts[0].trim(), flightDt: parts[1].trim() }
  return { flightNo: flights || '', flightDt: '' }
}

function formatDate(val: any): string {
  if (!val) return ''
  if (val instanceof Date) {
    return val.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  }
  return String(val)
}

export function parseExcelFile(file: File): Promise<ImportPreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' })

        // Skip header row (row 0)
        const result: ImportPreviewRow[] = rows.slice(1).filter(r => r[1]).map(r => {
          const awbNumber = String(r[1] || '').trim()
          const house     = String(r[2] || '').trim()
          const departure = String(r[7] || '').trim()
          const flights   = String(r[9] || '').trim()
          const { prefix, serial } = parseAwbNumber(awbNumber)
          const { depIata, destIata } = extractIata(departure)
          const { flightNo, flightDt } = parseFlights(flights)

          return {
            date:        formatDate(r[0]),
            awbNumber,
            house,
            reference:   String(r[3] || '').trim(),
            issuer:      String(r[4] || '').trim(),
            shipper:     String(r[5] || '').trim(),
            consignee:   String(r[6] || '').trim(),
            departure,
            destination: String(r[8] || '').trim(),
            flights,
            pieces:      String(r[10] || '').trim(),
            grossWeight: String(r[11] || '').trim(),
            prepaid:     String(r[12] || '').trim(),
            collect:     String(r[13] || '').trim(),
            nature:      String(r[14] || '').trim(),
            notes:       String(r[15] || '').trim(),
            awbPrefix: prefix,
            awbSerial: serial,
            depIata,
            destIata,
            flightNo,
            flightDt,
            isHawb: !!house,
          }
        })
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function rowToAWBData(row: ImportPreviewRow): AWBData {
  const rateItem: RateItem = {
    id: '1',
    pieces: row.pieces,
    grossWeight: row.grossWeight,
    weightUnit: 'K',
    rateClass: '',
    commodityItemNo: '',
    chargeableWeight: row.grossWeight,
    rateCharge: '',
    total: row.prepaid || '',
    natureAndQuantity: row.nature,
  }

  return {
    ...defaultAWBData,
    docType: row.isHawb ? 'hawb' : 'awb',
    awbPrefix: row.awbPrefix,
    awbSerial: row.awbSerial,
    hawbNumber: row.house || '',
    mawbReference: row.isHawb ? row.awbNumber : '',
    carrierName: row.issuer,
    carrierAddress: '',
    shipperNameAndAddress: row.shipper,
    consigneeNameAndAddress: row.consignee,
    referenceNumber: row.reference,
    airportOfDeparture: row.depIata,
    airportOfDestination: row.destIata || row.destination,
    flightNumber: row.flightNo,
    flightDate: row.flightDt,
    handlingInformation: row.notes,
    rateItems: [rateItem],
    isDraft: false,
  }
}

export async function importRows(
  rows: ImportPreviewRow[],
  onProgress: (done: number, total: number) => void
): Promise<{ ok: number; errors: string[] }> {
  let ok = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i++) {
    try {
      const awbData = rowToAWBData(rows[i])
      await saveAWB(awbData)
      ok++
    } catch (e: any) {
      errors.push(`Row ${i + 2}: ${e.message}`)
    }
    onProgress(i + 1, rows.length)
  }
  return { ok, errors }
}
