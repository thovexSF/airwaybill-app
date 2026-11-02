/**
 * ZPL II for the air cargo label — 4" × 5" @ 203 dpi (812 × 1016 dots).
 * Sent to a Zebra printer through Zebra Browser Print when available,
 * otherwise downloaded as a .zpl file the user can drop on a print queue.
 */
import { awbBarcodePayload, formatAwbDisplay } from './barcode'
import { LabelData, labelAwbNumber } from '../types/label'

/** ^ and ~ are ZPL control prefixes; \ escapes. Strip rather than emit raw. */
function zplEsc(s: string): string {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, ' ')
    .replace(/~/g, ' ')
}

export function buildLabelZpl(data: LabelData): string {
  const awb = labelAwbNumber(data)
  const payload = awbBarcodePayload(awb, data.pieceNumber)
  const awbDisp = formatAwbDisplay(awb)
  const dest = (data.destination || '').toUpperCase().slice(0, 8)
  const dep = (data.departure || '').toUpperCase().slice(0, 8)
  const airline = (data.airline || '').toUpperCase().slice(0, 40)
  const pieceLine = `${data.pieceNumber || '1'} OF ${data.totalPieces || '1'}`

  const other = [
    data.transit ? `TRANSIT: ${data.transit.toUpperCase()}` : '',
    data.agent ? `AGENT: ${data.agent}` : '',
    data.mawbPackages || data.mawbWeight
      ? `MAWB: ${data.mawbPackages || '-'} PCS / ${data.mawbWeight || '-'} KG`
      : '',
    data.identifyPackages && data.hawbNumber ? `HAWB: ${data.hawbNumber}` : '',
    data.identifyPackages && (data.hawbPackages || data.hawbWeight)
      ? `HAWB: ${data.hawbPackages || '-'} PCS / ${data.hawbWeight || '-'} KG`
      : '',
    ...(data.optionalInformation || '').replace(/\r/g, '').split('\n'),
  ]
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 10)

  const lines: string[] = [
    '^XA',
    '^PW800', // 100 mm @ 203 dpi
    '^LL1200', // 150 mm @ 203 dpi
    '^MNY', // gap / web-sensing media
    '^LH0,0',
    '^CI28',
    // outer box
    '^FO20,20^GB760,1160,3^FS',
    // airline
    '^FO30,35^A0N,28,28^FDAirline^FS',
    `^FO30,72^A0N,50,50^FD${zplEsc(airline)}^FS`,
    '^FO20,150^GB760,3,3^FS',
    // barcode
    `^FO70,175^BY3^BCN,160,N,N,N^FD${zplEsc(payload)}^FS`,
    `^FO70,345^A0N,28,28^FD${zplEsc(payload)}^FS`,
    `^FO560,345^A0N,28,28^FD${zplEsc(pieceLine)}^FS`,
    '^FO20,390^GB760,3,3^FS',
    // AWB number
    '^FO30,405^A0N,26,26^FDAir Waybill Number^FS',
    `^FO90,445^A0N,80,80^FD${zplEsc(awbDisp)}^FS`,
    '^FO20,545^GB760,3,3^FS',
    // destination | departure
    '^FO20,555^GB380,140,3^FS',
    '^FO400,555^GB380,140,3^FS',
    '^FO30,565^A0N,24,24^FDDestination^FS',
    `^FO60,600^A0N,66,66^FD${zplEsc(dest)}^FS`,
    '^FO410,565^A0N,24,24^FDDeparture^FS',
    `^FO440,600^A0N,66,66^FD${zplEsc(dep)}^FS`,
    // other information
    '^FO20,705^GB760,475,3^FS',
    '^FO30,715^A0N,24,24^FDOther Information^FS',
  ]

  let y = 755
  for (const line of other) {
    lines.push(`^FO30,${y}^A0N,24,24^FD${zplEsc(line.slice(0, 58))}^FS`)
    y += 34
    if (y > 1150) break
  }

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * One-shot media calibration for the printer: declare gap media and the 10×15
 * label length, persist it (^JUS), then run the auto length/gap calibration
 * (~JC) so the sensor registers to each label. Zebra Setup Utilities is
 * Windows-only, so on macOS this is sent through Browser Print instead.
 */
export function buildCalibrationZpl(): string {
  return ['^XA', '^MNY', '^LL1200', '^JUS', '^XZ', '~JC'].join('\n')
}

/**
 * Talk to the Zebra Browser Print local service directly over its HTTP API —
 * the SDK is only a thin wrapper around these two endpoints, so this avoids
 * bundling Zebra's proprietary JS. The service listens on 9100 (http) and
 * 9101 (https); from an https page the browser blocks the http origin as mixed
 * content, so try the matching scheme first. Returns false if the service
 * isn't running (user hasn't installed/started Browser Print) or refuses.
 */
async function sendViaBrowserPrint(zpl: string): Promise<boolean> {
  const bases =
    location.protocol === 'https:'
      ? ['https://localhost:9101', 'http://localhost:9100']
      : ['http://localhost:9100', 'https://localhost:9101']

  for (const base of bases) {
    try {
      const device = await fetch(`${base}/default?type=printer`).then(r => (r.ok ? r.json() : Promise.reject()))
      const res = await fetch(`${base}/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device, data: zpl }),
      })
      if (res.ok) return true
    } catch {
      // Try the next base, then fall through to download.
    }
  }
  return false
}

/**
 * Print through Zebra Browser Print if the local service is running,
 * otherwise fall back to downloading the .zpl file.
 */
export async function sendLabelToZebra(zpl: string, filename = 'label.zpl'): Promise<'browser-print' | 'download'> {
  // Prefer the SDK if a page ever loads it; otherwise hit the service directly.
  const BrowserPrint = (window as any).BrowserPrint
  if (BrowserPrint?.getDefaultDevice) {
    try {
      const device = await new Promise<any>((resolve, reject) => {
        BrowserPrint.getDefaultDevice('printer', resolve, reject)
      })
      if (device?.send) {
        await new Promise<void>((resolve, reject) => { device.send(zpl, resolve, reject) })
        return 'browser-print'
      }
    } catch {
      // Fall through.
    }
  }

  if (await sendViaBrowserPrint(zpl)) return 'browser-print'

  const url = URL.createObjectURL(new Blob([zpl], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'download'
}
