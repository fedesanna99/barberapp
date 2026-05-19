import { useRef, useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { EditProfileSheet } from '../components/EditProfileSheet'
import { PostMedia } from '../components/PostMedia'
import { PhotoImage } from '../components/PhotoImage'
import { SOFT_PHOTO_FILTER } from '../lib/photoTone'
import { BARBERS, POSTS, CUT_LOG, UPCOMING as DEMO_UPCOMING } from '../lib/demoData'
import { useClientBookings } from '../hooks/useBooking'
import { useProfile } from '../hooks/useProfile'
import { useFollows } from '../hooks/useFollows'
import { useBarberInfo } from '../hooks/useBarberInfo'
import { useReviews } from '../hooks/useReviews'
import { ReviewsList } from '../components/ReviewsList'
import { uploadAvatar, uploadPostPhoto, uploadUserPostPhoto, validateImageType } from '../hooks/useUpload'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { BookingWithBarber } from '../hooks/useBooking'
import type { Post, UserPost } from '../types/supabase'
import type { ToastEvent } from '../components/Toast'

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
  if (h < 1)  return 'adesso'
  if (h < 24) return `${h} h fa`
  return `${Math.floor(h / 24)} g fa`
}

interface Props {
  userId?:   string
  isBarber?: boolean
  barberId?: string
  onToast?:  (t: ToastEvent | null) => void
}

