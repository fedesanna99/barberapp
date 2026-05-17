import { useRef, useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, POSTS, CUT_LOG, UPCOMING as DEMO_UPCOMING } from '../lib/demoData'
import { useClientBookings } from '../hooks/useBooking'
import { useProfile } from '../hooks/useProfile'
import { useFollows } from '../hooks/useFollows'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { uploadAvatar, uploadPostPhoto, uploadUserPostPhoto, validateImageType } from '../hooks/useUpload'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { BookingWithBarber } from '../hooks/useBooking'
import type { Post, UserPost } from '../types/supabase'

type PostLike = {
  id: string
  image_url: string
  label: string | null
  caption: string | null
  likes_count: number
  created_at: string
}

function timeAgoStr(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  userId?: string
  isBarber?: boolean
  barberId?: string
}

const TODAY = new Date().toISOString().split('T')[0]

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function Profile({ userId, isBarber, barberId }: Props) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const postInputRef   = useRef<HTMLInputElement>(null)
  const [uploading,        setUploading]        = useState(false)
  const [uploadError,      setUploadError]      = useState<string | null>(null)
  const [ownPosts,         setOwnPosts]         = useState<Post[]>([])
  const [userPosts,        setUserPosts]        = useState<UserPost[]>([])
  const [showNewUserPost,  setShowNewUserPost]  = useState(false)
  const [selectedPostIdx, setSelectedPostIdx] = useState<number | null>(null)

  const { profile, updateAvatarUrl } = useProfile(userId)
  const follows  = useFollows(userId)
  const { bookings } = useClientBookings(isBarber ? undefined : userId)
  const { info: barberInfo } = useBarberInfo(isBarber ? barberId : undefined, isBarber ? userId : undefined)

  // Barber: load own posts on mount
  useEffect(() => {
    if (!isBarber || !barberId || IS_DEMO) return
    supabase
      .from('posts')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOwnPosts((data ?? []) as Post[]))
  }, [isBarber, barberId])

  // Client: load own user posts on mount
  useEffect(() => {
    if (isBarber || !userId || IS_DEMO) return
    supabase
      .from('user_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUserPosts((data ?? []) as UserPost[]))
  }, [isBarber, userId])

  const upcoming = bookings.filter(b => b.date >= TODAY && b.status !== 'cancelled')
  const past     = bookings.filter(b => b.date <  TODAY && b.status === 'done')

  // In demo mode (no real session) fall back to demo counts
  const isDemo = IS_DEMO || !userId
  const cutsCount     = isDemo ? CUT_LOG.length        : past.length
  const barbersCount  = isDemo ? 3                     : follows.length
  const upcomingCount = isDemo ? DEMO_UPCOMING.length  : upcoming.length

  const displayName = profile.display_name ?? 'User'
  const avatarUrl   = profile.avatar_url
  const ini         = initials(displayName)

  // "Following" subtitle: real names in production, demo string otherwise
  const followingLine = isDemo
    ? 'Following Marco, Fadi, Nico'
    : follows.length > 0
      ? `Following ${follows.map(f => f.displayName?.split(' ')[0] ?? '?').join(', ')}`
      : (profile.bio ?? '')

  // Pill tags: followed barber names in production, style tags in demo
  const pills: string[] = isDemo
    ? ['Skin fade', 'Beard', 'Line up']
    : follows.slice(0, 4).map(f => f.displayName?.split(' ')[0] ?? '?').filter(Boolean)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadAvatar(file, userId)
      await updateAvatarUrl(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handlePostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !isBarber || !barberId) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadPostPhoto(file, barberId)
      if (!IS_DEMO) {
        const { data } = await supabase
          .from('posts')
          .insert({ barber_id: barberId, image_url: url, caption: null })
          .select()
          .single()
        if (data) setOwnPosts(prev => [data as Post, ...prev])
      } else {
        setOwnPosts(prev => [{
          id: crypto.randomUUID(), barber_id: barberId,
          image_url: url, caption: null, label: null, likes_count: 0,
          created_at: new Date().toISOString(),
        }, ...prev])
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function addUserPost(caption: string, label: string, file?: File): Promise<void> {
    if (!userId) throw new Error('Not logged in')
    if (IS_DEMO) {
      setUserPosts(prev => [{
        id: crypto.randomUUID(), user_id: userId,
        image_url: file ? URL.createObjectURL(file) : '',
        caption, label, likes_count: 0,
        created_at: new Date().toISOString(),
      }, ...prev])
      return
    }
    if (!file) throw new Error('No photo selected')
    const imageUrl = await uploadUserPostPhoto(file, userId)
    const { data, error } = await supabase
      .from('user_posts')
      .insert({ user_id: userId, image_url: imageUrl, caption, label })
      .select()
      .single()
    if (error) throw new Error(`Upload failed: ${error.message}`)
    if (data) setUserPosts(prev => [data as UserPost, ...prev])
  }

  const showBarberPosts     = isBarber && !isDemo
  const showDemoBarberPosts = isBarber && isDemo
  const showClientPosts     = !isBarber && !isDemo
  const showDemoPosts       = !isBarber && isDemo

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>My cuts</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {!isBarber && (
            <i
              className="ti ti-camera-plus"
              onClick={() => !uploading && setShowNewUserPost(true)}
              style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
            />
          )}
          <i className="ti ti-settings" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
        </div>
      </div>

      {/* Hero with tappable avatar */}
      <div style={{ padding: '16px 16px 12px', textAlign: 'center' }}>
        <div
          style={{ position: 'relative', width: 80, margin: '0 auto 12px', cursor: 'pointer' }}
          onClick={() => !uploading && avatarInputRef.current?.click()}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: avatarUrl ? 'transparent' : C.accentLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 500, color: C.accent,
            border: `2px solid ${C.accent}`, overflow: 'hidden',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{ini}</span>
            }
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 22, height: 22, borderRadius: '50%',
            background: C.accent, border: `2px solid ${C.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-camera" style={{ fontSize: 11, color: '#fff' }} />
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>{displayName}</div>
        {followingLine !== '' && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{followingLine}</div>
        )}
        {pills.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {pills.map(p => (
              <span key={p} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.surface, color: C.muted, border: `0.5px solid ${C.border}` }}>
                {p}
              </span>
            ))}
          </div>
        )}

        {uploadError && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#e53e3e', textAlign: 'center', padding: '0 24px', cursor: 'pointer' }} onClick={() => setUploadError(null)}>
            {uploadError}
          </div>
        )}

        {isBarber && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {barberInfo.shop_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                <i className="ti ti-building-store" style={{ fontSize: 13 }} />
                <span>{barberInfo.shop_name}</span>
              </div>
            )}
            {barberInfo.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.hint }}>
                <i className="ti ti-map-pin" style={{ fontSize: 12 }} />
                <span>{barberInfo.address}</span>
              </div>
            )}
            {(barberInfo.phone || barberInfo.social_link) && (
              <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
                {barberInfo.phone && (
                  <a href={`tel:${barberInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.accent, textDecoration: 'none' }}>
                    <i className="ti ti-phone" style={{ fontSize: 13 }} />
                    <span>{barberInfo.phone}</span>
                  </a>
                )}
                {barberInfo.social_link && (
                  <a href={barberInfo.social_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.accent, textDecoration: 'none' }}>
                    <i className={`ti ${barberInfo.social_link.includes('instagram') ? 'ti-brand-instagram' : barberInfo.social_link.includes('tiktok') ? 'ti-brand-tiktok' : 'ti-world'}`} style={{ fontSize: 13 }} />
                    <span>Social</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, marginBottom: 16 }}>
        {([
          [String(cutsCount),     'Fresh cuts', 'ti-scissors'],
          [String(upcomingCount), 'Follower',   'ti-heart'],
          [String(barbersCount),  'Stelle',     'ti-star'],
        ] as [string, string, string][]).map(([val, label, icon], i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '14px 0 12px', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{val}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4 }}>
              <i className={`ti ${icon}`} style={{ fontSize: 10, color: C.muted }} />
              <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cut / post photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {showBarberPosts     && <OwnPostGrid posts={ownPosts} onPostClick={setSelectedPostIdx} />}
        {showDemoBarberPosts && <DemoBarberPostGrid onPostClick={setSelectedPostIdx} />}
        {showClientPosts     && <UserPostGrid posts={userPosts} onPostClick={setSelectedPostIdx} />}
        {showDemoPosts       && <DemoPostGrid />}
      </div>

      {/* Your appointment */}
      {(isDemo || upcoming.length > 0) && (
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ padding: '0 0 8px', fontSize: 13, fontWeight: 500, color: C.text }}>Your appointment</div>
          {isDemo
            ? <DemoUpcoming />
            : <RealUpcoming bookings={upcoming.slice(0, 1)} />
          }
        </div>
      )}

      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
      <input ref={postInputRef}   type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePostChange} />
    </div>

    {/* Post feed overlay — barbers */}
    {selectedPostIdx !== null && isBarber && (
      <ProfilePostsFeed
        posts={showDemoBarberPosts
          ? POSTS.map(p => ({ id: String(p.id), image_url: p.imageUrl ?? '', caption: p.caption, label: p.label, likes_count: p.likes, created_at: new Date().toISOString() }))
          : ownPosts
        }
        startIdx={selectedPostIdx}
        authorName={displayName}
        accent={C.accent}
        onClose={() => setSelectedPostIdx(null)}
      />
    )}

    {/* Post feed overlay — clients */}
    {selectedPostIdx !== null && !isBarber && showClientPosts && userPosts.length > 0 && (
      <ProfilePostsFeed
        posts={userPosts}
        startIdx={selectedPostIdx}
        authorName={displayName}
        accent={C.accent}
        title="My cuts"
        onClose={() => setSelectedPostIdx(null)}
      />
    )}

    {/* New user post sheet */}
    {showNewUserPost && (
      <NewUserPostSheet
        onAdd={async (caption, label, file) => {
          await addUserPost(caption, label, file)
          setShowNewUserPost(false)
        }}
        onClose={() => setShowNewUserPost(false)}
      />
    )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OwnPostGrid({ posts, onPostClick }: { posts: PostLike[]; onPostClick: (i: number) => void }) {
  return (
    <>
      {posts.map((post, i) => (
        <div
          key={post.id}
          onClick={() => onPostClick(i)}
          style={{
            aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
            position: 'relative', background: C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {post.image_url
            ? <img src={post.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <i className="ti ti-scissors" style={{ fontSize: 30, color: C.hint, opacity: 0.4 }} />
          }
          {post.label && (
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
      ))}
    </>
  )
}

function UserPostGrid({ posts, onPostClick }: { posts: UserPost[]; onPostClick: (i: number) => void }) {
  if (posts.length === 0) {
    return (
      <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center' }}>
        <i className="ti ti-camera-plus" style={{ fontSize: 38, color: C.hint, opacity: 0.35 }} />
        <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>No posts yet — tap the camera to add your first cut</div>
      </div>
    )
  }
  return (
    <>
      {posts.map((post, i) => (
        <div
          key={post.id}
          onClick={() => onPostClick(i)}
          style={{
            aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
            position: 'relative', background: C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {post.image_url
            ? <img src={post.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <i className="ti ti-scissors" style={{ fontSize: 30, color: C.hint, opacity: 0.4 }} />
          }
          {post.label && (
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
      ))}
    </>
  )
}

function DemoBarberPostGrid({ onPostClick }: { onPostClick: (i: number) => void }) {
  return (
    <>
      {POSTS.map((post, i) => {
        const barber = BARBERS.find(b => b.id === post.barberId)!
        return (
          <div key={post.id} onClick={() => onPostClick(i)} style={{
            aspectRatio: '1', background: barber.accent + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: 'pointer', overflow: 'hidden',
          }}>
            {post.imageUrl
              ? <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <i className="ti ti-scissors" style={{ fontSize: 30, color: barber.accent, opacity: 0.4 }} />
            }
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px 4px 5px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>{post.label}</div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function DemoPostGrid() {
  return (
    <>
      {CUT_LOG.map((cut, i) => {
        const b = BARBERS.find(br => br.name === cut.barber)
        return (
          <div key={i} style={{
            aspectRatio: '1', background: b ? b.accent + '18' : C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: 'pointer', overflow: 'hidden',
          }}>
            <i className="ti ti-scissors" style={{ fontSize: 30, color: b ? b.accent : C.hint, opacity: 0.4 }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px 4px 5px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>{cut.date}</div>
            </div>
          </div>
        )
      })}
    </>
  )
}

function DemoUpcoming() {
  return (
    <>
      {DEMO_UPCOMING.slice(0, 1).map((appt, i) => {
        const b = BARBERS.find(br => br.name === appt.barber)!
        return (
          <div key={i} style={apptCard}>
            <Avatar initials={b.initials} size={38} accent={b.accent} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{appt.barber}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{appt.date} · {appt.time}</div>
            </div>
            <StatusPill status="confirmed" tag={appt.tag} />
          </div>
        )
      })}
    </>
  )
}

function RealUpcoming({ bookings }: { bookings: BookingWithBarber[] }) {
  return (
    <>
      {bookings.map(b => {
        const name = b.barbers?.profile?.display_name ?? 'Barber'
        return (
          <div key={b.id} style={apptCard}>
            <Avatar initials={initials(name)} size={38} accent={C.accent} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(b.date)} · {b.time_slot}</div>
            </div>
            <StatusPill status={b.status} />
          </div>
        )
      })}
    </>
  )
}

function StatusPill({ status, tag }: { status: string; tag?: string }) {
  const label = tag ?? status.charAt(0).toUpperCase() + status.slice(1)
  const bg    = status === 'confirmed' ? C.accentLight : status === 'pending' ? 'rgba(29,158,117,0.1)' : C.surface
  const color = status === 'confirmed' ? C.accent      : status === 'pending' ? C.green               : C.hint
  return (
    <span style={{ fontSize: 10, background: bg, color, padding: '3px 8px', borderRadius: 20 }}>{label}</span>
  )
}

// ── Post feed overlay (barbers) ────────────────────────────────────────────

function ProfilePostsFeed({ posts, startIdx, authorName, accent, title = 'My posts', onClose }: {
  posts: PostLike[]
  startIdx: number
  authorName: string
  accent: string
  title?: string
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px', flexShrink: 0, borderBottom: `0.5px solid ${C.border}` }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>{title}</span>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        {posts.map((post, i) => (
          <div key={post.id} ref={el => { itemRefs.current[i] = el }}>
            <div style={{
              width: '100%', height: 280,
              background: accent + '18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {post.image_url
                ? <img src={post.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="ti ti-scissors" style={{ fontSize: 56, color: accent, opacity: 0.35 }} />
              }
              {post.label && (
                <div style={{
                  position: 'absolute', bottom: 10, left: 12,
                  background: 'rgba(0,0,0,0.55)', color: '#fff',
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                }}>
                  {post.label}
                </div>
              )}
            </div>
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{ fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 500 }}>{authorName}</span>{' '}{post.caption ?? ''}
              </div>
              <div style={{ fontSize: 11, color: C.hint, marginTop: 4 }}>
                {post.likes_count} likes · {timeAgoStr(post.created_at)}
              </div>
            </div>
            {i < posts.length - 1 && <div style={{ height: 6, background: C.surface }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── New user post sheet ────────────────────────────────────────────────────

function NewUserPostSheet({
  onAdd,
  onClose,
}: {
  onAdd: (caption: string, label: string, file?: File) => Promise<void>
  onClose: () => void
}) {
  const [caption,   setCaption]   = useState('')
  const [label,     setLabel]     = useState('')
  const [file,      setFile]      = useState<File | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      validateImageType(f)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Invalid file')
      e.target.value = ''
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const canPost = caption.trim().length > 0 && label.trim().length > 0 && (!IS_DEMO ? file !== null : true)

  async function handlePost() {
    if (!canPost || loading) return
    setLoading(true)
    setPostError(null)
    try {
      await onAdd(caption.trim(), label.trim(), file ?? undefined)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
    >
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', display: 'flex', flexDirection: 'column', animation: 'sheetUp .3s ease-out' }}>
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>New cut</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 130, background: C.surface, borderBottom: `0.5px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          {preview ? (
            <>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <i className="ti ti-camera" style={{ fontSize: 22, color: '#fff' }} />
                <span style={{ fontSize: 11, color: '#fff' }}>Tap to change</span>
              </div>
            </>
          ) : (
            <>
              <i className="ti ti-camera-plus" style={{ fontSize: 30, color: C.hint }} />
              <span style={{ fontSize: 12, color: C.hint }}>{IS_DEMO ? 'Tap to add a photo' : 'Tap to add a photo (required)'}</span>
            </>
          )}
        </div>
        <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption…"
            rows={3}
            style={{ padding: '9px 14px', borderRadius: 10, border: `0.5px solid ${C.borderMed}`, fontSize: 13, background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit', resize: 'none' }}
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Style label (e.g. Skin fade + line up)"
            style={{ padding: '9px 14px', borderRadius: 10, border: `0.5px solid ${C.borderMed}`, fontSize: 13, background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          />
          {postError && (
            <div style={{ fontSize: 12, color: '#e53935', padding: '6px 10px', background: '#ffebee', borderRadius: 8 }}>{postError}</div>
          )}
          <button
            onClick={handlePost}
            disabled={!canPost || loading}
            style={{
              padding: 13, borderRadius: 12,
              background: canPost && !loading ? C.text : C.borderMed,
              color: C.bg, fontSize: 14, fontWeight: 500,
              border: 'none', cursor: canPost && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Uploading…</>
              : 'Post'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

const apptCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 12px',
  background: C.surface, borderRadius: 12, marginBottom: 8,
  border: `0.5px solid ${C.border}`,
}
