/**
 * Prints 10×15 cm labels through the operating system's print dialog, so any
 * Zebra installed as a normal printer works — ZPL or EPL (TLP 2844), USB or
 * network — with no local service. The driver turns the image into whatever
 * language the printer speaks.
 */
import { pdfjs } from 'react-pdf'
import { loadPrintOffsetMm } from './labelZpl'

/** 203 dpi: rasterise at the printer's own resolution so the driver doesn't resample. */
const PRINTER_DPI = 203

export async function pdfToImages(blob: Blob): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: PRINTER_DPI / 72 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas } as any).promise
    out.push(canvas.toDataURL('image/png'))
  }
  return out
}

/** One label per page at exactly 100×150 mm, shifted by the saved printer alignment. */
export function printLabelImages(images: string[]): Promise<void> {
  return printPages(images.map(src => `<img src="${src}">`), 100, 150)
}

/**
 * Vector labels (see `designToSvg`) already turned onto the 100×150 stock.
 * A landscape page is not rotated by Chrome or the Zebra driver: it is shrunk
 * to fit across the 10 cm, so the turn has to be ours.
 */
export function printLabelSvgs(svgs: string[]): Promise<void> {
  return printPages(svgs, 100, 150)
}

function printPages(pages: string[], wMm: number, hMm: number): Promise<void> {
  const { x, y } = loadPrintOffsetMm()
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${wMm}mm ${hMm}mm; margin: 0 }
html, body { margin: 0; padding: 0 }
.p { width: ${wMm}mm; height: ${hMm}mm; overflow: hidden; page-break-after: always; break-after: page }
.p:last-child { page-break-after: auto; break-after: auto }
.p > img, .p > svg { display: block; width: ${wMm}mm; height: ${hMm}mm; transform: translate(${x}mm, ${y}mm) }
</style></head><body>${pages.map(p => `<div class="p">${p}</div>`).join('')}</body></html>`

  return new Promise(resolve => {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument!
    doc.open()
    doc.write(html)
    doc.close()

    const win = iframe.contentWindow!
    const imgs = Array.from(doc.images)
    Promise.all(imgs.map(img => (img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r })))).then(() => {
      win.focus()
      win.print()
      // print() blocks until the dialog closes in Chrome/Safari; afterprint covers the rest.
      setTimeout(() => { iframe.remove(); resolve() }, 1000)
    })
  })
}
