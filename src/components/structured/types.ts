export const B2B_AGENT_DEFAULTS = {
  agentNameAndCity: '',
  agentIataCode: '',
  agentAccountNumber: '',
};

/** Defaults B2B cuando el hub corre embebido con theme b2b. */
export function agentDefaultsForPartner() {
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-partner-theme') === 'b2b') {
    return {
      agentNameAndCity:
        'B2B EXPRESS S.A. RUT: 99.515.150-2\nCOLO COLO 521, BODEGA 11A\nQUILICURA - SANTIAGO PH: +56224810261',
      agentIataCode: '75-1-9012/0014',
      agentAccountNumber: '',
    };
  }
  return B2B_AGENT_DEFAULTS;
}

export interface RateLine {
  pieces: number;
  grossWeight: number;
  weightUnit: string;
  rateClass: string;
  itemNo: string;
  chargeableWeight: number;
  rate: number;
  total: number;
  natureAndQuantity: string;
  dimensions?: Array<{
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    pieces?: number;
    weight?: number;
    weightUnit?: string;
  }>;
  autoCalc?: 'total' | 'rate' | 'none';
}

export interface OtherCharge {
  description: string;
  amount: number;
  entitlement: 'DUE AGENT' | 'DUE CARRIER';
}

export interface MawbFormData {
  issueDate: string;
  awbPrefix: string;
  awbSerial: string;
  assignOnSave: boolean;
  houseNumber: string;
  referenceNumber: string;
  issuer: string;
  issuedBy: string;
  shipperAccountNumber: string;
  shipperNameAndAddress: string;
  consigneeAccountNumber: string;
  consigneeNameAndAddress: string;
  agentNameAndCity: string;
  agentIataCode: string;
  agentAccountNumber: string;
  accountingInformation: string;
  optionalShippingInformation: string;
  airportOfDeparture: string;
  departureDisplay: string;
  destinationDisplay: string;
  routeTo1: string;
  routeBy1: string;
  routeTo2: string;
  routeBy2: string;
  routeTo3: string;
  routeBy3: string;
  airportOfDestination: string;
  requestedFlightsDates: string;
  flightNumber: string;
  flightDate: string;
  flightNumber2: string;
  flightDate2: string;
  currency: string;
  chgsCode: string;
  weightValuationCharges: 'PPD' | 'COLL';
  otherChargesCode: 'PPD' | 'COLL';
  valueForCarriage: string;
  valueForCustoms: string;
  insuranceAmount: string;
  handlingInformation: string;
  sci: string;
  rateLines: RateLine[];
  otherCharges: OtherCharge[];
  weightChargePrepaid: number;
  weightChargeCollect: number;
  valuationChargePrepaid: number;
  valuationChargeCollect: number;
  taxPrepaid: number;
  taxCollect: number;
  totalOtherDueAgentPrepaid: number;
  totalOtherDueAgentCollect: number;
  totalOtherDueCarrierPrepaid: number;
  totalOtherDueCarrierCollect: number;
  totalPrepaid: number;
  totalCollect: number;
  signatureOfShipperOrAgent: string;
  executedOnDate: string;
  executedAtPlace: string;
  signatureOfIssuingCarrierOrAgent: string;
  notes: string;
  natureAndQuantityOfGoods: string;
  numberOfPieces: number;
  grossWeight: number;
  status: string;
}

export const emptyRateLine = (): RateLine => ({
  pieces: 0,
  grossWeight: 0,
  weightUnit: 'K',
  rateClass: '',
  itemNo: '',
  chargeableWeight: 0,
  rate: 0,
  total: 0,
  natureAndQuantity: '',
});

