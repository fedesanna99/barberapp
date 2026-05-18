import { C } from '../lib/colors'
import { Avatar } from './Avatar'
import { formatKm } from '../lib/geo'
import type { DemoBarber } from '../lib/demoData'
import type { SortMode } from '../hooks/useBarbers'

interface Props {
  barbers:  DemoBarber[]
  loading:  boolean
  sort:     SortMode
  onSort:   (s: SortMode) => void
  onBook:   (barber: DemoBarber) => void
  onView:   (barber: DemoBarber) => void
  // The current user's own barbers.id when they're a barber — used so
  // we don't render a "Prenota" button on the user's own row.
  myBarberId?: string
}

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'nearby',   label: 'Vicini'      },
  { id: 'popular',  label: 'Popolari'    },
  { id: 'new',      label: 'Nuovi'       },
  { id: 'toprated', label: 'Top rated'   },
]

export function BarberList({ barbers, loading, sort, onSort, onBook, onView, myBarberId }: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Sort pills */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 16px', overflowX: 'auto' }}>
        {SORTS.map(s => (
          <button
            key={s.id}
            onClick={() => onSort(s.id)}
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

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: C.hint }}>
          <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && barbers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: C.hint, fontSize: 14 }}>
          Nessun barbiere trovato
        </div>
      )}

      {barbers.map((barber, idx) => {
        const isSelf = !!myBarberId && String(myBarberId) === String(barber.id)
        return (
          <div key={barber.id}>
            {idx > 0 && <div style={{ height: 0.5, background: C.border, margin: '0 16px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div
                onClick={() => onView(barber)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <Avatar initials={barber.initials} size={50} accent={barber.accent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{barber.name}</span>
                    {isSelf && (
                      <span style={{ fontSize: 9, background: C.surface, color: C.muted, padding: '2px 6px', borderRadius: 20, fontWeight: 500, border: `0.5px solid ${C.border}` }}>
                        TU
                      </span>
                    )}
                    {barber.rating >= 4.9 && (
                      <span style={{ fontSize: 9, background: C.accentLight, color: C.accent, padding: '2px 6px', borderRadius: 20, fontWeight: 500 }}>TOP</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                    {barber.city}{barber.dist > 0 ? ` · ${formatKm(barber.dist)}` : ''}
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
              {!isSelf && (
                <button
                  onClick={() => onBook(barber)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, background: C.text, color: C.bg,
                    fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500,
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