const TODAY = new Date().toISOString().split('T')[0]

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function Profile({ userId, isBarber, barberId, onToast }: Props) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const postInputRef   = useRef<HTMLInputElement>(null)
  const [uploading,        setUploading]        = useState(false)
  const [ownPosts,         setOwnPosts]         = useState<Post[]>([])
  const [userPosts,        setUserPosts]        = useState<UserPost[]>([])
  const [showNewUserPost,  setShowNewUserPost]  = useState(false)
  const [showEditProfile,  setShowEditProfile]  = useState(false)
  const [selectedPostIdx, setSelectedPostIdx] = useState<number | null>(null)
  const [barberTab, setBarberTab] = useState<'posts' | 'reviews'>('posts')

  const { profile, updateAvatarUrl, updateProfile } = useProfile(userId)
  const follows  = useFollows(userId)
  const { bookings } = useClientBookings(isBarber ? undefined : userId)
  const { info: barberInfo } = useBarberInfo(isBarber ? barberId : undefined, isBarber ? userId : undefined)
  const { reviews: barberReviews, aggregate: reviewAggregate } =
    useReviews(isBarber ? barberId : undefined, undefined)

  useEffect(() => {
    if (!isBarber || !barberId || IS_DEMO) return
    supabase
      .from('posts')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOwnPosts((data ?? []) as Post[]))
  }, [isBarber, barberId])

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

  const isDemo = IS_DEMO || !userId
  const freshCutsCount = isDemo
    ? CUT_LOG.length
    : bookings.filter(b => b.status === 'done').length
  const barbersFollowedCount = isDemo
    ? 3
    : follows.filter(f => f.role === 'barber').length

  const [followerCount, setFollowerCount] = useState<number>(0)
  useEffect(() => {
    if (isDemo || !userId) { setFollowerCount(0); return }
    let cancelled = false
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followee_id', userId)
      .then(({ count }) => { if (!cancelled) setFollowerCount(count ?? 0) })
    return () => { cancelled = true }
  }, [userId, isDemo, follows.length])

  const displayName = profile.display_name ?? 'Utente'
  const avatarUrl   = profile.avatar_url
  const ini         = initials(displayName)

  const followingLine = isDemo
    ? 'Stai seguendo Marco, Fadi, Nico'
    : follows.length > 0
      ? `Stai seguendo ${follows.map(f => f.displayName?.split(' ')[0] ?? '?').join(', ')}`
      : (profile.bio ?? '')

  const pills: string[] = isDemo
    ? ['Skin fade', 'Beard', 'Line up']
    : follows.slice(0, 4).map(f => f.displayName?.split(' ')[0] ?? '?').filter(Boolean)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    try {
      const url = await uploadAvatar(file, userId)
      await updateAvatarUrl(url)
      onToast?.({ kind: 'success', title: 'Foto profilo aggiornata.' })
    } catch (err) {
      onToast?.({ kind: 'error', title: 'Caricamento foto fallito.', message: err instanceof Error ? err.message : undefined })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handlePostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !isBarber || !barberId || !userId) return
    setUploading(true)
    try {
      const url = await uploadPostPhoto(file, barberId)
      if (!IS_DEMO) {
        const { data } = await supabase
          .from('posts')
          .insert({ author_id: userId, barber_id: barberId, image_url: url, caption: null })
          .select()
          .single()
        if (data) setOwnPosts(prev => [data as Post, ...prev])
      } else {
        setOwnPosts(prev => [{
          id: crypto.randomUUID(), author_id: userId, barber_id: barberId,
          image_url: url, caption: null, label: null, likes_count: 0, comments_count: 0,
          tagged_profile_id: null,
          created_at: new Date().toISOString(),
        }, ...prev])
      }
      onToast?.({ kind: 'success', title: 'Post pubblicato.' })
    } catch (err) {
      onToast?.({ kind: 'error', title: 'Pubblicazione fallita.', message: err instanceof Error ? err.message : undefined })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function addUserPost(caption: string, label: string, file?: File): Promise<void> {
    if (!userId) throw new Error('Non sei autenticato')
    if (IS_DEMO) {
      setUserPosts(prev => [{
        id: crypto.randomUUID(), user_id: userId,
        image_url: file ? URL.createObjectURL(file) : '',
        caption, label, likes_count: 0,
        created_at: new Date().toISOString(),
      }, ...prev])
      return
    }
    if (!file) throw new Error('Nessuna foto selezionata')
    const imageUrl = await uploadUserPostPhoto(file, userId)
    const { data, error } = await supabase
      .from('user_posts')
      .insert({ user_id: userId, image_url: imageUrl, caption, label })
      .select()
      .single()
    if (error) throw new Error(`Caricamento fallito: ${error.message}`)
    if (data) setUserPosts(prev => [data as UserPost, ...prev])
  }

  const showBarberPosts     = isBarber && !isDemo
  const showDemoBarberPosts = isBarber && isDemo
  const showClientPosts     = !isBarber && !isDemo
  const showDemoPosts       = !isBarber && isDemo

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', color: C.text }}>
          Profilo
        </span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {!isBarber && (
            <button onClick={() => !uploading && setShowNewUserPost(true)} aria-label="Nuovo post" style={iconBtn()}>
              <Icon name="plus" size={22} color={C.muted} />
            </button>
          )}
          {!isDemo && (
            <button onClick={() => setShowEditProfile(true)} aria-label="Impostazioni profilo" style={iconBtn()}>
              <Icon name="settings" size={22} color={C.muted} />
            </button>
          )}
        </div>
      </div>

      {/* Hero card */}
      <div style={{ margin: '0 20px 16px', padding: 18, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => !uploading && avatarInputRef.current?.click()}
          >
            <Avatar initials={ini} size={72} ring photo={avatarUrl ?? null} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: C.text, border: `2px solid ${C.bg}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="image" size={11} color={C.bg} />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                padding: '3px 9px', borderRadius: 9999,
                background: isBarber ? C.accentLight : C.surfaceAlt,
                color: isBarber ? C.accentDeep : C.muted,
                fontSize: 11, fontWeight: 500,
              }}>
                {isBarber ? 'Barbiere' : 'Cliente'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em', color: C.text }}>
              {displayName}
            </div>
            {followingLine !== '' && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {followingLine}
              </div>
            )}
          </div>
        </div>

        {pills.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pills.map(p => (
              <span key={p} style={{
                fontSize: 11, fontWeight: 500,
                padding: '3px 9px', borderRadius: 9999,
                background: C.bg, color: C.muted,
                border: `1px solid ${C.border}`,
              }}>
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Stat value={String(freshCutsCount)} label="Tagli" />
          <Stat value={String(barbersFollowedCount)} label="Barbieri" />
          <Stat value={String(followerCount)} label="Follower" />
        </div>
      </div>

      {/* Barber info row */}
      {isBarber && (barberInfo.shop_name || barberInfo.address || barberInfo.phone || barberInfo.social_link) && (
        <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)' }}>
          {barberInfo.shop_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text, marginBottom: 4 }}>
              <Icon name="shop" size={14} color={C.muted} />
              <span style={{ fontWeight: 600 }}>{barberInfo.shop_name}</span>
            </div>
          )}
          {barberInfo.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
              <Icon name="pin" size={14} />
              <span>{barberInfo.address}</span>
            </div>
          )}
          {(barberInfo.phone || barberInfo.social_link) && (
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              {barberInfo.phone && (
                <a href={`tel:${barberInfo.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>
                  <Icon name="phone" size={14} />
                  <span>{barberInfo.phone}</span>
                </a>
              )}
              {barberInfo.social_link && (
                <a href={barberInfo.social_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.accent, textDecoration: 'none' }}>
                  <i className={`ph-thin ${barberInfo.social_link.includes('instagram') ? 'ph-instagram-logo' : barberInfo.social_link.includes('tiktok') ? 'ph-tiktok-logo' : 'ph-globe'}`} style={{ fontSize: 14 }} />
                  <span>Social</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barber-only tab bar */}
      {isBarber && (
        <div style={{ display: 'flex', padding: '0 20px', borderBottom: `1px solid ${C.border}` }}>
          {([
            ['posts',   'Post'],
            ['reviews', `Recensioni${reviewAggregate.count > 0 ? ` · ${reviewAggregate.count}` : ''}`],
          ] as ['posts' | 'reviews', string][]).map(([id, label]) => {
            const active = barberTab === id
            return (
              <button
                key={id}
                onClick={() => setBarberTab(id)}
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
      )}

      {(!isBarber || barberTab === 'posts') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: isBarber ? 0 : 4 }}>
          {showBarberPosts     && <OwnPostGrid posts={ownPosts} onPostClick={setSelectedPostIdx} />}
          {showDemoBarberPosts && <DemoBarberPostGrid onPostClick={setSelectedPostIdx} />}
          {showClientPosts     && <UserPostGrid posts={userPosts} onPostClick={setSelectedPostIdx} />}
          {showDemoPosts       && <DemoPostGrid />}
        </div>
      )}

      {isBarber && barberTab === 'reviews' && (
        <ReviewsList
          reviews={barberReviews}
          aggregate={reviewAggregate}
        />
      )}

      {(isDemo || upcoming.length > 0) && (
        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text, marginBottom: 10 }}>
            Il tuo appuntamento
          </div>
          {isDemo ? <DemoUpcoming /> : <RealUpcoming bookings={upcoming.slice(0, 1)} />}
        </div>
      )}

      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
      <input ref={postInputRef}   type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePostChange} />
    </div>

    {selectedPostIdx !== null && isBarber && (
      <ProfilePostsFeed
        posts={showDemoBarberPosts
          ? POSTS.map(p => ({ id: String(p.id), image_url: p.imageUrl ?? '', caption: p.caption, label: p.label, likes_count: p.likes, created_at: new Date().toISOString() }))
          : ownPosts
        }
        startIdx={selectedPostIdx}
        authorName={displayName}
        onClose={() => setSelectedPostIdx(null)}
      />
    )}
    {selectedPostIdx !== null && !isBarber && showClientPosts && userPosts.length > 0 && (
      <ProfilePostsFeed
        posts={userPosts}
        startIdx={selectedPostIdx}
        authorName={displayName}
        title="I miei tagli"
        onClose={() => setSelectedPostIdx(null)}
      />
    )}

    {showNewUserPost && (
      <NewUserPostSheet
        onAdd={async (caption, label, file) => {
          await addUserPost(caption, label, file)
          setShowNewUserPost(false)
        }}
        onClose={() => setShowNewUserPost(false)}
      />
    )}

    {showEditProfile && (
      <EditProfileSheet
        initial={{ display_name: displayName, bio: profile.bio ?? '' }}
        onSave={async ({ display_name, bio }) => {
          await updateProfile({ display_name, bio: bio || null })
        }}
        onClose={() => setShowEditProfile(false)}
      />
    )}
    </div>
  )
}

