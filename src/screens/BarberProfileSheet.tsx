import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { POSTS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { supabase, IS_DEMO } from '../lib/supabase'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { useFollow } from '../hooks/useFollow'
import { useReviews } from '../hooks/useReviews'
import { PostMedia } from '../components/PostMedia'
import { PhotoImage } from '../components/PhotoImage'
import { ReviewsList } from '../components/ReviewsList'
import { ReviewSheet } from '../components/ReviewSheet'
import type { ToastEvent } from '../components/Toast'
import { ratingDisplay } from '../lib/rating'
import { Icon, type IconName } from '../components/Icon'

interface BarberPost {
  id:       string
  label:    string
  caption:  string
  likes:    number
  timeAgo:  string
  imageUrl?: string
}

function timeAgoStr(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1)  return 'ora'
  if (h < 24) return `${h} h fa`
  return `${Math.floor(h / 24)} g fa`
}

interface Props {
  barber:    DemoBarber
  onClose:   () => void
  onBook:    (barber: DemoBarber) => void
  userId?:   string
  isBarber?: boolean
  myBarberId?: string
  onToast?:  (t: ToastEvent | null) => void
  onMessage?: (peer: { peerId: string; name: string | null; avatar: string | null; role: 'client' | 'barber' }) => void
}

