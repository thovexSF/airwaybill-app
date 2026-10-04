import type { AgreementForm } from './eawbAgreement'

/** Claves de error i18n (eawb.err.*). */
export type FormErrors = Partial<Record<keyof AgreementForm, string>>

const LATIN = /^[\p{Script=Latin}\p{N}\s.,'&()/#:;°ºª\-]+$/u
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FREE_MAIL = /@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|aol|proton|protonmail)\./i

/** "75-1 9012" → "7519012"; "n/a" → "N/A". */
export function normalizeAgentCode(raw: string): string {
  const t = raw.trim()
  if (/^n\s*\/?\s*a$/i.test(t)) return 'N/A'
  return t.replace(/[\s\-./]/g, '')
}

/** "+56 2 2234-5678" → "0056222345678" (formato 00 + país + área + número que pide IATA). */
export function normalizePhone(raw: string): string {
  const t = raw.trim().replace(/[\s\-().]/g, '')
  return t.startsWith('+') ? `00${t.slice(1)}` : t
}

export function isFreeMail(email: string): boolean {
  return FREE_MAIL.test(email)
}

export function normalizeForm(f: AgreementForm): AgreementForm {
  const up = (s: string) => s.trim().toUpperCase()
  return {
    ...f,
    companyName: up(f.companyName),
    contactName: up(f.contactName),
    signatoryName: up(f.signatoryName),
    signatory2Name: up(f.signatory2Name),
    iataAgentCode: normalizeAgentCode(f.iataAgentCode),
    cassCode: f.cassCode.trim().replace(/[\s\-./]/g, ''),
    contactPhone: normalizePhone(f.contactPhone),
  }
}

export function validateForm(raw: AgreementForm): FormErrors {
  const f = normalizeForm(raw)
  const e: FormErrors = {}
  const latin = (k: keyof AgreementForm) => {
    const v = String(f[k]).trim()
    if (v && !LATIN.test(v)) e[k] = 'latin'
  }
  const email = (k: keyof AgreementForm) => { if (!EMAIL.test(String(f[k]).trim())) e[k] = 'email' }

  email('submitterEmail'); email('contactEmail'); email('signatoryEmail')
  for (const k of ['submitterName', 'companyName', 'address', 'city', 'contactName', 'contactTitle', 'signatoryName', 'signatoryTitle'] as const) latin(k)

  if (!/^\d{7}$/.test(f.iataAgentCode) && f.iataAgentCode !== 'N/A') e.iataAgentCode = 'agentCode'
  if (f.cassCode && !/^\d{4}$/.test(f.cassCode)) e.cassCode = 'cass'
  if (!/^00\d{8,15}$/.test(f.contactPhone)) e.contactPhone = 'phone'

  if (f.secondSignatory) {
    email('signatory2Email'); latin('signatory2Name'); latin('signatory2Title')
    if (f.signatory2Email.trim().toLowerCase() === f.signatoryEmail.trim().toLowerCase()) e.signatory2Email = 'sameSignatory'
  }
  return e
}
