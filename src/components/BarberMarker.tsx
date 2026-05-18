import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { C } from '../lib/colors'
import { ratingDisplay } from '../lib/rating'

interface Props {
  id:        string
  name:      string
  initials:  string
  accent?:   string
  rating:    number
  reviewsCount?: number
  lat:       number
  lng:       number
  selected:  boolean
  onClick:   (id: string) => void
}

/**
 * Modern Minimal pin — ink-on-white when idle, fills ink when selected.
 * No gradients, no halo, just a small monogram disc with a coral notch
 * for top-rated barbers.
 */
export const BarberMarker = memo(function BarberMarker({
  id, name, initials, rating, reviewsCount, lat, lng, selected, onClick,
}: Props) {
  const rd = ratingDisplay({ rating, reviewsCount })
  const isTop = rd.hasReviews && rd.numeric >= 4.9
  const size = selected ? 40 : 32
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom" style={{ zIndex: selected ? 10 : 1 }}>
      <button
        type="button"
        aria-label={rd.hasReviews ? `${name}, ${rd.label} stelle` : `${name}, nuovo`}
        onClick={e => { e.stopPropagation(); onClick(id) }}
        style={{
          position: 'relative',
          width: size, height: size,
          padding: 0, border: 'none',
          background: selected ? C.text : C.bg,
          color: selected ? C.bg : C.text,
          boxShadow: '0 4px 10px rgba(10,10,10,0.15)',
          borderRadius: '50%',
          outline: selected ? 'none' : `2px solid ${C.text}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transformOrigin: 'bottom center',
          transition: 'all 180ms var(--ease)',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: selected ? 14 : 12, letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          {initials.charAt(0)}
        </span>
        {isTop && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 10, height: 10, borderRadius: '50%',
            background: C.accent, border: `2px solid ${C.bg}`,
          }} />
        )}
      </button>
    </Marker>
  )
})