export const defaultMawbForm = (): MawbFormData => ({
  issueDate: new Date().toISOString().slice(0, 10),
  awbPrefix: '',
  awbSerial: '',
  assignOnSave: false,
  houseNumber: '',
  referenceNumber: '',
  issuer: '',
  issuedBy: '',
  shipperAccountNumber: '',
  shipperNameAndAddress: '',
  consigneeAccountNumber: '',
  consigneeNameAndAddress: '',
    ...agentDefaultsForPartner(),
  accountingInformation: '',
  optionalShippingInformation: '',
  airportOfDeparture: '',
  departureDisplay: '',
  destinationDisplay: '',
  routeTo1: '',
  routeBy1: '',
  routeTo2: '',
  routeBy2: '',
  routeTo3: '',
  routeBy3: '',
  airportOfDestination: '',
  requestedFlightsDates: '',
  flightNumber: '',
  flightDate: '',
  flightNumber2: '',
  flightDate2: '',
  currency: 'USD',
  chgsCode: 'PP',
  weightValuationCharges: 'PPD',
  otherChargesCode: 'PPD',
  valueForCarriage: 'NVD',
  valueForCustoms: 'NCV',
  insuranceAmount: 'XXX',
  handlingInformation: '',
  sci: '',
  rateLines: [emptyRateLine()],
  otherCharges: [],
  weightChargePrepaid: 0,
  weightChargeCollect: 0,
  valuationChargePrepaid: 0,
  valuationChargeCollect: 0,
  taxPrepaid: 0,
  taxCollect: 0,
  totalOtherDueAgentPrepaid: 0,
  totalOtherDueAgentCollect: 0,
  totalOtherDueCarrierPrepaid: 0,
  totalOtherDueCarrierCollect: 0,
  totalPrepaid: 0,
  totalCollect: 0,
  signatureOfShipperOrAgent: '',
  executedOnDate: new Date().toISOString().slice(0, 10),
  executedAtPlace: 'SANTIAGO',
    signatureOfIssuingCarrierOrAgent: agentDefaultsForPartner().agentNameAndCity.split('\n')[0] || '',
  notes: '',
  natureAndQuantityOfGoods: '',
  numberOfPieces: 0,
  grossWeight: 0,
  status: 'draft',
});

/** IATA check digit: first 7 digits of serial mod 7 === 8th digit */
export function validateAwbCheckDigit(prefix: string, serial: string): boolean {
  const s = serial.replace(/\D/g, '');
  if (s.length !== 8 || !/^\d{3}$/.test(prefix)) return false;
  const serial7 = parseInt(s.slice(0, 7), 10);
  const check = parseInt(s.slice(7), 10);
  return serial7 % 7 === check;
}

export function awbNumberFromParts(prefix: string, serial: string): string {
  if (!prefix && !serial) return '';
  return `${prefix}-${serial}`.replace(/^-|-$/g, '');
}

/** Esquina izq. IATA: "006 SCL 44972362" */
export function awbNumberLeftDisplay(prefix: string, serial: string, originCode?: string): string {
  const p = String(prefix || '').trim();
  const s = String(serial || '').trim();
  if (!p && !s) return '';
  const origin = String(originCode || '')
    .toUpperCase()
    .match(/\b([A-Z]{3})\b/)?.[1];
  if (p && origin && s) return `${p} ${origin} ${s}`;
  return awbNumberFromParts(p, s);
}

const FORM_PAYLOAD_META = new Set(['_source', 'xmlRoot', 'externalId', 'importedFrom', '_editor', '_sourceFile']);

const IATA_SERIAL = /^\d{8}$/;

