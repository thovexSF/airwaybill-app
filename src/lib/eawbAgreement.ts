import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export const IATA_REGISTERED_REPORT_URL = 'https://matchmaker.iata.org/efReport/ffAndAffiliatesAgrReport'
export const IATA_FORM_URL = 'https://iata.formstack.com/forms/multilateral_copy_2'

export type AgreementStatus =
  | 'solicitado' | 'enviado_iata' | 'pendiente_firma' | 'firmado' | 'aprobado' | 'rechazado'

export const STATUS_LABEL: Record<AgreementStatus, string> = {
  solicitado: 'Solicitado / en revisión',
  enviado_iata: 'Enviado a IATA',
  pendiente_firma: 'Pendiente de tu firma',
  firmado: 'Firmado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

export interface AgreementForm {
  submitterName: string
  submitterEmail: string
  companyName: string
  address: string
  city: string
  country: string
  iataAgentCode: string
  cassCode: string
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  signatoryName: string
  signatoryEmail: string
  signatoryTitle: string
  secondSignatory: boolean
  signatory2Name: string
  signatory2Title: string
  signatory2Email: string
  /** Resultado de la consulta a la lista de IATA al solicitar. */
  registryCheck?: { asOf: string | null; status: 'registered' | 'possible' | 'not_found' | 'unavailable' }
  /** Idioma de la UI al solicitar; define el idioma de los correos. */
  locale: 'en' | 'es'
}

export const EMPTY_FORM: AgreementForm = {
  submitterName: '', submitterEmail: '', companyName: '', address: '', city: '', country: 'Chile',
  iataAgentCode: '', cassCode: '', contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
  signatoryName: '', signatoryEmail: '', signatoryTitle: '',
  secondSignatory: false, signatory2Name: '', signatory2Title: '', signatory2Email: '', locale: 'en',
}

export interface AgreementRow {
  id: string
  organization_id: string
  form: AgreementForm
  status: AgreementStatus
  authorized_at: string
  iata_checked_at: string | null
  sent_to_iata_at: string | null
  signed_pdf_path: string | null
  signed_at: string | null
  estimated_ready_at: string | null
  approved_at: string | null
  admin_note: string | null
  created_at: string
}

/** IDs de campo del Formstack de IATA; ver docs/IATA_FORMSTACK_FIELDS.md. */
export function iataPrefillUrl(f: AgreementForm): string {
  const q = new URLSearchParams()
  const set = (id: number, v: string) => { if (v) q.set(`field${id}`, v) }
  set(164242326, f.submitterName)
  set(164242327, f.submitterEmail)
  set(164242330, f.companyName)
  set(164242331, f.address)
  set(164242332, f.city)
  set(164242333, f.country)
  set(164242334, f.iataAgentCode || 'N/A')
  set(164242335, f.cassCode)
  set(164242337, f.contactName)
  set(164242338, f.contactTitle)
  set(164242339, f.contactEmail)
  set(164242340, f.contactPhone)
  set(164242343, f.signatoryName)
  set(164242344, f.signatoryEmail)
  set(164242345, f.signatoryTitle)
  q.set('field164242346', f.secondSignatory ? 'Yes' : 'No')
  if (f.secondSignatory) {
    set(164242348, f.signatory2Name)
    set(164242349, f.signatory2Title)
    set(164242350, f.signatory2Email)
  }
  q.set('field164242362', 'No')
  return `${IATA_FORM_URL}?${q.toString()}`
}

export async function listAgreements(orgId: string): Promise<AgreementRow[]> {
  const { data, error } = await supabase
    .from('eawb_agreements')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as AgreementRow[]) ?? []
}

export async function requestAgreement(orgId: string, userId: string, form: AgreementForm) {
  const { error } = await supabase
    .from('eawb_agreements')
    .insert({ organization_id: orgId, user_id: userId, form })
  if (error) throw error
}

export async function uploadSignedAgreement(orgId: string, agreementId: string, file: File) {
  const path = `${orgId}/${agreementId}.pdf`
  const up = await supabase.storage.from('eawb-agreements').upload(path, file, {
    upsert: true, contentType: 'application/pdf',
  })
  if (up.error) throw up.error
  const { error } = await supabase.rpc('eawb_attach_signed', { p_id: agreementId, p_path: path })
  if (error) throw error
}

