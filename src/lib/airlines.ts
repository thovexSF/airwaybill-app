/**
 * IATA numeric airline accounting codes — the three digits that open every air
 * waybill number — mapped to the carrier that owns them, with the logo printed
 * in the "Issued by" block.
 *
 * Kept in step with `airlineByPrefix.ts` in the sister `b2b` repo, which is
 * where the logo files in `public/awb-airlines/` come from. Only add a prefix
 * you have verified: a wrong mapping goes straight onto a printed waybill, so
 * an absent airline — the block simply stays as typed — is a far better failure
 * than a confidently wrong one.
 */
export interface Airline {
  /** IATA 2-character designator, e.g. "LH". */
  iata: string
  name: string
  /** The carrier block as it is printed on the form, one line per row. */
  issuedBy: string
}

export const AIRLINE_BY_PREFIX: Record<string, Airline> = {
  '001': { iata: 'AA', name: 'American Airlines', issuedBy: 'AMERICAN AIRLINES, INC.\nFORT WORTH, TEXAS\nUNITED STATES' },
  '006': { iata: 'DL', name: 'Delta Air Lines', issuedBy: 'DELTA AIR LINES, INC.\nATLANTA, GEORGIA\nUNITED STATES' },
  '014': { iata: 'AC', name: 'Air Canada', issuedBy: 'AIR CANADA\nMONTREAL, QUEBEC\nCANADA' },
  '016': { iata: 'UA', name: 'United Airlines', issuedBy: 'UNITED AIRLINES, INC.\nCHICAGO, ILLINOIS\nUNITED STATES' },
  '020': { iata: 'LH', name: 'Lufthansa', issuedBy: 'DEUTSCHE LUFTHANSA AG\nFRANKFURT AM MAIN\nGERMANY' },
  '023': { iata: 'FX', name: 'FedEx', issuedBy: 'FEDERAL EXPRESS CORPORATION\nMEMPHIS, TENNESSEE\nUNITED STATES' },
  '045': { iata: 'LA', name: 'LATAM Airlines', issuedBy: 'LATAM AIRLINES GROUP S.A.\nSANTIAGO\nCHILE' },
  '047': { iata: 'TP', name: 'TAP Air Portugal', issuedBy: 'TAP AIR PORTUGAL\nLISBON\nPORTUGAL' },
  '057': { iata: 'AF', name: 'Air France', issuedBy: 'AIR FRANCE\nROISSY CDG\nFRANCE' },
  '074': { iata: 'KL', name: 'KLM', issuedBy: 'KLM ROYAL DUTCH AIRLINES\nAMSTERDAM\nNETHERLANDS' },
  '075': { iata: 'IB', name: 'Iberia', issuedBy: 'IBERIA LINEAS AEREAS DE ESPANA\nMADRID\nSPAIN' },
  '080': { iata: 'LO', name: 'LOT Polish Airlines', issuedBy: 'LOT POLISH AIRLINES\nWARSAW\nPOLAND' },
  '081': { iata: 'QF', name: 'Qantas', issuedBy: 'QANTAS AIRWAYS LIMITED\nSYDNEY\nAUSTRALIA' },
  '125': { iata: 'BA', name: 'British Airways', issuedBy: 'BRITISH AIRWAYS PLC\nHARMONDSWORTH\nUNITED KINGDOM' },
  '131': { iata: 'JL', name: 'Japan Airlines', issuedBy: 'JAPAN AIRLINES CO., LTD.\nTOKYO\nJAPAN' },
  '134': { iata: 'AV', name: 'Avianca', issuedBy: 'AVIANCA S.A.\nBOGOTA\nCOLOMBIA' },
  '157': { iata: 'QR', name: 'Qatar Airways', issuedBy: 'QATAR AIRWAYS\nDOHA\nQATAR' },
  '160': { iata: 'CX', name: 'Cathay Pacific', issuedBy: 'CATHAY PACIFIC AIRWAYS LTD.\nHONG KONG' },
  '176': { iata: 'EK', name: 'Emirates', issuedBy: 'EMIRATES\nDUBAI\nUNITED ARAB EMIRATES' },
  '180': { iata: 'KE', name: 'Korean Air', issuedBy: 'KOREAN AIR LINES CO., LTD.\nSEOUL\nKOREA' },
  '205': { iata: 'NH', name: 'ANA', issuedBy: 'ALL NIPPON AIRWAYS CO., LTD.\nTOKYO\nJAPAN' },
  '217': { iata: 'TG', name: 'Thai Airways', issuedBy: 'THAI AIRWAYS INTERNATIONAL\nBANGKOK\nTHAILAND' },
  '230': { iata: 'CM', name: 'Copa Airlines', issuedBy: 'COPA AIRLINES\nPANAMA CITY\nPANAMA' },
  '235': { iata: 'TK', name: 'Turkish Airlines', issuedBy: 'TURKISH AIRLINES\nISTANBUL\nTURKEY' },
  '996': { iata: 'M3', name: 'LATAM Cargo Brasil', issuedBy: 'LATAM CARGO BRASIL\nSAO PAULO\nBRAZIL' },
}

export function normalizeAwbPrefix(prefix?: string | null): string {
  const digits = String(prefix || '').replace(/\D/g, '')
  return digits ? digits.padStart(3, '0').slice(-3) : ''
}

export function airlineForPrefix(prefix?: string | null): Airline | undefined {
  return AIRLINE_BY_PREFIX[normalizeAwbPrefix(prefix)]
}

/** The carrier's logo file, or undefined when the prefix is not in the registry. */
export function airlineLogoSrc(prefix?: string | null): string | undefined {
  const p = normalizeAwbPrefix(prefix)
  return p && AIRLINE_BY_PREFIX[p] ? `/awb-airlines/${p}.png` : undefined
}

/**
 * Fills the carrier block from the AWB prefix, leaving anything already typed
 * alone. Auto-fill that overwrites what somebody entered by hand is worse than
 * no auto-fill at all — an agent who corrects the carrier block must be able to
 * keep the correction.
 */
export function applyAirlineForPrefix<T extends { awbPrefix?: string; carrierName?: string; carrierAddress?: string }>(
  data: T,
  previousPrefix?: string,
): T {
  const airline = airlineForPrefix(data.awbPrefix)
  if (!airline) return data

  const previous = airlineForPrefix(previousPrefix)
  const [prevName, ...prevRest] = (previous?.issuedBy ?? '').split('\n')
  const [name, ...rest] = airline.issuedBy.split('\n')

  // A field counts as free to fill when it is empty, or still holds exactly
  // what the previously matched prefix had put there.
  const free = (value: string | undefined, was: string) => !value?.trim() || value === was

  const next = { ...data }
  if (free(data.carrierName, prevName)) next.carrierName = name
  if (free(data.carrierAddress, prevRest.join('\n'))) next.carrierAddress = rest.join('\n')
  return next
}
