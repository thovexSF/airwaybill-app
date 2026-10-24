/**
 * Reads the free-text name-and-address blocks of an AWB into the fields a
 * FWB/17 party segment needs. Agents type these blocks the way they print on
 * the paper form — name, tax id, street, "CITY - COUNTRY", phone, email in any
 * order — so each line is classified rather than taken by position.
 */

export interface FwbParty {
  name: string
  street: string
  place: string
  country: string // ISO 3166-1 alpha-2, '' if unknown
  postCode: string
  phone: string
  taxId: string // as typed: "RUT 76.503.774-3"
}

const COUNTRIES: [RegExp, string][] = [
  [/\bCHILE\b/, 'CL'], [/\bARGENTINA\b/, 'AR'], [/\bPER[UÚ]\b/, 'PE'], [/\bBRA[SZ]IL\b/, 'BR'],
  [/\bCOLOMBIA\b/, 'CO'], [/\bECUADOR\b/, 'EC'], [/\bURUGUAY\b/, 'UY'], [/\bPARAGUAY\b/, 'PY'],
  [/\bBOLIVIA\b/, 'BO'], [/\bVENEZUELA\b/, 'VE'], [/\bM[EÉ]XICO\b/, 'MX'], [/\bPANAM[AÁ]\b/, 'PA'],
  [/\bCOSTA RICA\b/, 'CR'], [/\b(UNITED STATES|USA|U\.S\.A\.?|EE\.? ?UU\.?|ESTADOS UNIDOS)\b/, 'US'],
  [/\bCANAD[AÁ]\b/, 'CA'], [/\b(SPAIN|ESPA[NÑ]A)\b/, 'ES'], [/\b(GERMANY|ALEMANIA|DEUTSCHLAND)\b/, 'DE'],
  [/\b(FRANCE|FRANCIA)\b/, 'FR'], [/\b(ITALY|ITALIA)\b/, 'IT'], [/\b(NETHERLANDS|HOLANDA|PAISES BAJOS)\b/, 'NL'],
  [/\b(UNITED KINGDOM|UK|REINO UNIDO|ENGLAND)\b/, 'GB'], [/\b(FALKLAND|MALVINAS)\b/, 'FK'],
  [/\bCHINA\b/, 'CN'], [/\b(JAPAN|JAP[OÓ]N)\b/, 'JP'], [/\b(SOUTH KOREA|COREA)\b/, 'KR'],
  [/\bAUSTRALIA\b/, 'AU'], [/\b(NEW ZEALAND|NUEVA ZELANDA)\b/, 'NZ'], [/\bSINGAP(ORE|UR)\b/, 'SG'], [/\bHONG KONG\b/, 'HK'],
  [/\b(SOUTH AFRICA|SUDAFRICA)\b/, 'ZA'], [/\bINDIA\b/, 'IN'], [/\bISRAEL\b/, 'IL'],
]

/** Country by name, else by the kind of tax id or the phone prefix the block carries. */
function countryOf(text: string): string {
  for (const [re, iso] of COUNTRIES) if (re.test(text)) return iso
  if (/\bRUT\b/.test(text)) return 'CL'
  if (/\bCUIT\b|\bCUIL\b|\bDNI\b/.test(text)) return 'AR'
  if (/\bRUC\b/.test(text)) return 'PE'
  if (/\bCNPJ\b/.test(text)) return 'BR'
  const phone = /\+\s?(\d{1,3})/.exec(text)?.[1]
  return ({ '56': 'CL', '54': 'AR', '51': 'PE', '55': 'BR', '57': 'CO', '593': 'EC', '598': 'UY', '595': 'PY', '591': 'BO', '52': 'MX', '1': 'US', '34': 'ES', '49': 'DE', '500': 'FK' } as Record<string, string>)[phone ?? ''] ?? ''
}

const TAX_ID = /\b(RUT|R\.U\.T\.?|CUIT|CUIL|RUC|NIT|CNPJ|TAX ?ID|VAT|EIN|DNI)\b\.?\s*:?\s*([0-9][0-9.\-]*[0-9K])/i
const PHONE = /(?:\b(?:PH|TEL|TELF|FONO|PHONE|CEL)\b\.?\s*:?\s*|(?<![\w])\+)(\+?[\d][\d\s\-()]{5,})/i
const EMAIL = /\S+@\S+\.\S+|\bE-?MAIL\b/i
const POSTCODE = /\b(?:ZC|CP|C\.P\.|ZIP|POSTAL CODE|COD(?:IGO)? POSTAL)\s*:?\s*([A-Z0-9][A-Z0-9 -]{2,9})/i

/** Strips a tax id or phone that shares a line with other text ("B2B EXPRESS S.A. RUT: 99.515.150-2"). */
function stripTagged(line: string): string {
  return line.replace(TAX_ID, '').replace(PHONE, '').replace(/\s*[,/]\s*$/, '').replace(/\s{2,}/g, ' ').trim()
}

