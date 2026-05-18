import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { C } from '../lib/colors'
import { BARBERS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { IS_DEMO } from '../lib/supabase'
import { useBarbers, type SortMode } from '../hooks/useBarbers'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineKm } from '../lib/geo'
import { accentFromId, initialsFromName } from '../hooks/useFeed'
import type { BarberWithProfile } from '../types/supabase'
import { MapSearchBar } from '../components/MapSearchBar'
import { MapListToggle, type DiscoverView } from '../components/MapListToggle'
import { BarberPreviewCard } from '../components/BarberPreviewCard'
import { BarberList } from '../components/BarberList'

const MapView = lazy(() => import('../components/MapView').then(m => ({ default: m.MapView })))

interface DiscoverProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
  // Current user's own barbers.id (if logged in as barber). Used so the
  // preview card / list can hide the Prenota button on the user's own pin.
  myBarberId?:   string
}

function toDisplayBarber(b: BarberWithProfile, userLat?: number, userLng?: number): DemoBarber {
  const dist = userLat != null && userLng != null && b.profile.lat != null && b.profile.lng != null
    ? Math.round(haversineKm({ lat: userLat, lng: userLng }, { lat: b.profile.lat, lng: b.profile.lng }) * 10) / 10
    : 0
  return {
    id:        b.id,
    name:      b.profile.display_name ?? b.shop_name ?? 'Barber',
    initials:  initialsFromName(b.profile.display_name ?? b.shop_name),
    city:      b.city ?? '',
    dist,
    rating:    b.rating,
    tags:      b.specialties?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
    followers: b.followers_count,
    accent:    accentFromId(b.id),
    lat:       b.profile.lat ?? undefined,
    lng:       b.profile.lng ?? undefined,
    acceptingBookings: b.accepting_bookings,
    profileId: b.profile_id,
    reviewsCount: b.reviews_count,
  }
}

