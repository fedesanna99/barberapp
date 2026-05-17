import { useState } from 'react'
import { C } from '../lib/colors'

export interface EditProfileForm {
  display_name: string
  bio: string
}

export function EditProfileSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: EditProfileForm
  onSave: (form: EditProfileForm) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm]       = useState<EditProfileForm>(initial)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (saving) return
    if (!form.display_name.trim()) {
      setSaveError('Inserisci un nome visualizzato')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({ display_name: form.display_name.trim(), bio: form.bio.trim() })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Salvataggio fallito')
    } finally {
      setSaving(false)
    }
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
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>Modifica profilo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        <div style={{ padding: '16px 16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-user" style={{ fontSize: 13 }} />
              Nome visualizzato
            </div>
            <input
              value={form.display_name}
              onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="es. Mario Rossi"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-quote" style={{ fontSize: 13 }} />
              Bio
            </div>
            <textarea
              value={form.bio}
              onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Una breve descrizione di te"
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

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
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 14px', borderRadius: 10,
  border: `0.5px solid ${C.borderMed}`,
  fontSize: 13, background: C.surface, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
