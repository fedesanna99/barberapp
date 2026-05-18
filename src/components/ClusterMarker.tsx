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
          width:           size,
          height:          size,
          borderRadius:    '50%',
          background:      C.text,
          color:           C.bg,
          border:          `2px solid ${C.bg}`,
          fontSize:        13,
          fontWeight:      600,
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          fontFamily:      'inherit',
          boxShadow:       '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {count}
      </button>
    </Marker>
  )
})
