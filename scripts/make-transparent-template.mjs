/**
 * Turns the opaque rasterisation of the blank IATA form into ink-on-transparent.
 *
 * The form is printed on coloured paper — a different colour for each of the
 * eight copies — so the sheet has to sit *over* a background colour instead of
 * carrying its own white one. The source PNG is opaque RGB, so this rewrites it
 * as grey+alpha: every pixel becomes black, and its alpha is how dark it was.
 * White paper turns fully transparent, black rules stay solid, and the grey
 * shaded boxes come through as a darker shade of whatever paper is underneath —
 * which is what printing on coloured stock actually looks like.
 *
 * Run it only when `awb-template.svg` is re-exported:
 *   node scripts/make-transparent-template.mjs
 */
import fs from 'node:fs'
import zlib from 'node:zlib'

const SRC = 'public/awb-template-bg.png'
const OUT = 'public/awb-template-line.png'

function readChunks(buf) {
  const chunks = []
  let p = 8 // signature
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('latin1', p + 4, p + 8)
    chunks.push({ type, data: buf.subarray(p + 8, p + 8 + len) })
    p += 12 + len
  }
  return chunks
}

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const src = fs.readFileSync(SRC)
const chunks = readChunks(src)
const ihdr = chunks.find((c) => c.type === 'IHDR').data
const width = ihdr.readUInt32BE(0)
const height = ihdr.readUInt32BE(4)
const bitDepth = ihdr[8]
const colorType = ihdr[9]
if (bitDepth !== 8 || colorType !== 2) throw new Error(`esperaba RGB de 8 bits, no ${colorType}/${bitDepth}`)

const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)))

// Undo the per-scanline PNG filters (spec 9.2) to get flat RGB.
const bpp = 3
const stride = width * bpp
const px = Buffer.alloc(height * stride)
let sp = 0
for (let y = 0; y < height; y++) {
  const filter = raw[sp++]
  const row = px.subarray(y * stride, (y + 1) * stride)
  const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? row[x - bpp] : 0
    const b = prev ? prev[x] : 0
    const c = prev && x >= bpp ? prev[x - bpp] : 0
    const v = raw[sp++]
    let out
    switch (filter) {
      case 0: out = v; break
      case 1: out = v + a; break
      case 2: out = v + b; break
      case 3: out = v + ((a + b) >> 1); break
      case 4: {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
        break
      }
      default: throw new Error(`filtro PNG desconocido: ${filter}`)
    }
    row[x] = out & 0xff
  }
}

// Grey+alpha: grey stays 0 (the ink is black), alpha carries how dark the pixel was.
const outStride = width * 2
const outRaw = Buffer.alloc(height * (1 + outStride))
let op = 0
let opaque = 0
for (let y = 0; y < height; y++) {
  outRaw[op++] = 0 // filter: none — the data is already highly repetitive
  for (let x = 0; x < width; x++) {
    const i = y * stride + x * bpp
    const lum = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000
    const alpha = 255 - Math.round(lum)
    if (alpha > 0) opaque++
    outRaw[op++] = 0
    outRaw[op++] = alpha
  }
}

const newIhdr = Buffer.from(ihdr)
newIhdr[9] = 4 // grey + alpha
const out = Buffer.concat([
  src.subarray(0, 8),
  chunk('IHDR', newIhdr),
  chunk('IDAT', zlib.deflateSync(outRaw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
fs.writeFileSync(OUT, out)

const pct = ((opaque / (width * height)) * 100).toFixed(2)
console.log(`${OUT}: ${width}x${height}, ${(out.length / 1024).toFixed(0)} KB, ${pct}% de tinta`)