export function Discover({ onBook, onViewProfile, myBarberId }: DiscoverProps) {
  const [view, setView]       = useState<DiscoverView>('map')
  const [sort, setSort]       = useState<SortMode>('nearby')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<DemoBarber | null>(null)
  const [mapErrored, setMapErrored] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const snackbarShown = useMemo(() => ({ shown: false }), [])

  const { coords, denied, unavailable, fallback, locate } = useGeolocation()
  const { barbers: realBarbers, loading } = useBarbers(sort, coords?.lat, coords?.lng, search)

  // One-time snackbar when geolocation falls back
  useEffect(() => {
    if ((denied || unavailable) && !snackbarShown.shown) {
      snackbarShown.shown = true
      setSnackbar('Posizione non disponibile — uso Cagliari come riferimento.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [denied, unavailable, snackbarShown])

  // If the map fails to load its style, switch to list automatically.
  useEffect(() => {
    if (mapErrored && view === 'map') {
      setView('list')
      setSnackbar('Mappa non disponibile — mostro la lista.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [mapErrored, view])

  // Reset selected when view or search changes
  useEffect(() => { setSelected(null) }, [view])

  const sourceBarbers: DemoBarber[] = IS_DEMO
    ? BARBERS
    : realBarbers.map(b => toDisplayBarber(b, coords?.lat, coords?.lng))

  // Apply search in demo mode (real mode already filters via the hook)
  const q = search.trim().toLowerCase()
  const filtered: DemoBarber[] = IS_DEMO && q
    ? sourceBarbers.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q)),
      )
    : sourceBarbers

  // Sort for demo mode (real mode already sorted by hook)
  const sortedList: DemoBarber[] = IS_DEMO
    ? [...filtered].sort((a, b) => {
        if (sort === 'nearby')   return a.dist - b.dist
        if (sort === 'popular')  return b.followers - a.followers
        if (sort === 'toprated') return b.rating - a.rating
        return Number(b.id) - Number(a.id)
      })
    : filtered

  // Map markers: any barber with coords (regardless of sort order)
  const mapBarbers = filtered.filter(b => b.lat != null && b.lng != null)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {view === 'map' ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Suspense fallback={
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface }}>
              <i className="ti ti-loader-2" style={{ fontSize: 28, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
            </div>
          }>
            <MapView
              barbers={mapBarbers}
              userCoords={coords}
              fallback={fallback}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onError={() => setMapErrored(true)}
            />
          </Suspense>

          <MapSearchBar value={search} onChange={setSearch} />
          <MapListToggle value={view} onChange={setView} />

          {/* Locate-me button */}
          <button
            onClick={locate}
            aria-label="Trova la mia posizione"
            style={{
              position:     'absolute',
              right:        12,
              bottom:       12,
              zIndex:       10,
              width:        44,
              height:       44,
              borderRadius: '50%',
              background:   C.bg,
              border:       `0.5px solid ${C.border}`,
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              color:        C.text,
              boxShadow:    '0 2px 10px rgba(0,0,0,0.12)',
            }}
          >
            <i className="ti ti-current-location" style={{ fontSize: 20 }} />
          </button>

          {selected && (
            <BarberPreviewCard
              barber={selected}
              userCoords={coords}
              onBook={b => { onBook(b); setSelected(null) }}
              onClose={() => setSelected(null)}
              isSelf={!!myBarberId && String(myBarberId) === String(selected.id)}
            />
          )}

          {/* Empty state when there are 0 markers */}
          {!loading && mapBarbers.length === 0 && (
            <div style={{
              position: 'absolute', left: 16, right: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 5, background: 'rgba(255,255,255,0.94)', padding: '14px 16px',
              borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              border: `0.5px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Nessun barbiere in zona</div>
              <button
                onClick={() => setView('list')}
                style={{
                  marginTop: 8, padding: '6px 14px', borderRadius: 16, border: 'none',
                  background: C.text, color: C.bg, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Vai alla lista
              </button>
            </div>
          )}
        </div>
      ) : (
        // List view
        <>
          <div style={{ position: 'relative', padding: '14px 16px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Esplora</span>
              <MapListToggleInline value={view} onChange={setView} />
            </div>
            <div style={{ marginTop: 10 }}>
              <InlineSearch value={search} onChange={setSearch} />
            </div>
          </div>
          <BarberList
            barbers={sortedList}
            loading={loading && !IS_DEMO}
            sort={sort}
            onSort={setSort}
            onBook={onBook}
            onView={onViewProfile}
            myBarberId={myBarberId}
          />
        </>
      )}

      {snackbar && (
        <div style={{
          position:  'absolute',
          left:      12,
          right:     12,
          bottom:    72,
          zIndex:    30,
          padding:   '10px 14px',
          background: 'rgba(20,20,20,0.92)',
          color:     '#fff',
          fontSize:  12,
          borderRadius: 10,
          textAlign: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}>
          {snackbar}
        </div>
      )}
    </div>
  )
}

// Inline (non-floating) toggle for list view header
function MapListToggleInline({ value, onChange }: { value: DiscoverView; onChange: (v: DiscoverView) => void }) {
  const items: { id: DiscoverView; icon: string; label: string }[] = [
    { id: 'map',  icon: 'ti-map',  label: 'Mappa' },
    { id: 'list', icon: 'ti-list', label: 'Lista' },
  ]
  return (
    <div style={{
      display:   'flex',
      padding:   3,
      borderRadius: 22,
      background: C.surface,
      border:    `0.5px solid ${C.border}`,
    }}>
      {items.map(it => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            aria-label={it.label}
            aria-pressed={active}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 18, border: 'none',
              background: active ? C.text : 'transparent',
              color: active ? C.bg : C.muted,
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <i className={`ti ${it.icon}`} style={{ fontSize: 13 }} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

// Inline search box for the list view
function InlineSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderRadius: 10,
      background: C.surface, border: `0.5px solid ${C.borderMed}`,
    }}>
      <i className="ti ti-search" style={{ fontSize: 14, color: C.muted }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Cerca barbieri, città o stili…"
        style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent',
          outline: 'none', fontSize: 13, color: C.text, fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Cancella"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, display: 'flex' }}
        >
          <i className="ti ti-x" style={{ fontSize: 13 }} />
        </button>
      )}
    </div>
  )
}
