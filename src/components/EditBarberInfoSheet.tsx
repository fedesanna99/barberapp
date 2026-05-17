import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import type { BarberInfo } from '../hooks/useBarberInfo'

const FIELDS: [keyof BarberInfo, string, string, string][] = [
  ['shop_name',   'ti-building-store',   'Salon name',  'e.g. Barber & Co.'],
  ['address',     'ti-map-pin',          'Address',     'e.g. Via Roma 1, Milano'],
  ['phone',       'ti-phone',            'Phone',       'e.g. +39 02 1234567'],
  ['social_link', 'ti-brand-instagram',  'Social link', 'https://instagram.com/...'],
]

export function EditBarberInfoSheet({
  initial,
  saving,
  saveError,
  onSave,
  onClose,
}: {
  initial: BarberInfo
  saving: boolean
  saveError?: string | null
  onSave: (info: BarberInfo) => Promise<string | null>
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
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end',
        zIndex: 200,
      }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0',
        width: '100%', animation: 'sheetUp .3s ease-out',
      }}>
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 0' }} />

        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 16px 10px',
          borderBottom: `0.5px solid ${C.border}`,
        }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>Shop info</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FIELDS.map(([key, icon, label, placeholder]) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 13 }} />
                {label}
              </div>
              <input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '9px 14px', borderRadius: 10,
                  border: `0.5px solid ${C.borderMed}`,
                  fontSize: 13, background: C.surface, color: C.text,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          {saveError && (
            <div style={{ fontSize: 12, color: '#E53935', padding: '8px 12px', borderRadius: 8, background: '#FFEBEE' }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 2, padding: 13, borderRadius: 12,
              background: saving ? C.borderMed : C.text,
              color: C.bg, fontSize: 14, fontWeight: 500,
              border: 'none', cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Saving…</>
              : 'Save'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
