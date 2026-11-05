import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EditableSticker, blankEditable, stickerValues, suggestOverpackText } from '../lib/shipperLabel'
import {
  Align, FIELD_LABEL, LabelBlock, LabelDesign, LabelField, VAlign, blockId, cloneDesign,
  defaultItemDesign, defaultOverpackDesign, designSize, renderDesign,
} from '../lib/labelDesign'
import {
  LabelTemplate, TemplateKind, deleteLabelTemplate, lastTemplateId, listLabelTemplates,
  rememberTemplate, saveLabelTemplate,
} from '../lib/labelTemplates'
import { DGDData } from '../types/dgd'

const SNAP = 4
const snap = (n: number) => Math.round(n / SNAP) * SNAP
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const kindOf = (s: EditableSticker): TemplateKind => (s.overpack ? 'overpack' : 'item')

/**
 * 10×15 cm sticker editor. The canvas is the same render the Zebra receives, so
 * moving, resizing or restyling a block here is exactly what prints. Layouts
 * are saved as organization templates and the last one used is reapplied.
 */
export function ShipperLabelDialog({
  open,
  labels,
  source,
  onChange,
  onClose,
  onPrint,
  printing,
}: {
  open: boolean
  labels: EditableSticker[]
  source: DGDData
  onChange: (next: EditableSticker[]) => void
  onClose: () => void
  onPrint: () => void
  printing: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [blockSel, setBlockSel] = useState<string | null>(null)
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [tplName, setTplName] = useState('')
  const [tplMsg, setTplMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Drag handlers and the keyboard read the latest labels, not the render they were created in.
  const labelsRef = useRef(labels)
  labelsRef.current = labels
  const applied = useRef(false)

  const active = labels.find(l => l.id === activeId) ?? labels[0]
  const kind = active ? kindOf(active) : 'item'
  const kindTemplates = templates.filter(t => t.kind === kind)

  function patchLabel(id: string, p: Partial<EditableSticker>) {
    onChange(labelsRef.current.map(l => (l.id === id ? { ...l, ...p } : l)))
  }
  function patchDesign(id: string, fn: (d: LabelDesign) => LabelDesign) {
    onChange(labelsRef.current.map(l => (l.id === id ? { ...l, design: fn(l.design) } : l)))
  }
  function patchBlock(bid: string, p: Partial<LabelBlock>) {
    if (!active) return
    patchDesign(active.id, d => ({ ...d, blocks: d.blocks.map(b => (b.id === bid ? { ...b, ...p } : b)) }))
  }

  useEffect(() => {
    if (!open) { applied.current = false; return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  // Load the organization's templates and reapply the last one used for each kind.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    listLabelTemplates()
      .then(ts => {
        if (cancelled) return
        setTemplates(ts)
        if (applied.current) return
        applied.current = true
        const byKind = (k: TemplateKind) => ts.find(t => t.id === lastTemplateId(k))
        onChange(labelsRef.current.map(l => {
          const t = byKind(kindOf(l))
          return t ? { ...l, design: cloneDesign(t.design), templateId: t.id } : l
        }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  // Arrow keys nudge the selected block, Delete removes it — unless typing in a field.
  useEffect(() => {
    if (!open || !blockSel || !active) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      const step = e.shiftKey ? 20 : SNAP
      const b = active.design.blocks.find(x => x.id === blockSel)
      if (!b) return
      const { w, h } = designSize(active.design)
      const moves: Record<string, Partial<LabelBlock>> = {
        ArrowLeft: { x: clamp(b.x - step, 0, w - b.w) },
        ArrowRight: { x: clamp(b.x + step, 0, w - b.w) },
        ArrowUp: { y: clamp(b.y - step, 0, h - b.h) },
        ArrowDown: { y: clamp(b.y + step, 0, h - b.h) },
      }
      if (moves[e.key]) { e.preventDefault(); patchBlock(b.id, moves[e.key]) }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeBlock(b.id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open || !active) return null

  const selectedCount = labels.filter(l => l.selected).length
  const block = active.design.blocks.find(b => b.id === blockSel) || null
  const { w: DW, h: DH } = designSize(active.design)

  function removeBlock(bid: string) {
    patchDesign(active.id, d => ({ ...d, blocks: d.blocks.filter(b => b.id !== bid) }))
    setBlockSel(null)
  }

  function addText() {
    const b: LabelBlock = {
      id: blockId(), field: 'text', text: 'TEXTO', x: snap(DW / 2 - 200), y: snap(DH / 2 - 30), w: 400, h: 60,
      size: 40, align: 'center', valign: 'middle', bold: true, upper: true,
    }
    patchDesign(active.id, d => ({ ...d, blocks: [...d.blocks, b] }))
    setBlockSel(b.id)
  }

  function duplicateBlock(b: LabelBlock) {
    const copy = { ...b, id: blockId(), x: clamp(b.x + 20, 0, DW - b.w), y: clamp(b.y + 20, 0, DH - b.h) }
    patchDesign(active.id, d => ({ ...d, blocks: [...d.blocks, copy] }))
    setBlockSel(copy.id)
  }

  function setOrientation(o: LabelDesign['orientation']) {
    patchDesign(active.id, d => {
      const next = { ...d, orientation: o }
      const { w, h } = designSize(next)
      return {
        ...next,
        blocks: d.blocks.map(b => {
          const bw = Math.min(b.w, w)
          const bh = Math.min(b.h, h)
          return { ...b, w: bw, h: bh, x: clamp(b.x, 0, w - bw), y: clamp(b.y, 0, h - bh) }
        }),
      }
    })
  }

  function applyTemplate(id: string) {
    setTplMsg(null)
    if (!id) {
      patchLabel(active.id, { design: kind === 'overpack' ? defaultOverpackDesign() : defaultItemDesign(), templateId: undefined })
      rememberTemplate(kind, null)
      return
    }
    const t = templates.find(x => x.id === id)
    if (!t) return
    patchLabel(active.id, { design: cloneDesign(t.design), templateId: t.id })
    rememberTemplate(kind, t.id)
    setBlockSel(null)
  }

  function applyToAll() {
    onChange(labelsRef.current.map(l =>
      l.id !== active.id && kindOf(l) === kind ? { ...l, design: cloneDesign(active.design), templateId: active.templateId } : l,
    ))
    setTplMsg('Diseño aplicado a todas las etiquetas de este tipo')
  }

  async function saveAsNew() {
    const name = tplName.trim()
    if (!name) { setTplMsg('Ponle un nombre a la plantilla'); return }
    setBusy(true)
    setTplMsg(null)
    try {
      const t = await saveLabelTemplate({ name, kind, design: cloneDesign(active.design) })
      setTemplates(prev => [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))
      patchLabel(active.id, { templateId: t.id })
      rememberTemplate(kind, t.id)
      setTplName('')
      setTplMsg(`Plantilla "${name}" guardada`)
    } catch (e: any) {
      setTplMsg(`No se pudo guardar: ${e?.message || e}`)
    }
    setBusy(false)
  }

  async function saveChanges() {
    const t = templates.find(x => x.id === active.templateId)
    if (!t) return
    setBusy(true)
    setTplMsg(null)
    try {
      const saved = await saveLabelTemplate({ name: t.name, kind: t.kind, design: cloneDesign(active.design) }, t.id)
      setTemplates(prev => prev.map(x => (x.id === t.id ? saved : x)))
      setTplMsg(`Plantilla "${t.name}" actualizada`)
    } catch (e: any) {
      setTplMsg(`No se pudo guardar: ${e?.message || e}`)
    }
    setBusy(false)
  }

  async function removeTemplate() {
    const t = templates.find(x => x.id === active.templateId)
    if (!t || !window.confirm(`¿Eliminar la plantilla "${t.name}"? Las etiquetas abiertas no cambian.`)) return
    setBusy(true)
    try {
      await deleteLabelTemplate(t.id)
      setTemplates(prev => prev.filter(x => x.id !== t.id))
      patchLabel(active.id, { templateId: undefined })
      if (lastTemplateId(kind) === t.id) rememberTemplate(kind, null)
      setTplMsg('Plantilla eliminada')
    } catch (e: any) {
      setTplMsg(`No se pudo eliminar: ${e?.message || e}`)
    }
    setBusy(false)
  }

  function addLabel(overpack: boolean) {
    const seed = labels[0]
    const t = templates.find(x => x.id === lastTemplateId(overpack ? 'overpack' : 'item'))
    const next = blankEditable(
      { shipper: seed?.shipper, consignee: seed?.consignee, overpack, footer: overpack ? suggestOverpackText(source) : '' },
      t?.design,
    )
    if (t) next.templateId = t.id
    onChange([...labels, next])
    setActiveId(next.id)
    setBlockSel(null)
  }

  const contentFields: { key: keyof EditableSticker; label: string; rows: number }[] = [
    { key: 'shipper', label: 'Shipper', rows: 3 },
    { key: 'consignee', label: 'Consignee', rows: 3 },
    ...(active.overpack
      ? [{ key: 'footer' as const, label: 'Texto inferior', rows: 4 }]
      : [
          { key: 'title' as const, label: 'Producto', rows: 2 },
          { key: 'un' as const, label: 'UN', rows: 1 },
          { key: 'quantity' as const, label: 'Cantidad', rows: 2 },
        ]),
  ]

  return (
    <div className="form-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="form-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Etiquetas"
        style={{ maxWidth: 1240, width: '96vw', height: '94vh', maxHeight: '94vh' }}
      >
        <div className="form-dialog-title">
          <span>Etiquetas 10×15</span>
          <button type="button" className="form-dialog-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="form-dialog-body" style={{ display: 'flex', gap: 0, padding: 0, background: '#eceae6', overflow: 'hidden', flex: 1, minHeight: 0 }}>
          {/* Labels */}
          <div style={{ width: 196, flexShrink: 0, overflowY: 'auto', padding: 12, borderRight: '1px solid #d8d5cf', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {labels.map((l, i) => (
              <div key={l.id} style={{ position: 'relative' }}>
                <div
                  onClick={() => { setActiveId(l.id); setBlockSel(null) }}
                  style={{ cursor: 'pointer', outline: l.id === active.id ? '3px solid var(--red)' : '1px solid #bbb', background: '#fff', opacity: l.selected ? 1 : 0.45 }}
                  title="Editar esta etiqueta"
                >
                  <StickerCanvas design={l.design} values={stickerValues(l)} width={170} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={l.selected} onChange={e => patchLabel(l.id, { selected: e.target.checked })} />
                    {l.overpack ? 'OVERPACK' : `Etiqueta ${i + 1}`}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rest = labels.filter(x => x.id !== l.id)
                      if (!rest.length) return
                      onChange(rest)
                      if (l.id === active.id) setActiveId(rest[0].id)
                    }}
                    disabled={labels.length === 1}
                    style={{ border: 0, background: 'none', color: '#999', cursor: 'pointer', fontSize: 14 }}
                    aria-label="Quitar etiqueta"
                  >×</button>
                </div>
              </div>
            ))}
            <button type="button" className="form-dialog-btn" onClick={() => addLabel(false)}>+ Etiqueta</button>
            <button type="button" className="form-dialog-btn" onClick={() => addLabel(true)}>+ OVERPACK</button>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Seg value={active.design.orientation} onChange={setOrientation}
                options={[{ value: 'landscape', label: 'Horizontal' }, { value: 'portrait', label: 'Vertical' }]} />
              <button type="button" className="form-dialog-btn" onClick={addText}>+ Texto</button>
              <button type="button" className="form-dialog-btn" onClick={() => {
                if (window.confirm('¿Volver al diseño original de esta etiqueta?')) {
                  patchLabel(active.id, { design: active.overpack ? defaultOverpackDesign() : defaultItemDesign(), templateId: undefined })
                  setBlockSel(null)
                }
              }}>Restablecer</button>
              <span style={{ fontSize: 11, color: '#777', marginLeft: 'auto' }}>
                Clic para seleccionar · arrastra para mover · esquina para redimensionar · flechas para ajustar fino
              </span>
            </div>
            <DesignEditor
              design={active.design}
              values={stickerValues(active)}
              selected={blockSel}
              onSelect={setBlockSel}
              onBlock={patchBlock}
            />
          </div>

          {/* Properties */}
          <div style={{ width: 300, flexShrink: 0, overflowY: 'auto', padding: 14, borderLeft: '1px solid #d8d5cf', background: '#f7f6f3', display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
            <Panel title="Plantilla">
              <select
                value={active.templateId || ''}
                onChange={e => applyTemplate(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Diseño original —</option>
                {kindTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {active.templateId && <button type="button" className="form-dialog-btn" disabled={busy} onClick={saveChanges}>Guardar cambios</button>}
                {active.templateId && <button type="button" className="form-dialog-btn" disabled={busy} onClick={removeTemplate}>Eliminar</button>}
                {labels.filter(l => kindOf(l) === kind).length > 1 && (
                  <button type="button" className="form-dialog-btn" onClick={applyToAll}>Aplicar a todas</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Nombre de plantilla nueva" style={{ ...inputStyle, flex: 1 }} />
                <button type="button" className="form-dialog-btn" disabled={busy} onClick={saveAsNew}>Guardar</button>
              </div>
              {tplMsg && <div style={{ color: '#555' }}>{tplMsg}</div>}
            </Panel>

            <Panel title="Contenido de esta etiqueta">
              {contentFields.map(f => (
                <Labeled key={f.key} label={f.label}>
                  <textarea
                    rows={f.rows}
                    value={String(active[f.key] ?? '')}
                    onChange={e => patchLabel(active.id, { [f.key]: f.key === 'un' ? e.target.value.toUpperCase() : e.target.value })}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </Labeled>
              ))}
            </Panel>

            <Panel title="Texto seleccionado">
              {!block ? (
                <div style={{ color: '#777', lineHeight: 1.5 }}>
                  Haz clic en un texto de la etiqueta para cambiar su tamaño, alineación o posición sin tocar los demás.
                </div>
              ) : (
                <>
                  <Labeled label="Muestra">
                    <select value={block.field} onChange={e => patchBlock(block.id, { field: e.target.value as LabelField })} style={inputStyle}>
                      {(Object.keys(FIELD_LABEL) as LabelField[]).map(f => <option key={f} value={f}>{FIELD_LABEL[f]}</option>)}
                    </select>
                  </Labeled>
                  {block.field === 'text' && (
                    <Labeled label="Texto">
                      <textarea rows={2} value={block.text || ''} onChange={e => patchBlock(block.id, { text: e.target.value })}
                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                    </Labeled>
                  )}
                  <Labeled label="Tamaño de letra">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button type="button" className="form-dialog-btn" onClick={() => patchBlock(block.id, { size: clamp(block.size - 2, 12, 300) })}>A−</button>
                      <input type="number" min={12} max={300} value={block.size}
                        onChange={e => patchBlock(block.id, { size: clamp(Number(e.target.value) || 12, 12, 300) })}
                        style={{ ...inputStyle, width: 70, textAlign: 'center' }} />
                      <button type="button" className="form-dialog-btn" onClick={() => patchBlock(block.id, { size: clamp(block.size + 2, 12, 300) })}>A+</button>
                      <span style={{ color: '#888' }}>{(block.size / 8).toFixed(1)} mm</span>
                    </div>
                  </Labeled>
                  <Labeled label="Alineación">
                    <Seg<Align> value={block.align} onChange={v => patchBlock(block.id, { align: v })}
                      options={[{ value: 'left', label: 'Izq.' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Der.' }]} />
                  </Labeled>
                  <Labeled label="Vertical">
                    <Seg<VAlign> value={block.valign} onChange={v => patchBlock(block.id, { valign: v })}
                      options={[{ value: 'top', label: 'Arriba' }, { value: 'middle', label: 'Centro' }, { value: 'bottom', label: 'Abajo' }]} />
                  </Labeled>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <input type="checkbox" checked={block.bold} onChange={e => patchBlock(block.id, { bold: e.target.checked })} /> Negrita
                    </label>
                    <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <input type="checkbox" checked={block.upper} onChange={e => patchBlock(block.id, { upper: e.target.checked })} /> MAYÚSCULAS
                    </label>
                  </div>
                  <Labeled label="Posición y caja (mm)">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                      {(['x', 'y', 'w', 'h'] as const).map(k => (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#888' }}>
                          {k === 'x' ? 'X' : k === 'y' ? 'Y' : k === 'w' ? 'Ancho' : 'Alto'}
                          <input type="number" step={0.5} value={+(block[k] / 8).toFixed(1)}
                            onChange={e => {
                              const v = Math.round((Number(e.target.value) || 0) * 8)
                              const p: Partial<LabelBlock> =
                                k === 'x' ? { x: clamp(v, 0, DW - block.w) }
                                : k === 'y' ? { y: clamp(v, 0, DH - block.h) }
                                : k === 'w' ? { w: clamp(v, 40, DW - block.x) }
                                : { h: clamp(v, 20, DH - block.y) }
                              patchBlock(block.id, p)
                            }}
                            style={{ ...inputStyle, padding: '4px 4px' }} />
                        </label>
                      ))}
                    </div>
                  </Labeled>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="form-dialog-btn" onClick={() => duplicateBlock(block)}>Duplicar</button>
                    <button type="button" className="form-dialog-btn" onClick={() => removeBlock(block.id)}>Eliminar texto</button>
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>

        <div className="form-dialog-actions" style={{ justifyContent: 'flex-end' }}>
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="form-dialog-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="form-dialog-btn primary" onClick={onPrint} disabled={!selectedCount || printing}>
              {printing ? 'Imprimiendo…' : `Imprimir ${selectedCount || ''}`}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

/** The editable label: the printer's own render with a handle box over each block. */
function DesignEditor({ design, values, selected, onSelect, onBlock }: {
  design: LabelDesign
  values: ReturnType<typeof stickerValues>
  selected: string | null
  onSelect: (id: string | null) => void
  onBlock: (id: string, p: Partial<LabelBlock>) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(600)
  const [overflow, setOverflow] = useState<Set<string>>(new Set())
  const { w: DW, h: DH } = designSize(design)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (canvasRef.current) setOverflow(renderDesign(canvasRef.current, design, values))
  }, [design, values.shipper, values.consignee, values.title, values.un, values.quantity, values.footer])

  // Vertical labels would otherwise be twice as tall as the screen.
  const shown = design.orientation === 'portrait' ? Math.min(width, 460) : Math.min(width, 900)
  const scale = shown / DW

  function startDrag(e: React.PointerEvent, b: LabelBlock, mode: 'move' | 'resize') {
    e.preventDefault()
    e.stopPropagation()
    onSelect(b.id)
    const sx = e.clientX
    const sy = e.clientY
    const o = { ...b }
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale
      const dy = (ev.clientY - sy) / scale
      if (mode === 'move') onBlock(b.id, { x: clamp(snap(o.x + dx), 0, DW - o.w), y: clamp(snap(o.y + dy), 0, DH - o.h) })
      else onBlock(b.id, { w: clamp(snap(o.w + dx), 40, DW - o.x), h: clamp(snap(o.h + dy), 20, DH - o.y) })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <div
        onPointerDown={() => onSelect(null)}
        style={{ position: 'relative', width: shown, height: DH * scale, margin: '0 auto', boxShadow: '0 1px 6px rgba(0,0,0,0.25)', background: '#fff', touchAction: 'none' }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {design.blocks.map(b => {
          const isSel = b.id === selected
          const over = overflow.has(b.id)
          return (
            <div
              key={b.id}
              onPointerDown={e => startDrag(e, b, 'move')}
              title={`${FIELD_LABEL[b.field]}${over ? ' — el texto no cabe' : ''}`}
              style={{
                position: 'absolute', left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale,
                border: isSel ? '2px solid #1f6feb' : over ? '2px dashed #d12' : '1px dashed rgba(0,0,0,0.18)',
                background: isSel ? 'rgba(31,111,235,0.06)' : 'transparent', cursor: 'move', boxSizing: 'border-box',
              }}
            >
              {isSel && (
                <div
                  onPointerDown={e => startDrag(e, b, 'resize')}
                  style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: '#1f6feb', cursor: 'nwse-resize', borderRadius: 2 }}
                />
              )}
            </div>
          )
        })}
      </div>
      {overflow.size > 0 && (
        <div style={{ color: '#b00', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Hay texto que no cabe en su caja (marcado en rojo): agranda la caja o achica la letra.
        </div>
      )}
    </div>
  )
}

function StickerCanvas({ design, values, width }: { design: LabelDesign; values: ReturnType<typeof stickerValues>; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) renderDesign(ref.current, design, values)
  }, [design, values.shipper, values.consignee, values.title, values.un, values.quantity, values.footer])
  return <canvas ref={ref} style={{ width, display: 'block' }} />
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4, padding: '6px 8px', fontSize: 12, background: '#fff',
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#555' }}>{title}</div>
      {children}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ color: '#666' }}>{label}</span>
      {children}
    </label>
  )
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            border: 0, padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            background: o.value === value ? '#222' : '#fff', color: o.value === value ? '#fff' : '#333',
          }}
        >{o.label}</button>
      ))}
    </div>
  )
}
