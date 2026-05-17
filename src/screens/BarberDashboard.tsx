import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { IS_DEMO } from '../lib/supabase'
import {
  DEMO_BARBER_BOOKINGS, DEMO_AVAIL,
  type DemoBarberBooking, type DemoAvailRow,
} from '../lib/demoData'
import { useBarberBookings, useBooking, type BookingWithClient } from '../hooks/useBooking'
import { useAvailabilitySettings } from '../hooks/useAvailabilitySettings'

type DashTab = 'bookings' | 'availability'

interface BookingRow {
  id: string
  clientName: string
  clientInitials: string
  dateLabel: string
  timeLabel: string
  tag?: string
  status: string
}

const TODAY = new Date().toISOString().split('T')[0]
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]

function fmtDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function toRow(b: BookingWithClient): BookingRow {
  const name = b.profiles?.display_name ?? 'Client'
  return { id: b.id, clientName: name, clientInitials: initials(name), dateLabel: fmtDate(b.date), timeLabel: b.time_slot, status: b.status }
}

function demoToRow(b: DemoBarberBooking): BookingRow {
  return { id: b.id, clientName: b.client, clientInitials: b.initials, dateLabel: b.date, timeLabel: b.time, tag: b.service, status: b.status }
}

// ── Main ──────────────────────────────────────────────────────────────────

export function BarberDashboard({ barberId }: { barberId?: string }) {
  const [tab, setTab] = useState<DashTab>('bookings')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0', flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Dashboard</span>
        <i className="ti ti-settings" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
      </div>

      <div style={{ display: 'flex', padding: '10px 16px 0', gap: 8, flexShrink: 0 }}>
        {(['bookings', 'availability'] as DashTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t ? C.accent : C.surface,
              color:      tab === t ? '#fff'   : C.muted,
              transition: 'background .15s, color .15s',
            }}
          >
            {t === 'bookings' ? 'Bookings' : 'Availability'}
          </button>
        ))}
      </div>

      {tab === 'bookings'
        ? <BookingsTab barberId={barberId} />
        : <AvailabilityTab barberId={barberId} />
      }
    </div>
  )
}

// ── Bookings tab ──────────────────────────────────────────────────────────

const DEMO_PENDING: DemoBarberBooking = { id: 'b0', client: 'Giulio M.', initials: 'GM', date: 'Mon 19 May', time: '08:30', service: 'Fade', status: 'pending' }

function BookingsTab({ barberId }: { barberId?: string }) {
  const isDemo = IS_DEMO || !barberId
  const { bookings: real } = useBarberBookings(barberId)
  const { cancelBooking, confirmBooking, markDone } = useBooking()
  const [demoList, setDemoList] = useState<DemoBarberBooking[]>([DEMO_PENDING, ...DEMO_BARBER_BOOKINGS])
  const [autoAccept, setAutoAccept] = useState(false)

  const pending = isDemo
    ? demoList.filter(b => b.status === 'pending').map(demoToRow)
    : real.filter(b => b.status === 'pending').map(toRow)

  const upcoming = isDemo
    ? demoList.filter(b => b.status === 'confirmed').map(demoToRow)
    : real.filter(b => b.status === 'confirmed' && b.date >= TODAY).map(toRow)

  useEffect(() => {
    if (!autoAccept) return
    if (isDemo) {
      setDemoList(prev => prev.map(b => b.status === 'pending' ? { ...b, status: 'confirmed' as const } : b))
    } else {
      real.filter(b => b.status === 'pending').forEach(b => confirmBooking(b.id))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, isDemo])

  useEffect(() => {
    if (!autoAccept || isDemo) return
    real.filter(b => b.status === 'pending').forEach(b => confirmBooking(b.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real])

  function demoAction(id: string, action: 'done' | 'cancel' | 'confirm') {
    if (action === 'cancel') {
      setDemoList(prev => prev.filter(b => b.id !== id))
    } else if (action === 'confirm') {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b))
    } else {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'done' as const } : b))
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 14px' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Auto-accept</span>
          <span style={{ fontSize: 11, color: C.hint, display: 'block', marginTop: 1 }}>New bookings confirm instantly</span>
        </div>
        <Toggle on={autoAccept} onChange={() => setAutoAccept(v => !v)} />
      </div>
      <Section label="Pending" count={pending.length}>
        {pending.length === 0
          ? <EmptyState icon="ti-clock" text="No pending requests" />
          : pending.map(r => (
              <BookingCard key={r.id} row={r}
                onConfirm={() => isDemo ? demoAction(r.id, 'confirm') : confirmBooking(r.id)}
                onDecline={() => isDemo ? demoAction(r.id, 'cancel')  : cancelBooking(r.id)}
              />
            ))
        }
      </Section>
      <Section label="Upcoming" count={upcoming.length}>
        {upcoming.length === 0
          ? <EmptyState icon="ti-calendar-off" text="No upcoming appointments" />
          : upcoming.map(r => (
              <BookingCard key={r.id} row={r}
                onMarkDone={() => isDemo ? demoAction(r.id, 'done')   : markDone(r.id)}
                onCancel={() => isDemo   ? demoAction(r.id, 'cancel') : cancelBooking(r.id)}
              />
            ))
        }
      </Section>
    </div>
  )
}

// ── Availability tab ──────────────────────────────────────────────────────