/** Prefijo/serial IATA; DRAFT o timestamps no se usan como serial. */
export function splitAwbParts(entity: any): { prefix: string; serial: string } {
  const fp = entity?.formPayload && typeof entity.formPayload === 'object' ? entity.formPayload : {};
  const prefixCol = String(
    entity?.awbPrefix || fp.awbPrefix || entity?.awbNumber1 || fp.awbNumber1 || ''
  ).trim();
  const serialCol = String(
    entity?.awbSerial || fp.awbSerial || entity?.awbNumber2 || fp.awbNumber2 || ''
  ).trim();
  const raw = String(entity?.awbNumber || fp.awbNumber || entity?.docNumber || '').trim();
  const blob = [raw, prefixCol, serialCol, entity?.docNumber, fp.awbNumber1, fp.awbNumber2]
    .filter(Boolean)
    .join(' ');
  const hyphen = blob.match(/(\d{3})[-\s](\d{8})/);
  if (prefixCol && IATA_SERIAL.test(serialCol)) return { prefix: prefixCol, serial: serialCol };
  if (hyphen) return { prefix: hyphen[1], serial: hyphen[2] };
  if (IATA_SERIAL.test(serialCol)) return { prefix: prefixCol, serial: serialCol };
  if (/^DRAFT/i.test(raw) || /^DRAFT/i.test(serialCol)) return { prefix: prefixCol, serial: '' };
  const serialOnly = blob.match(/\b(\d{8})\b/);
  if (prefixCol && serialOnly) return { prefix: prefixCol, serial: serialOnly[1] };
  try {
    const dump = JSON.stringify({ ...entity, formPayload: fp });
    const nested = dump.match(/(\d{3})[-\s](\d{8})/);
    if (nested) return { prefix: prefixCol || nested[1], serial: nested[2] };
  } catch {
    /* ignore */
  }
  return { prefix: prefixCol, serial: IATA_SERIAL.test(serialCol) ? serialCol : '' };
}

export function airportCodeFromDisplay(display?: string): string {
  const s = String(display || '').trim();
  const paren = s.match(/\(([A-Z]{3})(?:[/\-][A-Z]{3})*\)/i);
  if (paren) return paren[1].toUpperCase();
  if (/^[A-Z]{3}$/i.test(s)) return s.toUpperCase();
  return s.match(/\b([A-Z]{3})\b/)?.[1]?.toUpperCase() || '';
}

/** "A. MERINO . B (SCL/ATL/HND)" → to1=ATL, to2=HND */
export function routingFromDepartureDisplay(display?: string): { to1: string; to2: string; to3: string } {
  const m = String(display || '').match(/\(([A-Z]{3}(?:[/\-][A-Z]{3})+)\)/i);
  if (!m) return { to1: '', to2: '', to3: '' };
  const codes = m[1].toUpperCase().split(/[/\-]/);
  return { to1: codes[1] || '', to2: codes[2] || '', to3: codes[3] || '' };
}

/** "DL146/15-08 DL295/17-08" → las dos cajas de Requested Flight/Date. */
export function splitRequestedFlights(...parts: Array<string | undefined | null>): [string, string] {
  const tokens: string[] = [];
  for (const part of parts) {
    for (const t of String(part || '').split(/\s+/)) {
      const v = t.replace(/[…]|\.{3}$/g, '').trim();
      if (v && !tokens.includes(v)) tokens.push(v);
    }
  }
  return [tokens[0] || '', tokens[1] || ''];
}

export function fullAgentIata(code?: string): string {
  const fallback = agentDefaultsForPartner().agentIataCode;
  const c = String(code || '').trim();
  if (!c) return fallback;
  if (fallback.startsWith(c) && c.length < fallback.length) return fallback;
  return c;
}

