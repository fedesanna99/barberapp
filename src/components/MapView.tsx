import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Map, AttributionControl, type MapRef, type ViewState } from 'react-map-gl/maplibre'
import Supercluster from 'supercluster'
import type { DemoBarber } from '../lib/demoData'
import type { LatLng } from '../lib/geo'
import { mapStyleFor } from '../lib/mapStyle'
import { C } from '../lib/colors'
import { useTheme } from '../hooks/useTheme'
import { BarberMarker } from './BarberMarker'
import { ClusterMarker } from './ClusterMarker'
import { UserLocationMarker } from './UserLocationMarker'

interface Props {
  barbers:    DemoBarber[]
  userCoords: LatLng | null
  fallback:   LatLng
  selectedId: string | null
  onSelect:   (barber: DemoBarber) => void
  followedProfileIds?: Set<string>
  centerOnUserRequest?: number
  onMapLoad?: () => void
  onError?:   () => void
}

type ClusterFeature = Supercluster.PointFeature<{ id: string }> | Supercluster.ClusterFeature<{}>

type MapLayer = {
  id: string
  type?: string
  'source-layer'?: string
}

const MINIMAL_LAYER_PATTERNS = [
  /\bpoi\b/,
  /point[-_ ]of[-_ ]interest/,
  /amenity/,
  /building/,
  /housenumber/,
  /address/,
  /transit/,
  /public[-_ ]transport/,
  /railway/,
  /airport/,
  /aeroway/,
  /ferry/,
  /parking/,
  /place[-_ ]suburb/,
  /place[-_ ]neighbourhood/,
]

function applyMinimalMapStyle(map: ReturnType<MapRef['getMap']>) {
  const layers = (map.getStyle().layers ?? []) as MapLayer[]

  for (const layer of layers) {
    const layerKey = `${layer.id} ${layer['source-layer'] ?? ''}`.toLowerCase()
    const shouldHide = MINIMAL_LAYER_PATTERNS.some(pattern => pattern.test(layerKey))
    if (!shouldHide || !map.getLayer(layer.id)) continue

    try {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
    } catch {
      // Some provider styles protect computed layers during style reloads.
    }
  }
}

export function MapView({
  barbers, userCoords, fallback, selectedId, onSelect, followedProfileIds, centerOnUserRequest = 0, onMapLoad, onError,
}: Props) {
  const mapRef = useRef<MapRef | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  // Resolved theme (light/dark) — respects the user's explicit Menu preference,
  // not just the OS, so the map stays in sync with the rest of the UI.
  const { resolved: theme } = useTheme()

  const initialCenter = userCoords ?? fallback
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    latitude:  initialCenter.lat,
    longitude: initialCenter.lng,
    zoom:      12,
  })

  const centerOnUser = useCallback((duration = 700) => {
    if (!userCoords) return
    mapRef.current?.easeTo({
      center:   [userCoords.lng, userCoords.lat],
      zoom:     14,
      duration,
    })
  }, [userCoords])

  // When the user finally allows geolocation, re-center once.
  const centeredOnUser = useRef(false)
  useEffect(() => {
    if (userCoords && !centeredOnUser.current) {
      centeredOnUser.current = true
      centerOnUser(700)
    }
  }, [centerOnUser, userCoords])

  useEffect(() => {
    if (centerOnUserRequest > 0) centerOnUser(500)
  }, [centerOnUser, centerOnUserRequest])

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

  function handleMapStyleReady() {
    const map = mapRef.current?.getMap()
    if (map) applyMinimalMapStyle(map)
  }

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={onMove}
      onLoad={() => { handleMapStyleReady(); setMapLoaded(true); onMapLoad?.() }}
      onStyleData={handleMapStyleReady}
      onError={onError}
      mapStyle={mapStyleFor(theme)}
      dragRotate={false}
      touchPitch={false}
      pitchWithRotate={false}
      attributionControl={false}
      style={{ position: 'absolute', inset: 0, background: C.surface }}
    >
      <AttributionControl compact position="bottom-left" />
      {userCoords && (
        <UserLocationMarker lat={userCoords.lat} lng={userCoords.lng} />
      )}
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
            reviewsCount={barber.reviewsCount}
            lat={lat}
            lng={lng}
            selected={selectedId === barber.id}
            followed={!!barber.profileId && followedProfileIds?.has(barber.profileId)}
            onClick={handleMarkerClick}
          />
        )
      })}
    </Map>
  )
}
