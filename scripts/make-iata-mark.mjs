/**
 * Cuts the IATA winged-globe mark out of the reference waybill reverse and
 * writes one recoloured copy per ink.
 *
 * The mark is centred at the top of the Resolution 600b reverse on real
 * stationery, and on a coloured copy it is printed in that copy's ink like
 * everything else on the sheet — so it ships as one file per colour rather
 * than as a black mark dropped onto a green page.
 *
 * The source is `awb-guides/awb-page-2.png` in the sister `b2b` repo, which is
 * not in this repo; pass its path:
 *   node scripts/make-iata-mark.mjs ../b2b/frontend/public/awb-guides/awb-page-2.png
 *
 * The mark is IATA's trademark. It belongs on an air waybill reverse because
 * that is what the document is; it is not ours to use for anything else.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

const SRC = process.argv[2]
if (!SRC) { console.error('uso: node scripts/make-iata-mark.mjs <awb-page-2.png>'); process.exit(2) }
const OUT_DIR = 'public/awb-iata'

/** Ink per copy, mirroring `src/pdf/awbCopyTheme.ts`. Copies 6-8 reuse 5. */
const INKS = { '1': '#006900', '2': '#bd2a56', '3': '#00007d', '4': '#876d00', '5': '#000000' }

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function decode(file) {
  const buf = fs.readFileSync(file)
  const chunks = []
  let p = 8
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    chunks.push({ type: buf.toString('latin1', p + 4, p + 8), data: buf.subarray(p + 8, p + 8 + len) })
    p += 12 + len
  }
  const ihdr = chunks.find((c) => c.type === 'IHDR').data
  const W = ihdr.readUInt32BE(0), H = ihdr.readUInt32BE(4)
  if (ihdr[8] !== 8 || ihdr[9] !== 2) throw new Error('esperaba RGB de 8 bits')
  const bpp = 3, stride = W * bpp
  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)))
  const px = Buffer.alloc(H * stride)
  let sp = 0
  for (let y = 0; y < H; y++) {
    const f = raw[sp++]
    const row = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      const v = raw[sp++]
      let o
      switch (f) {
        case 0: o = v; break
        case 1: o = v + a; break
        case 2: o = v + b; break
        case 3: o = v + ((a + b) >> 1); break
        case 4: {
          const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c)
          o = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); break
        }
        default: throw new Error(`filtro PNG desconocido: ${f}`)
      }
      row[x] = o & 0xff
    }
  }
  return { W, H, stride, bpp, px }
}

const { W, H, stride, bpp, px } = decode(SRC)
const lum = (x, y) => { const i = y * stride + x * bpp; return (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000 }

// The mark is the only ink in the top tenth of the page, above the first title.
let x0 = W, x1 = 0, y0 = H, y1 = 0
for (let y = 0; y < Math.floor(H * 0.10); y++) {
  for (let x = 0; x < W; x++) {
    if (lum(x, y) < 170) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
}
const pad = 4
x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad)
const w = x1 - x0 + 1, h = y1 - y0 + 1

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const [key, hex] of Object.entries(INKS)) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  const outStride = w * 4
  const raw = Buffer.alloc(h * (1 + outStride))
  let op = 0
  for (let y = 0; y < h; y++) {
    raw[op++] = 0 // filtro: ninguno
    for (let x = 0; x < w; x++) {
      // Alpha carries how dark the source pixel was, so the antialiased edges
      // survive and the paper shows through where there is no ink.
      const alpha = 255 - Math.round(lum(x0 + x, y0 + y))
      raw[op++] = r; raw[op++] = g; raw[op++] = b; raw[op++] = alpha
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0 // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  const file = path.join(OUT_DIR, `${key}.png`)
  fs.writeFileSync(file, png)
  console.log(`${file}: ${w}x${h}, ${hex}, ${(png.length / 1024).toFixed(1)} KB`)
}
