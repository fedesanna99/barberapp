import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, CUT_LOG, UPCOMING as DEMO_UPCOMING } from '../lib/demoData'
import { useClientBookings } from '../hooks/useBooking'
import { useFeed } from '../hooks/useFeed'
import type { BookingWithBarber } from '../hooks/useBooking'
import type { PostWithBarber } from '../types/supabase'

interface Props {
  userId?: string
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

export function Profile({ userId }: Props) {
  const { bookings } = useClientBookings(userId)
  const { posts }    = useFeed(userId)

  const upcoming = bookings.filter(b => b.date >= TODAY && b.status !== 'cancelled')
  const past     = bookings.filter(b => b.date <  TODAY && b.status === 'done')

  // Fall back to demo data when no real data is available
  const showDemoUpcoming = upcoming.length === 0
  const showDemoPosts    = posts.length === 0

  const upcomingCount = showDemoUpcoming ? DEMO_UPCOMING.length : upcoming.length
  const pastCount     = showDemoPosts    ? CUT_LOG.length       : past.length

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>My cuts</span>
        <i className="ti ti-settings" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
      </div>

      {/* Hero */}
      <div style={{ padding: '16px 16px 12px', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: C.accentLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 500, color: C.accent,
          margin: '0 auto 12px', border: `2px solid ${C.accent}`,
        }}>
          AG
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, color: C.text }}>Andrea G.</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Following Marco, Fadi, Nico</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Skin fade', 'Beard', 'Line up'].map(t => (
            <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.surface, color: C.muted, border: `0.5px solid ${C.border}` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`, marginBottom: 16 }}>
        {[
          [String(pastCount),     'Cuts logged'],
          ['3',                   'Barbers'],
          [String(upcomingCount), 'Upcoming'],
        ].map(([val, label], i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: C.text }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Cut photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {showDemoPosts
          ? <DemoPostGrid />
          : <RealPostGrid posts={posts} />
        }
        {/* Add cell */}
        <div style={{
          aspectRatio: '1', background: C.surface,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', gap: 4, border: `0.5px dashed ${C.borderMed}`,
        }}>
          <i className="ti ti-plus" style={{ fontSize: 24, color: C.hint }} />
          <span style={{ fontSize: 9, color: C.hint }}>Add cut</span>
        </div>
      </div>

      {/* Upcoming appointments */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ padding: '0 0 8px', fontSize: 13, fontWeight: 500, color: C.text }}>Upcoming appointments</div>
        {showDemoUpcoming
          ? <DemoUpcoming />
          : <RealUpcoming bookings={upcoming} />
        }
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

function RealPostGrid({ posts }: { posts: PostWithBarber[] }) {
  return (
    <>
      {posts.slice(0, 8).map(post => {
        const name = post.barbers?.profile?.display_name ?? null
        return (
          <div key={post.id} style={{
            aspectRatio: '1', cursor: 'pointer', overflow: 'hidden',
            position: 'relative', background: C.surface,
            ...(post.image_url
              ? { backgroundImage: `url(${post.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { display: 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}>
            {!post.image_url && (
              <i className="ti ti-scissors" style={{ fontSize: 30, color: C.hint, opacity: 0.4 }} />
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '16px 4px 5px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
              textAlign: 'center',
            }}>
              {name && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>{name}</div>}
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
      {DEMO_UPCOMING.map((appt, i) => {
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
  if (bookings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: C.hint, fontSize: 13 }}>
        <i className="ti ti-calendar-off" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
        No upcoming appointments
      </div>
    )
  }
  return (
    <>
      {bookings.map(b => {
        const name = b.barbers?.profile?.display_name ?? 'Barber'
        const ini  = initials(name)
        return (
          <div key={b.id} style={apptCard}>
            <Avatar initials={ini} size={38} accent={C.accent} />
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
  const bg    = status === 'confirmed' ? C.accentLight  : status === 'pending' ? 'rgba(29,158,117,0.1)' : C.surface
  const color = status === 'confirmed' ? C.accent       : status === 'pending' ? C.green                : C.hint
  return (
    <span style={{ fontSize: 10, background: bg, color, padding: '3px 8px', borderRadius: 20 }}>
      {label}
    </span>
  )
}

const apptCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 12px',
  background: C.surface, borderRadius: 12, marginBottom: 8,
  border: `0.5px solid ${C.border}`,
}
