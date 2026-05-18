import { C } from '../lib/colors'
import { Avatar } from './Avatar'
import { haversineKm, formatKm, type LatLng } from '../lib/geo'
import type { DemoBarber } from '../lib/demoData'

interface Props {
  barber:     DemoBarber
  userCoords: LatLng | null
  onBook:     (barber: DemoBarber) => void
  onClose:    () => void
  // Marker belongs to the current barber-user → don't offer Prenota.
  isSelf?:    boolean
}

export function BarberPreviewCard({ barber, userCoords, onBook, onClose, isSelf }: Props) {
  const dist = userCoords && barber.lat != null && barber.lng != null
    ? haversineKm(userCoords, { lat: barber.lat, lng: barber.lng })
    : null

  return (
    <div
      style={{
        position:  'absolute',
        left:      12,
        right:     12,
        bottom:    12,
        zIndex:    20,
        background: C.bg,
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        border:    `0.5px solid ${C.border}`,
        padding:   '14px 14px 12px',
        animation: 'sheetUp .25s ease-out',
      }}
    >
      <button
        onClick={onClose}
        aria-label="Chiudi"
        style={{
          position:  'absolute',
          top:       8,
          right:     8,
          background: 'none',
          border:    'none',
          cursor:    'pointer',
          padding:   4,
          color:     C.muted,
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 16 }} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={barber.initials} size={48} accent={barber.accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {barber.name}
            </span>
            {barber.rating >= 4.9 && (
              <span style={{ fontSize: 9, background: C.accentLight, color: C.accent, padding: '2px 6px', borderRadius: 20, fontWeight: 500 }}>TOP</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
            {barber.city}{dist != null ? ` · ${formatKm(dist)}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <i className="ti ti-star-filled" style={{ fontSize: 11, color: '#EF9F27' }} />
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{barber.rating}</span>
            {barber.tags.length > 0 && (
              <>
                <span style={{ fontSize: 11, color: C.hint }}>·</span>
                <span style={{ fontSize: 11, color: C.hint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {barber.tags.join(' · ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isSelf ? (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: C.surface, border: `0.5px dashed ${C.borderMed}`,
          fontSize: 12, color: C.muted, textAlign: 'center',
        }}>
          Questo è il tuo profilo
        </div>
      ) : (
        <button
          onClick={() => onBook(barber)}
          style={{
            marginTop: 12,
            width:     '100%',
            padding:   '10px 0',
            borderRadius: 10,
            background: C.text,
            color:     C.bg,
            border:    'none',
            fontSize:  13,
            fontWeight: 500,
            cursor:    'pointer',
            fontFamily: 'inherit',
          }}
        >
          Prenota
        </button>
      )}
    </div>
  )
}
