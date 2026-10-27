/** DRAFT watermark switch for the dark preview toolbars. `locked`: the free allowance is spent and the mark is forced. */
export function DraftToggle({ checked, onChange, locked }: {
  checked: boolean
  onChange: (v: boolean) => void
  locked?: boolean
}) {
  return (
    <label
      title={locked ? 'Plan gratis: alcanzaste el límite de documentos sin marca. Actualiza a Starter para quitar DRAFT.' : 'Marca de agua DRAFT en el PDF'}
      style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ddd', fontSize: 11, fontWeight: 700, padding: '0 8px', height: 26, borderRadius: 4, background: '#333', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.7 : 1 }}
    >
      <input
        type="checkbox"
        checked={checked || !!locked}
        disabled={locked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--red-light)', margin: 0 }}
      />
      DRAFT
    </label>
  )
}