function AvailabilityTab({ barberId }: { barberId?: string }) {
  const isDemo = IS_DEMO || !barberId
  const { rows: real, upsertDay, removeDay } = useAvailabilitySettings(barberId)
  const [demoRows, setDemoRows] = useState<DemoAvailRow[]>(DEMO_AVAIL)

  const rows = isDemo ? demoRows : real

  function getRow(dow: number) {
    return rows.find(r => r.day_of_week === dow)
  }

  function handleToggle(dow: number) {
    if (getRow(dow)) {
      if (isDemo) setDemoRows(prev => prev.filter(r => r.day_of_week !== dow))
      else        removeDay(dow)
    } else {
      handleSave(dow, '09:00', '18:00')
    }
  }

  function handleSave(dow: number, start: string, end: string) {
    if (isDemo) {
      setDemoRows(prev => {
        const idx = prev.findIndex(r => r.day_of_week === dow)
        const next = { day_of_week: dow, start_time: start, end_time: end }
        return idx >= 0 ? prev.map((r, i) => (i === idx ? next : r)) : [...prev, next]
      })
    } else {
      upsertDay(dow, start, end)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
      <p style={{ fontSize: 12, color: C.hint, margin: '10px 0 8px' }}>
        Your weekly schedule — clients can only book within active windows.
      </p>
      {DOW_ORDER.map(dow => {
        const row = getRow(dow)
        return (
          <DayRow
            key={dow}
            dayName={DAY_NAMES[dow]}
            active={!!row}
            startTime={row?.start_time ?? '09:00'}
            endTime={row?.end_time ?? '18:00'}
            onToggle={() => handleToggle(dow)}
            onSave={(s, e) => handleSave(dow, s, e)}
          />
        )
      })}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: C.accent, borderRadius: 20, padding: '1px 7px' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '14px 0', color: C.hint }}>
      <i className={`ti ${icon}`} style={{ fontSize: 20, display: 'block', marginBottom: 4 }} />
      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
}

function BookingCard({
  row, onConfirm, onDecline, onMarkDone, onCancel,
}: {
  row: BookingRow
  onConfirm?: () => void
  onDecline?: () => void
  onMarkDone?: () => void
  onCancel?: () => void
}) {
  const isPending = row.status === 'pending'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 12, marginBottom: 8,
      background: C.surface, border: `0.5px solid ${C.border}`,
    }}>
      <Avatar initials={row.clientInitials} size={36} accent={C.accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.clientName}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
          {row.dateLabel} · {row.timeLabel}
          {row.tag && <span style={{ marginLeft: 6, color: C.accent, fontWeight: 500 }}>{row.tag}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {isPending ? (
          <>
            <Btn icon="ti-x"     color={C.red}   ghost onClick={onDecline} />
            <Btn icon="ti-check" color={C.green}       onClick={onConfirm} />
          </>
        ) : (
          <>
            <Btn icon="ti-trash" color={C.hint}  ghost onClick={onCancel} />
            <Btn label="Done"    color={C.green} ghost onClick={onMarkDone} />
          </>
        )}
      </div>
    </div>
  )
}

function Btn({ icon, label, color, ghost, onClick }: {
  icon?: string; label?: string; color: string; ghost?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30, minWidth: 30, borderRadius: 8,
        border: ghost ? `1px solid ${color}` : 'none',
        background: ghost ? 'transparent' : color,
        color: ghost ? color : '#fff',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4, padding: label ? '0 10px' : '0',
        fontSize: label ? 11 : 14, fontWeight: 600, fontFamily: 'inherit',
      }}
    >
      {icon  && <i className={`ti ${icon}`} />}
      {label}
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? C.accent : C.borderMed,
        cursor: 'pointer', position: 'relative',
        transition: 'background .2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 4, left: on ? 20 : 4,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
      }} />
    </div>
  )
}

function DayRow({
  dayName, active, startTime, endTime, onToggle, onSave,
}: {
  dayName: string
  active: boolean
  startTime: string
  endTime: string
  onToggle: () => void
  onSave: (start: string, end: string) => void
}) {
  const [start, setStart] = useState(startTime)
  const [end,   setEnd]   = useState(endTime)

  useEffect(() => { setStart(startTime) }, [startTime])
  useEffect(() => { setEnd(endTime) }, [endTime])

  const dirty = active && (start !== startTime || end !== endTime)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 0', borderBottom: `0.5px solid ${C.border}`,
    }}>
      <span style={{ width: 32, fontSize: 13, fontWeight: 500, color: active ? C.text : C.hint, flexShrink: 0 }}>
        {dayName}
      </span>
      <Toggle on={active} onChange={onToggle} />
      {active ? (
        <>
          <input
            type="time" value={start}
            onChange={e => setStart(e.target.value)}
            style={timeInputStyle}
          />
          <span style={{ fontSize: 12, color: C.hint }}>–</span>
          <input
            type="time" value={end}
            onChange={e => setEnd(e.target.value)}
            style={timeInputStyle}
          />
          {dirty && (
            <button
              onClick={() => onSave(start, end)}
              style={{
                height: 26, padding: '0 10px', borderRadius: 7,
                border: 'none', background: C.accent, color: '#fff',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                marginLeft: 'auto', flexShrink: 0,
              }}
            >
              Save
            </button>
          )}
        </>
      ) : (
        <span style={{ fontSize: 12, color: C.hint }}>Off</span>
      )}
    </div>
  )
}

const timeInputStyle: React.CSSProperties = {
  height: 28, width: 76, borderRadius: 8,
  border: `1px solid ${C.borderMed}`,
  background: C.surface, color: C.text,
  fontSize: 12, padding: '0 6px', fontFamily: 'inherit',
  outline: 'none', flexShrink: 0,
}
