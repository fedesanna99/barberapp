import { useState, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { IS_DEMO } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import {
  DEMO_BARBER_BOOKINGS, DEMO_AVAIL,
  type DemoBarberBooking, type DemoAvailRow,
} from '../lib/demoData'
import { useBarberBookings, useBooking, type BookingWithClient } from '../hooks/useBooking'
import { useAvailabilitySettings } from '../hooks/useAvailabilitySettings'
import { useAutoAccept } from '../hooks/useAutoAccept'

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

const d = new Date()
const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const { bookings: real, refetch } = useBarberBookings(barberId)
  const { cancelBooking, confirmBooking, markDone } = useBooking()
  const [demoList, setDemoList] = useState<DemoBarberBooking[]>([DEMO_PENDING, ...DEMO_BARBER_BOOKINGS])
  const [actionError, setActionError] = useState<string | null>(null)
  const { autoAccept, setAutoAccept } = useAutoAccept(isDemo ? undefined : barberId)

  const pending = isDemo
    ? demoList.filter(b => b.status === 'pending').map(demoToRow)
    : real.filter(b => b.status === 'pending').map(toRow)

  const upcoming = isDemo
    ? demoList.filter(b => b.status === 'confirmed').map(demoToRow)
    : real.filter(b => (b.status === 'confirmed' || b.status === 'done') && b.date >= TODAY).map(toRow)

  useEffect(() => {
    if (!autoAccept) return
    if (isDemo) {
      setDemoList(prev => prev.map(b => b.status === 'pending' ? { ...b, status: 'confirmed' as const } : b))
    } else {
      real.filter(b => b.status === 'pending').forEach(b => confirmBooking(b.id).then(({ error }) => {
        if (error) setActionError(`Auto-accept fallito: ${error.message}`)
        else refetch()
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAccept, isDemo])

  useEffect(() => {
    if (!autoAccept || isDemo) return
    real.filter(b => b.status === 'pending').forEach(b => confirmBooking(b.id).then(({ error }) => {
      if (error) setActionError(`Auto-accept fallito: ${error.message}`)
      else refetch()
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real])

  function demoAction(id: string, action: 'done' | 'cancel' | 'confirm') {
    const booking = demoList.find(b => b.id === id)
    const clientName = booking?.client ?? 'cliente'
    if (action === 'cancel') {
      setDemoList(prev => prev.filter(b => b.id !== id))
      writeLog('booking.cancelled', `Prenotazione di ${clientName} annullata dal barbiere`, 'info', { metadata: { booking_id: id } })
    } else if (action === 'confirm') {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b))
      writeLog('booking.confirmed', `Prenotazione di ${clientName} confermata`, 'info', { metadata: { booking_id: id } })
    } else {
      setDemoList(prev => prev.map(b => b.id === id ? { ...b, status: 'done' as const } : b))
      writeLog('booking.done', `Prenotazione di ${clientName} completata`, 'info', { metadata: { booking_id: id } })
    }
  }

  function act(id: string, action: 'confirm' | 'cancel' | 'done') {
    if (isDemo) { demoAction(id, action); return }
    const call = action === 'confirm' ? confirmBooking : action === 'cancel' ? cancelBooking : markDone
    const actionLabel = action === 'confirm' ? 'booking.confirmed' : action === 'cancel' ? 'booking.cancelled' : 'booking.done'
    const actionMsg   = action === 'confirm' ? 'Prenotazione confermata' : action === 'cancel' ? 'Prenotazione annullata' : 'Prenotazione completata'
    setActionError(null)
    call(id).then(({ error }) => {
      if (error) { setActionError(error.message); return }
      writeLog(actionLabel, actionMsg, 'info', { metadata: { booking_id: id } })
      refetch()
    })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
      {actionError && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#FEE2E2', color: '#B91C1C', fontSize: 12 }}>
          {actionError}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 14px' }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Auto-accept</span>
          <span style={{ fontSize: 11, color: C.hint, display: 'block', marginTop: 1 }}>New bookings confirm instantly</span>
        </div>
        <Toggle on={autoAccept} onChange={() => setAutoAccept(!autoAccept)} />
      </div>
      <Section label="Pending" count={pending.length}>
        {pending.length === 0
          ? <EmptyState icon="ti-clock" text="No pending requests" />
          : pending.map(r => (
              <BookingCard key={r.id} row={r}
                onConfirm={() => act(r.id, 'confirm')}
                onDecline={() => act(r.id, 'cancel')}
              />
            ))
        }
      </Section>
      <Section label="Upcoming" count={upcoming.length}>
        {upcoming.length === 0
          ? <EmptyState icon="ti-calendar-off" text="No upcoming appointments" />
          : upcoming.map(r => (
              <BookingCard key={r.id} row={r}
                onMarkDone={r.status === 'confirmed' ? () => act(r.id, 'done') : undefined}
                onCancel={() => act(r.id, 'cancel')}
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

  function handleSave(dow: number, start: string, end: string, bStart?: string, bEnd?: string) {
    if (isDemo) {
      setDemoRows(prev => {
        const idx = prev.findIndex(r => r.day_of_week === dow)
        const next = { day_of_week: dow, start_time: start, end_time: end, break_start: bStart, break_end: bEnd }
        return idx >= 0 ? prev.map((r, i) => (i === idx ? next : r)) : [...prev, next]
      })
    } else {
      upsertDay(dow, start, end, bStart, bEnd)
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
            breakStart={row?.break_start ?? undefined}
            breakEnd={row?.break_end ?? undefined}
            onToggle={() => handleToggle(dow)}
            onSave={(s, e, bs, be) => handleSave(dow, s, e, bs, be)}
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
            {onMarkDone && <Btn label="Done" color={C.green} ghost onClick={onMarkDone} />}
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

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function DayRow({
  dayName, active, startTime, endTime, breakStart, breakEnd, onToggle, onSave,
}: {
  dayName: string
  active: boolean
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  onToggle: () => void
  onSave: (start: string, end: string, breakStart?: string, breakEnd?: string) => void
}) {
  const [start,    setStart]    = useState(startTime)
  const [end,      setEnd]      = useState(endTime)
  const [hasBreak, setHasBreak] = useState(!!breakStart)
  const [bStart,   setBStart]   = useState(breakStart ?? '12:00')
  const [bEnd,     setBEnd]     = useState(breakEnd   ?? '13:00')

  useEffect(() => { setStart(startTime) }, [startTime])
  useEffect(() => { setEnd(endTime) }, [endTime])
  useEffect(() => { setHasBreak(!!breakStart) }, [breakStart])
  useEffect(() => { if (breakStart) setBStart(breakStart) }, [breakStart])
  useEffect(() => { if (breakEnd)   setBEnd(breakEnd)     }, [breakEnd])

  const dirty = active && (
    start !== startTime ||
    end   !== endTime   ||
    hasBreak !== !!breakStart ||
    (hasBreak && (bStart !== (breakStart ?? '12:00') || bEnd !== (breakEnd ?? '13:00')))
  )

  const sMin = timeToMin(start)
  const eMin = timeToMin(end)
  const bsMin = timeToMin(bStart)
  const beMin = timeToMin(bEnd)

  let validationError: string | null = null
  if (sMin >= eMin) {
    validationError = 'End must be after start'
  } else if (hasBreak) {
    if (bsMin <= sMin)  validationError = 'Break must start after opening'
    else if (beMin >= eMin) validationError = 'Break must end before closing'
    else if (bsMin >= beMin) validationError = 'Break end must be after start'
  }

  const canSave = dirty && !validationError

  return (
    <div style={{ padding: '11px 0', borderBottom: `0.5px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, fontSize: 13, fontWeight: 500, color: active ? C.text : C.hint, flexShrink: 0 }}>
          {dayName}
        </span>
        <Toggle on={active} onChange={onToggle} />
        {active ? (
          <>
            <input type="time" value={start} onChange={e => setStart(e.target.value)} style={timeInputStyle} />
            <span style={{ fontSize: 12, color: C.hint }}>–</span>
            <input type="time" value={end}   onChange={e => setEnd(e.target.value)}   style={timeInputStyle} />
            {!hasBreak && (
              <button
                onClick={() => setHasBreak(true)}
                title="Add break"
                style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${C.borderMed}`, background: 'transparent',
                  color: C.muted, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0,
                }}
              >
                <i className="ti ti-plus" style={{ fontSize: 12 }} />
              </button>
            )}
            {dirty && (
              <button
                onClick={() => canSave && onSave(start, end, hasBreak ? bStart : undefined, hasBreak ? bEnd : undefined)}
                disabled={!canSave}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 7,
                  border: 'none',
                  background: canSave ? C.accent : C.borderMed,
                  color: '#fff',
                  fontSize: 11, fontWeight: 600,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  marginLeft: 'auto', flexShrink: 0,
                  opacity: canSave ? 1 : 0.6,
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

      {active && hasBreak && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 80 }}>
          <span style={{ fontSize: 11, color: C.hint, flexShrink: 0 }}>break</span>
          <input type="time" value={bStart} onChange={e => setBStart(e.target.value)} style={timeInputStyle} />
          <span style={{ fontSize: 12, color: C.hint }}>–</span>
          <input type="time" value={bEnd}   onChange={e => setBEnd(e.target.value)}   style={timeInputStyle} />
          <button
            onClick={() => setHasBreak(false)}
            title="Remove break"
            style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              border: `1px solid ${C.borderMed}`, background: 'transparent',
              color: C.muted, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 12 }} />
          </button>
        </div>
      )}

      {active && dirty && validationError && (
        <div style={{ fontSize: 10, color: C.red, marginTop: 4, paddingLeft: 80 }}>
          {validationError}
        </div>
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
