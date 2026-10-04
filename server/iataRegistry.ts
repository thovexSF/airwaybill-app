/**
 * Lista pública "Freight Forwarders and Affiliates" del Multilateral e-AWB Agreement de IATA
 * (https://matchmaker.iata.org/efReport/ffAndAffiliatesAgrReport). El reporte está detrás de un
 * desafío anti-bot de Cloudflare, así que no se lee automáticamente: el admin exporta el CSV y lo
 * sube en /admin; aquí se parsea, se guarda en `iata_eawb_registry` y se consulta por razón social.
 */
import { randomUUID } from 'node:crypto'
import { adminClient } from './partnerAuth'

export interface IataRegistryMatch {
  companyName: string
  countryName: string
  city: string
  joiningDate: string | null
  comments: string | null // PARENT / AFFILIATE
}

export type RegistryStatus = 'registered' | 'possible' | 'not_found' | 'unavailable'

export interface IataRegistryResult {
  available: boolean
  status: RegistryStatus
  asOf: string | null
  matches: IataRegistryMatch[]
}

// Sufijos societarios: "B2B EXPRESS SPA" y "B2B Express S.P.A." deben ser la misma empresa.
const LEGAL_SUFFIX = new Set([
  'SPA', 'SA', 'SAS', 'LTDA', 'LTD', 'LIMITADA', 'LLC', 'INC', 'CORP', 'CORPORATION', 'CO', 'COMPANY',
  'GMBH', 'SRL', 'SL', 'BV', 'NV', 'AG', 'PTY', 'PLC', 'LP', 'LLP', 'CIA', 'EIRL', 'SAC', 'CV', 'LIMITED',
])

export function normalizeCompany(name: string): string {
  const base = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
  const core = base.split(' ').filter(t => t && !LEGAL_SUFFIX.has(t)).join(' ')
  return core || base
}

/** CSV RFC 4180: comillas dobles, comas y saltos de línea dentro de campos entre comillas. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

export async function replaceRegistry(csv: string, asOf: string): Promise<{ rows: number }> {
  const parsed = parseCsv(csv.replace(/^﻿/, ''))
  const header = parsed[0]?.map(h => h.trim().toLowerCase()) ?? []
  const col = (name: string) => header.indexOf(name)
  const [cc, cn, city, co, jd, cm] = ['country code', 'country name', 'city', 'company name', 'joining date', 'comments'].map(col)
  if (co < 0 || cn < 0) throw new Error('csv_invalid: faltan las columnas Country Name / Company Name')

  const batch = randomUUID()
  const records = parsed.slice(1)
    .filter(r => (r[co] ?? '').trim())
    .map(r => ({
      batch,
      country_code: (r[cc] ?? '').trim() || null,
      country_name: (r[cn] ?? '').trim() || null,
      city: (r[city] ?? '').trim() || null,
      company_name: r[co].trim(),
      norm_name: normalizeCompany(r[co]),
      joining_date: /^\d{4}-\d{2}-\d{2}$/.test((r[jd] ?? '').trim()) ? r[jd].trim() : null,
      comments: (r[cm] ?? '').trim() || null,
    }))
  if (records.length < 100) throw new Error('csv_invalid: la lista tiene muy pocas filas')

  const db = adminClient()
  for (let i = 0; i < records.length; i += 1000) {
    const { error } = await db.from('iata_eawb_registry').insert(records.slice(i, i + 1000))
    if (error) {
      await db.from('iata_eawb_registry').delete().eq('batch', batch)
      throw new Error(error.message)
    }
  }
  const meta = await db.from('iata_eawb_registry_meta')
    .upsert({ id: 1, as_of: asOf, uploaded_at: new Date().toISOString(), row_count: records.length, batch })
  if (meta.error) throw new Error(meta.error.message)
  await db.from('iata_eawb_registry').delete().neq('batch', batch)
  return { rows: records.length }
}

export async function registryMeta() {
  const { data } = await adminClient().from('iata_eawb_registry_meta').select('as_of, uploaded_at, row_count').eq('id', 1).maybeSingle()
  return data as { as_of: string; uploaded_at: string; row_count: number } | null
}

export async function lookupIataRegistry(companyName: string): Promise<IataRegistryResult> {
  const meta = await registryMeta()
  if (!meta) return { available: false, status: 'unavailable', asOf: null, matches: [] }
  const norm = normalizeCompany(companyName)
  if (norm.length < 3) return { available: true, status: 'not_found', asOf: meta.as_of, matches: [] }

  const db = adminClient()
  const cols = 'company_name, country_name, city, joining_date, comments'
  const toMatch = (r: any): IataRegistryMatch => ({
    companyName: r.company_name, countryName: r.country_name ?? '', city: r.city ?? '',
    joiningDate: r.joining_date, comments: r.comments,
  })

  const exact = await db.from('iata_eawb_registry').select(cols).eq('norm_name', norm).limit(5)
  if (exact.error) throw new Error(exact.error.message)
  if (exact.data?.length) {
    return { available: true, status: 'registered', asOf: meta.as_of, matches: exact.data.map(toMatch) }
  }
  if (norm.length >= 6) {
    const like = norm.replace(/[\\%_]/g, m => `\\${m}`)
    const near = await db.from('iata_eawb_registry').select(cols).ilike('norm_name', `%${like}%`).limit(5)
    if (near.error) throw new Error(near.error.message)
    if (near.data?.length) {
      return { available: true, status: 'possible', asOf: meta.as_of, matches: near.data.map(toMatch) }
    }
  }
  return { available: true, status: 'not_found', asOf: meta.as_of, matches: [] }
}
