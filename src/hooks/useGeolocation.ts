import { useCallback, useEffect, useState } from 'react'
import { CAGLIARI, type LatLng } from '../lib/geo'

interface GeoState {
  coords:    LatLng | null
  denied:    boolean
  unavailable: boolean
  fallback:  LatLng
  locate:    () => void
}

export function useGeolocation(): GeoState {
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [denied, setDenied] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUnavailable(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      p => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setDenied(false)
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) setDenied(true)
        else setUnavailable(true)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  }, [])

  useEffect(() => { locate() }, [locate])

  return { coords, denied, unavailable, fallback: CAGLIARI, locate }
}
