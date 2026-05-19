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

    let gotAccurate = false

    // Fast path: network/WiFi fix — shows distance quickly (< 1 s, 1-min cache)
    navigator.geolocation.getCurrentPosition(
      p => {
        if (!gotAccurate)
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setDenied(false)
      },
      () => { /* silent — GPS path handles errors */ },
      { enableHighAccuracy: false, timeout: 4_000, maximumAge: 60_000 },
    )

    // GPS path: accurate fix, runs in parallel — overwrites network position when ready
    navigator.geolocation.getCurrentPosition(
      p => {
        gotAccurate = true
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude })
        setDenied(false)
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) setDenied(true)
        else setUnavailable(true)
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )
  }, [])

  useEffect(() => { locate() }, [locate])

  return { coords, denied, unavailable, fallback: CAGLIARI, locate }
}
