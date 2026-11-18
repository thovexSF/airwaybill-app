import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai'

// Same provider and key as the translation (GEMINI_API_KEY); created on first use.
let gemini: GoogleGenerativeAI | null = null

const TEXT_FIELDS = [
  'proformaNumber', 'issueDate', 'dueDate', 'awbNumber', 'otherReferences',
  'seller', 'buyer', 'shipper', 'consignee',
  'origin', 'destination', 'currency', 'transportDetails', 'incoterms', 'paymentTerms',
  'tax', 'bankDetails', 'notes',
] as const

export type ExtractedProforma = Partial<Record<(typeof TEXT_FIELDS)[number], string>> & {
  lineItems?: { description: string; quantity: string; unit: string; unitPrice: string }[]
}

const str = { type: SchemaType.STRING } as const
const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    ...Object.fromEntries(TEXT_FIELDS.map(k => [k, str])),
    lineItems: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: { description: str, quantity: str, unit: str, unitPrice: str },
      },
    },
  },
}

const instructions =
  'You read a commercial or proforma invoice, packing list, purchase order or similar trade document and fill the ' +
  'fields of an air cargo proforma invoice. Copy names, addresses, references and descriptions exactly as written ' +
  '(keep their line breaks: name, then address lines, then tax ID and phone). seller = who issues the invoice; ' +
  'buyer = who is billed; shipper and consignee only if the document names them separately. origin and destination ' +
  'are "City, Country". currency is the ISO code (USD, CLP, EUR). Dates as YYYY-MM-DD. lineItems: one per product ' +
  'line, quantity as a plain number, unit as written (pcs, kg, packs), unitPrice as a plain number with a dot as ' +
  'decimal separator and no thousands separator; never put the line total in unitPrice. tax is the total tax amount ' +
  'as a plain number. Leave any field the document does not show empty; never invent values.'

/** Reads a PDF, an image or pasted text into proforma fields. Returns only fields it found. */
export async function extractProforma(input: { mime: string; data: Buffer } | { text: string }): Promise<ExtractedProforma> {
  gemini ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = gemini.getGenerativeModel({
    model: process.env.EXTRACT_MODEL || 'gemini-2.5-flash',
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  })
  const doc = 'text' in input
    ? { text: input.text }
    : { inlineData: { mimeType: input.mime, data: input.data.toString('base64') } }
  const result = await model.generateContent([{ text: instructions }, doc])
  const raw = JSON.parse(result.response.text()) as Record<string, unknown>

  const out: ExtractedProforma = {}
  for (const k of TEXT_FIELDS) {
    const v = raw[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  if (Array.isArray(raw.lineItems)) {
    const s = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
    const items = raw.lineItems
      .map((i: any) => ({ description: s(i?.description), quantity: s(i?.quantity), unit: s(i?.unit), unitPrice: s(i?.unitPrice) }))
      .filter(i => i.description || i.quantity || i.unitPrice)
    if (items.length) out.lineItems = items
  }
  return out
}
