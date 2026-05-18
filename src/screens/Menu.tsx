import { useState } from 'react'
import { C } from '../lib/colors'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { EditBarberInfoSheet } from '../components/EditBarberInfoSheet'

type MenuItem = { icon: string; label: string; badge?: string; action?: 'liked' | 'support' }

const SECTIONS: MenuItem[][] = [
  [
    { icon: 'ti-calendar', label: 'I miei appuntamenti', badge: '2' },
    { icon: 'ti-heart',    label: 'Post che ti piacciono', action: 'liked' as const },
    { icon: 'ti-bell',     label: 'Notifiche',           badge: '3' },
    { icon: 'ti-map-pin',  label: 'Impostazioni posizione' },
  ],
  [
    { icon: 'ti-share', label: 'Invita un amico'    },
  ],
  [
    { icon: 'ti-headset', label: 'Aiuto e supporto', action: 'support' as const },
  ],
]

export function Menu({ onLogout, onLikedPosts, onSupport, isBarber, barberId, userId }: {
  onLogout?: () => void
  onLikedPosts?: () => void
  onSupport?: () => void
  isBarber?: boolean
  barberId?: string
  userId?: string
}) {
  const [showEdit, setShowEdit] = useState(false)
  const { info, saving, saveError, saveInfo } = useBarberInfo(
    isBarber ? barberId : undefined,
    isBarber ? userId   : undefined,
  )

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
      {SECTIONS.map((group, gi) => (
        <div key={gi}>
          <div style={{ height: 8, background: C.surface }} />
          {group.map(({ icon, label, badge, action }) => (
            <div key={label} onClick={() => {
              if (action === 'liked')   onLikedPosts?.()
              if (action === 'support') onSupport?.()
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
    </div>
  )
}
