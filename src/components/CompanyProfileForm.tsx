import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProfileFields } from './ProfileFields'
import { ProfileErrors, fillDocumentDefaults, logoToDataUrl, normalizeProfile, useOrgProfile, validateProfile } from '../lib/orgProfile'

const ACCENT = '#8b0000'

/** Mismo perfil que el onboarding, editable siempre desde Configuración (usuarios existentes incluidos). */
export function CompanyProfileForm() {
  const { t } = useTranslation()
  const { orgId, profile, setProfile, loading, save } = useOrgProfile()
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateProfile(profile, { eawb: Boolean(profile.iataAgentCode || profile.cassCode) })
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setMsg(null)
    try {
      const p = normalizeProfile(profile)
      await save({ ...p, onboardingCompletedAt: profile.onboardingCompletedAt ?? new Date().toISOString() })
      if (orgId) await fillDocumentDefaults(orgId, p)
      setProfile(p)
      setMsg(t('onboarding.saved'))
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }

  if (loading) return null
  const onChange = (patch: Partial<typeof profile>) => { setProfile(prev => ({ ...prev, ...patch })); setErrors({}) }

  return (
    <form onSubmit={submit} style={{ background: '#fff', borderRadius: 10, padding: 24, marginTop: 32, border: '1px solid #e8dcdc' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: ACCENT, marginBottom: 8 }}>{t('onboarding.settings.title')}</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>{t('onboarding.settings.sub')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 24px' }}>
        <div><ProfileFields section="company" profile={profile} errors={errors} onChange={onChange} /></div>
        <div><ProfileFields section="docs" profile={profile} errors={errors} onChange={onChange} /></div>
        <div><ProfileFields section="eawb" profile={profile} errors={errors} onChange={onChange} /></div>
      </div>
      <div style={{ margin: '4px 0 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 160, height: 54, border: '1px dashed #ccc', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
          {profile.companyLogoUrl
            ? <img src={profile.companyLogoUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <span style={{ fontSize: 11, color: '#aaa' }}>{t('onboarding.f.logo')}</span>}
        </div>
        <div>
          <label style={{ display: 'inline-block', background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {t('onboarding.f.logoUpload')}
            <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
              onChange={async e => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try { onChange({ companyLogoUrl: await logoToDataUrl(f) }) } catch { setMsg(t('onboarding.err.logo')) }
              }} />
          </label>
          {profile.companyLogoUrl && (
            <button type="button" onClick={() => onChange({ companyLogoUrl: '' })}
              style={{ marginLeft: 8, background: 'none', border: 0, color: '#777', textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
              {t('onboarding.f.logoRemove')}
            </button>
          )}
          <div style={{ fontSize: 11, color: '#777', marginTop: 6, maxWidth: 360 }}>{t('onboarding.f.logoHelp')}</div>
        </div>
      </div>
      <button type="submit" disabled={busy} style={{ background: ACCENT, color: '#fff', border: 0, borderRadius: 6, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
        {busy ? t('onboarding.saving') : t('onboarding.save')}
      </button>
      {msg && <span style={{ marginLeft: 12, fontSize: 13, color: '#555' }}>{msg}</span>}
    </form>
  )
}
