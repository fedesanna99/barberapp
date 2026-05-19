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
    // Phase 1: fast low-accuracy fix via WiFi/cell (usually < 1 s, 5-min cache ok)
    navigator.geolocation.getCurrentPosition(
      p => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setDenied(false)
        // Phase 2: silently refine with GPS in background
        navigator.geolocation.getCurrentPosition(
          p2 => setCoords({ lat: p2.coords.latitude, lng: p2.coords.longitude }),
          () => { /* keep phase-1 coords */ },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
        )
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) setDenied(true)
        else setUnavailable(true)
      },
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 300_000 },
    )
  }, [])

  useEffect(() => { locate() }, [locate])

  return { coords, denied, unavailable, fallback: CAGLIARI, locate }
}
