import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { C } from '../lib/colors'
import { ratingDisplay } from '../lib/rating'
import { Icon } from './Icon'

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
 * Pari pin — paper disc with a thin ink ring when idle, fills clay
 * (the single accent) when selected so the chosen pin reads as the
 * one active element. Top-rated barbers get a small clay-deep notch.
 */
export const BarberMarker = memo(function BarberMarker({
  id, name, rating, reviewsCount, lat, lng, selected, onClick,
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
          background: selected ? 'var(--clay)' : 'var(--paper-3)',
          color: selected ? 'var(--paper-3)' : C.text,
          boxShadow: 'var(--shadow-lift)',
          borderRadius: '50%',
          outline: selected ? 'none' : `1.5px solid ${C.text}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transformOrigin: 'bottom center',
          transition: 'all 180ms var(--ease)',
        }}
      >
        <Icon name="user" size={selected ? 18 : 15} />
        {isTop && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--clay-deep)', border: '2px solid var(--paper-3)',
          }} />
        )}
      </button>
    </Marker>
  )
})
