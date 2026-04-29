import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'
import { AWBFormPanel } from '../components/AWBFormPanel'
import { AWBDocument } from '../pdf/AWBDocument'
import { AWBData, defaultAWBData } from '../types/awb'
import { exampleAWB } from '../data/example'
import { useAuth } from '../auth/AuthContext'

export function EditorPage() {
  const { currentUser, logout } = useAuth()
  const [data, setData] = useState<AWBData>(defaultAWBData)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftKey = `awb-saas-draft-${currentUser?.id || 'anon'}`

  useEffect(() => {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as AWBData
      setData(parsed)
    } catch {
      // Ignore corrupted draft and continue with default data.
    }
  }, [draftKey])

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(data))
  }, [data, draftKey])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => regenerate(data), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data])

  async function regenerate(d: AWBData) {
    setLoading(true)
    try {
      const blob = await pdf(<AWBDocument data={d} />).toBlob()
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(URL.createObjectURL(blob))
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setLoading(false)
  }

  const awbFull = data.awbPrefix && data.awbSerial ? `${data.awbPrefix}-${data.awbSerial}` : 'AWB'

  return (
    <div className="app">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>← Home</Link>
          <div>
            <div className="topbar-logo">✈ AWB EDITOR</div>
            <div className="topbar-sub">Air Waybill Generator — IATA Format</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {currentUser?.companyName || 'Tenant'}
          </span>
          {loading && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Generating...</span>}
          <button className="btn-example" onClick={() => setData(exampleAWB)}>Load Example</button>
          <button className="btn-example" onClick={() => setData(defaultAWBData)}>Clear</button>
          <button className="btn-example" onClick={logout}>Logout</button>
          {pdfUrl && (
            <a className="btn-download" href={pdfUrl} download={`AWB_${awbFull}.pdf`}>
              ⬇ Download PDF
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
            <div className="preview-loading">Generating preview…</div>
          )}
        </div>
      </div>
    </div>
  )
}
