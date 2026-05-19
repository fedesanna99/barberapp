import { useState } from 'react'
import { C } from '../lib/colors'
import { Icon } from '../components/Icon'
import { IS_DEMO } from '../lib/supabase'
import { useServices, type Service } from '../hooks/useServices'
import type { ToastEvent } from '../components/Toast'

interface ServicesTabProps {
  barberId?: string
  onToast?: (t: ToastEvent | null) => void
}

export function ServicesTab({ barberId, onToast }: ServicesTabProps) {
  const isDemo = IS_DEMO || !barberId
  const { services, addService, updateService, deleteService } = useServices(
    isDemo ? 'demo' : barberId,
  )
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function openAdd() { setEditingId(null); setShowForm(true) }
  function openEdit(id: string) { setEditingId(id); setShowForm(true) }

  async function handleSave(name: string, price: number, duration: number) {
    if (isDemo) {
      onToast?.({ kind: 'info', title: 'Demo', message: 'Accedi come barbiere per gestire i servizi.' })
      setShowForm(false)
      return
    }
    if (editingId) {
      const { error } = await updateService(editingId, { name, price, duration_minutes: duration })
      if (error) { onToast?.({ kind: 'error', title: 'Errore', message: error.message }); return }
      onToast?.({ kind: 'success', title: 'Servizio aggiornato.', message: name })
    } else {
      const { error } = await addService(name, price, duration)
      if (error) { onToast?.({ kind: 'error', title: 'Errore', message: error.message }); return }
      onToast?.({ kind: 'success', title: 'Servizio aggiunto.', message: name })
    }
    setShowForm(false)
  }

  async function handleToggle(s: Service) {
    if (isDemo) {
      onToast?.({ kind: 'info', title: 'Demo', message: 'Accedi come barbiere per gestire i servizi.' })
      return
    }
    await updateService(s.id, { is_active: !s.is_active })
  }

  async function handleDelete(s: Service) {
    if (isDemo) {
      onToast?.({ kind: 'info', title: 'Demo', message: 'Accedi come barbiere per gestire i servizi.' })
      return
    }
    const { error } = await deleteService(s.id)
    if (error) { onToast?.({ kind: 'error', title: 'Errore', message: error.message }); return }
    onToast?.({ kind: 'info', title: 'Servizio rimosso.', message: s.name })
  }

  const editing = editingId ? services.find(s => s.id === editingId) : undefined

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 14px', lineHeight: 1.55 }}>
        I clienti vedranno questi servizi al momento della prenotazione.
      </p>

      {services.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Icon name="scissors" size={30} color={C.hint} />
          Nessun servizio ancora. Aggiungine uno!
        </div>
      )}

      {services.map(s => (
        <div
          key={s.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 8,
            background: C.surface, border: `1px solid ${C.border}`,
            opacity: s.is_active ? 1 : 0.5,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: s.is_active ? C.accentLight : C.surface,
              border: s.is_active ? 'none' : `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="scissors" size={18} color={s.is_active ? C.accentDeep : C.hint} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
              {s.name}
              {!s.is_active && (
                <span style={{ fontSize: 10, fontWeight: 500, color: C.hint, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 6px' }}>
                  disattivo
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                € {Number.isInteger(s.price) ? s.price : s.price.toFixed(2)}
              </span>
              {' · '}{s.duration_minutes} min
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <ServiceBtn label={s.is_active ? 'Pausa' : 'Attiva'} tone="ghost" onClick={() => handleToggle(s)} />
            <ServiceBtn label="Modifica" tone="ghost" onClick={() => openEdit(s.id)} />
            <ServiceBtn label="Elimina" tone="danger" onClick={() => handleDelete(s)} />
          </div>
        </div>
      ))}

      <button
        onClick={openAdd}
        style={{
          width: '100%', marginTop: 4, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: C.surface, border: `1.5px dashed ${C.borderMed}`,
          borderRadius: 'var(--r-md)', cursor: 'pointer',
          fontSize: 13.5, fontWeight: 500, color: C.text, fontFamily: 'inherit',
        }}
      >
        <Icon name="plus" size={16} color={C.text} />
        Aggiungi servizio
      </button>

      {showForm && (
        <ServiceFormSheet
          initial={editing}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function ServiceBtn({ label, tone, onClick }: { label: string; tone: 'ghost' | 'danger'; onClick: () => void }) {
  const styles = tone === 'danger'
    ? { bg: C.bg, fg: C.red, bd: C.red }
    : { bg: C.bg, fg: C.text, bd: C.borderMed }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 10px', borderRadius: 'var(--r-md)',
        border: `1px solid ${styles.bd}`,
        background: styles.bg, color: styles.fg,
        fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function ServiceFormSheet({
  initial, onSave, onClose,
}: {
  initial?: Service
  onSave: (name: string, price: number, duration: number) => void
  onClose: () => void
}) {
  const [name,     setName]     = useState(initial?.name ?? '')
  const [price,    setPrice]    = useState(String(initial?.price ?? ''))
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? 30))
  const [saving,   setSaving]   = useState(false)

  const priceNum    = parseFloat(price)
  const durationNum = parseInt(duration, 10)
  const valid       = name.trim().length > 0 && !isNaN(priceNum) && priceNum >= 0 && !isNaN(durationNum) && durationNum >= 5 && durationNum <= 480

  async function submit() {
    if (!valid || saving) return
    setSaving(true)
    await onSave(name.trim(), priceNum, durationNum)
    setSaving(false)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
        boxShadow: 'var(--shadow-sheet)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 16px' }} />
        <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: C.text }}>
            {initial ? 'Modifica servizio' : 'Nuovo servizio'}
          </span>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: C.muted }}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <FormField label="Nome del servizio">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
              placeholder="es. Taglio classico"
              style={inputStyle}
            />
          </FormField>
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <FormField label="Prezzo (€)" style={{ flex: 1 }}>
              <input
                value={price}
                onChange={e => setPrice(e.target.value)}
                type="number"
                min={0}
                step={0.5}
                placeholder="15"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Durata (min)" style={{ flex: 1 }}>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                type="number"
                min={5}
                max={480}
                step={5}
                placeholder="30"
                style={inputStyle}
              />
            </FormField>
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={submit}
            disabled={!valid || saving}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
              background: valid ? 'var(--ink)' : C.surface,
              color: valid ? 'var(--paper-3)' : C.hint,
              border: `1px solid ${valid ? 'var(--ink)' : C.border}`,
              fontSize: 14.5, fontWeight: 500, cursor: valid ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Salvo…' : initial ? 'Salva modifiche' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 'var(--r-md)',
  border: `1px solid var(--ink-12)`,
  background: C.surface, color: C.text,
  fontFamily: 'inherit', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
