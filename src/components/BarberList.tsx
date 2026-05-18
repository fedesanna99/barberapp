import { C } from '../lib/colors'
import { Avatar } from './Avatar'
import { formatKm } from '../lib/geo'
import type { DemoBarber } from '../lib/demoData'
import type { SortMode } from '../hooks/useBarbers'
import { ratingDisplay } from '../lib/rating'
import { ListRowSkeleton } from './Skeleton'

interface Props {
  barbers:    DemoBarber[]
  loading:    boolean
  sort:       SortMode
  onSort:     (s: SortMode) => void
  onBook:     (barber: DemoBarber) => void
  onView:     (barber: DemoBarber) => void
  myBarberId?: string
}

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'nearby',   label: 'Vicini'    },
  { id: 'popular',  label: 'Popolari'  },
  { id: 'new',      label: 'Nuovi'     },
  { id: 'toprated', label: 'Top'       },
]

export function BarberList({ barbers, loading, sort, onSort, onBook, onView, myBarberId }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Sort chips */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px', overflowX: 'auto' }}>
        {SORTS.map(s => {
          const active = sort === s.id
          return (
            <button
              key={s.id}
              onClick={() => onSort(s.id)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--r-pill)',
                border: active ? `1px solid ${C.text}` : `1px solid ${C.border}`,
                fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                background: active ? C.text : C.surface,
                color:      active ? C.bg   : C.muted,
                fontWeight: 500, fontFamily: 'inherit',
                transition: 'all 120ms var(--ease)',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <>
          <ListRowSkeleton avatar={56} />
          <ListRowSkeleton avatar={56} />
          <ListRowSkeleton avatar={56} />
        </>
      )}

      {!loading && barbers.length === 0 && (
        <div style={{ padding: '48px 28px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ph-thin ph-magnifying-glass" style={{ fontSize: 20, color: C.hint }} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', color: C.text }}>
            Nessun barbiere
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Prova a togliere qualche filtro.
          </div>
        </div>
      )}

      {barbers.map((barber, idx) => {
        const isSelf = !!myBarberId && String(myBarberId) === String(barber.id)
        const rd = ratingDisplay({ rating: barber.rating, reviewsCount: barber.reviewsCount })
        return (
          <div key={barber.id}>
            {idx > 0 && <div style={{ height: 1, background: C.border, marginLeft: 20 }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
              <div
                onClick={() => onView(barber)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <Avatar initials={barber.initials} size={56} ring={rd.hasReviews && rd.numeric >= 4.9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 600, color: C.text, letterSpacing: '-0.015em' }}>
                      {barber.name}
                    </span>
                    {isSelf && (
                      <span style={{ fontSize: 11, background: C.surface, color: C.muted, padding: '3px 9px', borderRadius: 9999, fontWeight: 500, border: `1px solid ${C.border}` }}>
                        Tu
                      </span>
                    )}
                    {barber.acceptingBookings === false && (
                      <span style={{ fontSize: 11, background: C.redSoft, color: C.red, padding: '3px 9px', borderRadius: 9999, fontWeight: 500 }}>
                        In pausa
                      </span>
                    )}
                    {rd.hasReviews && rd.numeric >= 4.9 && (
                      <span style={{ fontSize: 11, background: C.accentLight, color: C.accentDeep, padding: '3px 9px', borderRadius: 9999, fontWeight: 500 }}>
                        Top
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12.5, color: C.muted }}>
                    {barber.city}{barber.dist > 0 ? ` · ${formatKm(barber.dist)}` : ''}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                    <i className={`${rd.hasReviews ? 'ph-fill' : 'ph-thin'} ph-star`} style={{ fontSize: 12, color: rd.hasReviews ? C.accent : C.hint }} />
                    <span style={{ fontWeight: 600, color: C.text }}>{rd.label}</span>
                    {barber.tags.length > 0 && (
                      <>
                        <span style={{ color: C.borderMed }}>·</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {barber.tags.join(' · ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!isSelf && barber.acceptingBookings !== false && (
                <button
                  onClick={e => { e.stopPropagation(); onBook(barber) }}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--r-md)',
                    background: C.bg, color: C.text,
                    fontSize: 13, border: `1px solid ${C.borderMed}`,
                    cursor: 'pointer', fontWeight: 500,
                    whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
                  }}
                >
                  Prenota
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