export function BarberProfileSheet({ barber, onClose, onBook, userId, isBarber, myBarberId, onToast, onMessage }: Props) {
  const isOwnProfile = !!myBarberId && String(myBarberId) === String(barber.id)
  const [posts, setPosts]             = useState<BarberPost[]>([])
  const [feedStartIdx, setFeedStartIdx] = useState<number | null>(null)
  const [tab, setTab]                 = useState<'posts' | 'reviews'>('posts')
  const [reviewOpen, setReviewOpen]   = useState(false)
  const { info } = useBarberInfo(IS_DEMO ? undefined : String(barber.id), undefined)
  const [followeeProfileId, setFolloweeProfileId] = useState<string | undefined>(barber.profileId)
  useEffect(() => {
    if (IS_DEMO) return
    if (barber.profileId) { setFolloweeProfileId(barber.profileId); return }
    let cancelled = false
    supabase.from('barbers').select('profile_id').eq('id', barber.id).single()
      .then(({ data }) => { if (!cancelled && data) setFolloweeProfileId(data.profile_id) })
    return () => { cancelled = true }
  }, [barber.id, barber.profileId])
  const { isFollowing, followersCount, toggle: toggleFollow, loading: followLoading } =
    useFollow(userId, IS_DEMO ? undefined : followeeProfileId)
  const [acceptingBookings, setAcceptingBookings] = useState<boolean>(barber.acceptingBookings ?? true)
  useEffect(() => {
    if (IS_DEMO || barber.acceptingBookings !== undefined) {
      setAcceptingBookings(barber.acceptingBookings ?? true)
      return
    }
    let cancelled = false
    supabase.from('barbers').select('accepting_bookings').eq('id', barber.id).single()
      .then(({ data }) => { if (!cancelled && data) setAcceptingBookings(data.accepting_bookings) })
    return () => { cancelled = true }
  }, [barber.id, barber.acceptingBookings])
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
  const rd = ratingDisplay({
    rating:       aggregate.count > 0 ? aggregate.rating : barber.rating,
    reviewsCount: aggregate.count > 0 ? aggregate.count  : barber.reviewsCount,
  })

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 8px', flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <Icon name="back" size={22} color={C.text} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          {barber.name}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px 18px' }}>
          <Avatar initials={barber.initials} size={72} ring={rd.hasReviews && rd.numeric >= 4.9} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {acceptingBookings
                ? <span style={pill(C.greenSoft, C.green)}>Aperto</span>
                : <span style={pill(C.redSoft, C.red)}>In pausa</span>}
              {rd.hasReviews && rd.numeric >= 4.9 && <span style={pill(C.accentLight, C.accentDeep)}>Top</span>}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', margin: 0, color: C.text }}>
              {barber.name}
            </h1>
            <div style={{ marginTop: 6, fontSize: 12.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="pin" size={13} color={C.accent} />
              {barber.city}
            </div>
          </div>
        </div>

        {/* Tag row */}
        {barber.tags.length > 0 && (
          <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {barber.tags.map(tag => (
              <span key={tag} style={pill(C.surfaceAlt, C.muted)}>{tag}</span>
            ))}
          </div>
        )}

        {/* Action row */}
        {!isOwnProfile && (
          <div style={{ display: 'flex', gap: 10, padding: '0 20px 16px' }}>
            {!isBarber && (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 'var(--r-md)',
                  background: isFollowing ? C.bg : 'var(--clay)',
                  color:      isFollowing ? C.text : 'var(--paper-3)',
                  border: `1px solid ${isFollowing ? C.borderMed : 'var(--clay)'}`,
                  fontSize: 13.5, fontWeight: 500,
                  cursor: followLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {isFollowing ? 'Stai seguendo' : 'Segui'}
              </button>
            )}
            {userId && followeeProfileId && onMessage && (
              <button
                onClick={() => onMessage({
                  peerId: followeeProfileId, name: barber.name, avatar: null, role: 'barber',
                })}
                style={{
                  padding: '11px 16px', borderRadius: 'var(--r-md)',
                  background: C.bg, color: C.text,
                  border: `1px solid ${C.borderMed}`,
                  fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Icon name="chat" size={16} />
                Messaggia
              </button>
            )}
          </div>
        )}

        {/* Contact card */}
        {(info.shop_name || info.address || info.phone || info.social_link) && (
          <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)' }}>
            {info.shop_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, marginBottom: 4 }}>
                <Icon name="shop" size={14} color={C.muted} />
                <span style={{ fontWeight: 600 }}>{info.shop_name}</span>
              </div>
            )}
            {info.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
                <Icon name="pin" size={14} />
                <span>{info.address}</span>
              </div>
            )}
            {(info.phone || info.social_link) && (
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                {info.phone && (
                  <a href={`tel:${info.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>
                    <Icon name="phone" size={14} />
                    <span>{info.phone}</span>
                  </a>
                )}
                {info.social_link && (() => {
                  const socialIcon: IconName = info.social_link.includes('instagram') ? 'instagram'
                    : info.social_link.includes('tiktok') ? 'tiktok' : 'globe'
                  return (
                    <a href={info.social_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>
                      <Icon name={socialIcon} size={14} />
                      <span>Social</span>
                    </a>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '0 20px 18px', padding: '16px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <Stat value={rd.label} label="Voto" />
          <Stat value={String(followersCount ?? barber.followers)} label="Follower" />
          <Stat value={String(posts.length)} label="Post" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 20px', borderBottom: `1px solid ${C.border}` }}>
          {([
            ['posts',   'Post'],
            ['reviews', 'Recensioni'],
          ] as ['posts' | 'reviews', string][]).map(([id, label]) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: active ? C.text : C.muted,
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  position: 'relative',
                }}
              >
                {label}
                {active && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: C.accent, borderRadius: 9999 }} />
                )}
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
                    background: C.surfaceAlt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {post?.imageUrl
                    ? <PhotoImage src={post.imageUrl} tone="soft" />
                    : <Icon name="scissors" size={26} color={C.hint} />
                  }
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <ReviewsList
              reviews={reviews}
              aggregate={aggregate}
              myUserId={effectiveUserId}
              onEditMine={() => setReviewOpen(true)}
            />
            {!isOwnProfile && (
              <div style={{ padding: '0 20px 16px' }}>
                {myReview ? null : canReview ? (
                  <button
                    onClick={() => setReviewOpen(true)}
                    style={{
                      width: '100%', padding: 12, borderRadius: 'var(--r-md)',
                      background: 'var(--ink)', color: 'var(--paper-3)',
                      border: '1px solid var(--ink)',
                      fontSize: 14, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Lascia una recensione
                  </button>
                ) : (
                  <div style={{
                    padding: '12px 14px', borderRadius: 'var(--r-md)',
                    background: C.surface, border: `1px dashed ${C.borderMed}`,
                    fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.5,
                  }}>
                    Puoi recensire solo dopo un appuntamento completato.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Book button */}
      {!isOwnProfile ? (
        <div style={{ padding: '12px 20px 16px', background: C.bg, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {acceptingBookings ? (
            <button
              onClick={() => onBook(barber)}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
                background: 'var(--clay)', color: 'var(--paper-3)',
                border: '1px solid var(--clay)',
                fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Prenota con {barber.name.split(' ')[0]}
            </button>
          ) : (
            <button
              disabled aria-disabled title="Il barbiere è in pausa"
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 'var(--r-md)',
                background: C.surface, color: C.muted,
                fontSize: 14, fontWeight: 500,
                border: `1px solid ${C.border}`, cursor: 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              In pausa
            </button>
          )}
        </div>
      ) : (
        <div style={{
          padding: '12px 20px 16px', background: C.bg,
          borderTop: `1px solid ${C.border}`, flexShrink: 0,
          textAlign: 'center', fontSize: 12, color: C.hint,
        }}>
          Questo è il tuo profilo pubblico
        </div>
      )}

      {feedStartIdx !== null && (
        <PostsFeed
          posts={posts}
          startIdx={feedStartIdx}
          barber={barber}
          onClose={() => setFeedStartIdx(null)}
        />
      )}

      {reviewOpen && (
        <ReviewSheet
          barberName={barber.name}
          existing={myReview}
          onClose={() => setReviewOpen(false)}
          onSubmit={async (rating, comment) => {
            const res = await upsertReview(rating, comment)
            if (!res.error) onToast?.({
              kind:    'success',
              title:   myReview ? 'Recensione aggiornata.' : 'Recensione pubblicata.',
              message: barber.name,
            })
            return res
          }}
          onDelete={myReview ? async () => {
            const res = await removeReview()
            if (!res.error) onToast?.({ kind: 'success', title: 'Recensione eliminata.', message: barber.name })
            return res
          } : undefined}
        />
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: C.text, letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>{label}</span>
    </div>
  )
}

function pill(bg: string, fg: string): React.CSSProperties {
  return {
    padding: '3px 9px', borderRadius: 9999,
    background: bg, color: fg,
    fontSize: 11, fontWeight: 500, lineHeight: 1.55,
    display: 'inline-block',
  }
}

function PostsFeed({ posts, startIdx, barber, onClose }: {
  posts:   BarberPost[]
  startIdx: number
  barber:  DemoBarber
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <Icon name="back" size={22} color={C.text} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>{barber.name}</span>
      </div>

      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        {posts.map((post, i) => (
          <div key={post.id} ref={el => { itemRefs.current[i] = el }}>
            <PostMedia imageUrl={post.imageUrl}>
              {post.label && (
                <div style={{
                  position: 'absolute', bottom: 12, left: 16,
                  background: 'rgba(20,17,13,0.65)', color: 'var(--paper-3)',
                  fontSize: 11, padding: '4px 10px', borderRadius: 9999,
                  fontWeight: 500,
                }}>
                  {post.label}
                </div>
              )}
            </PostMedia>
            <div style={{ padding: '12px 20px 16px' }}>
              <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600 }}>{barber.name}</span>{' '}{post.caption}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                {post.likes.toLocaleString('it-IT')} mi piace · {post.timeAgo}
              </div>
            </div>
            {i < posts.length - 1 && <div style={{ height: 1, background: C.border }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
