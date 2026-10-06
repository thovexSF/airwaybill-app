import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { useOrgProfile } from '../lib/orgProfile'
import { FormErrors, isFreeMail, normalizeForm, validateForm } from '../lib/eawbValidation'
import {
  AgreementForm, AgreementRow, COUNTRIES, EMPTY_FORM, RegistryCheck, checkRegistry, fmtAsOf, registryList,
  listAgreements, requestAgreement, uploadSignedAgreement,
} from '../lib/eawbAgreement'

const ACCENT = '#8B0000'

export function EawbAgreementFlow({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { orgId } = usePlan()
  const { profile, loading: profileLoading } = useOrgProfile()
  const locale: 'en' | 'es' = i18n.language === 'es' ? 'es' : 'en'
  const [rows, setRows] = useState<AgreementRow[]>([])
  const [form, setForm] = useState<AgreementForm>({ ...EMPTY_FORM, submitterEmail: user?.email ?? '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [registry, setRegistry] = useState<RegistryCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [forceForm, setForceForm] = useState(false)
  const [firstCheckDone, setFirstCheckDone] = useState(false)

  useEffect(() => {
    setRegistry(null)
    if (form.companyName.trim().length < 3) return
    setChecking(true)
    const h = setTimeout(() => {
      checkRegistry(form.companyName)
        .then(setRegistry)
        .catch(() => setRegistry(null))
        .finally(() => { setChecking(false); setFirstCheckDone(true) })
    }, 600)
    return () => { clearTimeout(h); setChecking(false) }
  }, [form.companyName])

  useEffect(() => {
    // Prellena desde el perfil de empresa, sin pisar lo que el usuario ya escribió.
    if (profileLoading) return
    const up = (v: string) => v.toUpperCase()
    setForm(f => ({
      ...f,
      submitterName: f.submitterName || profile.contactName,
      companyName: f.companyName || up(profile.legalName),
      address: f.address || profile.address,
      city: f.city || profile.city,
      country: profile.country || f.country,
      iataAgentCode: f.iataAgentCode || profile.iataAgentCode,
      cassCode: f.cassCode || profile.cassCode,
      contactName: f.contactName || up(profile.contactName),
      contactEmail: f.contactEmail || user?.email || '',
      contactPhone: f.contactPhone || profile.phone,
      signatoryName: f.signatoryName || up(profile.legalRepName),
      signatoryTitle: f.signatoryTitle || profile.legalRepTitle,
    }))
  }, [profileLoading, profile, user?.email])

  const load = useCallback(async () => {
    if (orgId) setRows(await listAgreements(orgId))
  }, [orgId])
  useEffect(() => { load().catch(e => setMsg(e.message)) }, [load])

  const set = <K extends keyof AgreementForm>(k: K, v: AgreementForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const err = (k: keyof AgreementForm) => (errors[k] ? t(`eawb.err.${errors[k]}`) : undefined)
  const active = rows.find(r => r.status !== 'rechazado')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !user || registry?.status === 'registered') return
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length) { setMsg(t('eawb.fixErrors')); return }
    setBusy(true); setMsg(null)
    try {
      await requestAgreement(orgId, user.id, {
        ...normalizeForm(form), locale,
        registryCheck: registry?.available ? { asOf: registry.asOf, status: registry.status } : undefined,
      })
      await load()
    } catch (e2: any) { setMsg(e2.message) } finally { setBusy(false) }
  }

  async function onSigned(r: AgreementRow, file: File) {
    if (!orgId) return
    setBusy(true); setMsg(null)
    try {
      await uploadSignedAgreement(orgId, r.id, file)
      await load()
    } catch (e2: any) { setMsg(e2.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 28px 4px 0' }}>{t('eawb.title')}</h1>
      <p style={{ color: '#666', fontSize: 13 }}>{t('eawb.intro')}</p>
      {msg && <p style={{ color: ACCENT, fontSize: 13 }}>{msg}</p>}

      {active ? (
        <Status r={active} busy={busy} onSigned={f => onSigned(active, f)} />
      ) : (profileLoading || (form.companyName.trim().length >= 3 && !firstCheckDone)) ? (
        <p style={{ fontSize: 13, color: '#777' }}>{t('eawb.reg.checking')}</p>
      ) : registry?.status === 'registered' && !forceForm ? (
        <div style={{ border: '1px solid #cfe5d0', background: '#f3faf3', borderRadius: 10, padding: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: '#2f7d32' }}>{t('eawb.reg.panelTitle')}</h2>
          <p style={{ fontSize: 14, margin: '0 0 16px' }}>
            {t('eawb.reg.panelText', { list: registryList(registry), date: registry.asOf ? fmtAsOf(registry.asOf, locale) : '' })}
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} style={btnStyle}>{t('eawb.reg.panelDone')}</button>
            <button type="button" onClick={() => setForceForm(true)}
              style={{ background: 'none', border: 0, color: '#555', textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
              {t('eawb.reg.panelOther')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <p style={{ fontSize: 13, background: '#fff8e6', border: '1px solid #f0dca0', borderRadius: 8, padding: '8px 12px' }}>{t('eawb.needEnglish')}</p>
          {rows[0]?.status === 'rechazado' && (
            <p style={{ color: ACCENT, fontSize: 13 }}>
              {t('eawb.rejected')}{rows[0].admin_note ? `: ${rows[0].admin_note}` : ''}. {t('eawb.rejectedHint')}
            </p>
          )}
          <Group title={t('eawb.submitter')}>
            <T label={t('eawb.yourName')} v={form.submitterName} on={v => set('submitterName', v)} err={err('submitterName')} />
            <T label={t('eawb.yourEmail')} type="email" v={form.submitterEmail} on={v => set('submitterEmail', v)} err={err('submitterEmail')} />
          </Group>
          <Group title={t('eawb.company')}>
            <T label={t('eawb.legalName')} v={form.companyName} on={v => set('companyName', v.toUpperCase())} err={err('companyName')} />
            {checking && <p style={{ fontSize: 12, color: '#777', margin: '-4px 0 10px' }}>{t('eawb.reg.checking')}</p>}
            {registry?.available && !checking && <RegistryNote r={registry} locale={locale} />}
            <T label={t('eawb.address')} v={form.address} on={v => set('address', v)} err={err('address')} />
            <T label={t('eawb.city')} v={form.city} on={v => set('city', v)} err={err('city')} />
            <div style={fieldStyle}>
              <label style={labelStyle}>{t('eawb.country')}</label>
              <select value={form.country} onChange={e => set('country', e.target.value)} style={inputStyle} required>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <T label={t('eawb.agentCode')} v={form.iataAgentCode} on={v => set('iataAgentCode', v)} ph="7519012 / N/A"
              help={t('eawb.agentCodeHelp')} err={err('iataAgentCode')} />
            <T label={t('eawb.cassCode')} v={form.cassCode} on={v => set('cassCode', v)} ph="0014" req={false}
              help={t('eawb.cassHelp')} err={err('cassCode')} />
          </Group>
          <Group title={t('eawb.contact')}>
            <T label={t('eawb.fullName')} v={form.contactName} on={v => set('contactName', v.toUpperCase())} err={err('contactName')} />
            <T label={t('eawb.jobTitle')} v={form.contactTitle} on={v => set('contactTitle', v)} err={err('contactTitle')} />
            <T label={t('eawb.email')} type="email" v={form.contactEmail} on={v => set('contactEmail', v)} err={err('contactEmail')} />
            <T label={t('eawb.phone')} v={form.contactPhone} on={v => set('contactPhone', v)} ph="0041227702669"
              help={t('eawb.phoneHelp')} err={err('contactPhone')} />
          </Group>
          <Group title={t('eawb.signatory')}>
            <T label={t('eawb.fullName')} v={form.signatoryName} on={v => set('signatoryName', v.toUpperCase())} err={err('signatoryName')} />
            <T label={t('eawb.signatoryEmail')} type="email" v={form.signatoryEmail} on={v => set('signatoryEmail', v)}
              err={err('signatoryEmail')} warn={isFreeMail(form.signatoryEmail) ? t('eawb.freeMailWarn') : undefined} />
            <T label={t('eawb.signatoryTitle')} v={form.signatoryTitle} on={v => set('signatoryTitle', v)} err={err('signatoryTitle')} />
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={form.secondSignatory} onChange={e => set('secondSignatory', e.target.checked)} /> {t('eawb.second')}
            </label>
            {form.secondSignatory && <>
              <T label={t('eawb.second2Name')} v={form.signatory2Name} on={v => set('signatory2Name', v.toUpperCase())} err={err('signatory2Name')} />
              <T label={t('eawb.second2Title')} v={form.signatory2Title} on={v => set('signatory2Title', v)} err={err('signatory2Title')} />
              <T label={t('eawb.second2Email')} type="email" v={form.signatory2Email} on={v => set('signatory2Email', v)} err={err('signatory2Email')} />
            </>}
          </Group>
          <label style={{ fontSize: 13, display: 'block', margin: '16px 0' }}>
            <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} /> {t('eawb.authorize')}
          </label>
          <button type="submit" disabled={busy || !authorized || !orgId || registry?.status === 'registered'} style={btnStyle}>
            {busy ? t('eawb.sending') : t('eawb.submit')}
          </button>
        </form>
      )}
    </div>
  )
}

const STEPS: AgreementRow['status'][] = ['solicitado', 'enviado_iata', 'pendiente_firma', 'firmado', 'aprobado']

function Status({ r, busy, onSigned }: { r: AgreementRow; busy: boolean; onSigned: (f: File) => void }) {
  const { t, i18n } = useTranslation()
  const idx = STEPS.indexOf(r.status)
  const p = { email: r.form.signatoryEmail, date: r.estimated_ready_at ?? '' }
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 20 }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>{r.form.companyName}</p>
      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: '8px 0 16px', flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <li key={s} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 12,
            background: i <= idx ? ACCENT : '#f2f2f2', color: i <= idx ? '#fff' : '#888', fontWeight: i === idx ? 700 : 400,
          }}>{t(`eawb.s.${s}`)}</li>
        ))}
      </ol>
      <p style={pStyle}>{t(`eawb.st.${r.status}`, p)}</p>
      {r.form.registryCheck?.status === 'not_found' && r.form.registryCheck.asOf && (
        <p style={{ fontSize: 12, color: '#2f7d32', margin: '0 0 12px' }}>{t('eawb.reg.notFound', { date: fmtAsOf(r.form.registryCheck.asOf, i18n.language) })}</p>
      )}
      {(r.status === 'pendiente_firma' || r.status === 'firmado') && (
        <>
          <input type="file" accept="application/pdf" disabled={busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) onSigned(f) }} />
          {r.status === 'firmado' && <p style={{ ...pStyle, fontSize: 12, color: '#888' }}>{t('eawb.st.firmadoReupload')}</p>}
        </>
      )}
    </div>
  )
}

