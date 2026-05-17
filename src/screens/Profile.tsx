import { useRef, useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, POSTS, CUT_LOG, UPCOMING as DEMO_UPCOMING } from '../lib/demoData'
import { useClientBookings } from '../hooks/useBooking'
import { useProfile } from '../hooks/useProfile'
import { useFollows } from '../hooks/useFollows'
import { uploadAvatar, uploadPostPhoto } from '../hooks/useUpload'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { BookingWithBarber } from '../hooks/useBooking'
import type { Post } from '../types/supabase'

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
  const [uploading, setUploading] = useState(false)
  const [ownPosts,  setOwnPosts]  = useState<Post[]>([])
  const [localCuts, setLocalCuts] = useState<{ id: string; url: string }[]>([])

  const { profile, updateAvatarUrl } = useProfile(userId)
  const follows  = useFollows(userId)
  const { bookings } = useClientBookings(isBarber ? undefined : userId)

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
    try {
      const url = await uploadAvatar(file, userId)
      await updateAvatarUrl(url)
    } catch { /* silent */ }
    setUploading(false)
    e.target.value = ''
  }

  async function handlePostChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      if (isBarber && barberId) {
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
      } else {
        // Client: local-only cut preview
        const url = URL.createObjectURL(file)
        setLocalCuts(prev => [{ id: crypto.randomUUID(), url }, ...prev])
      }
    } catch { /* silent */ }
    setUploading(false)
    e.target.value = ''
  }

  const showBarberPosts     = isBarber && !isDemo
  const showDemoBarberPosts = isBarber && isDemo
  const showClientPosts     = !isBarber && localCuts.length > 0
  const showDemoPosts       = !isBarber && localCuts.length === 0

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>My cuts</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {!isBarber && (
            <i
              className="ti ti-camera-plus"
              onClick={() => !uploading && postInputRef.current?.click()}
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
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, marginBottom: 16 }}>
        {([
          [String(cutsCount),     'Cuts logged'],
          [String(barbersCount),  'Barbers'],
          [String(upcomingCount), 'Upcoming'],
        ] as [string, string][]).map(([val, label], i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: C.text }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Cut / post photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {showBarberPosts     && <OwnPostGrid posts={ownPosts} />}
        {showDemoBarberPosts && <DemoBarberPostGrid />}
        {showClientPosts && <ClientGrid localCuts={localCuts} />}
        {showDemoPosts   && <DemoPostGrid />}
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

      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      <input ref={postInputRef}   type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePostChange} />
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OwnPostGrid({ posts }: { posts: Post[] }) {
  return (
    <>
      {posts.slice(0, 8).map(post => (
        <div
          key={post.id}
          style={{
            aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
            position: 'relative', background: C.surface,
            ...(post.image_url
              ? { backgroundImage: `url(${post.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { display: 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}
        >
          {!post.image_url && <i className="ti ti-scissors" style={{ fontSize: 30, color: C.hint, opacity: 0.4 }} />}
        </div>
      ))}
    </>
  )
}

function ClientGrid({ localCuts }: { localCuts: { id: string; url: string }[] }) {
  return (
    <>
      {localCuts.map(cut => (
        <div
          key={cut.id}
          style={{
            aspectRatio: '1', overflow: 'hidden', position: 'relative', cursor: 'pointer',
            backgroundImage: `url(${cut.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
      ))}
    </>
  )
}

function DemoBarberPostGrid() {
  return (
    <>
      {POSTS.map(post => {
        const barber = BARBERS.find(b => b.id === post.barberId)!
        return (
          <div key={post.id} style={{
            aspectRatio: '1', background: barber.accent + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: 'pointer', overflow: 'hidden',
          }}>
            <i className="ti ti-scissors" style={{ fontSize: 30, color: barber.accent, opacity: 0.4 }} />
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

const apptCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 12px',
  background: C.surface, borderRadius: 12, marginBottom: 8,
  border: `0.5px solid ${C.border}`,
}
