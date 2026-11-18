export interface ProformaLineItem {
  id: string
  description: string
  quantity: string
  unit: string
  unitPrice: string
  tax: string
}

export interface ProformaData {
  docType: 'proforma'

  // Header
  proformaNumber: string
  issueDate: string
  dueDate: string
  awbNumber: string
  otherReferences: string

  // Parties
  /** Logo printed in "Issued by": a public path, an uploaded image as a data URL, or '' for none. */
  sellerLogo?: string
  /** Where the logo sits and how big, in PDF points; absent = the default top-left slot. */
  sellerLogoBox?: { x: number; y: number; w: number; h: number }
  seller: string
  buyer: string
  shipper: string
  consignee: string

  // Shipment
  origin: string
  destination: string
  currency: string
  transportDetails: string
  paymentTerms: string
  incoterms: string

  // Goods
  lineItems: ProformaLineItem[]
  tax: string

  // Footer
  bankDetails: string
  notes: string
  sellerAuthDate: string
  sellerAuthPlace: string
  sellerSignature: string
  buyerAuthDate: string
  buyerAuthPlace: string
  buyerSignature: string

  // Meta
  isDraft: boolean
  /** Set once "AWB" lives inside the references text; older documents kept only the number. */
  awbLabelInline?: boolean
  /** Language shown and printed; the typed text has one saved version per language. */
  language?: 'en' | 'es'
  versions?: { en?: Record<string, string>; es?: Record<string, string> }
}

export const emptyProformaLine = (id: string): ProformaLineItem => ({
  id,
  description: '',
  quantity: '',
  unit: '',
  unitPrice: '',
  tax: '',
})

export const defaultProformaData: ProformaData = {
  docType: 'proforma',
  proformaNumber: '',
  issueDate: '',
  dueDate: '',
  awbNumber: '',
  otherReferences: '',
  sellerLogo: '',
  seller: '',
  buyer: '',
  shipper: '',
  consignee: '',
  origin: '',
  destination: '',
  currency: 'USD',
  transportDetails: '',
  paymentTerms: '',
  incoterms: '',
  lineItems: [emptyProformaLine('1')],
  tax: '',
  bankDetails: '',
  notes: '',
  sellerAuthDate: '',
  sellerAuthPlace: '',
  sellerSignature: '',
  buyerAuthDate: '',
  buyerAuthPlace: '',
  buyerSignature: '',
  isDraft: true,
}

export const B2B_EXPRESS_LOGO = '/proforma-logos/b2b-express.png'
export const B2B_SERVICIOS_LOGO = '/proforma-logos/b2b-servicios.png'

/**
 * The leading number of a cell, read with either decimal separator: "3,47",
 * "3.47", "1.234,56", "1,234.56", "8 packs". With both separators the last one
 * is the decimal point; a lone comma is a decimal comma, as typed in Chile.
 */
export function parseAmount(raw: string): number {
  const m = /^\s*-?[\d.,]+/.exec(raw || '')
  if (!m) return 0
  let t = m[0].trim()
  const dot = t.lastIndexOf('.')
  const comma = t.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) t = dot > comma ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.')
  else if (comma >= 0) t = t.replace(',', '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}

export function lineAmount(item: ProformaLineItem): number {
  return parseAmount(item.quantity) * parseAmount(item.unitPrice)
}

export function proformaTotals(data: ProformaData): { subtotal: number; tax: number; total: number } {
  const subtotal = data.lineItems.reduce((sum, i) => sum + lineAmount(i), 0)
  const lineTax = data.lineItems.reduce((sum, i) => sum + parseAmount(i.tax), 0)
  const tax = parseAmount(data.tax) + lineTax
  return { subtotal, tax, total: subtotal + tax }
}
