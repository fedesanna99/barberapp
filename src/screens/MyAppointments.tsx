import { useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { useBooking, useClientBookings, type BookingWithBarber } from '../hooks/useBooking'

interface Props {
  userId: string
  onClose: () => void
  onToast?: (msg: string | null) => void
}

const TODAY = new Date().toISOString().split('T')[0]

function fmtDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'In attesa',
  confirmed: 'Confermata',
  done:      'Completata',
  cancelled: 'Annullata',
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: 'rgba(29,158,117,0.1)', fg: C.green },
  confirmed: { bg: C.accentLight,          fg: C.accent },
  done:      { bg: C.surface,              fg: C.hint },
  cancelled: { bg: 'rgba(226,75,74,0.08)', fg: C.red },
}

export function MyAppointments({ userId, onClose, onToast }: Props) {
  const { bookings } = useClientBookings(userId)
  const { cancelBooking } = useBooking()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const upcoming = bookings.filter(b => b.date >= TODAY && b.status !== 'cancelled' && b.status !== 'done')
  const past     = bookings.filter(b => b.date < TODAY || b.status === 'done' || b.status === 'cancelled')
                           .sort((a, b) => b.date.localeCompare(a.date))

  async function handleCancel(b: BookingWithBarber) {
    const name = b.barbers?.profile?.display_name ?? 'il barbiere'
    if (!window.confirm(`Annullare la prenotazione con ${name} del ${fmtDate(b.date)} alle ${b.time_slot}?`)) return
    setCancellingId(b.id)
    const { error } = await cancelBooking(b.id)
    setCancellingId(null)
    if (error) {
      onToast?.(`Annullamento fallito: ${error.message}`)
    } else {
      onToast?.('Prenotazione annullata')
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, background: C.bg, zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 8px', flexShrink: 0,
        borderBottom: `0.5px solid ${C.border}`,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>I miei appuntamenti</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section title="Prossimi" count={upcoming.length}>
              {upcoming.length === 0
                ? <div style={{ fontSize: 12, color: C.hint, padding: '8px 0' }}>Nessun appuntamento futuro</div>
                : upcoming.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      cancelling={cancellingId === b.id}
                      onCancel={() => handleCancel(b)}
                    />
                  ))
              }
            </Section>

            {past.length > 0 && (
              <Section title="Storia" count={past.length}>
                {past.map(b => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '60px 32px', textAlign: 'center',
    }}>
      <i className="ti ti-calendar-off" style={{ fontSize: 44, color: C.hint, opacity: 0.5 }} />
      <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Nessun appuntamento</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
        Vai su Esplora per trovare un barbiere e prenotare il tuo primo taglio.
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
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

function BookingCard({ booking, cancelling, onCancel }: {
  booking: BookingWithBarber
  cancelling?: boolean
  onCancel?: () => void
}) {
  const name   = booking.barbers?.profile?.display_name ?? 'Barbiere'
  const status = booking.status as keyof typeof STATUS_COLOR
  const color  = STATUS_COLOR[status] ?? STATUS_COLOR.cancelled

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 12, marginBottom: 8,
      background: C.surface, border: `0.5px solid ${C.border}`,
    }}>
      <Avatar initials={initials(name)} size={36} accent={C.accent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
          {fmtDate(booking.date)} · {booking.time_slot}
        </div>
      </div>
      <span style={{ fontSize: 10, background: color.bg, color: color.fg, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>
        {STATUS_LABEL[status] ?? status}
      </span>
      {onCancel && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          style={{
            height: 28, padding: '0 10px', borderRadius: 8,
            border: `1px solid ${C.red}`,
            background: 'transparent',
            color: C.red, fontSize: 11, fontWeight: 500,
            cursor: cancelling ? 'default' : 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
            opacity: cancelling ? 0.6 : 1,
          }}
        >
          {cancelling ? '…' : 'Annulla'}
        </button>
      )}
    </div>
  )
}
