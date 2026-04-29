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
