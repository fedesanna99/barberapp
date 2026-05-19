import { useState } from 'react'
import { C } from '../lib/colors'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { useProfile } from '../hooks/useProfile'
import { useClientBookings } from '../hooks/useBooking'
import { useTheme, type ThemePref } from '../hooks/useTheme'
import { EditBarberInfoSheet } from '../components/EditBarberInfoSheet'
import { LocationSettingsSheet } from '../components/LocationSettingsSheet'
import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { IS_DEMO } from '../lib/supabase'
import type { ToastEvent } from '../components/Toast'

const TODAY = new Date().toISOString().split('T')[0]

type MenuAction = 'appointments' | 'saved' | 'support' | 'notifications' | 'invite' | 'location' | 'messages'
type MenuItem = { icon: IconName; label: string; badge?: string; action?: MenuAction }

function buildItems(upcomingCount: number): MenuItem[] {
  return [
    { icon: 'calendar', label: 'I miei appuntamenti', action: 'appointments', badge: upcomingCount > 0 ? String(upcomingCount) : undefined },
    { icon: 'chat',     label: 'Messaggi',            action: 'messages' },
    { icon: 'bookmark', label: 'Post salvati',        action: 'saved' },
    { icon: 'bell',     label: 'Notifiche',           action: 'notifications' },
    { icon: 'pin',      label: 'Posizione',           action: 'location' },
    { icon: 'share',    label: 'Invita un amico',     action: 'invite' },
    { icon: 'help',     label: 'Aiuto e supporto',    action: 'support' },
  ]
}

async function handleInvite(setToast: (t: ToastEvent) => void) {
  const url   = window.location.origin
  const title = 'Barberbook'
  const text  = 'Prenota il tuo prossimo taglio con Barberbook'
  if (navigator.share) {
    try { await navigator.share({ title, text, url }) } catch { /* user cancelled */ }
    return
  }
  try {
    await navigator.clipboard.writeText(`${text} — ${url}`)
    setToast({ kind: 'success', title: 'Link copiato.', message: 'L\'invito è negli appunti.' })
  } catch {
    setToast({ kind: 'info', title: 'Condividi questo link', message: url })
  }
}

interface Props {
  onLogout?:        () => void
  onSavedPosts?:    () => void
  onSupport?:       () => void
  onNotifications?: () => void
  onAppointments?:  () => void
  onMessages?:      () => void
  onToast?:         (t: ToastEvent | null) => void
  isBarber?:        boolean
  barberId?:        string
  userId?:          string
}

const THEME_OPTIONS: { id: ThemePref; label: string; icon: IconName }[] = [
  { id: 'light',  label: 'Chiaro', icon: 'sun'      },
  { id: 'dark',   label: 'Scuro',  icon: 'moon'     },
  { id: 'system', label: 'Auto',   icon: 'settings' },
]

export function Menu({ onLogout, onSavedPosts, onSupport, onNotifications, onAppointments, onMessages, onToast, isBarber, barberId, userId }: Props) {
  const [showEdit, setShowEdit]         = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const { theme, setTheme } = useTheme()
  const { info, saving, saveError, saveInfo } = useBarberInfo(
    isBarber ? barberId : undefined,
    isBarber ? userId   : undefined,
  )
  const { profile, updateProfile } = useProfile(userId)
  const { bookings } = useClientBookings(isBarber ? undefined : userId)
  const upcomingCount = bookings.filter(b => b.date >= TODAY && b.status !== 'cancelled' && b.status !== 'done').length
  const items = buildItems(upcomingCount)

  function initialsOf(name?: string | null) {
    if (!name) return 'TU'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: C.text }}>
          Menu
        </span>
      </div>

      {/* User card */}
      <div style={{ margin: '0 20px 16px', padding: '14px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={initialsOf(profile.display_name)} size={48} photo={profile.avatar_url ?? null} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            {profile.display_name ?? 'Utente'}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isBarber && info.shop_name ? info.shop_name : (profile.bio ?? (IS_DEMO ? 'Modalità demo' : ''))}
          </div>
        </div>
        {isBarber && (
          <button
            onClick={() => setShowEdit(true)}
            style={{
              padding: '7px 12px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.borderMed}`,
              background: C.bg, fontSize: 12.5, color: C.text,
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            Modifica
          </button>
        )}
      </div>

      <div style={{ height: 1, background: C.border }} />

      {/* Menu list */}
      <div style={{ padding: '4px 0' }}>
        {items.map(({ icon, label, badge, action }, i) => (
          <div key={label}>
            <div
              onClick={() => {
                if (action === 'appointments' && !IS_DEMO && userId) onAppointments?.()
                if (action === 'appointments' && (IS_DEMO || !userId)) onToast?.({ kind: 'info', title: 'Accesso richiesto', message: 'Accedi per vedere i tuoi appuntamenti.' })
                if (action === 'saved')         onSavedPosts?.()
                if (action === 'support')       onSupport?.()
                if (action === 'notifications') onNotifications?.()
                if (action === 'messages' && !IS_DEMO && userId) onMessages?.()
                if (action === 'messages' && (IS_DEMO || !userId)) onToast?.({ kind: 'info', title: 'Accesso richiesto', message: 'Accedi per inviare messaggi.' })
                if (action === 'invite')        handleInvite(t => onToast?.(t))
                if (action === 'location' && !IS_DEMO && userId) setShowLocation(true)
                if (action === 'location' && (IS_DEMO || !userId)) onToast?.({ kind: 'info', title: 'Accesso richiesto', message: 'Accedi per impostare la tua posizione.' })
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px', cursor: 'pointer',
              }}
            >
              <Icon name={icon} size={22} color={C.muted} style={{ width: 24 }} />
              <span style={{ flex: 1, fontSize: 14.5, color: C.text }}>{label}</span>
              {badge && (
                <span style={{
                  minWidth: 22, height: 20, padding: '0 7px',
                  borderRadius: 9999, background: 'var(--clay)', color: 'var(--paper-3)',
                  fontSize: 11, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {badge}
                </span>
              )}
              <Icon name="caret" size={16} color={C.hint} />
            </div>
            {i < items.length - 1 && <div style={{ height: 1, background: C.border, marginLeft: 20 }} />}
          </div>
        ))}
      </div>

      {/* Theme picker */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Aspetto
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          padding: 4, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 'var(--r-md)',
        }}>
          {THEME_OPTIONS.map(opt => {
            const active = theme === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                aria-pressed={active}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', minHeight: 44,
                  border: 'none', borderRadius: 'var(--r-sm)',
                  background: active ? 'var(--clay)' : 'transparent',
                  color:      active ? 'var(--paper-3)' : C.muted,
                  fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 120ms var(--ease), color 120ms var(--ease)',
                }}
              >
                <Icon name={opt.icon} size={14} weight={active ? 'fill' : 'regular'} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '20px 20px 12px' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '12px 0',
            borderRadius: 'var(--r-md)',
            border: `1px solid ${C.red}`,
            background: 'transparent', color: C.red,
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Esci
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 20px 24px', fontSize: 11, color: C.hint }}>
        Barberbook · v1.0
      </div>

      {showEdit && (
        <EditBarberInfoSheet
          initial={info}
          saving={saving}
          saveError={saveError}
          onSave={saveInfo}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showLocation && (
        <LocationSettingsSheet
          initialLat={profile.lat}
          initialLng={profile.lng}
          onSave={(lat, lng) => updateProfile({ lat, lng })}
          onClose={() => setShowLocation(false)}
        />
      )}
    </div>
  )
}
