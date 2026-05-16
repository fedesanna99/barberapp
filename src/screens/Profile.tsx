import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, CUT_LOG } from '../lib/demoData'

const UPCOMING = [
  { barber: 'Marco Barba', date: 'Sat 24 May',  time: '10:00', tag: 'Skin fade'  },
  { barber: 'Fadi Nour',   date: 'Mon 2 Jun',   time: '11:30', tag: 'Beard trim' },
]

export function Profile() {
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
        {[['14', 'Cuts logged'], ['3', 'Barbers'], ['2', 'Upcoming']].map(([val, label], i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderLeft: i > 0 ? `0.5px solid ${C.border}` : 'none' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: C.text }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Cut photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {CUT_LOG.map((cut, i) => {
          const b = BARBERS.find(br => br.name === cut.barber)
          return (
            <div key={i} style={{
              aspectRatio: '1',
              background:  b ? b.accent + '18' : C.surface,
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
        {/* Add cell */}
        <div style={{
          aspectRatio: '1',
          background: C.surface,
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
        {UPCOMING.map((appt, i) => {
          const b = BARBERS.find(br => br.name === appt.barber)!
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: C.surface, borderRadius: 12, marginBottom: 8,
              border: `0.5px solid ${C.border}`,
            }}>
              <Avatar initials={b.initials} size={38} accent={b.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{appt.barber}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{appt.date} · {appt.time}</div>
              </div>
              <span style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: '3px 8px', borderRadius: 20 }}>
                {appt.tag}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
