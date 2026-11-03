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

/** 203 dpi → 8 dots/mm. Printer alignment offset comes in from the editor. */
export const DOTS_PER_MM = 8
/** Keep the shift inside the 20-dot margins so content never clips off the label. */
export function clampOffsetDots(dots: number): number {
  return Math.max(-20, Math.min(20, Math.round(dots)))
}

export function buildLabelZpl(data: LabelData, offsetXDots = 0, offsetYDots = 0): string {
  const ox = clampOffsetDots(offsetXDots)
  const oy = clampOffsetDots(offsetYDots)
  const fo = (x: number, y: number) => `^FO${x + ox},${y + oy}`
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
    `${fo(20, 20)}^GB760,1160,3^FS`,
    // airline
    `${fo(30, 35)}^A0N,28,28^FDAirline^FS`,
    `${fo(30, 72)}^A0N,50,50^FD${zplEsc(airline)}^FS`,
    `${fo(20, 150)}^GB760,3,3^FS`,
    // barcode
    `${fo(70, 175)}^BY3^BCN,160,N,N,N^FD${zplEsc(payload)}^FS`,
    `${fo(70, 345)}^A0N,28,28^FD${zplEsc(payload)}^FS`,
    `${fo(560, 345)}^A0N,28,28^FD${zplEsc(pieceLine)}^FS`,
    `${fo(20, 390)}^GB760,3,3^FS`,
    // AWB number
    `${fo(30, 405)}^A0N,26,26^FDAir Waybill Number^FS`,
    `${fo(90, 445)}^A0N,80,80^FD${zplEsc(awbDisp)}^FS`,
    `${fo(20, 545)}^GB760,3,3^FS`,
    // destination | departure
    `${fo(20, 555)}^GB380,140,3^FS`,
    `${fo(400, 555)}^GB380,140,3^FS`,
    `${fo(30, 565)}^A0N,24,24^FDDestination^FS`,
    `${fo(60, 600)}^A0N,66,66^FD${zplEsc(dest)}^FS`,
    `${fo(410, 565)}^A0N,24,24^FDDeparture^FS`,
    `${fo(440, 600)}^A0N,66,66^FD${zplEsc(dep)}^FS`,
    // other information
    `${fo(20, 705)}^GB760,475,3^FS`,
    `${fo(30, 715)}^A0N,24,24^FDOther Information^FS`,
  ]

  let y = 755
  for (const line of other) {
    lines.push(`${fo(30, y)}^A0N,24,24^FD${zplEsc(line.slice(0, 58))}^FS`)
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

type BrowserPrintOutcome = 'browser-print' | 'printer-error' | 'blocked' | false

// Same shape the official SDK posts. version is always 2 there, not the
// version field Browser Print reports on the device.
function sdkDevice(d: Record<string, unknown>) {
  return {
    name: d.name,
    uid: d.uid,
    connection: d.connection,
    deviceType: d.deviceType,
    version: 2,
    provider: d.provider,
    manufacturer: d.manufacturer,
  }
}

// Chrome (SDK 3.1) always uses http://127.0.0.1:9100. Safari on an https page
// cannot, so it uses the service's https port. `targetAddressSpace` is what
// lets an https app reach that http port: without it Chrome treats the call as
// mixed content / an unknown address space and fails before Browser Print sees it.
function browserPrintBases(): string[] {
  const safariHttps = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && location.protocol === 'https:'
  const http = 'http://127.0.0.1:9100'
  const https = 'https://127.0.0.1:9101'
  return safariHttps ? [https, http] : [http, https]
}

function bpFetch(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, targetAddressSpace: 'loopback' } as RequestInit)
}

async function loopbackBlocked(): Promise<boolean> {
  // On http://localhost the call is same-machine and needs no permission.
  // Only an https page is gated, and only when the service never answered.
  if (location.protocol !== 'https:') return false
  try {
    const status = await navigator.permissions.query({ name: 'loopback-network' as PermissionName })
    return status.state === 'denied' || status.state === 'prompt'
  } catch {
    return false
  }
}

/**
 * Talk to the Zebra Browser Print local service directly over its HTTP API —
 * the SDK is only a thin wrapper around these endpoints, so this avoids
 * bundling Zebra's proprietary JS.
 *
 * `/default` is not safe to print to: after the printer re-enumerates on USB
 * its uid changes (…addr_004 → …addr_003) and the cached default keeps the old
 * one, so `/write` answers 500 "Unable to establish connection" while
 * `/available` already lists the live device. Content-Type stays text/plain,
 * same as the SDK — application/json triggers a preflight this service does
 * not answer.
 */
async function sendViaBrowserPrint(zpl: string): Promise<BrowserPrintOutcome> {
  let reached = false
  for (const base of browserPrintBases()) {
    let printers: Record<string, unknown>[]
    try {
      const res = await bpFetch(`${base}/available`)
      if (!res.ok) continue
      const body = await res.json()
      printers = Array.isArray(body?.printer) ? body.printer : []
    } catch {
      continue
    }
    reached = true
    for (const printer of printers) {
      try {
        const res = await bpFetch(`${base}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ device: sdkDevice(printer), data: zpl }),
        })
        if (res.ok) return 'browser-print'
      } catch {
        // This base answered; another printer on it may still accept the job.
      }
    }
    break
  }
  if (reached) return 'printer-error'
  if (await loopbackBlocked()) return 'blocked'
  return false
}

/**
 * Print through Zebra Browser Print if the local service is running,
 * otherwise fall back to downloading the .zpl file.
 */
export async function sendLabelToZebra(zpl: string, filename = 'label.zpl'): Promise<'browser-print' | 'printer-error' | 'blocked' | 'download'> {
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

  const via = await sendViaBrowserPrint(zpl)
  if (via) return via

  const url = URL.createObjectURL(new Blob([zpl], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'download'
}
