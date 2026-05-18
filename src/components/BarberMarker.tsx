import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { C } from '../lib/colors'
import { ratingDisplay } from '../lib/rating'

interface Props {
  id:        string
  name:      string
  initials:  string
  accent:    string
  rating:    number
  reviewsCount?: number
  lat:       number
  lng:       number
  selected:  boolean
  onClick:   (id: string) => void
}

export const BarberMarker = memo(function BarberMarker({
  id, name, initials, accent, rating, reviewsCount, lat, lng, selected, onClick,
}: Props) {
  const scale = selected ? 1.18 : 1
  const rd = ratingDisplay({ rating, reviewsCount })
  const isTop = rd.hasReviews && rd.numeric >= 4.9
  return (
    <Marker longitude={lng} latitude={lat} anchor="bottom" style={{ zIndex: selected ? 10 : 1 }}>
      <button
        type="button"
        aria-label={rd.hasReviews ? `${name}, ${rd.label} stelle` : `${name}, nuovo (nessuna recensione)`}
        onClick={e => { e.stopPropagation(); onClick(id) }}
        style={{
          position:  'relative',
          width:     44,
          height:    44,
          padding:   0,
          border:    'none',
          background: 'transparent',
          cursor:    'pointer',
          transform: `scale(${scale})`,
          transformOrigin: 'bottom center',
          transition: 'transform .15s ease-out',
          filter:    selected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
        }}
      >
        <div style={{
          position:        'absolute',
          left:            '50%',
          top:             0,
          transform:       'translateX(-50%)',
          width:           36,
          height:          36,
          borderRadius:    '50%',
          background:      `${accent}E6`,
          border:          `2px solid ${accent}`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          fontSize:        12,
          fontWeight:      700,
          color:           '#fff',
          fontFamily:      'inherit',
          letterSpacing:   0.2,
        }}>
          {initials}
        </div>
        <div style={{
          position:    'absolute',
          left:        '50%',
          bottom:      0,
          transform:   'translateX(-50%) rotate(45deg)',
          width:       12,
          height:      12,
          background:  accent,
          borderRadius: '0 0 2px 0',
        }} />
        <div style={{
          position:     'absolute',
          top:          -4,
          right:        -4,
          minWidth:     18,
          height:       18,
          padding:      '0 4px',
          borderRadius: 9,
          background:   isTop ? C.accent : C.bg,
          color:        isTop ? '#fff' : C.text,
          fontSize:     9,
          fontWeight:   600,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          gap:          2,
          border:       `0.5px solid ${isTop ? C.accent : C.border}`,
          lineHeight:   1,
        }}>
          <i className={`ti ${rd.hasReviews ? 'ti-star-filled' : 'ti-sparkles'}`} style={{ fontSize: 8, color: isTop ? '#fff' : rd.hasReviews ? '#EF9F27' : C.muted }} />
          {rd.label}
        </div>
      </button>
    </Marker>
  )
})
