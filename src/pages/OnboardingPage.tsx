import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProfileFields, ProfileSection } from '../components/ProfileFields'
import { LangSwitcher } from '../components/LangSwitcher'
import {
  OrgProfile, ProfileErrors, fillDocumentDefaults, normalizeProfile, taxIdLabel, useOrgProfile, validateProfile,
} from '../lib/orgProfile'

const ACCENT = '#8B0000'
const STEPS = ['company', 'docs', 'eawb', 'done'] as const

export function OnboardingFlow({ onClose, onOpenEawb }: { onClose: () => void; onOpenEawb: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { orgId, profile, setProfile, loading, save } = useOrgProfile()
  const [step, setStep] = useState(0)
  const [wantEawb, setWantEawb] = useState(false)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => { if (profile.iataAgentCode) setWantEawb(true) }, [profile.iataAgentCode])

  const key = STEPS[step]
  const patch = (p: Partial<OrgProfile>) => { setProfile(prev => ({ ...prev, ...p })); setErrors({}) }

  async function next() {
    const normalized = normalizeProfile(profile)
    const errs = validateProfile(profile, { eawb: key === 'eawb' && wantEawb })
    // Cada paso solo bloquea por sus propios campos.
    const own: Record<string, (keyof OrgProfile)[]> = {
      company: ['legalName', 'country', 'taxId', 'phone'], docs: ['airportOfDeparture'], eawb: ['iataAgentCode', 'cassCode'], done: [],
    }
    const stepErrs: ProfileErrors = {}
    for (const k of own[key]) if (errs[k]) stepErrs[k] = errs[k]
    setErrors(stepErrs)
    if (Object.keys(stepErrs).length) return

    setBusy(true); setMsg(null)
    try {
      const toSave: Partial<OrgProfile> = { ...normalized }
      if (key === 'eawb' && !wantEawb) { toSave.iataAgentCode = ''; toSave.cassCode = '' }
      if (key === 'eawb') toSave.onboardingCompletedAt = new Date().toISOString()
      await save(toSave)
      if (key === 'eawb' && orgId) await fillDocumentDefaults(orgId, normalized)
      setStep(s => s + 1)
    } catch (e: any) { setMsg(e.message) } finally { setBusy(false) }
  }

  async function skip() {
    setBusy(true)
    try { await save({ onboardingDismissedAt: new Date().toISOString() }) } catch { /* se puede retomar desde Configuración */ }
    onClose()
  }

  if (loading) return <div style={{ minHeight: 240 }} />

  return (
    <div style={{ fontFamily: 'system-ui' }}>
      <style>{`@keyframes obIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .ob-card{animation:obIn .25s ease both}
        .ob-seg{height:4px;border-radius:2px;background:#ddd;transition:background .3s}.ob-seg.on{background:${ACCENT}}`}</style>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 28 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>AIRWAYBILL <span style={{ color: ACCENT }}>APP</span></div>
          <LangSwitcher />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {STEPS.map((s, i) => <div key={s} className={`ob-seg${i <= step ? ' on' : ''}`} style={{ flex: 1 }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777', marginBottom: 18 }}>
          <span>{t('onboarding.step', { n: step + 1, total: STEPS.length })} · {t(`onboarding.steps.${key}`)}</span>
          {key !== 'done' && <button onClick={skip} disabled={busy} style={{ background: 'none', border: 0, color: '#777', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>{t('onboarding.skip')}</button>}
        </div>

        <div key={key} className="ob-card">
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>{t(`onboarding.title.${key}`)}</h1>
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px' }}>{t(`onboarding.sub.${key}`)}</p>

          {key === 'company' && <ProfileFields section="company" profile={profile} errors={errors} onChange={patch} />}
          {key === 'docs' && <ProfileFields section="docs" profile={profile} errors={errors} onChange={patch} />}
          {key === 'eawb' && (
            <>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={wantEawb} onChange={e => { setWantEawb(e.target.checked); setErrors({}) }} style={{ marginTop: 3 }} />
                <span><b style={{ fontWeight: 600 }}>{t('onboarding.f.wantEawb')}</b><br /><span style={{ fontSize: 12, color: '#777' }}>{t('onboarding.f.wantEawbHelp')}</span></span>
              </label>
              {wantEawb && <ProfileFields section="eawb" profile={profile} errors={errors} onChange={patch} />}
            </>
          )}
          {key === 'done' && <Summary profile={profile} wantEawb={wantEawb} />}

          {msg && <p style={{ color: ACCENT, fontSize: 13 }}>{msg}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {step > 0 && key !== 'done' ? <button onClick={() => setStep(s => s - 1)} style={ghost}>{t('onboarding.back')}</button> : <span />}
            {key !== 'done' ? (
              <button onClick={next} disabled={busy} style={primary}>{busy ? t('onboarding.saving') : t('onboarding.next')}</button>
            ) : (
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={onClose} style={ghost}>{t('onboarding.done.goHub')}</button>
                {wantEawb && <button onClick={onOpenEawb} style={ghost}>{t('onboarding.done.requestEawb')}</button>}
                <button onClick={() => navigate('/editor')} style={primary}>{t('onboarding.done.newAwb')}</button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Summary({ profile, wantEawb }: { profile: OrgProfile; wantEawb: boolean }) {
  const { t } = useTranslation()
  const rows: [string, string][] = [
    [t('onboarding.f.legalName'), profile.legalName],
    [t('onboarding.f.country'), profile.country],
    [profile.country ? taxIdLabel(profile.country) : '', profile.taxId],
    [t('onboarding.f.legalRepName'), profile.legalRepName],
    [t('onboarding.f.airport'), profile.airportOfDeparture],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <>
      <table style={{ width: '100%', fontSize: 13, marginBottom: 12 }}>
        <tbody>{rows.map(([k, v]) => <tr key={k}><td style={{ color: '#777', padding: '4px 0' }}>{k}</td><td style={{ textAlign: 'right' }}>{v}</td></tr>)}</tbody>
      </table>
      <p style={{ fontSize: 13, color: wantEawb ? '#2f7d32' : '#777', margin: '0 0 16px' }}>
        {wantEawb ? t('onboarding.done.eawbReady') : t('onboarding.done.eawbOff')}
      </p>
    </>
  )
}

const primary: React.CSSProperties = { background: ACCENT, color: '#fff', border: 0, borderRadius: 6, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }
const ghost: React.CSSProperties = { background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 6, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }
