import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { useAuth } from '../auth/AuthContext'
import { saveAWB, getAWB } from '../lib/awbService'

export function EditorPage() {
  const { user, logout, orgName } = useAuth()
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

  // Load from Supabase if id param present, otherwise load local draft
  useEffect(() => {
    if (docId) {
      getAWB(docId).then(doc => {
        setData(doc.data)
        setCurrentId(doc.id)
      }).catch(() => {
        // Doc not found — fall back to default
      })
    } else {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      try { setData(JSON.parse(raw) as AWBData) } catch { /* ignore */ }
    }
  }, [docId, draftKey])

  // Persist local draft while editing (only when no saved doc)
  useEffect(() => {
    if (!currentId) {
      localStorage.setItem(draftKey, JSON.stringify(data))
    }
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
    setSaving(true)
    setSaveMsg(null)
    try {
      const doc = await saveAWB(data, currentId ?? undefined)
      setCurrentId(doc.id)
      // Update URL so refresh keeps this doc
      navigate(`/editor?id=${doc.id}`, { replace: true })
      setSaveMsg('Guardado ✓')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch (e) {
      setSaveMsg('Error al guardar')
    }
    setSaving(false)
  }

  const awbFull = data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB'

  return (
    <div className="app">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← Home</Link>
          <div>
            <div className="topbar-logo">✈ AIRWAYBILL APP</div>
            <div className="topbar-sub">Air Waybill Generator — IATA Format</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {orgName ?? user?.email}
          </span>
          {generating && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Generando...</span>}
          <Link to="/my-awbs" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>Mis AWBs</Link>
          <button className="btn-example" onClick={() => setData(exampleAWB)}>Ejemplo</button>
          <button className="btn-example" onClick={() => { setData(defaultAWBData); setCurrentId(null) }}>Limpiar</button>
          <button
            className="btn-example"
            onClick={handleSave}
            disabled={saving}
            style={{ background: 'rgba(255,255,255,0.15)', fontWeight: 700 }}
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
