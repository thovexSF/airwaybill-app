import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'
import {
  generateApiKeySecret,
  hashApiKey,
  type PartnerApiKeyRow,
} from '../lib/partnerApiKeys'
import { LangSwitcher } from '../components/LangSwitcher'
import { usePostHog } from '@posthog/react'

type OrgDefaults = {
  shipper_name_and_address: string
  shipper_account_number: string
  carrier_name: string
  carrier_address: string
  carrier_logo_url: string
  issuing_carrier_agent: string
  airport_of_departure: string
  awb_prefix: string
}

const EMPTY: OrgDefaults = {
  shipper_name_and_address: '',
  shipper_account_number: '',
  carrier_name: '',
  carrier_address: '',
  carrier_logo_url: '',
  issuing_carrier_agent: '',
  airport_of_departure: '',
  awb_prefix: '',
}

export function SettingsPage() {
  const { t } = useTranslation()
  const posthog = usePostHog()
  const { user, logout, orgName } = useAuth()
  const { orgId, plan } = usePlan()
  const [form, setForm] = useState<OrgDefaults>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [cancelUrl, setCancelUrl] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<PartnerApiKeyRow[]>([])
  const [apiKeyName, setApiKeyName] = useState('B2B Express')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const loadApiKeys = useCallback(async (id: string) => {
    const { data } = await supabase
      .from('partner_api_keys')
      .select('id, name, key_prefix, plan_override, revoked_at, last_used_at, created_at')
      .eq('organization_id', id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    setApiKeys((data as PartnerApiKeyRow[]) ?? [])
  }, [])

  useEffect(() => {
    if (!orgId) return
    supabase
      .from('organization_defaults')
      .select('*')
      .eq('organization_id', orgId)
      .single()
      .then(({ data }) => {
        if (data) setForm(data)
        setLoading(false)
      })

    // Load cancel URL if on paid plan
    supabase
      .from('organizations')
      .select('paddle_cancel_url')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        if (data?.paddle_cancel_url) setCancelUrl(data.paddle_cancel_url)
      })

    loadApiKeys(orgId)
  }, [orgId, loadApiKeys])

  async function handleCreateApiKey() {
    if (!orgId || !user) return
    setCreatingKey(true)
    setApiKeyError(null)
    setNewSecret(null)
    try {
      const { secret, prefix } = generateApiKeySecret()
      const keyHash = await hashApiKey(secret)
      const { error } = await supabase.from('partner_api_keys').insert({
        organization_id: orgId,
        acting_user_id: user.id,
        name: apiKeyName.trim() || 'default',
        key_prefix: prefix,
        key_hash: keyHash,
        plan_override: plan === 'free' ? 'enterprise' : null,
      })
      if (error) throw error
      setNewSecret(secret)
      await loadApiKeys(orgId)
      posthog?.capture('partner_api_key_created', { plan })
    } catch (e: any) {
      setApiKeyError(e?.message || t('common.error'))
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleRevokeApiKey(id: string) {
    if (!orgId || !confirm(t('settings.apiKeyRevoke') + '?')) return
    await supabase
      .from('partner_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
    await loadApiKeys(orgId)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('organization_defaults')
      .upsert({ ...form, organization_id: orgId }, { onConflict: 'organization_id' })
    setSaving(false)
    if (!error) posthog?.capture('settings_saved', { plan })
    setMsg(error ? t('common.error') : t('editor.saved'))
    setTimeout(() => setMsg(null), 3000)
  }

  function field(label: string, key: keyof OrgDefaults, placeholder = '', textarea = false) {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </label>
        {textarea ? (
          <textarea
            rows={3}
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        ) : (
          <input
            type="text"
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>{t('common.home')}</Link>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{orgName ?? user?.email}</span>
          <Link to="/editor" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>Editor</Link>
          <Link to="/my-awbs" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>{t('common.myAwbs')}</Link>
          <LangSwitcher />
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>{t('common.signOut')}</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t('settings.title')}</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
          {t('settings.sub')}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>{t('settings.loading')}</div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>{t('settings.shipper')}</h2>
              {field(t('settings.shipperName'), 'shipper_name_and_address', 'Empresa S.A.\nAv. Principal 123\nSantiago, Chile', true)}
              {field(t('settings.shipperAccount'), 'shipper_account_number', 'Ej: 12345678')}
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>{t('settings.carrier')}</h2>
              {field(t('settings.carrierName'), 'carrier_name', 'Ej: LATAM CARGO')}
              {field(t('settings.carrierAddress'), 'carrier_address', 'Ej: Av. Presidente Riesco 5711, Santiago')}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Carrier Logo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.carrier_logo_url ? (
                    <div style={{ position: 'relative', display: 'inline-flex', border: '1px solid #e0e0e0', borderRadius: 8, padding: 6, background: '#fafafa' }}>
                      <img src={form.carrier_logo_url} alt="logo" style={{ height: 40, maxWidth: 120, objectFit: 'contain' }} />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, carrier_logo_url: '' }))}
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#c00', color: '#fff', border: 'none', fontSize: 12, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    </div>
                  ) : (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '2px dashed #ccc', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#666', transition: 'border-color 0.2s' }}>
                      <span style={{ fontSize: 18 }}>+</span> Subir logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 500_000) { alert('Logo must be under 500KB'); return }
                          const reader = new FileReader()
                          reader.onload = (ev) => setForm(f => ({ ...f, carrier_logo_url: ev.target?.result as string }))
                          reader.readAsDataURL(file)
                        }}
                      />
                    </label>
                  )}
                </div>
                <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>PNG, JPG o SVG. Max 500 KB. Aparece en el header del AWB junto a "Air Waybill".</p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>{t('settings.agent')}</h2>
              {field(t('settings.issuingAgent'), 'issuing_carrier_agent', 'Ej: Pacific Freight Agency')}
              {field(t('settings.departureAirport'), 'airport_of_departure', 'Ej: SANTIAGO DE CHILE (SCL/ZRH)')}
              {field(t('settings.awbPrefix'), 'awb_prefix', 'Ej: 999')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {saving ? t('common.saving') : t('settings.saveChanges')}
              </button>
              {msg && (
                <span style={{ fontSize: 14, color: msg.includes('Error') ? '#c00' : '#2a7a2a', fontWeight: 600 }}>
                  {msg}
                </span>
              )}
            </div>
          </form>
        )}

        {/* Subscription section */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginTop: 32, border: '1px solid #e8dcdc' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>{t('settings.subscription')}</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: '#666' }}>{t('settings.currentPlan')}</div>
              <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'capitalize', color: '#222' }}>{plan}</div>
            </div>
            {plan === 'free' ? (
              <a
                href="/pricing"
                style={{ background: '#8b0000', color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
              >
                {t('settings.upgradePlan')}
              </a>
            ) : cancelUrl ? (
              <a
                href={cancelUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#fff', color: '#666', padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none', border: '1px solid #ddd' }}
              >
                {t('settings.cancelSub')}
              </a>
            ) : (
              <span style={{ fontSize: 12, color: '#aaa' }}>{t('settings.cancelContact')}</span>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginTop: 32, border: '1px solid #e8dcdc' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 8 }}>{t('settings.apiKeys')}</h2>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>{t('settings.apiKeysSub')}</p>

          {newSecret && (
            <div style={{ background: '#f8fff8', border: '1px solid #b7e0b7', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2a7a2a', marginBottom: 8 }}>{t('settings.apiKeyCreated')}</div>
              <code style={{ display: 'block', fontSize: 12, wordBreak: 'break-all', background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #ddd', marginBottom: 10 }}>
                {newSecret}
              </code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(newSecret)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                style={{ background: '#2a7a2a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                {copied ? t('settings.apiKeyCopied') : t('settings.apiKeyCopy')}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              type="text"
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              placeholder={t('settings.apiKeyNamePh')}
              aria-label={t('settings.apiKeyName')}
              style={{ flex: 1, minWidth: 160, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
            />
            <button
              type="button"
              disabled={creatingKey || !orgId}
              onClick={handleCreateApiKey}
              style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              {creatingKey ? t('common.saving') : t('settings.apiKeyCreate')}
            </button>
          </div>
          {apiKeyError && <div style={{ color: '#c00', fontSize: 13, marginBottom: 12 }}>{apiKeyError}</div>}

          {apiKeys.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999' }}>{t('settings.apiKeyEmpty')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {apiKeys.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>{k.name}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>
                      {t('settings.apiKeyPrefix')}: <code>{k.key_prefix}…</code>
                      {' · '}
                      {t('settings.apiKeyCreatedAt')}: {new Date(k.created_at).toLocaleDateString()}
                      {' · '}
                      {t('settings.apiKeyLastUsed')}: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : t('settings.apiKeyNever')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeApiKey(k.id)}
                    style={{ background: '#fff', color: '#c00', border: '1px solid #e0b0b0', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                  >
                    {t('settings.apiKeyRevoke')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