function iconBtn(): React.CSSProperties {
  return { background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, lineHeight: 1, color: C.text, letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>{label}</span>
    </div>
  )
}

/* ---- Post grids -------------------------------------------------------- */

function OwnPostGrid({ posts, onPostClick }: { posts: PostLike[]; onPostClick: (i: number) => void }) {
  return (
    <>
      {posts.map((post, i) => (
        <GridCell key={post.id} src={post.image_url} label={post.label} onClick={() => onPostClick(i)} />
      ))}
    </>
  )
}

function UserPostGrid({ posts, onPostClick }: { posts: UserPost[]; onPostClick: (i: number) => void }) {
  if (posts.length === 0) {
    return (
      <div style={{ gridColumn: '1 / -1', padding: '48px 28px', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Icon name="plus" size={20} color={C.hint} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.015em', color: C.text }}>
          Nessun post
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
          Tocca la fotocamera per aggiungere il tuo primo taglio.
        </div>
      </div>
    )
  }
  return (
    <>
      {posts.map((post, i) => (
        <GridCell key={post.id} src={post.image_url} label={post.label} onClick={() => onPostClick(i)} />
      ))}
    </>
  )
}

function DemoBarberPostGrid({ onPostClick }: { onPostClick: (i: number) => void }) {
  return (
    <>
      {POSTS.map((post, i) => (
        <GridCell key={post.id} src={post.imageUrl ?? null} label={post.label} onClick={() => onPostClick(i)} />
      ))}
    </>
  )
}

function DemoPostGrid() {
  return (
    <>
      {CUT_LOG.map((cut, i) => (
        <GridCell key={i} src={null} label={cut.date} />
      ))}
    </>
  )
}

function GridCell({ src, label, onClick }: { src?: string | null; label?: string | null; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      aspectRatio: '1', cursor: onClick ? 'pointer' : 'default',
      overflow: 'hidden', position: 'relative', background: C.surfaceAlt,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <PhotoImage src={src} tone="soft" />
        : <Icon name="scissors" size={26} color={C.hint} />
      }
      {label && (
        <div style={{
          position: 'absolute', bottom: 6, left: 6, right: 6,
          fontSize: 10, color: C.bg, fontWeight: 500,
          background: 'rgba(20,17,13,0.55)',
          padding: '2px 8px', borderRadius: 9999,
          textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
      )}
    </div>
  )
}

/* ---- Upcoming appointments ------------------------------------------- */

function DemoUpcoming() {
  return (
    <>
      {DEMO_UPCOMING.slice(0, 1).map((appt, i) => {
        const b = BARBERS.find(br => br.name === appt.barber)!
        return (
          <div key={i} style={apptCard}>
            <Avatar initials={b.initials} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{appt.barber}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{appt.date} · {appt.time}</div>
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
        const name = b.barbers?.profile?.display_name ?? 'Barbiere'
        return (
          <div key={b.id} style={apptCard}>
            <Avatar initials={initials(name)} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{name}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{fmtDate(b.date)} · {b.time_slot}</div>
            </div>
            <StatusPill status={b.status} />
          </div>
        )
      })}
    </>
  )
}

const STATUS_LABEL_IT: Record<string, string> = {
  pending:   'In attesa',
  confirmed: 'Confermato',
  done:      'Completato',
  cancelled: 'Annullato',
}

function StatusPill({ status, tag }: { status: string; tag?: string }) {
  const label = tag ?? STATUS_LABEL_IT[status] ?? status
  const styles = status === 'confirmed'
    ? { bg: C.greenSoft, fg: C.green }
    : status === 'pending'
      ? { bg: C.accentLight, fg: C.accentDeep }
      : status === 'cancelled'
        ? { bg: C.redSoft, fg: C.red }
        : { bg: C.surfaceAlt, fg: C.muted }
  return (
    <span style={{ fontSize: 11, background: styles.bg, color: styles.fg, padding: '3px 9px', borderRadius: 9999, fontWeight: 500 }}>{label}</span>
  )
}

/* ---- Posts feed overlay ---------------------------------------------- */

function ProfilePostsFeed({ posts, startIdx, authorName, title = 'I miei post', onClose }: {
  posts:    PostLike[]
  startIdx: number
  authorName: string
  title?:   string
  onClose:  () => void
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
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>{title}</span>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        {posts.map((post, i) => (
          <div key={post.id} ref={el => { itemRefs.current[i] = el }}>
            <PostMedia imageUrl={post.image_url ?? undefined}>
              {post.label && (
                <div style={{
                  position: 'absolute', bottom: 12, left: 16,
                  background: 'rgba(20,17,13,0.65)', color: 'var(--paper-3)',
                  fontSize: 11, padding: '4px 10px', borderRadius: 9999, fontWeight: 500,
                }}>
                  {post.label}
                </div>
              )}
            </PostMedia>
            <div style={{ padding: '12px 20px 16px' }}>
              <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600 }}>{authorName}</span>{' '}{post.caption ?? ''}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                {post.likes_count.toLocaleString('it-IT')} mi piace · {timeAgoStr(post.created_at)}
              </div>
            </div>
            {i < posts.length - 1 && <div style={{ height: 1, background: C.border }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- New user post sheet --------------------------------------------- */

function NewUserPostSheet({
  onAdd, onClose,
}: {
  onAdd:   (caption: string, label: string, file?: File) => Promise<void>
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
      setPostError(err instanceof Error ? err.message : 'File non valido')
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
      setPostError(err instanceof Error ? err.message : 'Caricamento fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 100, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Nuovo taglio
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 140, background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          {preview ? (
            <>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: SOFT_PHOTO_FILTER }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,17,13,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Icon name="image" size={22} color={C.bg} />
                <span style={{ fontSize: 12, color: C.bg }}>Tocca per cambiare</span>
              </div>
            </>
          ) : (
            <>
              <Icon name="plus" size={28} color={C.hint} />
              <span style={{ fontSize: 12.5, color: C.muted }}>
                {IS_DEMO ? 'Tocca per aggiungere una foto' : 'Tocca per aggiungere una foto (richiesta)'}
              </span>
            </>
          )}
        </div>
        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Didascalia…"
            rows={3}
            style={{ padding: '11px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${C.border}`, fontSize: 13.5, background: C.surfaceAlt, color: C.text, outline: 'none', fontFamily: 'inherit', resize: 'none' }}
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Etichetta stile (es. Skin fade + line up)"
            style={{ padding: '11px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${C.border}`, fontSize: 13.5, background: C.surfaceAlt, color: C.text, outline: 'none', fontFamily: 'inherit' }}
          />
          {postError && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '8px 12px', background: C.redSoft, borderRadius: 'var(--r-md)' }}>{postError}</div>
          )}
          <button
            onClick={handlePost}
            disabled={!canPost || loading}
            style={{
              padding: 13, borderRadius: 'var(--r-md)',
              background: canPost && !loading ? C.text : C.surface,
              color:      canPost && !loading ? C.bg : C.hint,
              border: `1px solid ${canPost && !loading ? C.text : C.border}`,
              fontSize: 14, fontWeight: 500,
              cursor: canPost && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Pubblicazione…</>
              : 'Pubblica'}
          </button>
        </div>
      </div>
    </div>
  )
}

const apptCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '14px',
  background: C.surface, borderRadius: 'var(--r-md)',
  border: `1px solid ${C.border}`,
}
