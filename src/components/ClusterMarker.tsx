import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import { C } from '../lib/colors'

interface Props {
  clusterId: number
  count:     number
  lat:       number
  lng:       number
  onClick:   (clusterId: number, lat: number, lng: number) => void
}

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
          background: C.text, color: C.bg,
          border: `2px solid ${C.bg}`,
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.02em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(10,10,10,0.15)',
        }}
      >
        {count}
      </button>
    </Marker>
  )
})
