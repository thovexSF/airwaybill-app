// IATA check digit: last digit of (first 7 digits) mod 7
export function computeCheckDigit(serial: string): string {
  const digits = serial.replace(/\D/g, '').slice(0, 7)
  if (digits.length < 7) return ''
  return String(parseInt(digits, 10) % 7)
}

export function validateAWBSerial(serial: string): boolean {
  const clean = serial.replace(/\D/g, '')
  if (clean.length !== 8) return false
  const expected = computeCheckDigit(clean.slice(0, 7))
  return clean[7] === expected
}

/**
 * Reads what was typed or pasted into the serial box. A full number
 * ("180-19167820") carries the prefix along, which otherwise ends up printed
 * twice ("180-180-19167820") and makes the FWB invalid.
 */
export function splitAwbSerial(value: string): { prefix?: string; serial: string } {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 11) return { prefix: digits.slice(0, 3), serial: digits.slice(3) }
  return { serial: digits.slice(0, 8) }
}
