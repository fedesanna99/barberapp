import { C } from '../lib/colors'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { haversineKm, formatKm, type LatLng } from '../lib/geo'
import type { DemoBarber } from '../lib/demoData'
import { ratingDisplay } from '../lib/rating'

interface Props {
  barber:     DemoBarber
  userCoords: LatLng | null
  onBook:     (barber: DemoBarber) => void
  onClose:    () => void
  isSelf?:    boolean
}

export function BarberPreviewCard({ barber, userCoords, onBook, onClose, isSelf }: Props) {
  const dist: number | null =
    userCoords && barber.lat != null && barber.lng != null
      ? haversineKm(userCoords, { lat: barber.lat, lng: barber.lng })
      : barber.dist > 0 ? barber.dist : null
  const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })

  return (
    <div
      style={{
        position:    'absolute',
        left:        12,
        right:       12,
        bottom:      12,
        zIndex:      20,
        background:  C.bg,
        borderRadius: 'var(--r-lg)',
        boxShadow:   'var(--shadow-lift)',
        padding:     '14px',
        animation:   'sheetUp 260ms var(--ease)',
      }}
    >
      <button
        onClick={onClose}
        aria-label="Chiudi"
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'none', border: 'none',
          cursor: 'pointer', padding: 4, color: C.muted,
        }}
      >
        <Icon name="close" size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={barber.initials} size={48} ring={rd.hasReviews && rd.numeric >= 4.9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {barber.name}
            </span>
            {rd.hasReviews && rd.numeric >= 4.9 && (
              <span style={{ fontSize: 10.5, background: C.accentLight, color: C.accentDeep, padding: '2px 8px', borderRadius: 9999, fontWeight: 500 }}>Top</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: C.muted }}>
            <Icon name="pin" size={13} color={C.accent} />
            {barber.city}{dist != null ? ` · ${formatKm(dist)}` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: C.muted }}>
            <Icon name="star" size={12} color={rd.hasReviews ? C.accent : C.hint} weight={rd.hasReviews ? 'fill' : 'regular'} />
            <span style={{ fontWeight: 600, color: C.text }}>{rd.label}</span>
            {barber.tags.length > 0 && (
              <>
                <span style={{ color: C.borderMed }}>·</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {barber.tags.join(' · ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isSelf ? (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 'var(--r-md)',
          background: C.surface, border: `1px dashed ${C.borderMed}`,
          fontSize: 12, color: C.muted, textAlign: 'center',
        }}>
          Questo è il tuo profilo
        </div>
      ) : barber.acceptingBookings === false ? (
        <button
          disabled
          aria-disabled
          title="Il barbiere è in pausa"
          style={{
            marginTop: 12, width: '100%', padding: '11px 0',
            borderRadius: 'var(--r-md)',
            background: C.surface, color: C.muted,
            border: `1px solid ${C.border}`,
            fontSize: 13, fontWeight: 500, cursor: 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          In pausa
        </button>
      ) : (
        <button
          onClick={() => onBook(barber)}
          style={{
            marginTop: 12, width: '100%', padding: '11px 0',
            borderRadius: 'var(--r-md)',
            background: 'var(--clay)', color: 'var(--paper-3)', border: '1px solid var(--clay)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Prenota
        </button>
      )}
    </div>
  )
}
