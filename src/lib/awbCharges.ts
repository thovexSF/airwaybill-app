// Currencies with no minor unit; everything else (USD, EUR…) prints two decimals.
const ZERO_DECIMAL_CURRENCIES = new Set(['CLP', 'JPY', 'KRW', 'PYG'])

/** A charge as typed on a waybill: "1250.00", never "1250" or a float remainder. Text that isn't a number prints as typed. */
export function formatCharge(value: unknown, currency?: string): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n)) return raw
  return n.toFixed(ZERO_DECIMAL_CURRENCIES.has((currency ?? '').trim().toUpperCase()) ? 0 : 2)
}
