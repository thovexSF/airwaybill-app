import React from 'react'

/**
 * Form primitives shared by the document editors, wrapping the existing
 * `.form-section` / `.field` / `.field-row` styles in App.css so every editor
 * in the suite looks like the AWB one.
 */

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="field-row">{children}</div>
}

export function Field({ label, value, onChange, placeholder, type }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Select({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Check({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="field">
      <label className="toggle" style={{ marginTop: 16 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    </div>
  )
}

/** Multi-select of fixed codes rendered as a checkbox grid (SPH, etc.). */
export function CodeChecks({ label, codes, selected, onChange }: {
  label: string
  codes: readonly { code: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <div style={{ padding: '10px 12px' }}>
      <label style={{ fontSize: 11, color: 'var(--label)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {codes.map(c => (
          <label key={c.code} className="toggle">
            <input
              type="checkbox"
              checked={selected.includes(c.code)}
              onChange={e => onChange(e.target.checked ? [...selected, c.code] : selected.filter(x => x !== c.code))}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

/**
 * Editable table of repeating rows (goods items, DG items, ULDs…).
 * `columns` is a CSS grid template shared by the header and every GridRow;
 * `display: grid` is set inline because `.rate-header`/`.rate-row` are flex.
 */
export function GridTable({ columns, headers, minWidth, onAdd, addLabel, children }: {
  columns: string
  headers: string[]
  minWidth?: number
  onAdd: () => void
  addLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="rate-table">
      <div className="rate-inner" style={{ minWidth: minWidth ?? 560 }}>
        <div className="rate-header" style={{ display: 'grid', gridTemplateColumns: columns }}>
          {headers.map((h, i) => <span key={i}>{h}</span>)}
        </div>
        {children}
      </div>
      <button className="btn-add" onClick={onAdd}>{addLabel}</button>
    </div>
  )
}

export function GridRow({ columns, children }: { columns: string; children: React.ReactNode }) {
  return (
    <div className="rate-row" style={{ display: 'grid', gridTemplateColumns: columns }}>
      {children}
    </div>
  )
}