function RegistryNote({ r, locale }: { r: RegistryCheck; locale: 'en' | 'es' }) {
  const { t } = useTranslation()
  const list = r.matches.map(m => `${m.companyName} (${m.countryName}${m.joiningDate ? `, ${m.joiningDate}` : ''})`).join('; ')
  const color = r.status === 'registered' ? ACCENT : r.status === 'possible' ? '#a60' : '#2f7d32'
  const text = r.status === 'not_found'
    ? t('eawb.reg.notFound', { date: r.asOf ? fmtAsOf(r.asOf, locale) : '' })
    : t(`eawb.reg.${r.status}`, { list })
  return <p style={{ fontSize: 12, color, margin: '-4px 0 10px' }}>{text}</p>
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: '1px solid #eee', borderRadius: 10, padding: '12px 16px 16px', margin: '16px 0' }}>
      <legend style={{ fontSize: 13, fontWeight: 700, color: ACCENT, padding: '0 6px' }}>{title}</legend>
      {children}
    </fieldset>
  )
}

function T({ label, v, on, type, ph, req = true, help, err, warn }: {
  label: string; v: string; on: (v: string) => void; type?: string; ph?: string; req?: boolean; help?: string; err?: string; warn?: string
}) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input type={type ?? 'text'} value={v} onChange={e => on(e.target.value)} placeholder={ph} required={req}
        style={{ ...inputStyle, borderColor: err ? ACCENT : '#ddd' }} />
      {help && <div style={{ fontSize: 11, color: '#777', marginTop: 3 }}>{help}</div>}
      {warn && !err && <div style={{ fontSize: 11, color: '#a60', marginTop: 3 }}>{warn}</div>}
      {err && <div style={{ fontSize: 12, color: ACCENT, marginTop: 3 }}>{err}</div>}
    </div>
  )
}

const fieldStyle: React.CSSProperties = { marginBottom: 10 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#555', marginBottom: 3 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btnStyle: React.CSSProperties = { background: ACCENT, color: '#fff', border: 0, borderRadius: 6, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }
const pStyle: React.CSSProperties = { fontSize: 14, margin: '0 0 12px' }
