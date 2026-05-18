import { useState } from 'react'
import { C } from '../lib/colors'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { useProfile } from '../hooks/useProfile'
import { useClientBookings } from '../hooks/useBooking'
import { EditBarberInfoSheet } from '../components/EditBarberInfoSheet'
import { LocationSettingsSheet } from '../components/LocationSettingsSheet'
import { IS_DEMO } from '../lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

type MenuAction = 'appointments' | 'liked' | 'support' | 'notifications' | 'invite' | 'location'
type MenuItem = { icon: string; label: string; badge?: string; action?: MenuAction }

function buildSections(upcomingCount: number): MenuItem[][] {
  return [
    [
      { icon: 'ti-calendar', label: 'I miei appuntamenti', action: 'appointments' as const, badge: upcomingCount > 0 ? String(upcomingCount) : undefined },
      { icon: 'ti-heart',    label: 'Post che ti piacciono', action: 'liked' as const },
      { icon: 'ti-bell',     label: 'Notifiche',             action: 'notifications' as const },
      { icon: 'ti-map-pin',  label: 'Impostazioni posizione', action: 'location' as const },
    ],
    [
      { icon: 'ti-share', label: 'Invita un amico', action: 'invite' as const },
    ],
    [
      { icon: 'ti-headset', label: 'Aiuto e supporto', action: 'support' as const },
    ],
  ]
}

async function handleInvite(setToast: (m: string | null) => void) {
  const url   = window.location.origin
  const title = 'CutBook'
  const text  = 'Prenota il tuo prossimo taglio con CutBook'
  if (navigator.share) {
    try { await navigator.share({ title, text, url }) } catch { /* user cancelled */ }
    return
  }
  // Fallback: copy URL to clipboard
  try {
    await navigator.clipboard.writeText(`${text} — ${url}`)
    setToast('Link copiato negli appunti')
  } catch {
    setToast(`Condividi questo link: ${url}`)
  }
}

export function Menu({ onLogout, onLikedPosts, onSupport, onNotifications, onAppointments, onToast, isBarber, barberId, userId }: {
  onLogout?: () => void
  onLikedPosts?: () => void
  onSupport?: () => void
  onNotifications?: () => void
  onAppointments?: () => void
  onToast?: (msg: string | null) => void
  isBarber?: boolean
  barberId?: string
  userId?: string
}) {
  const [showEdit, setShowEdit]         = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const { info, saving, saveError, saveInfo } = useBarberInfo(
    isBarber ? barberId : undefined,
    isBarber ? userId   : undefined,
  )
  const { profile, updateProfile } = useProfile(userId)
  const { bookings } = useClientBookings(isBarber ? undefined : userId)
  const upcomingCount = bookings.filter(b => b.date >= TODAY && b.status !== 'cancelled' && b.status !== 'done').length
  const sections = buildSections(upcomingCount)

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Menu</span>
      </div>

      {/* User card */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: C.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 500, color: C.accent,
          border: `2px solid ${C.accent}`,
        }}>
          AG
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Andrea G.</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {isBarber && info.shop_name ? info.shop_name : 'andrea@email.com'}
          </div>
        </div>
        {isBarber && (
          <button
            onClick={() => setShowEdit(true)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: `0.5px solid ${C.borderMed}`,
              background: 'none', fontSize: 12, color: C.muted,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Modifica
          </button>
        )}
      </div>

      {/* Menu sections */}
      {sections.map((group, gi) => (
        <div key={gi}>
          <div style={{ height: 8, background: C.surface }} />
          {group.map(({ icon, label, badge, action }) => (
            <div key={label} onClick={() => {
              if (action === 'appointments' && !IS_DEMO && userId) onAppointments?.()
              if (action === 'appointments' && (IS_DEMO || !userId)) onToast?.('Disponibile dopo il login')
              if (action === 'liked')         onLikedPosts?.()
              if (action === 'support')       onSupport?.()
              if (action === 'notifications') onNotifications?.()
              if (action === 'invite')        handleInvite(msg => onToast?.(msg))
              if (action === 'location' && !IS_DEMO && userId) setShowLocation(true)
              if (action === 'location' && (IS_DEMO || !userId)) onToast?.('Disponibile dopo il login')
            }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', borderBottom: `0.5px solid ${C.border}` }}>
              <i className={`ti ${icon}`} style={{ fontSize: 20, color: C.muted }} />
              <span style={{ flex: 1, fontSize: 14, color: C.text }}>{label}</span>
              {badge && (
                <span style={{ fontSize: 11, background: C.text, color: C.bg, padding: '1px 7px', borderRadius: 20, fontWeight: 500 }}>
                  {badge}
                </span>
              )}
              <i className="ti ti-chevron-right" style={{ fontSize: 16, color: C.hint }} />
            </div>
          ))}
        </div>
      ))}

      {/* Sign out */}
      <div style={{ height: 8, background: C.surface }} />
      <div
        onClick={onLogout}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
      >
        <i className="ti ti-logout" style={{ fontSize: 20, color: C.red }} />
        <span style={{ flex: 1, fontSize: 14, color: C.red }}>Esci</span>
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
