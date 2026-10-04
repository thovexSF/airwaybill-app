import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import {
  AgreementForm, AgreementRow, COUNTRIES, EMPTY_FORM, STATUS_LABEL,
  listAgreements, requestAgreement, uploadSignedAgreement,
} from '../lib/eawbAgreement'

const ACCENT = '#8B0000'
const upper = (s: string) => s.toUpperCase()

export function EawbAgreementPage() {
  const { user } = useAuth()
  const { orgId } = usePlan()
  const [rows, setRows] = useState<AgreementRow[]>([])
  const [form, setForm] = useState<AgreementForm>({ ...EMPTY_FORM, submitterEmail: user?.email ?? '' })
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (orgId) setRows(await listAgreements(orgId))
  }, [orgId])
  useEffect(() => { load().catch(e => setMsg(e.message)) }, [load])

  const set = <K extends keyof AgreementForm>(k: K, v: AgreementForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const active = rows.find(r => r.status !== 'rechazado')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !user) return
    setBusy(true); setMsg(null)
    try {
      await requestAgreement(orgId, user.id, form)
      await load()
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }

  async function onSigned(r: AgreementRow, file: File) {
    if (!orgId) return
    setBusy(true); setMsg(null)
    try {
      await uploadSignedAgreement(orgId, r.id, file)
      await load()
    } catch (err: any) { setMsg(err.message) } finally { setBusy(false) }
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 760, margin: '0 auto', padding: '24px 20px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Servicio Multilateral e-AWB Agreement</h1>
        <Link to="/settings" style={{ fontSize: 13, color: ACCENT }}>← Volver</Link>
      </div>
      <p style={{ color: '#666', fontSize: 13 }}>
        Acuerdo multilateral de IATA (Res. 672) que habilita el AWB electrónico (eAWB) con las aerolíneas.
        Nosotros tramitamos el formulario ante IATA por ti; IATA enviará el contrato a firmar al correo del firmante.
      </p>
      {msg && <p style={{ color: ACCENT, fontSize: 13 }}>{msg}</p>}

      {active ? (
        <Status r={active} busy={busy} onSigned={f => onSigned(active, f)} />
      ) : (
        <form onSubmit={submit}>
          {rows[0]?.status === 'rechazado' && (
            <p style={{ color: ACCENT, fontSize: 13 }}>
              Tu solicitud anterior fue rechazada{rows[0].admin_note ? `: ${rows[0].admin_note}` : ''}. Corrige los datos y vuelve a enviarla.
            </p>
          )}
          <Group title="Quién envía la solicitud">
            <T label="Tu nombre" v={form.submitterName} on={v => set('submitterName', v)} />
            <T label="Tu email" type="email" v={form.submitterEmail} on={v => set('submitterEmail', v)} />
          </Group>
          <Group title="Datos de la empresa (tal como aparecerán en el contrato)">
            <T label="Razón social (MAYÚSCULAS)" v={form.companyName} on={v => set('companyName', upper(v))} />
            <T label="Dirección de la oficina principal" v={form.address} on={v => set('address', v)} />
            <T label="Ciudad" v={form.city} on={v => set('city', v)} />
            <div style={fieldStyle}>
              <label style={labelStyle}>País</label>
              <select value={form.country} onChange={e => set('country', e.target.value)} style={inputStyle} required>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <T label="Código IATA Cargo Agent (7 dígitos, o N/A)" v={form.iataAgentCode} on={v => set('iataAgentCode', v)} ph="N/A" />
            <T label="Código CASS/Branch (opcional, 4 dígitos)" v={form.cassCode} on={v => set('cassCode', v)} req={false} />
          </Group>
          <Group title="Contacto designado (recibe avisos de aerolíneas e IATA)">
            <T label="Nombre completo (MAYÚSCULAS)" v={form.contactName} on={v => set('contactName', upper(v))} />
            <T label="Cargo (en inglés)" v={form.contactTitle} on={v => set('contactTitle', v)} />
            <T label="Email" type="email" v={form.contactEmail} on={v => set('contactEmail', v)} />
            <T label="Teléfono (00 + país + área + número)" v={form.contactPhone} on={v => set('contactPhone', v)} ph="0056222345678" />
          </Group>
          <Group title="Firmante (con poder para obligar a la empresa)">
            <T label="Nombre completo (MAYÚSCULAS)" v={form.signatoryName} on={v => set('signatoryName', upper(v))} />
            <T label="Email (aquí llega el contrato a firmar)" type="email" v={form.signatoryEmail} on={v => set('signatoryEmail', v)} />
            <T label="Cargo (CEO, CFO, Director, General Manager…)" v={form.signatoryTitle} on={v => set('signatoryTitle', v)} />
            <label style={{ fontSize: 13 }}>
              <input type="checkbox" checked={form.secondSignatory} onChange={e => set('secondSignatory', e.target.checked)} /> Agregar un 2º firmante
            </label>
            {form.secondSignatory && <>
              <T label="2º firmante: nombre (MAYÚSCULAS)" v={form.signatory2Name} on={v => set('signatory2Name', upper(v))} />
              <T label="2º firmante: cargo" v={form.signatory2Title} on={v => set('signatory2Title', v)} />
              <T label="2º firmante: email" type="email" v={form.signatory2Email} on={v => set('signatory2Email', v)} />
            </>}
          </Group>
          <label style={{ fontSize: 13, display: 'block', margin: '16px 0' }}>
            <input type="checkbox" checked={authorized} onChange={e => setAuthorized(e.target.checked)} required />{' '}
            Autorizo a airwaybill.app a enviar estos datos a IATA en nombre de mi empresa para tramitar el Multilateral e-AWB Agreement.
          </label>
          <button type="submit" disabled={busy || !authorized || !orgId} style={btnStyle}>
            {busy ? 'Enviando…' : 'Solicitar'}
          </button>
        </form>
      )}
    </div>
  )
}

