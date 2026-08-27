/**
 * Registry of every document type the suite can create. MyAWBsPage uses it to
 * badge, label, route and list saved documents, so adding a document type
 * means adding one entry here rather than another branch in a ternary chain.
 */
export interface DocTypeMeta {
  /** `docType` discriminator stored in awb_documents.data */
  type: string
  /** Badge text in the list */
  badge: string
  /** Human name in the "new document" menu */
  name: string
  /** Badge / button background */
  color: string
  /** Editor route (the document id is appended as ?id=) */
  route: string
  /** Headline shown in the list for a saved document */
  title: (d: any) => string
  /** Requires a paid plan to create */
  pro: boolean
}

const awbNumber = (d: any) => (d.awbPrefix && d.awbSerial ? `${d.awbPrefix}-${d.awbSerial}` : '')

export const DOC_TYPES: DocTypeMeta[] = [
  {
    type: 'awb', badge: 'MAWB', name: 'Master Air Waybill', color: '#8b0000', route: '/editor', pro: false,
    title: d => awbNumber(d) || '—',
  },
  {
    type: 'hawb', badge: 'HAWB', name: 'House Air Waybill', color: '#1a3a5c', route: '/editor', pro: true,
    title: d => d.hawbNumber || awbNumber(d) || '—',
  },
  {
    type: 'manifest', badge: 'MANIFEST', name: 'Cargo Manifest', color: '#1a5c3a', route: '/manifest', pro: true,
    title: d => (d.flightNumber ? `${d.flightNumber} ${d.flightDate || ''}`.trim() : 'Manifest'),
  },
  {
    type: 'dgd', badge: 'DGD', name: "Shipper's Declaration for Dangerous Goods", color: '#7a3a00', route: '/dgd', pro: true,
    title: d => d.awbNo || 'DGD',
  },
  {
    type: 'label', badge: 'LABEL', name: 'Air Cargo Label (Zebra)', color: '#3a1a5c', route: '/label', pro: true,
    title: d => {
      const awb = [d.awbPrefix, d.awbSerial].filter(Boolean).join('-')
      return awb ? `${awb} · ${d.pieceNumber || 1}/${d.totalPieces || 1}` : 'Label'
    },
  },
  {
    type: 'bl', badge: 'B/L', name: 'House Bill of Lading', color: '#1a4a5c', route: '/bl', pro: true,
    title: d => d.blNumber || d.documentNumber || 'B/L',
  },
  {
    type: 'bl_manifest', badge: 'B/L MANIFEST', name: 'B/L Consolidation Manifest', color: '#1a5c4a', route: '/bl-manifest', pro: true,
    title: d => d.masterBl || 'B/L Manifest',
  },
  {
    type: 'imo_dgd', badge: 'IMO DGD', name: 'IMO / IMDG Dangerous Goods Form', color: '#7a3a00', route: '/imo-dgd', pro: true,
    title: d => d.referenceNumber || d.blNumber || 'IMO DGD',
  },
  {
    type: 'neppex', badge: 'NEPPEX', name: 'NEPPEX (SERNAPESCA F15)', color: '#0d4a6b', route: '/neppex', pro: true,
    title: d => d.neppexNumber || d.rutExportador || 'NEPPEX',
  },
  {
    type: 'proforma', badge: 'PROFORMA', name: 'Proforma Invoice', color: '#5c3a1a', route: '/proforma', pro: true,
    title: d => d.proformaNumber || 'Proforma',
  },
  {
    type: 'fwb', badge: 'FWB', name: 'FWB — Freight Waybill message', color: '#33305c', route: '/edi/fwb', pro: true,
    title: d => awbNumber(d) || 'FWB',
  },
  {
    type: 'fhl', badge: 'FHL', name: 'FHL — House waybill message', color: '#33305c', route: '/edi/fhl', pro: true,
    title: d => d.hwbNumber || awbNumber(d) || 'FHL',
  },
  {
    type: 'ffr', badge: 'FFR', name: 'FFR — Space allocation request', color: '#33305c', route: '/edi/ffr', pro: true,
    title: d => awbNumber(d) || 'FFR',
  },
]

/** Tabs of the B2B-style document hub (EDI types stay in the “+” menu / EDI routes). */
export const HUB_DOC_TYPES: DocTypeMeta[] = DOC_TYPES.filter(
  (t) => !['fwb', 'fhl', 'ffr'].includes(t.type),
)

const AWB_META = DOC_TYPES[0]

export function docTypeMeta(docType?: string): DocTypeMeta {
  return DOC_TYPES.find(t => t.type === docType) ?? AWB_META
}
