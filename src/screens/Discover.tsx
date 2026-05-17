import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { useBarbers, haversineKm } from '../hooks/useBarbers'
import type { SortMode } from '../hooks/useBarbers'
import { accentFromId, initialsFromName } from '../hooks/useFeed'
import { IS_DEMO } from '../lib/supabase'
import type { BarberWithProfile } from '../types/supabase'

type SortId = 'nearby' | 'popular' | 'new' | 'toprated'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'nearby',   label: 'Nearby'    },
  { id: 'popular',  label: 'Popular'   },
  { id: 'new',      label: 'New'       },
  { id: 'toprated', label: 'Top rated' },
]

interface DiscoverProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
}

function toDisplayBarber(b: BarberWithProfile, userLat?: number, userLng?: number): DemoBarber {
  const dist =
    userLat != null && userLng != null && b.profile.lat != null && b.profile.lng != null
      ? Math.round(haversineKm(userLat, userLng, b.profile.lat, b.profile.lng) * 10) / 10
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
  }
}

export function Discover({ onBook, onViewProfile }: DiscoverProps) {
  const [sort, setSort]             = useState<SortId>('nearby')
  const [search, setSearch]         = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [userLat, setUserLat]       = useState<number | undefined>()
  const [userLng, setUserLng]       = useState<number | undefined>()

  useEffect(() => {
    if (IS_DEMO) return
    navigator.geolocation?.getCurrentPosition(pos => {
      setUserLat(pos.coords.latitude)
      setUserLng(pos.coords.longitude)
    })
  }, [])

  const dbSort: SortMode = sort === 'toprated' ? 'toprated' : sort as SortMode
  const { barbers: realBarbers, loading } = useBarbers(
    IS_DEMO ? 'nearby' : dbSort,
    !IS_DEMO ? userLat : undefined,
    !IS_DEMO ? userLng : undefined,
  )

  const demoBarbers: DemoBarber[] = IS_DEMO
    ? [...BARBERS]
        .filter(b =>
          !search ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => {
          if (sort === 'nearby')   return a.dist - b.dist
          if (sort === 'popular')  return b.followers - a.followers
          if (sort === 'new')      return Number(b.id) - Number(a.id)
          return b.rating - a.rating
        })
    : []

  const prodBarbers: DemoBarber[] = !IS_DEMO
    ? realBarbers
        .map(b => toDisplayBarber(b, userLat, userLng))
        .filter(b =>
          !search ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
        )
    : []

  const sorted = IS_DEMO ? demoBarbers : prodBarbers

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Discover</span>
        <button onClick={() => setShowSearch(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
          <i className="ti ti-search" style={{ fontSize: 22, color: showSearch ? C.text : C.muted }} />
        </button>
      </div>

      {/* Search input */}
      {showSearch && (
        <div style={{ padding: '0 16px 10px' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search barbers or styles…"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 10,
              border: `0.5px solid ${C.borderMed}`, fontSize: 13,
              background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
      )}

      {/* Sort pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', overflowX: 'auto' }}>
        {SORTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: `0.5px solid ${sort === s.id ? C.text : C.border}`,
              fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
              background: sort === s.id ? C.text : C.bg,
              color: sort === s.id ? C.bg : C.muted,
              transition: 'all .15s', fontFamily: 'inherit',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {!IS_DEMO && loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: C.hint }}>
          <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Barber list */}
      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: C.hint, fontSize: 14 }}>
          No barbers found
        </div>
      )}
      {sorted.map((barber, idx) => (
        <div key={barber.id}>
          {idx > 0 && <div style={{ height: 0.5, background: C.border, margin: '0 16px' }} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onViewProfile(barber)}>
              <Avatar initials={barber.initials} size={50} accent={barber.accent} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{barber.name}</span>
                  {barber.rating >= 4.9 && (
                    <span style={{ fontSize: 9, background: C.accentLight, color: C.accent, padding: '2px 6px', borderRadius: 20, fontWeight: 500 }}>TOP</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                  {barber.city}{barber.dist > 0 ? ` · ${barber.dist} km` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <i className="ti ti-star-filled" style={{ fontSize: 11, color: '#EF9F27' }} />
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{barber.rating}</span>
                  {barber.tags.length > 0 && (
                    <>
                      <span style={{ fontSize: 11, color: C.hint }}>·</span>
                      <span style={{ fontSize: 11, color: C.hint }}>{barber.tags.join(' · ')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => onBook(barber)}
              style={{ padding: '8px 14px', borderRadius: 8, background: C.text, color: C.bg, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}
            >
              Book
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
