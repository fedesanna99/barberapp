/**
 * Discover.tsx — V4 "Pari + Mappa" map-first redesign.
 *
 * Drop-in replacement for the existing src/screens/Discover.tsx in
 * fedesanna99/barberappit. Same props contract, same hooks, same data
 * sources — only the layout pattern changes.
 *
 * What's different from the old Discover:
 *   - No more map/list toggle (MapListToggle is removed)
 *   - Map is always the canvas, full-screen
 *   - Bottom sheet has 3 snap states: "min" (handle only, ~64px),
 *     "mid" (55% height, list visible), "full" (94% height)
 *   - Selected pin → sheet becomes a Barber Preview Card with stat
 *     strip, tags, quick slots, and "Prenota" CTA inline
 *   - Filter chips and agenda pill sit in a top strip above the map
 *   - Search bar is a floating overlay
 *
 * State map (browse/card × min/mid/full):
 *   • mode='browse' + snap='min'  → map fullscreen + handle row
 *   • mode='browse' + snap='mid'  → list at 55%
 *   • mode='browse' + snap='full' → list at 94%
 *   • mode='card'                 → barber preview card (auto height)
 */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { C } from '../lib/colors'
import { BARBERS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { IS_DEMO } from '../lib/supabase'
import { useBarbers, type SortMode } from '../hooks/useBarbers'
import { useFollows } from '../hooks/useFollows'
import { useGeolocation } from '../hooks/useGeolocation'
import { haversineKm } from '../lib/geo'
import { accentFromId, initialsFromName } from '../hooks/useFeed'
import type { BarberWithProfile } from '../types/supabase'
import { Avatar } from '../components/Avatar'
import { BarberList } from '../components/BarberList'
import { Icon } from '../components/Icon'
import { ratingDisplay } from '../lib/rating'
import { formatKm } from '../lib/geo'

const MapView = lazy(() => import('../components/MapView').then(m => ({ default: m.MapView })))

interface DiscoverProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
  myBarberId?:   string
  userId?:       string
}

type SheetSnap = 'min' | 'mid' | 'full'
type SheetMode = 'browse' | 'card'

/* ============================================================
 * Map → DemoBarber adapter (unchanged from V1)
 * ============================================================ */
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

/* ============================================================
 * Pari V4 quick filters — minimal set, scrollable
 * ============================================================ */
const QUICK_FILTERS = ['Tutti', 'Aperti', 'Top', 'Vicini'] as const
type QuickFilter = typeof QUICK_FILTERS[number]

/* Mappings between quick filter and underlying sort/predicate */
function applyQuickFilter(arr: DemoBarber[], qf: QuickFilter): DemoBarber[] {
  if (qf === 'Aperti')  return arr.filter(b => b.acceptingBookings !== false)
  if (qf === 'Top')     return arr.filter(b => b.rating >= 4.8)
  if (qf === 'Vicini')  return arr.filter(b => b.dist <= 1.5)
  return arr
}

/* ============================================================
 * Main component
 * ============================================================ */