const STEPS: AgreementRowStatus[] = ['solicitado', 'enviado_iata', 'pendiente_firma', 'firmado', 'aprobado']
type AgreementRowStatus = AgreementRow['status']

function Status({ r, busy, onSigned }: { r: AgreementRow; busy: boolean; onSigned: (f: File) => void }) {
  const idx = STEPS.indexOf(r.status)
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 20 }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>{r.form.companyName}</p>
      <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: '8px 0 16px', flexWrap: 'wrap' }}>
        {STEPS.map((s, i) => (
          <li key={s} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 12,
            background: i <= idx ? ACCENT : '#f2f2f2', color: i <= idx ? '#fff' : '#888', fontWeight: i === idx ? 700 : 400,
          }}>{STATUS_LABEL[s]}</li>
        ))}
      </ol>
      {r.status === 'solicitado' && <p style={pStyle}>Recibimos tu solicitud. La estamos enviando a IATA.</p>}
      {r.status === 'enviado_iata' && <p style={pStyle}>Enviada a IATA. En breve recibirás un correo de IATA con el contrato para firmar en {r.form.signatoryEmail}.</p>}
      {(r.status === 'pendiente_firma' || r.status === 'firmado') && (
        <>
          <p style={pStyle}>
            {r.status === 'pendiente_firma'
              ? `IATA envió el contrato a ${r.form.signatoryEmail}. Fírmalo y sube aquí el PDF firmado que te llega por correo.`
              : `Recibimos tu contrato firmado. Fecha estimada de aprobación: ${r.estimated_ready_at} (10 días hábiles).`}
          </p>
          <input type="file" accept="application/pdf" disabled={busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) onSigned(f) }} />
          {r.status === 'firmado' && <p style={{ ...pStyle, fontSize: 12, color: '#888' }}>Puedes subir otra versión si te equivocaste de archivo.</p>}
        </>
      )}
      {r.status === 'aprobado' && <p style={pStyle}>Tu empresa ya es parte del acuerdo multilateral. Escríbenos para activar el eAWB con tus aerolíneas.</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: '1px solid #eee', borderRadius: 10, padding: '12px 16px 16px', margin: '16px 0' }}>
      <legend style={{ fontSize: 13, fontWeight: 700, color: ACCENT, padding: '0 6px' }}>{title}</legend>
      {children}
    </fieldset>
  )
}

function T({ label, v, on, type, ph, req = true }: { label: string; v: string; on: (v: string) => void; type?: string; ph?: string; req?: boolean }) {
  return (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>
      <input type={type ?? 'text'} value={v} onChange={e => on(e.target.value)} placeholder={ph} required={req} style={inputStyle} />
    </div>
  )
}

const fieldStyle: React.CSSProperties = { marginBottom: 10 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: '#555', marginBottom: 3 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }
const btnStyle: React.CSSProperties = { background: ACCENT, color: '#fff', border: 0, borderRadius: 6, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }
const pStyle: React.CSSProperties = { fontSize: 14, margin: '0 0 12px' }