export const COUNTRIES = "Afghanistan|Albania|Algeria|American Samoa|Andorra|Angola|Anguilla|Antigua And Barbuda|Argentina|Armenia|Aruba|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bermuda|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|British Indian Ocean Territory|Brunei Darussalam|Bulgaria|Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Cape Verde|Cayman Islands|Central African Republic|Chad|Chile|China (People's Republic of)|Chinese Taipei|Colombia|Comoros|Congo|Congo, the Democratic Republic of the|Costa Rica|Côte d'Ivoire|Croatia|Cuba|Cyprus|Czech Republic|Denmark|Djibouti|Dominica|Dominican Republic|Timor-Leste|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|Estonia|Ethiopia|Falkland Islands (Malvinas)|Faroe Islands|Fiji|Finland|France|French Guiana|French Polynesia|French Southern Territories|Gabon|Gambia|Georgia|Germany|Ghana|Gibraltar|Greece|Greenland|Grenada|Guadeloupe|Guam|Guatemala|Guinea|Guinea-Bissau|Guyana|Haiti|Honduras|Hong Kong SAR, China|Hungary|Iceland|India|Indonesia|Iran, Islamic Republic of|Iraq|Ireland|Israel|Italy|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kiribati|Korea, Democratic People's Republic of|Korea, Republic of|Kosovo|Kuwait|Kyrgyzstan|Lao People's Democratic Republic|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Macao SAR, China|Macedonia, the former Yugoslav Republic of|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|Martinique|Mauritania|Mauritius|Mayotte|Mexico|Micronesia, Federal States of|Moldova, Republic of|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nepal|Netherlands|Netherlands Antilles|New Caledonia|New Zealand|Nicaragua|Niger|Nigeria|Niue|Northern Mariana Islands|Norway|Oman|Pakistan|Palau|Palestinian Territories|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Pitcairn|Poland|Portugal|Puerto Rico|Qatar|Réunion|Romania|Russian Federation|Rwanda|Saint Helena|Saint Kitts and Nevis|Saint Lucia|Saint Pierre and Miquelon|Saint Vincent and the Grenadines|Samoa|San Marino|Sao Tome and Principe|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|Spain|Sri Lanka|Sudan|Suriname|Swaziland|Sweden|Switzerland|Syrian Arab Republic|Tajikistan|Tanzania, United Republic of|Thailand|Togo|Tonga|Trinidad and Tobago|Tunisia|Turkey|Turkmenistan|Turks and Caicos Islands|Tuvalu|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Venezuela|Vietnam|Virgin British Islands|Virgin Islands, US|Wallis and Futuna|Western Sahara|Yemen|Zambia|Zimbabwe|Montserrat|Bonaire, Saba, St. Eustatius|Curaçao|Saint Maarten|South Sudan|Cook Islands".split('|')

export interface RegistryMatch { companyName: string; countryName: string; city: string; joiningDate: string | null; comments: string | null }
export interface RegistryCheck {
  available: boolean
  status: 'registered' | 'possible' | 'not_found' | 'unavailable'
  asOf: string | null
  matches: RegistryMatch[]
}

export async function checkRegistry(companyName: string): Promise<RegistryCheck> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('no_session')
  const res = await fetch(`/v1/eawb/registry-check?name=${encodeURIComponent(companyName)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`registry_${res.status}`)
  return res.json()
}

export function fmtAsOf(iso: string, locale: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-GB', { dateStyle: 'long' })
}

/** Consulta (con retardo) si una razón social ya figura en la lista de IATA; `null` mientras no hay resultado. */
export function useRegistryCheck(companyName: string) {
  const [registry, setRegistry] = useState<RegistryCheck | null>(null)
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    setRegistry(null)
    if (companyName.trim().length < 3) return
    setChecking(true)
    const h = setTimeout(() => {
      checkRegistry(companyName).then(setRegistry).catch(() => setRegistry(null)).finally(() => setChecking(false))
    }, 400)
    return () => { clearTimeout(h); setChecking(false) }
  }, [companyName])
  return { registry, checking }
}

export function registryList(r: RegistryCheck): string {
  return r.matches.map(m => `${m.companyName} (${m.countryName}${m.joiningDate ? `, ${m.joiningDate}` : ''})`).join('; ')
}
