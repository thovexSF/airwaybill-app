import React, { useRef, useState } from 'react'
import { parseExcelFile, importRows, ImportPreviewRow } from '../lib/importService'
import { importAwbeditorDb } from '../lib/importAwbeditorApi'
import { usePostHog } from '@posthog/react'

interface Props {
  onClose: () => void
  onDone: () => void
}

type Step = 'pick' | 'preview' | 'importing' | 'done'
type ImportMode = 'excel' | 'awbeditor'

export function ImportModal({ onClose, onDone }: Props) {
  const posthog = usePostHog()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('pick')
  const [mode, setMode] = useState<ImportMode>('excel')
  const [rows, setRows] = useState<ImportPreviewRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ ok: number; errors: string[]; summary?: string } | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    const lower = file.name.toLowerCase()

    if (lower.endsWith('.db') || lower.endsWith('.zip')) {
      setMode('awbeditor')
      setStep('importing')
      setProgress(0)
      try {
        const r = await importAwbeditorDb(file)
        const ok = r.mawbCreated + r.mawbUpdated + r.hawbCreated + r.hawbUpdated + r.dgdCreated + r.dgdUpdated
        const summary = `${r.preview.mawb} MAWB · ${r.preview.hawb} HAWB · ${r.preview.dgd} DGD`
        setResult({ ok, errors: r.errors, summary })
        setStep('done')
        if (ok > 0) {
          posthog?.capture('awbeditor_db_imported', {
            mawb: r.mawbCreated + r.mawbUpdated,
            hawb: r.hawbCreated + r.hawbUpdated,
            dgd: r.dgdCreated + r.dgdUpdated,
            errors: r.errors.length,
          })
          onDone()
        }
      } catch (err: any) {
        setParseError(err?.message || String(err))
        setStep('pick')
      } finally {
        if (inputRef.current) inputRef.current.value = ''
      }
      return
    }

    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      setParseError('Formato no soportado. Usa .xlsx, awbeditor.db o .zip')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setMode('excel')
    try {
      const parsed = await parseExcelFile(file)
      setRows(parsed)
      setStep('preview')
    } catch (err: any) {
      setParseError('No se pudo leer el archivo: ' + err.message)
    }
  }

  async function handleImport() {
    setStep('importing')
    setProgress(0)
    const res = await importRows(rows, (done, total) => setProgress(Math.round((done / total) * 100)))
    setResult(res)
    setStep('done')
    if (res.ok > 0) {
      posthog?.capture('excel_imported', { rows_total: rows.length, rows_ok: res.ok, rows_failed: res.errors.length })
      onDone()
    }
  }

  const awbCount = rows.filter((r) => !r.isHawb).length
  const hawbCount = rows.filter((r) => r.isHawb).length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          width: '90%',
          maxWidth: 820,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            background: '#8b0000',
            borderRadius: '10px 10px 0 0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>↑ Importar AWB</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: 20 }}>
          {step === 'pick' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
                Excel (<strong>.xlsx</strong>) con el template AWB, o base <strong>awbeditor.db</strong> / zip de AWB Editor.
                <br />
                El .db importa MAWB, HAWB y DGD completos.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.db,.zip"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  background: '#8b0000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 32px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Seleccionar archivo
              </button>
              {parseError && <p style={{ color: '#c00', marginTop: 12, fontSize: 13 }}>{parseError}</p>}
            </div>
          )}

          {step === 'preview' && mode === 'excel' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{rows.length} registros encontrados</span>
                <span style={{ background: '#8b0000', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                  {awbCount} AWB
                </span>
                {hawbCount > 0 && (
                  <span style={{ background: '#1a3a5c', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    {hawbCount} HAWB
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>Verifica antes de importar</span>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      {['Tipo', 'AWB / HAWB', 'Emisor', 'Shipper', 'Consignee', 'Ruta', 'Piezas', 'Peso', 'Vuelo'].map((h) => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '5px 10px' }}>
                          <span
                            style={{
                              background: r.isHawb ? '#1a3a5c' : '#8b0000',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 3,
                            }}
                          >
                            {r.isHawb ? 'HAWB' : 'AWB'}
                          </span>
                        </td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {r.isHawb ? r.house : r.awbNumber}
                          {r.isHawb && <div style={{ color: '#888', fontWeight: 400, fontSize: 10 }}>MAWB: {r.awbNumber}</div>}
                        </td>
                        <td style={{ padding: '5px 10px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.issuer}
                        </td>
                        <td style={{ padding: '5px 10px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.shipper}
                        </td>
                        <td style={{ padding: '5px 10px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.consignee}
                        </td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                          {r.depIata || '?'} → {r.destIata || r.destination}
                        </td>
                        <td style={{ padding: '5px 10px', textAlign: 'center' }}>{r.pieces}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right' }}>{r.grossWeight} K</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                          {r.flightNo} {r.flightDt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
                {mode === 'awbeditor' ? 'Importando awbeditor.db…' : `Importando… ${progress}%`}
              </div>
              <div style={{ background: '#f0f0f0', borderRadius: 8, height: 12, overflow: 'hidden', maxWidth: 400, margin: '0 auto' }}>
                <div
                  style={{
                    background: '#8b0000',
                    height: '100%',
                    width: mode === 'awbeditor' ? '100%' : `${progress}%`,
                    transition: 'width 0.2s',
                    animation: mode === 'awbeditor' ? 'pulse 1.2s ease-in-out infinite' : undefined,
                  }}
                />
              </div>
              {mode === 'awbeditor' && (
                <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>Puede tardar unos minutos con bases grandes.</p>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{result.errors.length === 0 ? '✅' : '⚠️'}</div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                {mode === 'awbeditor'
                  ? `Importación completada (${result.ok} documentos)`
                  : `${result.ok} de ${rows.length} AWBs importados correctamente`}
              </p>
              {result.summary && <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>{result.summary}</p>}
              {result.errors.length > 0 && (
                <div
                  style={{
                    textAlign: 'left',
                    maxHeight: 140,
                    overflow: 'auto',
                    background: '#fff3f3',
                    border: '1px solid #fcc',
                    borderRadius: 6,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  {result.errors.slice(0, 20).map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#c00' }}>
                      {e}
                    </div>
                  ))}
                  {result.errors.length > 20 && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>…y {result.errors.length - 20} más</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {step === 'done' ? (
            <button
              onClick={onClose}
              style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Ver mis documentos
            </button>
          ) : step === 'preview' ? (
            <>
              <button
                onClick={onClose}
                style={{ background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '9px 20px', fontSize: 13, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                style={{ background: '#8b0000', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Importar {rows.length} registros →
              </button>
            </>
          ) : step !== 'importing' ? (
            <button
              onClick={onClose}
              style={{ background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '9px 20px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
