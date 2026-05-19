import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'

interface Props {
  clusterId: number
  count:     number
  lat:       number
  lng:       number
  onClick:   (clusterId: number, lat: number, lng: number) => void
}

/**
 * Pari cluster — ink fill, paper number, hairline paper ring. Lift
 * shadow tokenized so dark mode inverts the elevation cue.
 */
export const ClusterMarker = memo(function ClusterMarker({ clusterId, count, lat, lng, onClick }: Props) {
  const size = count < 10 ? 36 : count < 50 ? 42 : 50
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <button
        type="button"
        aria-label={`${count} barbieri`}
        onClick={e => { e.stopPropagation(); onClick(clusterId, lat, lng) }}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--ink)', color: 'var(--paper-3)',
          border: '2px solid var(--paper-3)',
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.02em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-lift)',
        }}
      >
        {count}
      </button>
    </Marker>
  )
})
