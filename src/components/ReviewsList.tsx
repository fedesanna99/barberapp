import { C } from '../lib/colors'
import { Avatar } from './Avatar'
import { StarRating } from './StarRating'
import type { ReviewRow } from '../hooks/useReviews'

interface Props {
  reviews:    ReviewRow[]
  aggregate:  { rating: number; count: number }
  accent:     string
  myUserId?:  string                  // highlights "my" review with an edit pill
  onEditMine?: () => void
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ora'
  if (m < 60) return `${m} min fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}g fa`
  if (d < 30) return `${Math.floor(d / 7)}sett fa`
  if (d < 365) return `${Math.floor(d / 30)}m fa`
  return `${Math.floor(d / 365)}a fa`
}

export function ReviewsList({ reviews, aggregate, accent, myUserId, onEditMine }: Props) {
  if (reviews.length === 0) {
    return (
      <div style={{
        padding: '40px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-star" style={{ fontSize: 36, color: C.hint, opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Nessuna recensione</div>
        <div style={{ fontSize: 12, color: C.muted, maxWidth: 240, lineHeight: 1.4 }}>
          Sii il primo a recensire dopo il tuo primo taglio.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      {/* Aggregate header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0 12px', borderBottom: `0.5px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{aggregate.rating.toFixed(1)}</span>
          <StarRating value={aggregate.rating} size={16} gap={2} />
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>
          {aggregate.count} recension{aggregate.count === 1 ? 'e' : 'i'}
        </span>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
        {reviews.map(r => {
          const isMine = !!myUserId && r.clientId === myUserId
          return (
            <div key={r.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar initials={initials(r.authorName)} size={36} accent={isMine ? accent : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                    {isMine ? 'Tu' : r.authorName}
                  </span>
                  <StarRating value={r.rating} size={12} gap={1} />
                  <span style={{ fontSize: 10, color: C.hint }}>
                    {timeAgo(r.createdAt)}
                    {r.updatedAt !== r.createdAt && ' · modificata'}
                  </span>
                  {isMine && onEditMine && (
                    <button
                      onClick={onEditMine}
                      style={{
                        marginLeft: 'auto', background: 'none', border: 'none',
                        color: accent, fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px',
                      }}
                    >
                      Modifica
                    </button>
                  )}
                </div>
                {r.comment && (
                  <div style={{ fontSize: 13, color: C.text, marginTop: 4, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.comment}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