function parseOtherCharges(raw: any): OtherCharge[] {
  try {
    if (typeof raw === 'string' && raw.trim().startsWith('[')) return JSON.parse(raw);
    if (Array.isArray(raw)) {
      return raw.map((c) => ({
        description: c.description || '',
        amount: Number(c.amount) || 0,
        entitlement: c.entitlement === 'DUE CARRIER' ? 'DUE CARRIER' : 'DUE AGENT',
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function parseRateLines(entity: any, fp?: any): RateLine[] {
  const src = (Array.isArray(fp?.rateLines) && fp.rateLines.length ? fp.rateLines : null)
    || (Array.isArray(entity?.rateLines) && entity.rateLines.length ? entity.rateLines : null);
  if (src) return src.map((r: any) => ({ ...emptyRateLine(), ...r }));
  return [
    {
      ...emptyRateLine(),
      pieces: Number(entity?.numberOfPieces) || 0,
      grossWeight: Number(entity?.grossWeight) || 0,
      weightUnit: entity?.weightUnit || 'K',
      rateClass: entity?.rateClass || '',
      itemNo: entity?.commodityItemNumber || '',
      chargeableWeight: Number(entity?.chargeableWeight) || 0,
      rate: Number(entity?.rateCharge) || 0,
      total: Number(entity?.totalCharge) || 0,
      natureAndQuantity: entity?.natureAndQuantityOfGoods || '',
    },
  ];
}

function overlayKnownFormFields(base: MawbFormData, fp: Record<string, unknown>): Partial<MawbFormData> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fp)) {
    if (FORM_PAYLOAD_META.has(k)) continue;
    if (!(k in base)) continue;
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<MawbFormData>;
}

export function entityToMawbForm(entity: any): MawbFormData {
  const base = defaultMawbForm();
  if (!entity) return base;

  const fp = entity.formPayload && typeof entity.formPayload === 'object' ? entity.formPayload : null;
  const { prefix, serial } = splitAwbParts(entity);
  const inferred = routingFromDepartureDisplay(entity.departureDisplay);
  const shipperBlock = [entity.shipperName, entity.shipperAddress, entity.shipperCity, entity.shipperCountry]
    .filter(Boolean)
    .join('\n');
  const consigneeBlock = [entity.consigneeName, entity.consigneeAddress, entity.consigneeCity, entity.consigneeCountry]
    .filter(Boolean)
    .join('\n');

  const fromColumns: MawbFormData = {
    ...base,
    issueDate: entity.issueDate ? String(entity.issueDate).slice(0, 10) : base.issueDate,
    awbPrefix: prefix,
    awbSerial: serial,
    assignOnSave: Boolean(entity.assignOnSave),
    houseNumber: entity.houseNumber || '',
    referenceNumber: entity.referenceNumber || '',
    issuer: entity.issuer || '',
    issuedBy: entity.issuedBy || entity.issuer || '',
    shipperAccountNumber: entity.shipperAccountNumber || '',
    shipperNameAndAddress: shipperBlock || entity.shipperNameAndAddress || '',
    consigneeAccountNumber: entity.consigneeAccountNumber || '',
    consigneeNameAndAddress: consigneeBlock || entity.consigneeNameAndAddress || '',
    agentNameAndCity: entity.agentNameAndCity || base.agentNameAndCity,
    agentIataCode: fullAgentIata(entity.agentIataCode),
    agentAccountNumber: entity.agentAccountNumber || '',
    accountingInformation: entity.accountingInformation || entity.accountingDetails || '',
    optionalShippingInformation: entity.optionalShippingInformation || entity.optionalShippingInfo || '',
    airportOfDeparture: entity.airportOfDeparture || airportCodeFromDisplay(entity.departureDisplay) || '',
    departureDisplay: entity.departureDisplay || entity.airportOfDeparture || '',
    destinationDisplay: entity.destinationDisplay || entity.airportOfDestination || '',
    routeTo1: entity.routeTo1 || inferred.to1,
    routeBy1: entity.routeBy1 || '',
    routeTo2: entity.routeTo2 || inferred.to2,
    routeBy2: entity.routeBy2 || '',
    routeTo3: entity.routeTo3 || inferred.to3,
    routeBy3: entity.routeBy3 || '',
    airportOfDestination: entity.airportOfDestination || airportCodeFromDisplay(entity.destinationDisplay) || entity.destinationDisplay || '',
    requestedFlightsDates: entity.requestedFlightsDates || entity.flightNumber || '',
    flightNumber: splitRequestedFlights(entity.flightNumber, entity.requestedFlightsDates)[0],
    flightNumber2: splitRequestedFlights(entity.flightNumber2, entity.flightNumber, entity.requestedFlightsDates)[1],
    flightDate: entity.requestedFlightDate ? String(entity.requestedFlightDate).slice(0, 10) : '',
    currency: entity.currency || 'USD',
    chgsCode: entity.chgsCode || 'PP',
    weightValuationCharges: (entity.weightValuationCharges as 'PPD' | 'COLL') || 'PPD',
    otherChargesCode: (entity.otherChargesCode as 'PPD' | 'COLL') || 'PPD',
    valueForCarriage: entity.valueForCarriage || entity.declaredValueForCarriage || 'NVD',
    valueForCustoms: entity.valueForCustoms || entity.declaredValueForCustoms || 'NCV',
    insuranceAmount: entity.insuranceAmount || 'XXX',
    handlingInformation: entity.handlingInformation || '',
    sci: entity.sci || '',
    rateLines: parseRateLines(entity, fp),
    otherCharges: parseOtherCharges(fp?.otherCharges ?? entity.otherCharges),
    weightChargePrepaid: Number(entity.weightChargePrepaid ?? entity.weightCharge) || 0,
    weightChargeCollect: Number(entity.weightChargeCollect) || 0,
    totalOtherDueAgentPrepaid: Number(entity.totalOtherDueAgentPrepaid ?? entity.totalOtherChargesDueAgent) || 0,
    totalOtherDueCarrierCollect: Number(entity.totalOtherDueCarrierCollect ?? entity.totalOtherChargesDueCarrier) || 0,
    totalPrepaid: Number(entity.totalPrepaid) || 0,
    totalCollect: Number(entity.totalCollect) || 0,
    natureAndQuantityOfGoods: entity.natureAndQuantityOfGoods || '',
    numberOfPieces: Number(entity.numberOfPieces) || 0,
    grossWeight: Number(entity.grossWeight) || 0,
    notes: entity.notes || '',
    status: entity.status || 'draft',
    executedOnDate: entity.executedOnDate ? String(entity.executedOnDate).slice(0, 10) : base.executedOnDate,
    executedAtPlace: entity.executedAtPlace || 'SANTIAGO',
    signatureOfShipperOrAgent: entity.signatureOfShipperOrAgent || '',
    signatureOfIssuingCarrierOrAgent: entity.signatureOfIssuingCarrierOrAgent || agentDefaultsForPartner().agentNameAndCity.split('\n')[0] || '',
  };

  if (fromColumns.rateLines[0]?.natureAndQuantity && !fromColumns.natureAndQuantityOfGoods) {
    fromColumns.natureAndQuantityOfGoods = fromColumns.rateLines[0].natureAndQuantity;
  }
  if (!fromColumns.weightChargePrepaid && fromColumns.rateLines[0]?.total) {
    fromColumns.weightChargePrepaid = Number(fromColumns.rateLines[0].total) || 0;
    if (!fromColumns.totalPrepaid) fromColumns.totalPrepaid = fromColumns.weightChargePrepaid;
  }

  if (!fp) return fromColumns;
  const merged = { ...fromColumns, ...overlayKnownFormFields(base, fp) };
  const parts = splitAwbParts({ ...entity, ...fp, ...merged, formPayload: fp });
  if (parts.prefix) merged.awbPrefix = parts.prefix;
  if (parts.serial) merged.awbSerial = parts.serial;
  if (fp.accountingDetails && !merged.accountingInformation) {
    merged.accountingInformation = String(fp.accountingDetails);
  }
  if (fp.natureAndQuantity && !merged.natureAndQuantityOfGoods) {
    merged.natureAndQuantityOfGoods = String(fp.natureAndQuantity);
  }
  return merged;
}

export function mawbFormToPayload(form: MawbFormData): Record<string, unknown> {
  const [shipperName = '', ...shipperRest] = form.shipperNameAndAddress.split('\n');
  const [consigneeName = '', ...consigneeRest] = form.consigneeNameAndAddress.split('\n');
  const rate = form.rateLines[0] || emptyRateLine();
  const awbNumber = awbNumberFromParts(form.awbPrefix, form.awbSerial) || undefined;

  const agentDue = form.otherCharges
    .filter((c) => c.entitlement === 'DUE AGENT')
    .reduce((s, c) => s + Number(c.amount || 0), 0);
  const carrierDue = form.otherCharges
    .filter((c) => c.entitlement === 'DUE CARRIER')
    .reduce((s, c) => s + Number(c.amount || 0), 0);

  return {
    awbNumber: awbNumber || undefined,
    awbPrefix: form.awbPrefix,
    awbSerial: form.awbSerial,
    assignOnSave: form.assignOnSave,
    issueDate: form.issueDate || undefined,
    houseNumber: form.houseNumber,
    referenceNumber: form.referenceNumber,
    issuer: form.issuer,
    issuedBy: form.issuedBy,
    shipperAccountNumber: form.shipperAccountNumber,
    shipperName,
    shipperAddress: shipperRest.join('\n'),
    consigneeAccountNumber: form.consigneeAccountNumber,
    consigneeName,
    consigneeAddress: consigneeRest.join('\n'),
    agentNameAndCity: form.agentNameAndCity,
    agentIataCode: form.agentIataCode,
    agentAccountNumber: form.agentAccountNumber,
    accountingInformation: form.accountingInformation,
    optionalShippingInformation: form.optionalShippingInformation,
    airportOfDeparture: form.airportOfDeparture || form.departureDisplay,
    departureDisplay: form.departureDisplay || form.airportOfDeparture,
    destinationDisplay: form.destinationDisplay || form.airportOfDestination,
    airportOfDestination: form.airportOfDestination || form.destinationDisplay,
    routeTo1: form.routeTo1,
    routeBy1: form.routeBy1,
    routeTo2: form.routeTo2,
    routeBy2: form.routeBy2,
    routeTo3: form.routeTo3,
    routeBy3: form.routeBy3,
    requestedFlightsDates: form.requestedFlightsDates,
    flightNumber: form.flightNumber,
    requestedFlightDate: form.flightDate || undefined,
    flightNumber2: form.flightNumber2,
    flightDate2: form.flightDate2 || undefined,
    currency: form.currency,
    chgsCode: form.chgsCode,
    weightValuationCharges: form.weightValuationCharges,
    otherChargesCode: form.otherChargesCode,
    valueForCarriage: form.valueForCarriage,
    valueForCustoms: form.valueForCustoms,
    insuranceAmount: form.insuranceAmount,
    handlingInformation: form.handlingInformation,
    sci: form.sci,
    rateLines: form.rateLines,
    numberOfPieces: form.rateLines.reduce((s, r) => s + Number(r.pieces || 0), 0) || form.numberOfPieces,
    grossWeight: form.rateLines.reduce((s, r) => s + Number(r.grossWeight || 0), 0) || form.grossWeight,
    weightUnit: rate.weightUnit,
    rateClass: rate.rateClass,
    commodityItemNumber: rate.itemNo,
    chargeableWeight: rate.chargeableWeight,
    rateCharge: rate.rate,
    totalCharge: rate.total,
    natureAndQuantityOfGoods: rate.natureAndQuantity || form.natureAndQuantityOfGoods,
    otherCharges: JSON.stringify(form.otherCharges),
    weightCharge: form.weightChargePrepaid,
    weightChargePrepaid: form.weightChargePrepaid,
    weightChargeCollect: form.weightChargeCollect,
    valuationChargePrepaid: form.valuationChargePrepaid,
    valuationChargeCollect: form.valuationChargeCollect,
    taxPrepaid: form.taxPrepaid,
    taxCollect: form.taxCollect,
    totalOtherChargesDueAgent: agentDue || form.totalOtherDueAgentPrepaid,
    totalOtherDueAgentPrepaid: form.totalOtherDueAgentPrepaid || agentDue,
    totalOtherDueAgentCollect: form.totalOtherDueAgentCollect,
    totalOtherChargesDueCarrier: carrierDue || form.totalOtherDueCarrierCollect,
    totalOtherDueCarrierPrepaid: form.totalOtherDueCarrierPrepaid,
    totalOtherDueCarrierCollect: form.totalOtherDueCarrierCollect || carrierDue,
    totalPrepaid: form.totalPrepaid,
    totalCollect: form.totalCollect,
    signatureOfShipperOrAgent: form.signatureOfShipperOrAgent,
    executedOnDate: form.executedOnDate || undefined,
    executedAtPlace: form.executedAtPlace,
    signatureOfIssuingCarrierOrAgent: form.signatureOfIssuingCarrierOrAgent,
    notes: form.notes,
    status: form.status,
    formPayload: form,
  };
}
