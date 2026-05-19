import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import { Icon } from './Icon'
import type { BarberInfo } from '../hooks/useBarberInfo'

const FIELDS: [keyof BarberInfo, string, string, string?][] = [
  ['shop_name',            'Nome del salone',   'es. Barber & Co.'],
  ['address',              'Indirizzo',         'es. Via Roma 1, Cagliari'],
  ['phone',                'Telefono',          'es. +39 02 1234567', 'tel'],
  ['social_link',          'Link social',       'https://instagram.com/...', 'url'],
  ['default_slot_minutes', 'Durata slot (min)', '30'],
  ['default_price',        'Prezzo medio (€)',  '25'],
]

// Permissive: + opzionale, almeno 7 caratteri tra cifre/spazi/parentesi/trattini.
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/
const FIELD_LIMITS: Partial<Record<keyof BarberInfo, number>> = {
  shop_name:   TEXT_LIMITS.shopName,
  address:     TEXT_LIMITS.address,
  phone:       TEXT_LIMITS.phone,
  social_link: TEXT_LIMITS.socialLink,
}

function phoneError(v: string): string | null {
  const trimmed = v.trim()
  if (!trimmed) return null // optional field
  return PHONE_RE.test(trimmed) ? null : 'Telefono non valido (solo cifre, spazi, +, -, parentesi)'
}

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
    const max = FIELD_LIMITS[key]
    setForm(prev => ({ ...prev, [key]: max ? limitText(val, max) : val }))
  }

  const phoneErr = phoneError(form.phone)
  const formInvalid = phoneErr !== null

  async function handleSave() {
    if (saving || formInvalid) return
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
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FIELDS.map(([key, label, placeholder, inputType]) => {
            const fieldErr = key === 'phone' ? phoneErr : null
            const showErr = fieldErr && (form[key]?.length ?? 0) > 0
            return (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{label}</span>
                <input
                  type={inputType ?? 'text'}
                  inputMode={inputType === 'tel' ? 'tel' : undefined}
                  value={form[key]}
                  maxLength={FIELD_LIMITS[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
                    border: `1px solid ${showErr ? C.red : C.border}`,
                    fontSize: 14, background: C.bg, color: C.text,
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                {showErr && (
                  <span style={{ fontSize: 11.5, color: C.red, marginTop: 2 }}>{fieldErr}</span>
                )}
              </label>
            )
          })}

          {saveError && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || formInvalid}
            style={{
              marginTop: 4, padding: 13, borderRadius: 'var(--r-md)',
              background: saving || formInvalid ? C.surface : 'var(--clay)',
              color:      saving || formInvalid ? C.muted : 'var(--paper-3)',
              border: `1px solid ${saving || formInvalid ? C.border : 'var(--clay)'}`,
              fontSize: 14, fontWeight: 500,
              cursor: saving || formInvalid ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
