import { useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { ReviewSheet } from '../components/ReviewSheet'
import { useBooking, useClientBookings, type BookingWithBarber } from '../hooks/useBooking'
import { useReviews } from '../hooks/useReviews'
import type { ToastEvent } from '../components/Toast'

interface Props {
  userId:  string
  onClose: () => void
  onToast?: (t: ToastEvent | null) => void
}

// Returns the booking's datetime as ms-since-epoch in local time.
// Used to move bookings to "past" the instant their slot starts, not at
// midnight: an 08:00 appointment today belongs in Cronologia from 08:01.
function bookingTime(date: string, timeSlot: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = timeSlot.slice(0, 5).split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).getTime()
}

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
  confirmed: 'Confermato',
  done:      'Completato',
  cancelled: 'Annullato',
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: C.accentLight, fg: C.accentDeep },
  confirmed: { bg: C.greenSoft,   fg: C.green },
  done:      { bg: C.surfaceAlt,  fg: C.muted },
  cancelled: { bg: C.redSoft,     fg: C.red },
}

export function MyAppointments({ userId, onClose, onToast }: Props) {
  const { bookings } = useClientBookings(userId)
  const { cancelBooking } = useBooking()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reviewBooking, setReviewBooking] = useState<BookingWithBarber | null>(null)

  const now = Date.now()
  const upcoming = bookings.filter(b =>
    bookingTime(b.date, b.time_slot) >= now
    && b.status !== 'cancelled'
    && b.status !== 'done'
  )
  const past = bookings.filter(b =>
    bookingTime(b.date, b.time_slot) < now
    || b.status === 'done'
    || b.status === 'cancelled'
  ).sort((a, b) =>
    bookingTime(b.date, b.time_slot) - bookingTime(a.date, a.time_slot)
  )

  async function handleCancel(b: BookingWithBarber) {
    const name = b.barbers?.profile?.display_name ?? 'il barbiere'
    if (!window.confirm(`Annullare la prenotazione con ${name} del ${fmtDate(b.date)} alle ${b.time_slot}?`)) return
    setCancellingId(b.id)
    const { error } = await cancelBooking(b.id)
    setCancellingId(null)
    if (error) {
      onToast?.({ kind: 'error', title: 'Annullamento fallito', message: error.message })
    } else {
      onToast?.({
        kind:    'success',
        title:   'Prenotazione annullata.',
        message: `${name} · ${fmtDate(b.date)} alle ${b.time_slot}`,
      })
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ph-thin ph-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          I miei appuntamenti
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Section title="Prossimi" count={upcoming.length}>
              {upcoming.length === 0
                ? <div style={{ fontSize: 12.5, color: C.muted, padding: '12px 0' }}>Nessun appuntamento futuro.</div>
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
              <Section title="Cronologia" count={past.length}>
                {past.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onReview={b.status === 'done' ? () => setReviewBooking(b) : undefined}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>

      {reviewBooking && (
        <ReviewSheetForBooking
          userId={userId}
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onToast={onToast}
        />
      )}
    </div>
  )
}

function ReviewSheetForBooking({
  userId, booking, onClose, onToast,
}: {
  userId:   string
  booking:  BookingWithBarber
  onClose:  () => void
  onToast?: (t: ToastEvent | null) => void
}) {
  const barberId   = booking.barbers?.id
  const barberName = booking.barbers?.profile?.display_name ?? 'il barbiere'
  const { myReview, upsertReview, removeReview } = useReviews(barberId, userId)

  if (!barberId) { onClose(); return null }

  return (
    <ReviewSheet
      barberName={barberName}
      existing={myReview}
      onClose={onClose}
      onSubmit={async (rating, comment) => {
        const res = await upsertReview(rating, comment)
        if (!res.error) onToast?.({
          kind:    'success',
          title:   myReview ? 'Recensione aggiornata.' : 'Recensione pubblicata.',
          message: barberName,
        })
        return res
      }}
      onDelete={myReview ? async () => {
        const res = await removeReview()
        if (!res.error) onToast?.({ kind: 'success', title: 'Recensione eliminata.', message: barberName })
        return res
      } : undefined}
    />
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '60px 32px', textAlign: 'center',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="ph-thin ph-calendar-x" style={{ fontSize: 20, color: C.hint }} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
        Nessun appuntamento
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, maxWidth: 260 }}>
        Vai su Esplora per trovare un barbiere e prenotare il tuo primo taglio.
      </div>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          {title}
        </span>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 500, color: C.accentDeep, background: C.accentLight, borderRadius: 9999, padding: '2px 8px' }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function BookingCard({ booking, cancelling, onCancel, onReview }: {
  booking:   BookingWithBarber
  cancelling?: boolean
  onCancel?: () => void
  onReview?: () => void
}) {
  const name   = booking.barbers?.profile?.display_name ?? 'Barbiere'
  const status = booking.status as keyof typeof STATUS_COLOR
  const color  = STATUS_COLOR[status] ?? STATUS_COLOR.cancelled

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 8,
      background: C.surface, border: `1px solid ${C.border}`,
    }}>
      <Avatar initials={initials(name)} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
          {fmtDate(booking.date)} · <span style={{ fontFamily: 'var(--font-mono)' }}>{booking.time_slot}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, background: color.bg, color: color.fg, padding: '3px 9px', borderRadius: 9999, flexShrink: 0, fontWeight: 500 }}>
        {STATUS_LABEL[status] ?? status}
      </span>
      {onCancel && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          style={{
            padding: '7px 12px', borderRadius: 'var(--r-md)',
            border: `1px solid ${C.red}`,
            background: C.bg, color: C.red,
            fontSize: 12, fontWeight: 500,
            cursor: cancelling ? 'default' : 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
            opacity: cancelling ? 0.6 : 1,
          }}
        >
          {cancelling ? '…' : 'Annulla'}
        </button>
      )}
      {onReview && (
        <button
          onClick={onReview}
          style={{
            padding: '7px 12px', borderRadius: 'var(--r-md)',
            border: `1px solid ${C.borderMed}`,
            background: C.bg, color: C.text,
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          Recensisci
        </button>
      )}
    </div>
  )
}
