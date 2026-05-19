import { useState } from 'react'
import { C } from '../lib/colors'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import { Icon } from './Icon'

export interface EditProfileForm {
  display_name: string
  bio: string
}

export function EditProfileSheet({
  initial, onSave, onClose,
}: {
  initial: EditProfileForm
  onSave:  (form: EditProfileForm) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm]   = useState<EditProfileForm>(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (saving) return
    if (!form.display_name.trim()) { setSaveError('Inserisci un nome visualizzato'); return }
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
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Modifica profilo
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Nome visualizzato">
            <input
              value={form.display_name}
              maxLength={TEXT_LIMITS.profileName}
              onChange={e => setForm(prev => ({ ...prev, display_name: limitText(e.target.value, TEXT_LIMITS.profileName) }))}
              placeholder="es. Mario Rossi"
              style={inputStyle}
            />
          </Field>

          <Field label="Bio">
            <textarea
              value={form.bio}
              maxLength={TEXT_LIMITS.profileBio}
              onChange={e => setForm(prev => ({ ...prev, bio: limitText(e.target.value, TEXT_LIMITS.profileBio) }))}
              placeholder="Una breve descrizione di te"
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
            <CharCount value={form.bio.length} max={TEXT_LIMITS.profileBio} />
          </Field>

          {saveError && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={primaryBtn(saving)}
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

function CharCount({ value, max }: { value: number; max: number }) {
  return <span style={{ alignSelf: 'flex-end', fontSize: 11, color: C.hint, fontVariantNumeric: 'tabular-nums' }}>{value}/{max}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
  border: `1px solid ${C.border}`,
  fontSize: 14, background: C.bg, color: C.text,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 120ms var(--ease)',
}

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    marginTop: 4, padding: 13, borderRadius: 'var(--r-md)',
    background: loading ? C.surface : 'var(--clay)',
    color:      loading ? C.muted : 'var(--paper-3)',
    border: `1px solid ${loading ? C.border : 'var(--clay)'}`,
    fontSize: 14, fontWeight: 500,
    cursor: loading ? 'default' : 'pointer',
    fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }
}
