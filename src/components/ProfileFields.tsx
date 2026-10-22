import React from 'react'
import { useTranslation } from 'react-i18next'
import { COUNTRIES } from '../lib/eawbAgreement'
import { OrgProfile, ProfileErrors } from '../lib/orgProfile'

export type ProfileSection = 'company' | 'docs' | 'eawb'

const ACCENT = '#8B0000'
const input: React.CSSProperties = { width: '100%', padding: '9px 11px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', background: '#fff' }

function Head({ children, gap }: { children: React.ReactNode; gap?: boolean }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#333', margin: gap ? '10px 0 10px' : '2px 0 10px' }}>{children}</div>
}

function F({ label, help, err, children }: { label: string; help?: string; err?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>{label}</label>
      {children}
      {help && !err && <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{help}</div>}
      {err && <div style={{ fontSize: 12, color: ACCENT, marginTop: 4 }}>{err}</div>}
    </div>
  )
}

export function ProfileFields({ section, profile, errors, onChange }: {
  section: ProfileSection
  profile: OrgProfile
  errors: ProfileErrors
  onChange: (patch: Partial<OrgProfile>) => void
}) {
  const { t } = useTranslation()
  const e = (k: keyof OrgProfile) => (errors[k] ? t(`onboarding.err.${errors[k]}`) : undefined)
  const text = (k: keyof OrgProfile, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input style={{ ...input, borderColor: errors[k] ? ACCENT : '#ddd' }} value={String(profile[k] ?? '')}
      onChange={ev => onChange({ [k]: ev.target.value } as Partial<OrgProfile>)} {...props} />
  )

  const chile = profile.country === 'Chile'
  const taxHelp = chile ? t('onboarding.f.rutHelp') : t('onboarding.f.taxHelp')
  const taxPlaceholder = chile ? '12.345.678-5' : ''

  if (section === 'company') return (
    <>
      <Head>{t('onboarding.f.you')}</Head>
      <F label={t('onboarding.f.contactName')}>{text('contactName', { autoComplete: 'name' })}</F>
      <F label={t(chile ? 'onboarding.f.yourRut' : 'onboarding.f.yourTaxId')} err={e('contactTaxId')} help={chile ? taxHelp : undefined}>
        {text('contactTaxId', { placeholder: taxPlaceholder })}
      </F>
      <Head gap>{t('onboarding.f.yourCompany')}</Head>
      <F label={t('onboarding.f.legalName')} err={e('legalName')}>{text('legalName', { autoComplete: 'organization' })}</F>
      <F label={t(chile ? 'onboarding.f.companyRut' : 'onboarding.f.companyTaxId')} err={e('taxId')} help={taxHelp}>
        {text('taxId', { placeholder: taxPlaceholder })}
      </F>
      <F label={t('onboarding.f.country')} err={e('country')}>
        <select style={{ ...input, borderColor: errors.country ? ACCENT : '#ddd' }} value={profile.country}
          onChange={ev => onChange({ country: ev.target.value })}>
          <option value="">{t('onboarding.f.countryPick')}</option>
          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </F>
      <F label={t('onboarding.f.phone')} err={e('phone')} help={t('onboarding.f.phoneHelp')}>{text('phone', { type: 'tel', autoComplete: 'tel' })}</F>
    </>
  )

  if (section === 'docs') return (
    <>
      <F label={t('onboarding.f.address')}>{text('address', { autoComplete: 'street-address' })}</F>
      <F label={t('onboarding.f.city')}>{text('city')}</F>
      <F label={t('onboarding.f.legalRepName')}>{text('legalRepName')}</F>
      <F label={t('onboarding.f.legalRepTitle')}>{text('legalRepTitle')}</F>
      <F label={t('onboarding.f.airport')} err={e('airportOfDeparture')} help={t('onboarding.f.airportHelp')}>
        {text('airportOfDeparture', { maxLength: 3, placeholder: 'SCL' })}
      </F>
    </>
  )

  return (
    <>
      <F label={t('onboarding.f.agentCode')} err={e('iataAgentCode')} help={t('onboarding.f.agentCodeHelp')}>
        {text('iataAgentCode', { placeholder: '7519012 / N/A' })}
      </F>
      <F label={t('onboarding.f.cassCode')} err={e('cassCode')} help={t('onboarding.f.cassHelp')}>
        {text('cassCode', { placeholder: '0014' })}
      </F>
    </>
  )
}
