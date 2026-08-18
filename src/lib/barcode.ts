import JsBarcode from 'jsbarcode'

/**
 * IATA air cargo label barcode payload: the 11 AWB digits followed by a
 * 4-digit piece number (e.g. "18013723124" + "0003"), per the Cargo-IMP
 * label standard. Non-digits in the AWB number are stripped.
 */
export function awbBarcodePayload(awbNumber: string, pieceNumber: string | number = 1): string {
  const digits = String(awbNumber || '').replace(/\D/g, '')
  const piece = String(Math.max(1, Number(pieceNumber) || 1)).padStart(4, '0')
  return `${digits}${piece}`
}

/** Format an AWB number for display: "180 - 13723124". */
export function formatAwbDisplay(awbNumber: string): string {
  const digits = String(awbNumber || '').replace(/\D/g, '')
  if (digits.length >= 11) return `${digits.slice(0, 3)} - ${digits.slice(3, 11)}`
  if (digits.length > 3) return `${digits.slice(0, 3)} - ${digits.slice(3)}`
  return awbNumber || ''
}

/**
 * Code 128 barcode as a PNG data URL, for embedding in a react-pdf <Image>.
 * Returns an empty string when the canvas is unavailable (SSR/tests) so
 * callers can fall back to the human-readable payload.
 */
export function barcodeDataUrl(value: string, opts?: { width?: number; height?: number }): string {
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value || '0', {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: opts?.width ?? 2,
      height: opts?.height ?? 80,
      background: '#ffffff',
      lineColor: '#000000',
    })
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}
