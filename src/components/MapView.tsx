import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Map, AttributionControl, type MapRef, type ViewState } from 'react-map-gl/maplibre'
import Supercluster from 'supercluster'
import type { DemoBarber } from '../lib/demoData'
import type { LatLng } from '../lib/geo'
import { mapStyleFor } from '../lib/mapStyle'
import { C } from '../lib/colors'
import { BarberMarker } from './BarberMarker'
import { ClusterMarker } from './ClusterMarker'

interface Props {
  barbers:    DemoBarber[]
  userCoords: LatLng | null
  fallback:   LatLng
  selectedId: string | null
  onSelect:   (barber: DemoBarber) => void
  onMapLoad?: () => void
  onError?:   () => void
}

type ClusterFeature = Supercluster.PointFeature<{ id: string }> | Supercluster.ClusterFeature<{}>

export function MapView({
  barbers, userCoords, fallback, selectedId, onSelect, onMapLoad, onError,
}: Props) {
  const mapRef = useRef<MapRef | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )

  // React to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const initialCenter = userCoords ?? fallback
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    latitude:  initialCenter.lat,
    longitude: initialCenter.lng,
    zoom:      12,
  })

  // When the user finally allows geolocation, re-center once.
  const centeredOnUser = useRef(false)
  useEffect(() => {
    if (userCoords && !centeredOnUser.current) {
      centeredOnUser.current = true
      mapRef.current?.easeTo({
        center:   [userCoords.lng, userCoords.lat],
        zoom:     13,
        duration: 700,
      })
    }
  }, [userCoords])

  // When there's no user geolocation, fit the map to include all barbers so
  // the user sees everyone (otherwise pins far from the fallback are hidden).
  // Runs once, after the map loads and the barbers list arrives.
  const fittedBounds = useRef(false)
  useEffect(() => {
    if (userCoords || fittedBounds.current) return
    if (!mapLoaded) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const coords = barbers.filter(b => b.lat != null && b.lng != null)
    if (coords.length < 1) return
    fittedBounds.current = true
    if (coords.length === 1) {
      map.easeTo({ center: [coords[0].lng!, coords[0].lat!], zoom: 13, duration: 600 })
      return
    }
    let minLat =  90, maxLat =  -90, minLng =  180, maxLng = -180
    for (const b of coords) {
      if (b.lat! < minLat) minLat = b.lat!
      if (b.lat! > maxLat) maxLat = b.lat!
      if (b.lng! < minLng) minLng = b.lng!
      if (b.lng! > maxLng) maxLng = b.lng!
    }
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 60, duration: 600, maxZoom: 14 },
    )
  }, [userCoords, barbers, mapLoaded])

  // Build supercluster index whenever the barber list changes.
  const cluster = useMemo(() => {
    const c = new Supercluster<{ id: string }>({ radius: 60, maxZoom: 16 })
    c.load(
      barbers
        .filter(b => b.lat != null && b.lng != null)
        .map(b => ({
          type:     'Feature' as const,
          properties: { id: b.id },
          geometry: { type: 'Point' as const, coordinates: [b.lng!, b.lat!] },
        })),
    )
    return c
  }, [barbers])

  // Recompute visible clusters from the current view (debounced).
  const [tick, setTick] = useState(0)
  const debounceTimer = useRef<number | null>(null)
  const onMove = useCallback((e: { viewState: ViewState }) => {
    setViewState(e.viewState)
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current)
    debounceTimer.current = window.setTimeout(() => setTick(t => t + 1), 120)
  }, [])

  // tick is the only purpose of this dep — the actual data flows through the closures.
  void tick

  const features = useMemo<ClusterFeature[]>(() => {
    const map = mapRef.current?.getMap()
    if (!map) return []
    const b = map.getBounds()
    const bbox: [number, number, number, number] = [
      b.getWest(), b.getSouth(), b.getEast(), b.getNorth(),
    ]
    const zoom = Math.round(map.getZoom())
    return cluster.getClusters(bbox, zoom) as ClusterFeature[]
  }, [cluster, viewState.latitude, viewState.longitude, viewState.zoom, tick])

  function handleClusterClick(clusterId: number, lat: number, lng: number) {
    const zoom = Math.min(cluster.getClusterExpansionZoom(clusterId), 18)
    mapRef.current?.easeTo({
      center:   [lng, lat],
      zoom,
      duration: 500,
    })
  }

  function handleMarkerClick(id: string) {
    const barber = barbers.find(b => b.id === id)
    if (!barber || barber.lat == null || barber.lng == null) return
    onSelect(barber)
    // Offset center upward so the preview card doesn't cover the marker.
    const map = mapRef.current?.getMap()
    if (map) {
      map.easeTo({
        center:   [barber.lng, barber.lat],
        offset:   [0, -90],
        zoom:     Math.max(map.getZoom(), 14),
        duration: 500,
      })
    }
  }

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={onMove}
      onLoad={() => { setMapLoaded(true); onMapLoad?.() }}
      onError={onError}
      mapStyle={mapStyleFor(theme)}
      dragRotate={false}
      touchPitch={false}
      pitchWithRotate={false}
      attributionControl={false}
      style={{ position: 'absolute', inset: 0, background: C.surface }}
    >
      <AttributionControl compact position="bottom-left" />
      {features.map(f => {
        const [lng, lat] = f.geometry.coordinates as [number, number]
        const props = f.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; id?: string }
        if (props.cluster) {
          return (
            <ClusterMarker
              key={`c-${props.cluster_id}`}
              clusterId={props.cluster_id!}
              count={props.point_count!}
              lat={lat}
              lng={lng}
              onClick={handleClusterClick}
            />
          )
        }
        const barber = barbers.find(b => b.id === props.id)
        if (!barber) return null
        return (
          <BarberMarker
            key={`b-${barber.id}`}
            id={barber.id}
            name={barber.name}
            initials={barber.initials}
            accent={barber.accent}
            rating={barber.rating}
            lat={lat}
            lng={lng}
            selected={selectedId === barber.id}
            onClick={handleMarkerClick}
          />
        )
      })}
    </Map>
  )
}
