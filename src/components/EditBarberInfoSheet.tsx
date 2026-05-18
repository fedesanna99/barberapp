import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import type { BarberInfo } from '../hooks/useBarberInfo'

const FIELDS: [keyof BarberInfo, string, string][] = [
  ['shop_name',            'Nome del salone',   'es. Barber & Co.'],
  ['address',              'Indirizzo',         'es. Via Roma 1, Cagliari'],
  ['phone',                'Telefono',          'es. +39 02 1234567'],
  ['social_link',          'Link social',       'https://instagram.com/...'],
  ['default_slot_minutes', 'Durata slot (min)', '30'],
  ['default_price',        'Prezzo medio (€)',  '25'],
]

export function EditBarberInfoSheet({
  initial, saving, saveError, onSave, onClose,
}: {
  initial: BarberInfo
  saving:  boolean
  saveError?: string | null
  onSave:  (info: BarberInfo) => Promise<string | null>
  onClose: () => void
}) {
  const [form, setForm] = useState<BarberInfo>(initial)

  useEffect(() => { setForm(initial) }, [initial])

  function set(key: keyof BarberInfo, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (saving) return
    const err = await onSave(form)
    if (!err) onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
        maxHeight: '92%', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Info salone
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ph-thin ph-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FIELDS.map(([key, label, placeholder]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{label}</span>
              <input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
                  border: `1px solid ${C.border}`,
                  fontSize: 14, background: C.bg, color: C.text,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </label>
          ))}

          {saveError && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 4, padding: 13, borderRadius: 'var(--r-md)',
              background: saving ? C.surface : C.text,
              color:      saving ? C.muted : C.bg,
              border: `1px solid ${saving ? C.border : C.text}`,
              fontSize: 14, fontWeight: 500,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 16, animation: 'spin .8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
