import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { usePlan } from '../lib/usePlan'
import { listAWBs, deleteAWB, AWBDocument } from '../lib/awbService'

export function MyAWBsPage() {
  const { user, logout, orgName } = useAuth()
  const { plan } = usePlan()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<AWBDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    listAWBs()
      .then(setDocs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this AWB?')) return
    setDeleting(id)
    try {
      await deleteAWB(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (e: any) {
      alert('Error deleting: ' + e.message)
    }
    setDeleting(null)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
          <Link to="/" style={{ fontWeight: 800, fontSize: 16, color: '#fff', textDecoration: 'none' }}>✈ AIRWAYBILL APP</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
            {orgName ?? user?.email}
            {plan !== 'free' && <span style={{ marginLeft: 6, opacity: 0.7, textTransform: 'capitalize' }}>· {plan}</span>}
          </span>
          <Link to="/settings" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>⚙ Settings</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '32px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', margin: 0 }}>My Air Waybills</h1>
          <Link
            to="/editor"
            style={{ background: '#8b0000', color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
          >
            + New AWB
          </Link>
        </div>

        {loading && <p style={{ color: '#666' }}>Loading...</p>}
        {error && <p style={{ color: '#8b0000' }}>Error: {error}</p>}

        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈</div>
            <p style={{ marginBottom: 4 }}>No AWBs saved yet.</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>Create your first Air Waybill to get started.</p>
            <Link to="/editor" style={{ background: '#8b0000', color: '#fff', padding: '11px 28px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
              + Create AWB
            </Link>
          </div>
        )}

        {docs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map(doc => {
              const d = doc.data
              const awbNum = d.awbPrefix && d.awbSerial ? `${d.awbPrefix}-${d.awbSerial}` : '—'
              return (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #e8dcdc', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>AWB {awbNum}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                      {d.shipperNameAndAddress?.split('\n')[0] || 'Shipper —'} → {d.consigneeNameAndAddress?.split('\n')[0] || 'Consignee —'}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      Updated: {fmt(doc.updated_at)} · <span style={{ textTransform: 'uppercase', color: doc.status === 'final' ? '#2a7a2a' : '#888' }}>{doc.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/editor?id=${doc.id}`)}
                      style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      style={{ background: '#fff', color: '#c00', border: '1px solid #f5b6b6', borderRadius: 6, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}
                    >
                      {deleting === doc.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
