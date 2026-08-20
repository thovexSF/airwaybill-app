/**
 * Checks `src/pdf/awbConditions.ts` word for word against the text layer of the
 * reference waybill's reverse, so a transcription slip in a contractual text
 * cannot go unnoticed.
 *
 *   node scripts/check-conditions.mjs <ruta-al-awb.pdf>
 *
 * The reference PDF is not in this repo — pass the path to one that carries the
 * Resolution 600b reverse.
 */
import fs from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import {
  CONDITIONS, CONDITIONS_NOTICE, CONDITIONS_NOTICE_TITLE, CONDITIONS_TITLE,
} from '../src/pdf/awbConditions.ts'

const pdfPath = process.argv[2]
if (!pdfPath) { console.error('uso: node scripts/check-conditions.mjs <awb.pdf>'); process.exit(2) }

// Compare on words alone: line breaks, column splits and quote styles differ
// between the source's typesetting and ours, the wording must not.
const words = (s) => s
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)

const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)) }).promise
const tc = await (await doc.getPage(2)).getTextContent()
const source = words(tc.items.map((i) => i.str).join(' '))

const ours = words([
  CONDITIONS_NOTICE_TITLE,
  CONDITIONS_NOTICE,
  CONDITIONS_TITLE,
  ...CONDITIONS.map((c) => `${c.n} ${c.text}`),
].join(' '))

let i = 0, j = 0, diffs = 0
while (i < source.length && j < ours.length) {
  if (source[i] === ours[j]) { i++; j++; continue }
  // The source prints clause numbers as separate runs and drops some trailing
  // dots; skip a token on whichever side is purely numbering.
  const numbering = (w) => /^\d+(\.\d+)*\.?$/.test(w)
  if (numbering(source[i])) { i++; continue }
  if (numbering(ours[j])) { j++; continue }
  diffs++
  console.error(`palabra ${i}: original "${source.slice(i, i + 6).join(' ')}"`)
  console.error(`          nuestro "${ours.slice(j, j + 6).join(' ')}"`)
  break
}

const leftover = source.length - i
if (diffs === 0 && leftover <= 2 && Math.abs(ours.length - j) <= 2) {
  console.log(`ok — ${ours.length} palabras coinciden con el original`)
} else {
  console.error(`FALLA — diferencias: ${diffs}, sobran ${leftover} del original y ${ours.length - j} nuestras`)
  process.exit(1)
}
