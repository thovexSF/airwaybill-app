import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { usePlan } from './usePlan'
import { normalizePhone, normalizeAgentCode } from './eawbValidation'

export interface OrgProfile {
  legalName: string
  country: string
  taxId: string
  phone: string
  contactName: string
  address: string
  city: string
  legalRepName: string
  legalRepTitle: string
  airportOfDeparture: string
  iataAgentCode: string
  cassCode: string
  /** Company logo as a (downscaled) data URL; printed on documents with a logo box. */
  companyLogoUrl: string
  /** Signatory's handwritten signature as a (downscaled) data URL, stamped on documents that carry one. */
  signatureUrl: string
  onboardingCompletedAt: string | null
  onboardingDismissedAt: string | null
}

export const EMPTY_PROFILE: OrgProfile = {
  legalName: '', country: '', taxId: '', phone: '', contactName: '', address: '', city: '',
  legalRepName: '', legalRepTitle: '', airportOfDeparture: '', iataAgentCode: '', cassCode: '', companyLogoUrl: '', signatureUrl: '',
  onboardingCompletedAt: null, onboardingDismissedAt: null,
}

const COLS: Record<keyof OrgProfile, string> = {
  legalName: 'legal_name', country: 'country', taxId: 'tax_id', phone: 'phone', contactName: 'contact_name',
  address: 'address', city: 'city', legalRepName: 'legal_rep_name', legalRepTitle: 'legal_rep_title',
  airportOfDeparture: 'airport_of_departure', iataAgentCode: 'iata_agent_code', cassCode: 'cass_code', companyLogoUrl: 'company_logo_url', signatureUrl: 'signature_url',
  onboardingCompletedAt: 'onboarding_completed_at', onboardingDismissedAt: 'onboarding_dismissed_at',
}

function fromRow(row: Record<string, any> | null): OrgProfile {
  const p: any = { ...EMPTY_PROFILE }
  if (row) for (const k of Object.keys(COLS) as (keyof OrgProfile)[]) p[k] = row[COLS[k]] ?? EMPTY_PROFILE[k]
  return p
}

export function toRow(patch: Partial<OrgProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const k of Object.keys(patch) as (keyof OrgProfile)[]) row[COLS[k]] = patch[k]
  return row
}

/** Etiqueta del identificador tributario según el país. */
export const taxIdLabel = (country: string) => (country === 'Chile' ? 'RUT' : 'Tax ID')

export function validRut(raw: string): boolean {
  const s = raw.replace(/[.\s-]/g, '').toUpperCase()
  if (!/^\d{6,8}[\dK]$/.test(s)) return false
  const body = s.slice(0, -1)
  let sum = 0, mul = 2
  for (let i = body.length - 1; i >= 0; i--) { sum += Number(body[i]) * mul; mul = mul === 7 ? 2 : mul + 1 }
  const r = 11 - (sum % 11)
  const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r)
  return s.slice(-1) === dv
}

export function normalizeProfile(p: OrgProfile): OrgProfile {
  return {
    ...p,
    legalName: p.legalName.trim(),
    taxId: p.country === 'Chile' ? p.taxId.replace(/[.\s]/g, '').toUpperCase() : p.taxId.trim(),
    phone: normalizePhone(p.phone),
    legalRepName: p.legalRepName.trim().toUpperCase(),
    airportOfDeparture: p.airportOfDeparture.trim().toUpperCase(),
    iataAgentCode: p.iataAgentCode ? normalizeAgentCode(p.iataAgentCode) : '',
    cassCode: p.cassCode.trim().replace(/[\s\-./]/g, ''),
  }
}

export type ProfileErrors = Partial<Record<keyof OrgProfile, string>>

/** Claves de error i18n (onboarding.err.*). Solo país y razón social son obligatorios. */
export function validateProfile(raw: OrgProfile, opts: { eawb: boolean }): ProfileErrors {
  const p = normalizeProfile(raw)
  const e: ProfileErrors = {}
  if (!p.legalName) e.legalName = 'required'
  if (!p.country) e.country = 'required'
  if (p.country === 'Chile' && p.taxId && !validRut(p.taxId)) e.taxId = 'rut'
  if (p.phone && !/^00\d{8,15}$/.test(p.phone)) e.phone = 'phone'
  if (p.airportOfDeparture && !/^[A-Z]{3}$/.test(p.airportOfDeparture)) e.airportOfDeparture = 'airport'
  if (opts.eawb) {
    if (!/^\d{7}$/.test(p.iataAgentCode) && p.iataAgentCode !== 'N/A') e.iataAgentCode = 'agentCode'
    if (p.cassCode && !/^\d{4}$/.test(p.cassCode)) e.cassCode = 'cass'
  }
  return e
}

export function useOrgProfile() {
  const { orgId } = usePlan()
  const [profile, setProfile] = useState<OrgProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    supabase.from('organization_defaults').select('*').eq('organization_id', orgId).maybeSingle()
      .then(async ({ data }) => {
        const p = fromRow(data)
        if (!p.legalName) {
          // El registro pidió el nombre de la empresa: sirve de punto de partida.
          const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).maybeSingle()
          p.legalName = org?.name ?? ''
        }
        setProfile(p)
      })
      .then(() => setLoading(false), () => setLoading(false))
  }, [orgId])

  const save = useCallback(async (patch: Partial<OrgProfile>) => {
    if (!orgId) throw new Error('no_org')
    const { error } = await supabase
      .from('organization_defaults')
      .upsert({ organization_id: orgId, ...toRow(patch), updated_at: new Date().toISOString() })
    if (error) throw error
    setProfile(p => ({ ...p, ...patch }))
  }, [orgId])

  return { orgId, profile, setProfile, loading, save }
}

/** Al completar el perfil, rellena (sin pisar lo ya escrito) los defaults que usa el editor de AWB. */
export async function fillDocumentDefaults(orgId: string, p: OrgProfile) {
  const { data } = await supabase
    .from('organization_defaults')
    .select('shipper_name_and_address, issuing_carrier_agent')
    .eq('organization_id', orgId)
    .maybeSingle()
  const patch: Record<string, string> = {}
  if (!data?.shipper_name_and_address) {
    patch.shipper_name_and_address = [p.legalName, p.address, [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean).join('\n')
  }
  if (!data?.issuing_carrier_agent) {
    patch.issuing_carrier_agent = [p.legalName, p.city].filter(Boolean).join(', ')
  }
  if (Object.keys(patch).length) {
    await supabase.from('organization_defaults').update(patch).eq('organization_id', orgId)
  }
}

/** Downscales an image to fit `maxW` x `maxH` and returns a PNG data URL (small enough to keep in the profile and in documents). */
function resizeToDataUrl(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, maxW / img.width, maxH / img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * k))
      canvas.height = Math.max(1, Math.round(img.height * k))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'   // JPGs have no alpha: keep the paper white
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid_image')) }
    img.src = url
  })
}

export const logoToDataUrl = (file: File) => resizeToDataUrl(file, 480, 160)
export const signatureToDataUrl = (file: File) => resizeToDataUrl(file, 400, 140)