export function Discover({ onBook, onViewProfile, myBarberId, userId }: DiscoverProps) {
  const [mode, setMode]             = useState<SheetMode>('browse')
  const [snap, setSnap]             = useState<SheetSnap>('min')
  const [selected, setSelected]     = useState<DemoBarber | null>(null)
  const [search, setSearch]         = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('Tutti')
  const [sort, setSort]             = useState<SortMode>('nearby')
  const [mapErrored, setMapErrored] = useState(false)
  const [snackbar, setSnackbar]     = useState<string | null>(null)
  const [centerOnUserRequest, setCenterOnUserRequest] = useState(0)
  const snackbarShown = useMemo(() => ({ shown: false }), [])

  const { coords, denied, unavailable, fallback, locate } = useGeolocation()
  const { barbers: realBarbers, loading } = useBarbers(sort, coords?.lat, coords?.lng, search)
  const follows = useFollows(userId)
  const followedProfileIds = useMemo(
    () => new Set(follows.filter(f => f.role === 'barber').map(f => f.profileId)),
    [follows],
  )

  useEffect(() => {
    if ((denied || unavailable) && !snackbarShown.shown) {
      snackbarShown.shown = true
      setSnackbar('Posizione non disponibile — uso Cagliari come riferimento.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [denied, unavailable, snackbarShown])

  useEffect(() => {
    if (mapErrored) {
      // Without a working map we can't do V4 — fall back to a basic list snap.
      setSnap('full')
      setSnackbar('Mappa non disponibile — mostro la lista.')
      const t = window.setTimeout(() => setSnackbar(null), 3500)
      return () => window.clearTimeout(t)
    }
  }, [mapErrored])

  function handleLocateClick() {
    locate()
    setCenterOnUserRequest(n => n + 1)
  }

  /* ---- Source → filtered → sorted ---- */
  const sourceBarbers: DemoBarber[] = IS_DEMO
    ? BARBERS
    : realBarbers.map(b => toDisplayBarber(b, coords?.lat, coords?.lng))

  const visibleBarbers = sourceBarbers.filter(b =>
    (!myBarberId || String(b.id) !== String(myBarberId)) &&
    (!userId || String(b.profileId) !== String(userId))
  )

  const q = search.trim().toLowerCase()
  const searched: DemoBarber[] = q
    ? visibleBarbers.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q)),
      )
    : visibleBarbers

  const filtered = applyQuickFilter(searched, quickFilter)

  const sortedList: DemoBarber[] = IS_DEMO
    ? [...filtered].sort((a, b) => {
        if (sort === 'nearby')   return a.dist - b.dist
        if (sort === 'popular')  return b.followers - a.followers
        if (sort === 'toprated') return b.rating - a.rating
        return Number(b.id) - Number(a.id)
      })
    : filtered

  const mapBarbers = filtered.filter(b => b.lat != null && b.lng != null)

  /* ---- Sheet height ---- */
  const sheetHeight: number | string =
    mode === 'card' ? 'auto' :
    snap === 'min'  ? 64 :
    snap === 'mid'  ? '55%' :
                      '94%'

  function selectBarber(b: DemoBarber) {
    setSelected(b)
    setMode('card')
  }
  function closeCard() {
    setSelected(null)
    setMode('browse')
    setSnap('min')
  }
  function cycleSnap() {
    if (mode !== 'browse') return
    setSnap(snap === 'min' ? 'mid' : snap === 'mid' ? 'full' : 'min')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* MAP CANVAS — always visible */}
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
            onSelect={selectBarber}
            followedProfileIds={followedProfileIds}
            centerOnUserRequest={centerOnUserRequest}
            onError={() => setMapErrored(true)}
          />
        </Suspense>
      </div>

      {/* SEARCH BAR — floating top */}
      <div style={{
        position: 'absolute', top: 18, left: 18, right: 18, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 16px',
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 9999,
        boxShadow: '0 2px 10px -3px rgba(43,39,35,0.10), 0 0 0 1px rgba(43,39,35,0.04)',
      }}>
        <Icon name="search" size={16} color={C.hint} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca barbiere, via, stile…"
          style={{
            flex: 1, border: 'none', background: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: 14, color: C.text,
            letterSpacing: '-0.005em',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Cancella ricerca"
            style={{
              background: C.surface, border: 'none', padding: 0,
              width: 20, height: 20, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.muted,
            }}>
            <Icon name="close" size={11} />
          </button>
        )}
      </div>

      {/* TOP STRIP — agenda pill + filter chips */}
      <div style={{
        position: 'absolute', top: 76, left: 18, right: 18, zIndex: 38,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Agenda pill (placeholder — wire to actual next appointment via a prop later) */}
        <button
          aria-label="Prossimo appuntamento"
          style={{
            flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 11px 6px 6px',
            background: C.text, color: C.bg,
            border: 'none',
            borderRadius: 9999,
            boxShadow: '0 4px 14px -4px rgba(43,39,35,0.30)',
            fontSize: 11.5, fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: '-0.005em',
            cursor: 'pointer',
          }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--clay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="calendar" size={11} color="var(--paper-3)" />
          </span>
          <span>sab <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>10:00</span></span>
          <Icon name="caret-right" size={10} color="rgba(252,250,245,0.5)" />
        </button>

        {/* Filter chips — scrollable right-aligned */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', gap: 6,
          overflowX: 'auto',
          justifyContent: 'flex-end',
          paddingLeft: 6,
        }}>
          {QUICK_FILTERS.map(f => {
            const active = quickFilter === f
            return (
              <button key={f} onClick={() => setQuickFilter(f)} style={{
                flexShrink: 0,
                padding: '6px 11px',
                background: active ? 'var(--clay)' : C.bg,
                color:      active ? 'var(--paper-3)' : C.text,
                border:     active ? 'none' : `1px solid ${C.border}`,
                borderRadius: 9999,
                fontFamily: 'inherit',
                fontSize: 11.5, fontWeight: 500,
                cursor: 'pointer',
                boxShadow: active
                  ? '0 2px 6px -2px rgba(176,127,97,0.40)'
                  : '0 2px 6px -3px rgba(43,39,35,0.10)',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
              }}>{f}</button>
            )
          })}
        </div>
      </div>

      {/* LOCATE FAB — bottom-right above sheet, only in browse mode */}
      {mode === 'browse' && (
        <button
          onClick={handleLocateClick}
          aria-label="Trova la mia posizione"
          style={{
            position: 'absolute', right: 18,
            bottom: (typeof sheetHeight === 'number' ? sheetHeight : 0) + 18,
            width: 44, height: 44, borderRadius: '50%',
            background: C.bg, border: `1px solid ${C.border}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.text,
            boxShadow: '0 2px 10px -3px rgba(43,39,35,0.10), 0 0 0 1px rgba(43,39,35,0.04)',
            zIndex: 45,
            transition: 'bottom 320ms var(--ease)',
          }}>
          <Icon name="pin" size={18} />
        </button>
      )}

      {/* BOTTOM SHEET */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -10px 30px -12px rgba(43,39,35,0.14), 0 0 0 1px var(--ink-08)',
        height: sheetHeight,
        maxHeight: '94%',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        transition: 'height 320ms var(--ease)',
      }}>
        {/* Handle row */}
        <div
          onClick={cycleSnap}
          style={{
            width: '100%',
            padding: snap === 'min' && mode === 'browse' ? '14px 20px' : '10px 0 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: snap === 'min' && mode === 'browse' ? 'space-between' : 'center',
            gap: 10,
            flexShrink: 0,
            cursor: mode === 'browse' ? 'pointer' : 'default',
          }}>
          {snap === 'min' && mode === 'browse' ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.text, letterSpacing: '-0.005em' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {filtered.length}
                </span>
                <span style={{ color: C.muted, marginLeft: 6 }}>
                  {filtered.length === 1 ? 'bottega vicino a te' : filtered.length === 0 ? 'risultati' : 'bottega vicino a te'}
                </span>
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px 5px 9px',
                background: 'var(--linen)',
                borderRadius: 9999,
                fontSize: 11.5, color: C.text, fontWeight: 500,
              }}>
                <Icon name="caret-up" size={11} />
                Lista
              </span>
            </>
          ) : (
            <span style={{
              width: 40, height: 4,
              borderRadius: 9999,
              background: C.borderMed,
            }}/>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {mode === 'card' && selected ? (
            <BarberCardSheet
              barber={selected}
              userCoords={coords}
              isSelf={!!myBarberId && String(myBarberId) === String(selected.id)}
              onClose={closeCard}
              onBook={onBook}
              onViewProfile={onViewProfile}
            />
          ) : snap === 'min' ? null :
              loading && !IS_DEMO ? (
                <div style={{ padding: 20 }}>
                  <Icon name="refresh" size={24} color={C.muted} style={{ animation: 'spin .8s linear infinite' }} />
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  query={search}
                  filter={quickFilter}
                  onReset={() => { setQuickFilter('Tutti'); setSearch('') }}
                />
              ) : (
                <BarberList
                  barbers={sortedList}
                  loading={false}
                  sort={sort}
                  onSort={setSort}
                  onBook={onBook}
                  onView={onViewProfile}
                  myBarberId={myBarberId}
                />
              )
          }
        </div>
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div style={{
          position: 'absolute', left: 14, right: 14,
          bottom: (typeof sheetHeight === 'number' ? sheetHeight : 60) + 14,
          zIndex: 60,
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

/* ============================================================
 * Empty state — used when search/filter has no results
 * ============================================================ */
interface EmptyProps { query: string; filter: QuickFilter; onReset: () => void }
function EmptyState({ query, filter, onReset }: EmptyProps) {
  return (
    <div style={{
      padding: '60px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--linen)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.muted,
      }}>
        <Icon name="search" size={24} />
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600,
          color: C.text, letterSpacing: '-0.022em', marginBottom: 6,
        }}>
          Nessuna bottega
        </div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, maxWidth: 280 }}>
          Nessun barbiere corrisponde a "{query.trim() || filter}". Prova a togliere qualche filtro.
        </div>
      </div>
      <button onClick={onReset} style={{
        padding: '10px 18px',
        background: C.text, color: C.bg, border: 'none',
        borderRadius: 9999,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        letterSpacing: '-0.005em', cursor: 'pointer', marginTop: 4,
      }}>
        Mostra tutti
      </button>
    </div>
  )
}

/* ============================================================
 * Barber Card Sheet — replaces the previous BarberPreviewCard.
 * Shows stats, tags, quick slots, and Prenota/Vedi profilo CTAs.
 * ============================================================ */
interface CardProps {
  barber: DemoBarber
  userCoords?: { lat: number; lng: number } | null
  isSelf: boolean
  onClose: () => void
  onBook: (b: DemoBarber) => void
  onViewProfile: (b: DemoBarber) => void
}
const QUICK_SLOTS = ['10:00', '10:30', '11:00', '11:30', '14:00', '14:30']
const TAKEN_QUICK = new Set(['10:30', '14:00'])

function BarberCardSheet({ barber, isSelf, onClose, onBook, onViewProfile }: CardProps) {
  const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })
  return (
    <div style={{ padding: '8px 0 0', animation: 'fadeIn 220ms var(--ease)' }}>
      {/* status + close */}
      <div style={{ padding: '4px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: barber.acceptingBookings === false ? C.red : C.green,
          }}/>
          <span style={{
            fontSize: 11, color: C.muted, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            {barber.acceptingBookings === false ? 'In pausa' : 'Aperto · prossimo: 11:30'}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--linen)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.text,
        }}>
          <Icon name="close" size={14} />
        </button>
      </div>

      {/* Identity */}
      <div
        onClick={() => onViewProfile(barber)}
        style={{ padding: '0 20px 18px', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
        <Avatar initials={barber.initials} size={56} ring={rd.hasReviews && rd.numeric >= 4.9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 600,
            color: C.text, letterSpacing: '-0.025em', lineHeight: 1.1,
          }}>
            {barber.name}
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: C.muted }}>
            {barber.city}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{
        margin: '0 20px', display: 'flex', gap: 20,
        padding: '14px 0',
        borderTop: `1px solid var(--ink-08)`,
        borderBottom: `1px solid var(--ink-08)`,
      }}>
        <Stat label="Rating" value={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={13} color="var(--clay)" weight={rd.hasReviews ? 'fill' : 'regular'} />
            {rd.label}
          </span>
        }/>
        <Stat label="Distanza" value={barber.dist > 0 ? <>{formatKm(barber.dist)}</> : '—'} />
        <Stat label="Follower" value={barber.followers.toLocaleString('it-IT')} />
      </div>

      {/* Tags */}
      {barber.tags.length > 0 && (
        <div style={{ padding: '16px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {barber.tags.map(t => (
            <span key={t} style={{
              padding: '4px 10px',
              background: 'var(--linen)',
              borderRadius: 9999,
              fontSize: 11.5, color: C.text,
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* Quick slots */}
      {!isSelf && barber.acceptingBookings !== false && (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            fontSize: 11, color: C.muted, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Slot di oggi
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {QUICK_SLOTS.map(t => {
              const taken = TAKEN_QUICK.has(t)
              return (
                <button
                  key={t}
                  disabled={taken}
                  onClick={() => !taken && onBook(barber)}
                  style={{
                    flexShrink: 0,
                    padding: '9px 14px',
                    background: taken ? 'var(--ink-04)' : C.surface,
                    border: `1px solid ${taken ? 'var(--ink-08)' : C.border}`,
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                    color: taken ? 'var(--ink-25)' : C.text,
                    cursor: taken ? 'not-allowed' : 'pointer',
                    textDecoration: taken ? 'line-through' : 'none',
                  }}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA row */}
      <div style={{ padding: '20px 20px 22px', display: 'flex', gap: 8 }}>
        <button
          onClick={() => onViewProfile(barber)}
          style={{
            flex: '0 0 auto',
            padding: '0 16px', height: 46, borderRadius: 12,
            background: C.surface,
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
            color: C.text, letterSpacing: '-0.005em',
          }}>
          Vedi profilo
        </button>
        {!isSelf && barber.acceptingBookings !== false && (
          <button
            onClick={() => onBook(barber)}
            style={{
              flex: 1,
              padding: '0 18px', height: 46, borderRadius: 12,
              background: C.text, color: C.bg, border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
              letterSpacing: '-0.01em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            Prenota una sedia
            <Icon name="caret-right" size={16} color={C.bg} />
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: C.hint, fontWeight: 500,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 17, fontWeight: 600,
        color: C.text, letterSpacing: '-0.01em', lineHeight: 1,
      }}>{value}</div>
    </div>
  )
}
