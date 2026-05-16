import { useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, POSTS, getBarberById } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'

interface FeedProps {
  onBook: (barber: DemoBarber) => void
}

export function Feed({ onBook }: FeedProps) {
  const [liked, setLiked] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  const toggleLike = (id: number) => setLiked(l => ({ ...l, [id]: !l[id] }))
  const toggleSave = (id: number) => setSaved(s => ({ ...s, [id]: !s[id] }))

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.8, color: C.text, fontFamily: 'Georgia, serif' }}>
          CutBook
        </span>
        <div style={{ display: 'flex', gap: 18 }}>
          <i className="ti ti-heart" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
          <i className="ti ti-send" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
        </div>
      </div>

      {/* Stories row */}
      <div style={{ display: 'flex', gap: 12, padding: '4px 16px 14px', overflowX: 'auto' }}>
        {BARBERS.map(b => (
          <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', minWidth: 58 }}>
            <div style={{ padding: 2.5, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},#E8B86D)` }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%',
                background: b.accent + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 500, color: b.accent,
                border: `2px solid ${C.bg}`,
              }}>
                {b.initials}
              </div>
            </div>
            <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 58, textAlign: 'center' }}>
              {b.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Posts */}
      {POSTS.map((post, idx) => {
        const barber = getBarberById(post.barberId)!
        const isLiked = liked[post.id]
        const isSaved = saved[post.id]
        return (
          <div key={post.id}>
            {idx > 0 && <div style={{ height: 6, background: C.surface }} />}

            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
              <Avatar initials={barber.initials} size={36} accent={barber.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{barber.name}</div>
                <div style={{ fontSize: 11, color: C.hint }}>{barber.city} · {post.timeAgo}</div>
              </div>
              <button
                onClick={() => onBook(barber)}
                style={{ padding: '6px 13px', borderRadius: 8, background: C.text, color: C.bg, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
              >
                Book
              </button>
            </div>

            {/* Post image placeholder */}
            <div style={{
              width: '100%', height: 220,
              background: barber.accent + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`,
            }}>
              <i className="ti ti-scissors" style={{ fontSize: 52, color: barber.accent, opacity: 0.35 }} />
              <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                {post.label}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px 4px' }}>
              <button onClick={() => toggleLike(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <i className="ti ti-heart" style={{ fontSize: 22, color: isLiked ? C.red : C.muted }} />
              </button>
              <i className="ti ti-message-circle" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
              <i className="ti ti-send" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
              <div style={{ flex: 1 }} />
              <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                <i className="ti ti-bookmark" style={{ fontSize: 22, color: isSaved ? C.text : C.muted }} />
              </button>
            </div>

            <div style={{ padding: '0 16px 2px', fontSize: 13, fontWeight: 500, color: C.text }}>
              {post.likes + (isLiked ? 1 : 0)} likes
            </div>
            <div style={{ padding: '0 16px 4px', fontSize: 13, color: C.text }}>
              <span style={{ fontWeight: 500 }}>{barber.name}</span>{' '}{post.caption}
            </div>
            <div style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint }}>
              View all {post.comments} comments
            </div>
          </div>
        )
      })}
    </div>
  )
}
