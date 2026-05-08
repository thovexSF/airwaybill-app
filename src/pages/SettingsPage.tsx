import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'

type OrgDefaults = {
  shipper_name_and_address: string
  shipper_account_number: string
  carrier_name: string
  carrier_address: string
  issuing_carrier_agent: string
  airport_of_departure: string
  awb_prefix: string
}

const EMPTY: OrgDefaults = {
  shipper_name_and_address: '',
  shipper_account_number: '',
  carrier_name: '',
  carrier_address: '',
  issuing_carrier_agent: '',
  airport_of_departure: '',
  awb_prefix: '',
}

export function SettingsPage() {
  const { user, logout, orgName } = useAuth()
  const { orgId, plan } = usePlan()
  const [form, setForm] = useState<OrgDefaults>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
  }, [orgId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('organization_defaults')
      .upsert({ ...form, organization_id: orgId }, { onConflict: 'organization_id' })
    setSaving(false)
    setMsg(error ? 'Error al guardar' : 'Guardado ✓')
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
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{orgName ?? user?.email}</span>
          <Link to="/editor" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>Editor</Link>
          <Link to="/my-awbs" style={{ color: '#fff', fontSize: 13, textDecoration: 'none' }}>Mis AWBs</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Configuración de empresa</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 32 }}>
          Estos datos se pre-llenarán automáticamente en cada AWB nuevo que crees.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>Shipper (Remitente)</h2>
              {field('Nombre y Dirección', 'shipper_name_and_address', 'Empresa S.A.\nAv. Principal 123\nSantiago, Chile', true)}
              {field('Número de cuenta', 'shipper_account_number', 'Ej: 12345678')}
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>Carrier (Aerolínea)</h2>
              {field('Nombre del carrier', 'carrier_name', 'Ej: LATAM CARGO')}
              {field('Dirección del carrier', 'carrier_address', 'Ej: Av. Presidente Riesco 5711, Santiago')}
            </div>

            <div style={{ background: '#fff', borderRadius: 10, padding: 24, marginBottom: 20, border: '1px solid #e8dcdc' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#8b0000', marginBottom: 20 }}>Agente emisor</h2>
              {field('Issuing Carrier\'s Agent', 'issuing_carrier_agent', 'Ej: B2B Express S.A. RUT: 99.515.150-2')}
              {field('Aeropuerto de salida', 'airport_of_departure', 'Ej: SANTIAGO DE CHILE (SCL/ZRH)')}
              {field('Prefijo AWB (3 dígitos)', 'awb_prefix', 'Ej: 014')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              {msg && (
                <span style={{ fontSize: 14, color: msg.includes('Error') ? '#c00' : '#2a7a2a', fontWeight: 600 }}>
                  {msg}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
