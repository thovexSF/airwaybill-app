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
    '^PW812',
    '^LL1016',
    '^LH0,0',
    '^CI28',
    // outer box
    '^FO20,20^GB772,976,3^FS',
    // airline
    '^FO30,35^A0N,28,28^FDAirline^FS',
    `^FO30,70^A0N,48,48^FD${zplEsc(airline)}^FS`,
    '^FO20,140^GB772,3,3^FS',
    // barcode
    `^FO60,160^BY3^BCN,140,N,N,N^FD${zplEsc(payload)}^FS`,
    `^FO60,310^A0N,28,28^FD${zplEsc(payload)}^FS`,
    `^FO560,310^A0N,28,28^FD${zplEsc(pieceLine)}^FS`,
    '^FO20,350^GB772,3,3^FS',
    // AWB number
    '^FO30,365^A0N,24,24^FDAir Waybill Number^FS',
    `^FO80,400^A0N,72,72^FD${zplEsc(awbDisp)}^FS`,
    // destination | departure
    '^FO20,490^GB386,120,3^FS',
    '^FO406,490^GB386,120,3^FS',
    '^FO30,500^A0N,22,22^FDDestination^FS',
    `^FO60,530^A0N,60,60^FD${zplEsc(dest)}^FS`,
    '^FO416,500^A0N,22,22^FDDeparture^FS',
    `^FO450,530^A0N,60,60^FD${zplEsc(dep)}^FS`,
    // other information
    '^FO20,610^GB772,386,3^FS',
    '^FO30,620^A0N,22,22^FDOther Information^FS',
  ]

  let y = 655
  for (const line of other) {
    lines.push(`^FO30,${y}^A0N,24,24^FD${zplEsc(line.slice(0, 55))}^FS`)
    y += 32
    if (y > 960) break
  }

  lines.push('^XZ')
  return lines.join('\n')
}

/**
 * Print through Zebra Browser Print if the local service is running,
 * otherwise fall back to downloading the .zpl file.
 */
export async function sendLabelToZebra(zpl: string, filename = 'label.zpl'): Promise<'browser-print' | 'download'> {
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
      // Browser Print not reachable — fall through to the download path.
    }
  }

  const url = URL.createObjectURL(new Blob([zpl], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'download'
}
