import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { AWBDocument, AWBCopiesDocument } from '../src/pdf/AWBDocument'
import { DGDDocument } from '../src/pdf/DGDDocument'
import { ManifestDocument } from '../src/pdf/ManifestDocument'
import { LabelDocument } from '../src/pdf/LabelDocument'
import { ProformaDocument } from '../src/pdf/ProformaDocument'
import { BLDocument } from '../src/pdf/BLDocument'
import { BLManifestDocument } from '../src/pdf/BLManifestDocument'
import { IMODGDDocument } from '../src/pdf/IMODGDDocument'
import { NeppexDocument } from '../src/pdf/NeppexDocument'
import { EDIDocument } from '../src/pdf/EDIDocument'

/**
 * `AWBDocument` (and friends) reference fonts/images as root-relative paths
 * — `/awb-fonts/…`, `/awb-copies/…` — because in the browser that resolves
 * against the site origin. Those same modules are imported here to render on
 * the server, where react-pdf's font (fontkit) and image loaders treat a bare
 * "/foo" as a literal filesystem path and read straight off disk — i.e. the
 * real OS root, which has no `public/` on it. Rather than fork every
 * asset-path reference per environment, redirect reads for our known public
 * prefixes to the actual `public/` directory, once, here.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')
const PUBLIC_ASSET_PREFIXES = ['/awb-fonts/', '/awb-copies/', '/awb-iata/', '/awb-airlines/']

function resolvePublicAsset(filePath: string): string {
  const pathOnly = filePath.split('?')[0]
  for (const prefix of PUBLIC_ASSET_PREFIXES) {
    if (pathOnly.startsWith(prefix)) return path.join(PUBLIC_DIR, pathOnly.slice(1))
  }
  return filePath
}

const originalReadFile = fs.readFile
fs.readFile = ((p: fs.PathLike, ...rest: unknown[]) =>
  (originalReadFile as (...args: unknown[]) => void)(typeof p === 'string' ? resolvePublicAsset(p) : p, ...rest)) as typeof fs.readFile

const originalReadFileSync = fs.readFileSync
fs.readFileSync = ((p: fs.PathLike, ...rest: unknown[]) =>
  (originalReadFileSync as (...args: unknown[]) => Buffer | string)(typeof p === 'string' ? resolvePublicAsset(p) : p, ...rest)) as typeof fs.readFileSync

const originalPromisesReadFile = fs.promises.readFile
fs.promises.readFile = ((p: fs.PathLike, ...rest: unknown[]) =>
  (originalPromisesReadFile as (...args: unknown[]) => Promise<Buffer | string>)(typeof p === 'string' ? resolvePublicAsset(p) : p, ...rest)) as typeof fs.promises.readFile

function docTypeOf(data: Record<string, unknown>): string {
  const t = data.docType
  if (typeof t === 'string' && t) return t
  return 'awb'
}

function fileNameFor(data: Record<string, unknown>): string {
  const t = docTypeOf(data)
  if (t === 'hawb') return `HAWB_${data.hawbNumber || 'doc'}.pdf`
  if (t === 'dgd') return `DGD_${data.awbNo || 'doc'}.pdf`
  if (t === 'manifest') return `Manifest_${data.flightNumber || 'doc'}.pdf`
  if (t === 'neppex') return `NEPPEX_${data.neppexNumber || data.rutExportador || 'doc'}.pdf`
  if (t === 'label') return `Label_${[data.awbPrefix, data.awbSerial].filter(Boolean).join('-') || 'doc'}.pdf`
  if (t === 'proforma') return `Proforma_${data.proformaNumber || 'doc'}.pdf`
  if (t === 'bl') return `BL_${data.blNumber || data.documentNumber || 'doc'}.pdf`
  if (t === 'bl_manifest') return `BLManifest_${data.masterBl || 'doc'}.pdf`
  if (t === 'imo_dgd') return `IMODGD_${data.referenceNumber || data.blNumber || 'doc'}.pdf`
  if (t === 'fwb' || t === 'fhl' || t === 'ffr') return `${String(t).toUpperCase()}_${data.awbPrefix || 'doc'}.pdf`
  return `AWB_${data.awbPrefix || 'xxx'}-${data.awbSerial || 'doc'}.pdf`
}

function elementFor(data: any, copies?: string[]) {
  const t = docTypeOf(data)
  // Partner PDFs are never draft watermarks when org is waived
  const clean = { ...data, isDraft: false }

  if (t === 'awb' || t === 'hawb') {
    if (copies?.length) return <AWBCopiesDocument data={clean} copies={copies} />
    return <AWBDocument data={clean} />
  }
  if (t === 'dgd') return <DGDDocument data={clean} />
  if (t === 'manifest') return <ManifestDocument data={clean} />
  if (t === 'label') return <LabelDocument data={clean} />
  if (t === 'proforma') return <ProformaDocument data={clean} />
  if (t === 'bl') return <BLDocument data={clean} />
  if (t === 'bl_manifest') return <BLManifestDocument data={clean} />
  if (t === 'imo_dgd') return <IMODGDDocument data={clean} />
  if (t === 'neppex') return <NeppexDocument data={clean} />
  if (t === 'fwb' || t === 'fhl' || t === 'ffr') return <EDIDocument data={clean} />
  return <AWBDocument data={clean} />
}

export async function renderDocumentPdf(
  data: Record<string, unknown>,
  opts?: { copies?: string[] },
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const el = elementFor(data, opts?.copies)
  const blob = await pdf(el).toBlob()
  const ab = await blob.arrayBuffer()
  return {
    buffer: Buffer.from(ab),
    filename: fileNameFor(data),
    contentType: 'application/pdf',
  }
}

void React