export function parseParty(block: string | undefined, fallbackCountry = ''): FwbParty {
  const lines = String(block ?? '').toUpperCase().split('\n').map(l => l.trim()).filter(Boolean)
  const all = lines.join(' ')
  const taxMatch = TAX_ID.exec(all)
  const phoneMatch = PHONE.exec(all)
  const post = POSTCODE.exec(all)?.[1]?.trim() ?? ''

  const name = stripTagged(lines[0] ?? '')
  const rest = lines.slice(1)
    .filter(l => !EMAIL.test(l))
    .map(stripTagged)
    .map(l => l.replace(POSTCODE, '').replace(/\s*[,/]\s*$/, '').trim())
    .filter(Boolean)

  // A line that is only a postcode ("FIQQ 1ZZ", "8320000") is the postcode.
  let postCode = post
  const pcIdx = rest.findIndex(l => /^(\d{4,8}|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|[A-Z]{4} ?\d[A-Z]{2})$/.test(l))
  if (pcIdx >= 0) postCode ||= rest.splice(pcIdx, 1)[0]

  const cleanPlace = (p: string) => p.replace(/[^A-Z .'-]/g, ' ').replace(/\s{2,}/g, ' ').trim()
  // "QUILICURA - SANTIAGO" → the city after the dash; "GODOY CRUZ, MENDOZA, 5501" → the first part, postcode last.
  const placeOf = (line: string) => {
    const tailCode = /,\s*(\d{4,8})\s*$/.exec(line)
    if (tailCode) postCode ||= tailCode[1]
    const notCountry = (p: string) => p && !COUNTRIES.some(([re]) => re.test(p))
    const dashed = line.split(/\s+-\s+/)
    if (dashed.length > 1) return dashed.map(cleanPlace).filter(notCountry).pop() ?? ''
    return line.split(/,\s*/).map(cleanPlace).filter(notCountry)[0] ?? ''
  }

  // The line naming the country (often "CITY - COUNTRY" or "CITY, COUNTRY") gives the place.
  let place = ''
  let cityState = ''
  const countryIdx = rest.findIndex(l => COUNTRIES.some(([re]) => re.test(l)))
  if (countryIdx >= 0) {
    const line = rest.splice(countryIdx, 1)[0]
    postCode ||= /\s(\d{4,8})\s*$/.exec(line)?.[1] ?? ''
    // A city-state line ("SINGAPORE") is both the country and the place.
    place = placeOf(line.replace(/\s\d{4,8}\s*$/, ''))
    const bare = cleanPlace(line.replace(/\d+/g, ''))
    if (/^(SINGAPORE|SINGAPUR|HONG KONG|MONACO|M[OÓ]NACO|MACAU|MACAO|LUXEMBOURG|LUXEMBURGO|GIBRALTAR|VATICAN)$/.test(bare)) cityState = bare
    // Drop a second line that only repeats the country.
    for (let k = rest.length - 1; k >= 0; k--) {
      if (COUNTRIES.some(([re]) => re.test(rest[k])) && cleanPlace(rest[k]).replace(/[^A-Z]/g, '').length <= 15 && !/\d/.test(rest[k])) rest.splice(k, 1)
    }
  }
  // European style "65479 RAUNHEIM": postcode, then city.
  if (!place) {
    const eu = rest.findIndex(l => /^\d{4,6}\s+[A-Z][A-Z .'-]+$/.test(l))
    if (eu >= 0) {
      const [, code, city] = /^(\d{4,6})\s+(.+)$/.exec(rest.splice(eu, 1)[0])!
      postCode ||= code
      place = cleanPlace(city)
    }
  }
  // Otherwise a "CITY, REGION, 5501" line, or the last line when it has no number.
  if (!place) {
    const coded = rest.findIndex(l => /,\s*\d{4,8}\s*$/.test(l))
    if (coded >= 0) place = placeOf(rest.splice(coded, 1)[0])
  }
  if (!place && rest.length > 1 && !/\d/.test(rest[rest.length - 1])) place = placeOf(rest.pop()!)
  if (!place && rest.length === 1 && / - /.test(rest[0])) {
    place = placeOf(rest[0])
    rest[0] = rest[0].split(/\s+-\s+/)[0]
  }
  if (!place) place = cityState
  const street = rest.join(', ')

  return {
    name,
    street,
    place,
    country: countryOf(all) || fallbackCountry,
    postCode,
    phone: phoneMatch ? phoneMatch[1].replace(/[^\d+]/g, '') : '',
    taxId: taxMatch ? `${taxMatch[1].replace(/\./g, '').toUpperCase()} ${taxMatch[2]}` : '',
  }
}

/**
 * IATA other-charge codes (Cargo-IMP OTH). Agents type their own wording, so
 * the common ones are recognised and the rest go as miscellaneous (MA/MC by
 * who is entitled), which every carrier accepts.
 */
const OTH_CODES: [RegExp, string][] = [
  [/\b(AWB|GU[IÍ]A A[EÉ]REA|AIR ?WAYBILL)\b/, 'AW'],
  [/\b(FUEL|COMBUSTIBLE|MYC)\b/, 'MY'],
  [/\b(SECURITY|SEGURIDAD|SCREENING|ESC[AÁ]NER|SCANNER|RAYOS)\b/, 'SC'],
  [/\b(DANGEROUS|PELIGROS|DGR|DG FEE)\b/, 'RA'],
  [/\b(PICK ?UP|RETIRO|COLLECTION)\b/, 'PU'],
  [/\b(PACKING|PACKAGING|EMBALAJE|FILM)\b/, 'PK'],
  [/\b(STORAGE|ALMACENAJE|BODEGAJE)\b/, 'SO'],
  [/\b(HANDLING|MANIPULACI[OÓ]N|TERMINAL)\b/, 'CH'],
  [/\b(INSURANCE|SEGURO)\b/, 'IN'],
  [/\b(CUSTOMS|ADUANA)\b/, 'CC'],
]

export function otherChargeCode(description: string | undefined, dueCarrier: boolean): string {
  const d = String(description ?? '').toUpperCase()
  for (const [re, code] of OTH_CODES) if (re.test(d)) return code
  return dueCarrier ? 'MC' : 'MA'
}

/** "75-1-9012/0014" → IATA cargo agent numeric code 7519012 and CASS address 0014. */
export function parseAgentCode(raw: string | undefined): { iata: string; cass: string } {
  const [code, cass] = String(raw ?? '').split('/')
  return { iata: code.replace(/\D/g, '').slice(0, 7), cass: (cass ?? '').replace(/\D/g, '').slice(0, 4) }
}
