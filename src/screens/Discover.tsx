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
import { Icon, type IconName } from '../components/Icon'

const MapView = lazy(() => import('../components/MapView').then(m => ({ default: m.MapView })))

interface DiscoverProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
  myBarberId?:   string
  userId?:       string
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

export function Discover({ onBook, onViewProfile, myBarberId, userId }: DiscoverProps) {
  const [view, setView]       = useState<DiscoverView>('map')
  const [sort, setSort]       = useState<SortMode>('nearby')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<DemoBarber | null>(null)
  const [mapErrored, setMapErrored] = useState(false)
  const [snackbar, setSnackbar] = useState<string | null>(null)
  const snackbarShown = useMemo(() => ({ shown: false }), [])

  const { coords, denied, unavailable, fallback, locate } = useGeolocation()
  const { barbers: realBarbers, loading } = useBarbers(sort, coords?.lat, coords?.lng, search)

  useEffect(() => {
    if ((denied || unavailable) && !snackbarShown.shown) {
      snackbarShown.shown = true
      setSnackbar('Posizione non disponibile — uso Cagliari come riferimento.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [denied, unavailable, snackbarShown])

  useEffect(() => {
    if (mapErrored && view === 'map') {
      setView('list')
      setSnackbar('Mappa non disponibile — mostro la lista.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [mapErrored, view])

  useEffect(() => { setSelected(null) }, [view])

  const sourceBarbers: DemoBarber[] = IS_DEMO
    ? BARBERS
    : realBarbers.map(b => toDisplayBarber(b, coords?.lat, coords?.lng))

  const visibleBarbers = sourceBarbers.filter(b =>
    (!myBarberId || String(b.id) !== String(myBarberId)) &&
    (!userId || String(b.profileId) !== String(userId))
  )

  const q = search.trim().toLowerCase()
  const filtered: DemoBarber[] = IS_DEMO && q
    ? visibleBarbers.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q)),
      )
    : visibleBarbers

  const sortedList: DemoBarber[] = IS_DEMO
    ? [...filtered].sort((a, b) => {
        if (sort === 'nearby')   return a.dist - b.dist
        if (sort === 'popular')  return b.followers - a.followers
        if (sort === 'toprated') return b.rating - a.rating
        return Number(b.id) - Number(a.id)
      })
    : filtered

  const mapBarbers = filtered.filter(b => b.lat != null && b.lng != null)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {view === 'map' ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Suspense fallback={
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.surface }}>
              <Icon name="refresh" size={28} color={C.muted} style={{ animation: 'spin .8s linear infinite' }} />
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

          <button
            onClick={locate}
            aria-label="Trova la mia posizione"
            style={{
              position: 'absolute', right: 12, bottom: 12, zIndex: 10,
              width: 44, height: 44, borderRadius: '50%',
              background: C.bg, border: `1px solid ${C.border}`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.text,
              boxShadow: 'var(--shadow-lift)',
            }}
          >
            <Icon name="pin" size={20} />
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

          {!loading && mapBarbers.length === 0 && (
            <div style={{
              position: 'absolute', left: 16, right: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 5, background: C.bg, padding: '16px 18px',
              borderRadius: 'var(--r-lg)', textAlign: 'center',
              boxShadow: 'var(--shadow-lift)',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: '-0.015em' }}>
                Nessun barbiere in zona
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, color: C.muted }}>Prova ad allargare il raggio.</div>
              <button
                onClick={() => setView('list')}
                style={{
                  marginTop: 12, padding: '8px 16px', borderRadius: 'var(--r-md)', border: 'none',
                  background: 'var(--clay)', color: 'var(--paper-3)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Vai alla lista
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 500 }}>Cerca a</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Icon name="pin" size={16} color={C.accent} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.025em', color: C.text }}>
                    Cagliari
                  </span>
                </div>
              </div>
              <MapListToggleInline value={view} onChange={setView} />
            </div>
            <div style={{ marginTop: 14 }}>
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
          position: 'absolute', left: 14, right: 14, bottom: 72, zIndex: 30,
          padding: '12px 16px', background: C.text, color: C.bg,
          fontSize: 12.5, borderRadius: 'var(--r-md)', textAlign: 'center',
          boxShadow: 'var(--shadow-toast)',
        }}>
          {snackbar}
        </div>
      )}
    </div>
  )
}

function MapListToggleInline({ value, onChange }: { value: DiscoverView; onChange: (v: DiscoverView) => void }) {
  const items: { id: DiscoverView; icon: IconName; label: string }[] = [
    { id: 'map',  icon: 'map',  label: 'Mappa' },
    { id: 'list', icon: 'list', label: 'Lista' },
  ]
  return (
    <div style={{
      display: 'flex', padding: 3,
      borderRadius: 'var(--r-md)',
      background: C.surface, border: `1px solid ${C.border}`,
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
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: active ? C.bg : 'transparent',
              color:      active ? C.text : C.muted,
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? 'var(--shadow-card)' : 'none',
            }}
          >
            <Icon name={it.icon} size={14} />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function InlineSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 'var(--r-md)',
      background: C.surfaceAlt, border: `1px solid ${C.border}`,
    }}>
      <Icon name="search" size={18} color={C.muted} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Cerca un barbiere, una via, uno stile…"
        style={{
          flex: 1, minWidth: 0, border: 'none', background: 'transparent',
          outline: 'none', fontSize: 14, color: C.text, fontFamily: 'inherit',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Cancella"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, display: 'flex' }}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  )
}
