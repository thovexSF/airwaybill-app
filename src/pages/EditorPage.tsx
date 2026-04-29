import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { useAuth } from '../auth/AuthContext'
import { saveAWB, getAWB } from '../lib/awbService'
import { usePlan } from '../lib/usePlan'
import { supabase } from '../lib/supabase'

export function EditorPage() {
  const { user, logout, orgName } = useAuth()
  const { plan, orgId, canCreateAWB, awbUsedThisMonth, awbLimit } = usePlan()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('id')

  const [data, setData] = useState<AWBData>(defaultAWBData)
  const [currentId, setCurrentId] = useState<string | null>(docId)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftKey = `awb-draft-${user?.id || 'anon'}`

  // Auto-disable DRAFT watermark for paid plans
  useEffect(() => {
    if (plan !== 'free' && data.isDraft) {
      setData(prev => ({ ...prev, isDraft: false }))
    }
  }, [plan])

  // Load doc
  useEffect(() => {
    if (docId) {
      getAWB(docId).then(doc => {
        setData(doc.data)
        setCurrentId(doc.id)
      }).catch(() => {})
    } else {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      try { setData(JSON.parse(raw) as AWBData) } catch { /* ignore */ }
    }
  }, [docId, draftKey])

  // Persist local draft
  useEffect(() => {
    if (!currentId) localStorage.setItem(draftKey, JSON.stringify(data))
  }, [data, draftKey, currentId])

  // Debounced PDF regeneration
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  async function regenerate(d: AWBData) {
    setGenerating(true)
    try {
      const blob = await pdf(<AWBDocument data={d} />).toBlob()
      setPdfUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob) })
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setGenerating(false)
  }

  async function handleSave() {
    // Enforce Free plan limit on new docs
    if (!currentId && orgId) {
      const { data: result } = await supabase.rpc('increment_awb_usage', { p_org_id: orgId })
      if (result === 'limit_reached') {
        setSaveMsg('Límite del plan Free (10/mes)')
        setTimeout(() => setSaveMsg(null), 4000)
        return
      }
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveAWB(data, currentId ?? undefined)
      setCurrentId(doc.id)
      navigate(`/editor?id=${doc.id}`, { replace: true })
      setSaveMsg('Guardado ✓')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch {
      setSaveMsg('Error al guardar')
    }
    setSaving(false)
  }

  const awbFull = data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB'
  const atLimit = plan === 'free' && !canCreateAWB && !currentId

  return (
    <div className="app">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← Home</Link>
          <div>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }} className="topbar-logo">✈ AIRWAYBILL APP</Link>
            <div className="topbar-sub">Air Waybill Generator — IATA Format</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {orgName ?? user?.email}
            {plan === 'free' && awbLimit !== null && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>· {awbUsedThisMonth}/{awbLimit} AWBs</span>
            )}
            {plan !== 'free' && (
              <span style={{ marginLeft: 6, opacity: 0.7, textTransform: 'capitalize' }}>· {plan}</span>
            )}
          </span>
          {generating && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Generando...</span>}
          <Link to="/my-awbs" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>Mis AWBs</Link>
          <button className="btn-example" onClick={() => setData(exampleAWB)}>Ejemplo</button>
          <button className="btn-example" onClick={() => { setData(defaultAWBData); setCurrentId(null) }}>Limpiar</button>
          <button
            className="btn-example"
            onClick={handleSave}
            disabled={saving || atLimit}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700, opacity: atLimit ? 0.5 : 1 }}
            title={atLimit ? 'Límite mensual alcanzado — actualiza tu plan' : undefined}
          >
            {saving ? 'Guardando...' : saveMsg ?? 'Guardar'}
          </button>
          <button className="btn-example" onClick={logout}>Salir</button>
          {pdfUrl && (
            <a className="btn-download" href={pdfUrl} download={`AWB_${awbFull}.pdf`}>
              ⬇ Descargar PDF
            </a>
          )}
        </div>
      </div>

      {/* Free plan limit banner */}
      {atLimit && (
        <div style={{ background: '#fff3cd', borderBottom: '1px solid #ffc107', padding: '8px 20px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Has alcanzado el límite de 10 AWBs del plan Free este mes.</span>
          <Link to="/pricing" style={{ fontWeight: 700, color: '#8b0000', textDecoration: 'none' }}>Actualizar a Starter →</Link>
        </div>
      )}

      <div className="main">
        <div className="form-panel-wrap">
          <AWBFormPanel data={data} onChange={setData} />
        </div>
        <div className="preview-panel">
          {pdfUrl ? (
            <iframe src={pdfUrl} title="AWB Preview" />
          ) : (
            <div className="preview-loading">Generando vista previa…</div>
          )}
        </div>
      </div>
    </div>
  )
}
