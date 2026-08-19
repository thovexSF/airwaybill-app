/**
 * IATA numeric airline accounting codes — the three digits that open every air
 * waybill number — mapped to the carrier that owns them.
 *
 * Curated, not exhaustive: it covers the carriers that show up most often on
 * forwarder desks, and it is meant to be extended. Only add a prefix you have
 * confirmed against the carrier's own documentation — a wrong mapping here goes
 * straight onto a printed waybill, so an absent airline (the field simply stays
 * as typed) is a far better failure than a confidently wrong one.
 *
 * `color` is the carrier's brand colour, used for the wordmark drawn in the
 * "Issued by" block when no licensed logo image has been uploaded.
 */
export interface Airline {
  /** IATA 2-character designator, e.g. "LH". */
  code: string
  name: string
  /** Registered head office / cargo address printed under the name. */
  address: string
  /** Brand colour as a hex string. */
  color: string
}

export const AIRLINES_BY_PREFIX: Record<string, Airline> = {
  '001': { code: 'AA', name: 'AMERICAN AIRLINES CARGO', address: '1 SKYVIEW DRIVE, FORT WORTH, TX 76155, USA', color: '#0078D2' },
  '006': { code: 'DL', name: 'DELTA CARGO', address: '1030 DELTA BOULEVARD, ATLANTA, GA 30354, USA', color: '#C8102E' },
  '014': { code: 'AC', name: 'AIR CANADA CARGO', address: '7373 COTE-VERTU BLVD WEST, SAINT-LAURENT, QC, CANADA', color: '#F01428' },
  '016': { code: 'UA', name: 'UNITED CARGO', address: '233 SOUTH WACKER DRIVE, CHICAGO, IL 60606, USA', color: '#002244' },
  '020': { code: 'LH', name: 'LUFTHANSA CARGO AG', address: 'FLUGHAFEN FRANKFURT, 60546 FRANKFURT AM MAIN, GERMANY', color: '#05164D' },
  '023': { code: 'FX', name: 'FEDEX EXPRESS', address: '3610 HACKS CROSS ROAD, MEMPHIS, TN 38125, USA', color: '#4D148C' },
  '027': { code: 'AS', name: 'ALASKA AIR CARGO', address: '19300 INTERNATIONAL BLVD, SEATTLE, WA 98188, USA', color: '#01426A' },
  '037': { code: '5X', name: 'UPS AIRLINES', address: '1400 NORTH HURSTBOURNE PARKWAY, LOUISVILLE, KY 40223, USA', color: '#351C15' },
  '045': { code: 'LA', name: 'LATAM CARGO', address: 'AV. PRESIDENTE RIESCO 5711, LAS CONDES, SANTIAGO, CHILE', color: '#E4002B' },
  '047': { code: 'TP', name: 'TAP AIR PORTUGAL CARGO', address: 'AEROPORTO DE LISBOA, 1704-801 LISBOA, PORTUGAL', color: '#00A34E' },
  '055': { code: 'AZ', name: 'ITA AIRWAYS CARGO', address: 'VIA XX SETTEMBRE 1, 00187 ROMA, ITALY', color: '#00205B' },
  '057': { code: 'AF', name: 'AIR FRANCE CARGO', address: 'ROISSY-CHARLES DE GAULLE, 95747 ROISSY CDG, FRANCE', color: '#002157' },
  '071': { code: 'ET', name: 'ETHIOPIAN CARGO', address: 'BOLE INTERNATIONAL AIRPORT, ADDIS ABABA, ETHIOPIA', color: '#7C9A34' },
  '074': { code: 'KL', name: 'KLM CARGO', address: 'AMSTERDAMSEWEG 55, 1182 GP AMSTELVEEN, NETHERLANDS', color: '#00A1DE' },
  '075': { code: 'IB', name: 'IBERIA CARGO', address: 'CALLE MARTINEZ VILLERGAS 49, 28027 MADRID, SPAIN', color: '#D7192D' },
  '077': { code: 'ME', name: 'MIDDLE EAST AIRLINES', address: 'BEIRUT INTERNATIONAL AIRPORT, BEIRUT, LEBANON', color: '#C8102E' },
  '079': { code: 'PR', name: 'PAL AIR CARGO', address: 'NAIA COMPLEX, PASAY CITY, METRO MANILA, PHILIPPINES', color: '#00529B' },
  '080': { code: 'LO', name: 'LOT POLISH AIRLINES CARGO', address: 'UL. KOMITETU OBRONY ROBOTNIKOW 43, 02-146 WARSZAWA, POLAND', color: '#11397E' },
  '081': { code: 'QF', name: 'QANTAS FREIGHT', address: '10 BOURKE ROAD, MASCOT NSW 2020, AUSTRALIA', color: '#E40000' },
  '083': { code: 'SK', name: 'SAS CARGO', address: 'FROSUNDAVIKS ALLE 1, 195 87 STOCKHOLM, SWEDEN', color: '#003D87' },
  '086': { code: 'NZ', name: 'AIR NEW ZEALAND CARGO', address: '185 FANSHAWE STREET, AUCKLAND 1010, NEW ZEALAND', color: '#00247A' },
  '125': { code: 'BA', name: 'IAG CARGO / BRITISH AIRWAYS', address: 'WATERSIDE, HARMONDSWORTH UB7 0GB, UNITED KINGDOM', color: '#075AAA' },
  '131': { code: 'JL', name: 'JAL CARGO', address: '2-4-11 HIGASHI-SHINAGAWA, SHINAGAWA-KU, TOKYO, JAPAN', color: '#C8102E' },
  '134': { code: 'AV', name: 'AVIANCA CARGO', address: 'AV. CALLE 26 NO. 59-15, BOGOTA, COLOMBIA', color: '#E4002B' },
  '139': { code: 'AM', name: 'AEROMEXICO CARGO', address: 'PASEO DE LA REFORMA 445, CIUDAD DE MEXICO, MEXICO', color: '#0B2265' },
  '157': { code: 'QR', name: 'QATAR AIRWAYS CARGO', address: 'QATAR AIRWAYS TOWER, DOHA, QATAR', color: '#5C0632' },
  '160': { code: 'CX', name: 'CATHAY CARGO', address: 'CATHAY CITY, HONG KONG INTERNATIONAL AIRPORT, HONG KONG', color: '#006564' },
  '172': { code: 'CV', name: 'CARGOLUX AIRLINES INTERNATIONAL', address: 'AEROPORT DE LUXEMBOURG, L-2990 LUXEMBOURG', color: '#004B87' },
  '176': { code: 'EK', name: 'EMIRATES SKYCARGO', address: 'DUBAI INTERNATIONAL AIRPORT, DUBAI, UNITED ARAB EMIRATES', color: '#D71921' },
  '180': { code: 'KE', name: 'KOREAN AIR CARGO', address: '260 HANEUL-GIL, GANGSEO-GU, SEOUL, REPUBLIC OF KOREA', color: '#00256C' },
  '217': { code: 'TG', name: 'THAI CARGO', address: '89 VIBHAVADI RANGSIT ROAD, BANGKOK 10900, THAILAND', color: '#4B0082' },
  '235': { code: 'TK', name: 'TURKISH CARGO', address: 'ISTANBUL AIRPORT, 34283 ARNAVUTKOY, ISTANBUL, TURKIYE', color: '#C70A0C' },
  '297': { code: 'CI', name: 'CHINA AIRLINES CARGO', address: '131 NANKING EAST ROAD SEC 3, TAIPEI, TAIWAN', color: '#CC0033' },
  '555': { code: 'SU', name: 'AEROFLOT CARGO', address: 'ARBAT STREET 10, 119002 MOSCOW, RUSSIA', color: '#00256C' },
  '607': { code: 'MS', name: 'EGYPTAIR CARGO', address: 'CAIRO INTERNATIONAL AIRPORT, CAIRO, EGYPT', color: '#00529B' },
  '618': { code: 'SQ', name: 'SINGAPORE AIRLINES CARGO', address: 'AIRLINE HOUSE, 25 AIRLINE ROAD, SINGAPORE 819829', color: '#F99F1C' },
  '623': { code: 'AY', name: 'FINNAIR CARGO', address: 'RAHTITIE 1, 01530 VANTAA, FINLAND', color: '#0B1560' },
  '632': { code: 'GA', name: 'GARUDA INDONESIA CARGO', address: 'SOEKARNO-HATTA AIRPORT, TANGERANG, INDONESIA', color: '#035AA6' },
  '695': { code: 'BR', name: 'EVA AIR CARGO', address: '376 HSIN-NAN ROAD SEC 1, LUZHU, TAOYUAN, TAIWAN', color: '#136C3A' },
  '706': { code: 'KQ', name: 'KENYA AIRWAYS CARGO', address: 'JOMO KENYATTA INTERNATIONAL AIRPORT, NAIROBI, KENYA', color: '#C8102E' },
  '724': { code: 'LX', name: 'SWISS WORLDCARGO', address: 'ZURICH AIRPORT, P.O. BOX, 8058 ZURICH, SWITZERLAND', color: '#E3000F' },
  '781': { code: 'MU', name: 'CHINA EASTERN AIRLINES CARGO', address: '66 JIANGCHANG THIRD ROAD, SHANGHAI, CHINA', color: '#1A3668' },
  '784': { code: 'CZ', name: 'CHINA SOUTHERN CARGO', address: '278 JICHANG ROAD, BAIYUN, GUANGZHOU, CHINA', color: '#00519E' },
  '988': { code: 'OZ', name: 'ASIANA CARGO', address: '443 OSOE-DONG, GANGSEO-GU, SEOUL, REPUBLIC OF KOREA', color: '#5B4A9E' },
  '999': { code: 'CA', name: 'AIR CHINA CARGO', address: '30 TIANZHU ROAD, SHUNYI DISTRICT, BEIJING, CHINA', color: '#D8232A' },
}

/** The carrier that owns an AWB prefix, or `null` when the prefix is unknown. */
export function airlineForPrefix(prefix: string | undefined | null): Airline | null {
  if (!prefix) return null
  const key = String(prefix).trim().padStart(3, '0')
  return AIRLINES_BY_PREFIX[key] ?? null
}

/**
 * Fills the carrier block from the AWB prefix, leaving anything already typed
 * alone. Auto-fill that overwrites what somebody entered by hand is worse than
 * no auto-fill at all — an agent who corrects the carrier address must be able
 * to keep the correction.
 */
export function applyAirlineForPrefix<T extends { awbPrefix?: string; carrierName?: string; carrierAddress?: string }>(
  data: T,
  previousPrefix?: string,
): T {
  const airline = airlineForPrefix(data.awbPrefix)
  if (!airline) return data

  const previous = airlineForPrefix(previousPrefix)
  // A field counts as free to fill when it is empty, or still holds exactly what
  // the previously matched prefix had put there.
  const free = (value: string | undefined, was: string | undefined) => !value?.trim() || value === was

  const next = { ...data }
  if (free(data.carrierName, previous?.name)) next.carrierName = airline.name
  if (free(data.carrierAddress, previous?.address)) next.carrierAddress = airline.address
  return next
}
