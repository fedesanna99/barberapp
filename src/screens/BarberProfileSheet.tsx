import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { POSTS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { supabase, IS_DEMO } from '../lib/supabase'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { useFollow } from '../hooks/useFollow'
import { useReviews } from '../hooks/useReviews'
import { PostMedia } from '../components/PostMedia'
import { ReviewsList } from '../components/ReviewsList'
import { ReviewSheet } from '../components/ReviewSheet'
import type { ToastEvent } from '../components/Toast'

interface BarberPost {
  id: string
  label: string
  caption: string
  likes: number
  timeAgo: string
  imageUrl?: string
}

function timeAgoStr(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  barber: DemoBarber
  onClose: () => void
  onBook: (barber: DemoBarber) => void
  userId?: string
  isBarber?: boolean
  // The current user's own barbers.id when logged in as a barber.
  // Used to detect "this is MY profile" and hide Prenota / review CTAs.
  myBarberId?: string
  onToast?: (t: ToastEvent | null) => void
}

export function BarberProfileSheet({ barber, onClose, onBook, userId, isBarber, myBarberId, onToast }: Props) {
  // True when the currently logged-in barber is looking at their own profile.
  // Server-side triggers already block self-booking / self-review; this is
  // the UI half of the same rule (cleaner UX than waiting for the error).
  const isOwnProfile = !!myBarberId && String(myBarberId) === String(barber.id)
  const [posts, setPosts]             = useState<BarberPost[]>([])
  const [feedStartIdx, setFeedStartIdx] = useState<number | null>(null)
  const [tab, setTab]                 = useState<'posts' | 'reviews'>('posts')
  const [reviewOpen, setReviewOpen]   = useState(false)
  const { info } = useBarberInfo(IS_DEMO ? undefined : String(barber.id), undefined)
  const { isFollowing, followersCount, toggle: toggleFollow, loading: followLoading } =
    useFollow(userId, IS_DEMO ? undefined : String(barber.id))
  const {
    reviews, aggregate, myReview, canReview,
    upsertReview, removeReview, effectiveUserId,
  } = useReviews(barber.id, userId)

  useEffect(() => {
    if (IS_DEMO) {
      setPosts(
        POSTS.filter(p => p.barberId === barber.id).map(p => ({
          id:       String(p.id),
          label:    p.label,
          caption:  p.caption,
          likes:    p.likes,
          timeAgo:  p.timeAgo,
          imageUrl: p.imageUrl,
        }))
      )
      return
    }
    supabase
      .from('posts')
      .select('id, label, caption, likes_count, created_at, image_url')
      .eq('barber_id', barber.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setPosts(data.map(p => ({
            id:       p.id,
            label:    p.label ?? '',
            caption:  p.caption ?? '',
            likes:    p.likes_count ?? 0,
            timeAgo:  timeAgoStr(p.created_at),
            imageUrl: p.image_url ?? undefined,
          })))
        }
      })
  }, [barber.id])

  const totalCells = Math.max(posts.length, 6)

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

          {!isBarber && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                marginTop: 14,
                padding: '8px 24px', borderRadius: 20,
                background: isFollowing ? C.surface : barber.accent,
                color: isFollowing ? C.muted : '#fff',
                border: isFollowing ? `0.5px solid ${C.borderMed}` : 'none',
                fontSize: 13, fontWeight: 500, cursor: followLoading ? 'default' : 'pointer',
                fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'background .15s, color .15s',
              }}
            >
              <i className={`ti ${isFollowing ? 'ti-user-check' : 'ti-user-plus'}`} style={{ fontSize: 14 }} />
              {isFollowing ? 'Stai seguendo' : 'Segui'}
            </button>
          )}

          {(info.shop_name || info.address || info.phone || info.social_link) && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {info.shop_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                  <i className="ti ti-building-store" style={{ fontSize: 13 }} />
                  <span>{info.shop_name}</span>
                </div>
              )}
              {info.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.hint }}>
                  <i className="ti ti-map-pin" style={{ fontSize: 12 }} />
                  <span>{info.address}</span>
                </div>
              )}
              {(info.phone || info.social_link) && (
                <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                  {info.phone && (
                    <a href={`tel:${info.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: barber.accent, textDecoration: 'none' }}>
                      <i className="ti ti-phone" style={{ fontSize: 13 }} />
                      <span>{info.phone}</span>
                    </a>
                  )}
                  {info.social_link && (
                    <a href={info.social_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: barber.accent, textDecoration: 'none' }}>
                      <i className={`ti ${info.social_link.includes('instagram') ? 'ti-brand-instagram' : info.social_link.includes('tiktok') ? 'ti-brand-tiktok' : 'ti-world'}`} style={{ fontSize: 13 }} />
                      <span>Social</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, marginBottom: 2 }}>
          {([
            [followersCount !== null ? String(followersCount) : String(barber.followers), 'Follower'],
            // Voto = real aggregate when we have reviews, otherwise the seed barber.rating
            [aggregate.count > 0 ? aggregate.rating.toFixed(1) : barber.rating.toFixed(1), 'Voto'],
            [String(posts.length),     'Post'],
          ] as [string, string][]).map(([val, label], i) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `0.5px solid ${C.border}` }}>
          {([
            ['posts',   'ti-layout-grid', 'Post'],
            ['reviews', 'ti-star',        'Recensioni'],
          ] as ['posts' | 'reviews', string, string][]).map(([id, icon, label]) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1, padding: '10px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'inherit',
                  borderBottom: active ? `2px solid ${C.text}` : '2px solid transparent',
                  color: active ? C.text : C.hint,
                  fontSize: 12, fontWeight: 500,
                }}
              >
                <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {tab === 'posts' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const post = posts[i]
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
                  {post?.imageUrl
                    ? <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="ti ti-scissors" style={{ fontSize: 28, color: barber.accent, opacity: 0.4 }} />
                  }
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
        ) : (
          <>
            <ReviewsList
              reviews={reviews}
              aggregate={aggregate}
              accent={barber.accent}
              myUserId={effectiveUserId}
              onEditMine={() => setReviewOpen(true)}
            />
            {/* CTA: clients (or barbers viewing OTHER barbers) can review when eligible.
                If `canReview` is false we still show a contextual hint so the user understands
                why the button isn't there. Barbers viewing their OWN profile see nothing
                (they can't auto-review themselves). */}
            {!isOwnProfile && (
              <div style={{ padding: '0 16px 16px' }}>
                {myReview ? null : canReview ? (
                  <button
                    onClick={() => setReviewOpen(true)}
                    style={{
                      width: '100%', padding: 12, borderRadius: 12,
                      background: barber.accent, color: '#fff',
                      fontSize: 14, fontWeight: 500, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <i className="ti ti-star" style={{ fontSize: 16 }} />
                    Lascia una recensione
                  </button>
                ) : (
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: C.surface, border: `0.5px dashed ${C.borderMed}`,
                    fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.4,
                  }}>
                    Puoi recensire solo dopo un appuntamento completato.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book button — hidden when the logged-in barber is viewing their own profile */}
      {!isOwnProfile ? (
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
            Prenota con {barber.name.split(' ')[0]}
          </button>
        </div>
      ) : (
        <div style={{
          padding: '12px 16px 20px', background: C.bg,
          borderTop: `0.5px solid ${C.border}`, flexShrink: 0,
          textAlign: 'center', fontSize: 12, color: C.hint,
        }}>
          Questo è il tuo profilo pubblico
        </div>
      )}

      {/* Post feed overlay */}
      {feedStartIdx !== null && (
        <PostsFeed
          posts={posts}
          startIdx={feedStartIdx}
          barber={barber}
          onClose={() => setFeedStartIdx(null)}
        />
      )}

      {/* Review create/edit sheet */}
      {reviewOpen && (
        <ReviewSheet
          barberName={barber.name}
          existing={myReview}
          onClose={() => setReviewOpen(false)}
          onSubmit={async (rating, comment) => {
            const res = await upsertReview(rating, comment)
            if (!res.error) onToast?.({
              kind:    'success',
              title:   myReview ? 'Recensione aggiornata' : 'Recensione pubblicata',
              message: barber.name,
            })
            return res
          }}
          onDelete={myReview ? async () => {
            const res = await removeReview()
            if (!res.error) onToast?.({ kind: 'success', title: 'Recensione eliminata', message: barber.name })
            return res
          } : undefined}
        />
      )}
    </div>
  )
}

function PostsFeed({ posts, startIdx, barber, onClose }: {
  posts: BarberPost[]
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
            <PostMedia imageUrl={post.imageUrl} fallbackAccent={barber.accent} fallbackIconSize={56}>
              <div style={{
                position: 'absolute', bottom: 10, left: 12,
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
              }}>
                {post.label}
              </div>
            </PostMedia>
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
