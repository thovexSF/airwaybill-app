import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { listAWBs, deleteAWB, AWBDocument } from '../lib/awbService'

export function MyAWBsPage() {
  const { user, logout } = useAuth()
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
    if (!confirm('¿Eliminar este AWB?')) return
    setDeleting(id)
    try {
      await deleteAWB(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } catch (e: any) {
      alert('Error al eliminar: ' + e.message)
    }
    setDeleting(null)
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      {/* Topbar */}
      <div style={{ background: '#8b0000', color: '#fff', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>← Home</Link>
          <span style={{ fontWeight: 800, fontSize: 16 }}>✈ AIRWAYBILL APP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{user?.email}</span>
          <Link to="/editor" style={{ color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.15)', padding: '5px 14px', borderRadius: 6 }}>+ Nuevo AWB</Link>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>Salir</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '32px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', marginBottom: 20 }}>Mis Air Waybills</h1>

        {loading && <p style={{ color: '#666' }}>Cargando...</p>}
        {error && <p style={{ color: '#8b0000' }}>Error: {error}</p>}

        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈</div>
            <p>No tienes AWBs guardados aún.</p>
            <Link to="/editor" style={{ display: 'inline-block', marginTop: 16, background: '#8b0000', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
              Crear primer AWB
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
                      Actualizado: {fmt(doc.updated_at)} · <span style={{ textTransform: 'uppercase', color: doc.status === 'final' ? '#2a7a2a' : '#888' }}>{doc.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => navigate(`/editor?id=${doc.id}`)}
                      style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      style={{ background: '#fff', color: '#c00', border: '1px solid #f5b6b6', borderRadius: 6, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}
                    >
                      {deleting === doc.id ? '...' : 'Eliminar'}
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
