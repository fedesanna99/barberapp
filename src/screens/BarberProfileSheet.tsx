import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { POSTS } from '../lib/demoData'
import type { DemoBarber, DemoPost } from '../lib/demoData'

interface Props {
  barber: DemoBarber
  onClose: () => void
  onBook: (barber: DemoBarber) => void
}

export function BarberProfileSheet({ barber, onClose, onBook }: Props) {
  const barberPosts = POSTS.filter(p => p.barberId === barber.id)
  const totalCells  = Math.max(barberPosts.length, 6)
  const [feedStartIdx, setFeedStartIdx] = useState<number | null>(null)

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>{barber.name}</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 4 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '8px 16px 16px' }}>
          <div style={{ display: 'inline-flex', padding: 3, borderRadius: '50%', background: `linear-gradient(135deg,${barber.accent},${barber.accent}66)` }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: barber.accent + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 500, color: barber.accent,
              border: `3px solid ${C.bg}`,
            }}>
              {barber.initials}
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, marginTop: 10 }}>{barber.name}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <i className="ti ti-map-pin" style={{ fontSize: 12 }} />
            {barber.city}
            <span style={{ color: C.borderMed }}>·</span>
            <i className="ti ti-star-filled" style={{ fontSize: 11, color: '#EF9F27' }} />
            {barber.rating}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {barber.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: barber.accent + '18', color: barber.accent,
                border: `0.5px solid ${barber.accent}40`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, marginBottom: 2 }}>
          {([
            [String(barber.followers), 'Followers'],
            [barber.rating.toFixed(1),  'Rating'],
            [String(totalCells),         'Posts'],
          ] as [string, string][]).map(([val, label], i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Posts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const post = barberPosts[i]
            return (
              <div
                key={i}
                onClick={() => post && setFeedStartIdx(i)}
                style={{
                  aspectRatio: '1', cursor: post ? 'pointer' : 'default', position: 'relative', overflow: 'hidden',
                  background: barber.accent + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className="ti ti-scissors" style={{ fontSize: 28, color: barber.accent, opacity: 0.4 }} />
                {post && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '12px 4px 4px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>{post.label}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Book button */}
      <div style={{ padding: '12px 16px 20px', background: C.bg, borderTop: `0.5px solid ${C.border}`, flexShrink: 0 }}>
        <button
          onClick={() => onBook(barber)}
          style={{
            width: '100%', padding: 15, borderRadius: 12,
            background: C.text, color: C.bg,
            fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}
        >
          <i className="ti ti-calendar-plus" style={{ fontSize: 18 }} />
          Book with {barber.name.split(' ')[0]}
        </button>
      </div>

      {/* Post feed overlay */}
      {feedStartIdx !== null && (
        <PostsFeed
          posts={barberPosts}
          startIdx={feedStartIdx}
          barber={barber}
          onClose={() => setFeedStartIdx(null)}
        />
      )}
    </div>
  )
}

function PostsFeed({ posts, startIdx, barber, onClose }: {
  posts: DemoPost[]
  startIdx: number
  barber: DemoBarber
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs     = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    const el        = itemRefs.current[startIdx]
    if (container && el) container.scrollTop = el.offsetTop
  }, [startIdx])

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px', flexShrink: 0, borderBottom: `0.5px solid ${C.border}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>{barber.name}</span>
      </div>

      {/* Scrollable posts */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        {posts.map((post, i) => (
          <div key={post.id} ref={el => { itemRefs.current[i] = el }}>
            {/* Photo */}
            <div style={{
              width: '100%', height: 280,
              background: barber.accent + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {post.imageUrl
                ? <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="ti ti-scissors" style={{ fontSize: 56, color: barber.accent, opacity: 0.35 }} />
              }
              <div style={{
                position: 'absolute', bottom: 10, left: 12,
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
              }}>
                {post.label}
              </div>
            </div>
            {/* Caption */}
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{ fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 500 }}>{barber.name}</span>{' '}{post.caption}
              </div>
              <div style={{ fontSize: 11, color: C.hint, marginTop: 4 }}>
                {post.likes} likes · {post.timeAgo}
              </div>
            </div>
            {i < posts.length - 1 && <div style={{ height: 6, background: C.surface }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
