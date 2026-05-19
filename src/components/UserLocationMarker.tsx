import { memo } from 'react'
import { Marker } from 'react-map-gl/maplibre'

interface Props {
  lat: number
  lng: number
}

export const UserLocationMarker = memo(function UserLocationMarker({ lat, lng }: Props) {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center" style={{ zIndex: 6 }}>
      <div
        aria-label="La tua posizione"
        role="img"
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'var(--clay-tint)',
          border: '1px solid var(--clay-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lift)',
          pointerEvents: 'none',
        }}
      >
        <span style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--ink)',
          border: '2px solid var(--paper-3)',
          display: 'block',
        }} />
      </div>
    </Marker>
  )
})
