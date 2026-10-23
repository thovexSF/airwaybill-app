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

export function lineAmount(item: ProformaLineItem): number {
  return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
}

export function proformaTotals(data: ProformaData): { subtotal: number; tax: number; total: number } {
  const subtotal = data.lineItems.reduce((sum, i) => sum + lineAmount(i), 0)
  const lineTax = data.lineItems.reduce((sum, i) => sum + (parseFloat(i.tax) || 0), 0)
  const tax = (parseFloat(data.tax) || 0) + lineTax
  return { subtotal, tax, total: subtotal + tax }
}
