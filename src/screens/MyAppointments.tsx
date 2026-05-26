import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { ReviewSheet } from '../components/ReviewSheet'
import { CancelBookingSheet, getCancelVariant } from '../components/CancelBookingSheet'
import { RefundFailedAlert, RefundResolvedBanner } from '../components/RefundFailedAlert'
import { useBooking, useClientBookings, type BookingWithBarber } from '../hooks/useBooking'
import { useRefundFailedBookings } from '../hooks/useRefundFailedBookings'
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
function bookingTime(date: string | null | undefined, timeSlot: string | null | undefined): number {
  if (!date || !timeSlot) return 0
  try {
    const [y, m, d] = date.split('-').map(Number)
    const [hh, mm] = timeSlot.slice(0, 5).split(':').map(Number)
    return new Date(y, m - 1, d, hh, mm).getTime()
  } catch {
    return 0
  }
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  try {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return s
  }
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
  declined:  'Rifiutato',
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: C.accentLight, fg: C.accentDeep },
  confirmed: { bg: C.greenSoft,   fg: C.green },
  done:      { bg: C.surfaceAlt,  fg: C.muted },
  cancelled: { bg: C.redSoft,     fg: C.red },
  declined:  { bg: C.redSoft,     fg: C.red },
}

function priceOf(b: BookingWithBarber): number {
  return Number(b.service?.price ?? b.barbers?.default_price ?? 0)
}

function formatEur(n: number): string {
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2).replace('.', ',')}`
}

export function MyAppointments({ userId, onClose, onToast }: Props) {
  const { bookings, loading, loadError } = useClientBookings(userId)
  const { cancelBooking } = useBooking()
  const { bookings: refundFailed } = useRefundFailedBookings(userId)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BookingWithBarber | null>(null)
  const [reviewBooking, setReviewBooking] = useState<BookingWithBarber | null>(null)
  // PR-tris: dedup "resolved" banner via localStorage marker. Cache price
  // by booking id so we can show the right amount when the booking has
  // already left the failed list.
  const failedPriceCache = useRef<Map<string, number>>(new Map())
  const [recentlyResolved, setRecentlyResolved] = useState<{ id: string; price: number }[]>([])

  // Track id→price snapshot for failed bookings. When a booking leaves the
  // failed list (refund_status switched to 'succeeded' or 'resolved_manually'),
  // promote it to recentlyResolved IF localStorage marker is missing.
  useEffect(() => {
    const currentIds = new Set(refundFailed.map(b => b.id))
    // Cache prices for currently-failed bookings (for future detection).
    refundFailed.forEach(b => failedPriceCache.current.set(b.id, priceOf(b)))
    // Find ids that were previously in the cache but are no longer failed.
    const newlyResolved: { id: string; price: number }[] = []
    for (const [id, price] of failedPriceCache.current.entries()) {
      if (!currentIds.has(id) && !localStorage.getItem(`bb_refund_banner_${id}`)) {
        newlyResolved.push({ id, price })
      }
    }
    if (newlyResolved.length > 0) {
      setRecentlyResolved(prev => {
        const have = new Set(prev.map(r => r.id))
        const add = newlyResolved.filter(r => !have.has(r.id))
        return add.length > 0 ? [...prev, ...add] : prev
      })
    }
  }, [refundFailed])

  function dismissResolved(id: string) {
    localStorage.setItem(`bb_refund_banner_${id}`, '1')
    setRecentlyResolved(prev => prev.filter(r => r.id !== id))
    failedPriceCache.current.delete(id)
  }

  const now = Date.now()
  const upcoming = bookings.filter(b =>
    bookingTime(b.date, b.time_slot) >= now
    && b.status !== 'cancelled'
    && b.status !== 'declined'
    && b.status !== 'done'
  )
  const past = bookings.filter(b =>
    bookingTime(b.date, b.time_slot) < now
    || b.status === 'done'
    || b.status === 'cancelled'
    || b.status === 'declined'
  ).sort((a, b) =>
    bookingTime(b.date, b.time_slot) - bookingTime(a.date, a.time_slot)
  )

  async function confirmCancel() {
    const b = cancelTarget
    if (!b) return
    const name = b.barbers?.profile?.display_name ?? 'il barbiere'
    const variant = getCancelVariant(b)
    const price = priceOf(b)
    setCancellingId(b.id)
    const { data, error } = await cancelBooking(b.id)
    setCancellingId(null)
    setCancelTarget(null)
    if (error) {
      onToast?.({ kind: 'error', title: 'Annullamento fallito', message: error.message })
      return
    }
    // Toast variant logic (Pari V4 Sezione D):
    //   refunded:true  + within  → 'success' "tornano sulla tua carta..."
    //   refund_failed  + within  → 'success' "rimborso in elaborazione" (alert sticky comparirà)
    //   refund:false   + outside → 'warning' "nessun rimborso — eri fuori dalla finestra"
    //   cash variant            → 'success' "lo slot si è liberato"
    if (data?.refund_failed) {
      onToast?.({
        kind:    'success',
        title:   'Prenotazione annullata.',
        message: 'Rimborso in elaborazione. Ti aggiorniamo entro 48h.',
      })
    } else if (variant === 'within-paid' && data?.refunded) {
      onToast?.({
        kind:    'success',
        title:   'Prenotazione annullata.',
        message: `${formatEur(price)} tornano sulla tua carta in 5–10 giorni lavorativi.`,
      })
    } else if (variant === 'outside-paid') {
      onToast?.({
        kind:    'warning',
        title:   'Prenotazione annullata.',
        message: `Nessun rimborso — eri fuori dalla finestra ${b.cancellation_window_hours}h.`,
      })
    } else {
      // cash
      onToast?.({
        kind:    'success',
        title:   'Prenotazione annullata.',
        message: `${name} · ${fmtDate(b.date)} alle ${b.time_slot}`,
      })
    }
  }

  function handleContactSupport() {
    onToast?.({ kind: 'info', title: 'Supporto', message: 'Apri Menu → Aiuto per parlare col team.' })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <Icon name="back" size={22} color={C.text} />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          I miei appuntamenti
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
            <Icon name="refresh" size={24} color={C.hint} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : loadError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '60px 32px', textAlign: 'center' }}>
            <Icon name="warning" size={28} color={C.hint} />
            <div style={{ fontSize: 14, color: C.muted }}>Impossibile caricare gli appuntamenti.</div>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* PR-tris Sezione D edge — alert sticky refund failed.
                Sopra la lista, persistente fino a risoluzione da parte del supporto. */}
            {refundFailed.map(b => (
              <RefundFailedAlert key={b.id} booking={b} onContact={handleContactSupport} />
            ))}
            {/* "Cleared" banner: una volta sola, dopo che il supporto risolve. */}
            {recentlyResolved.map(r => (
              <RefundResolvedBanner key={r.id} price={r.price} onDismiss={() => dismissResolved(r.id)} />
            ))}

            <Section title="Prossimi" count={upcoming.length}>
              {upcoming.length === 0
                ? <div style={{ fontSize: 12.5, color: C.muted, padding: '12px 0' }}>Nessun appuntamento futuro.</div>
                : upcoming.map(b => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      cancelling={cancellingId === b.id}
                      onCancel={() => setCancelTarget(b)}
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

      {cancelTarget && (
        <CancelBookingSheet
          booking={cancelTarget}
          busy={cancellingId === cancelTarget.id}
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
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
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="calendar" size={20} color="var(--clay-deep)" />
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

  // PR-tris: variant micro-copy + ghost button styling
  const variant = onCancel ? getCancelVariant(booking) : null
  const isOutside = variant === 'outside-paid'
  const cancelLabel = variant === 'outside-paid' ? 'Annulla senza rimborso' : 'Annulla'
  // Compute "Cancelli gratis fino a {dayLabel}" micro-copy for within-paid only.
  let microCopy: { text: string; tone: 'muted' | 'rust' } | null = null
  if (variant === 'within-paid') {
    const apptMs = bookingTime(booking.date, booking.time_slot)
    const freeUntilMs = apptMs - booking.cancellation_window_hours * 3_600_000
    if (freeUntilMs > Date.now()) {
      const d = new Date(freeUntilMs)
      const DAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      microCopy = { text: `Cancelli gratis fino a ${DAYS[d.getDay()]} ${d.getDate()} alle ${hh}:${mm}`, tone: 'muted' }
    }
  } else if (variant === 'outside-paid') {
    microCopy = { text: `Fuori dalla finestra ${booking.cancellation_window_hours}h`, tone: 'rust' }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 14px', borderRadius: 'var(--r-md)', marginBottom: 8,
      background: C.surface,
      border: isOutside ? '1px solid rgba(176, 94, 72, 0.20)' : `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={initials(name)} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
            {fmtDate(booking.date)} · <span className="bb-mono">{booking.time_slot}</span>
          </div>
        </div>
        <span style={{ fontSize: 11, background: color.bg, color: color.fg, padding: '3px 9px', borderRadius: 9999, flexShrink: 0, fontWeight: 500 }}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      {microCopy && (
        <div style={{
          fontSize: 11.5,
          color: microCopy.tone === 'rust' ? 'var(--rust)' : C.muted,
          paddingLeft: 52,
        }}>
          {microCopy.text}
        </div>
      )}
      {(onCancel || onReview) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingLeft: 52 }}>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r-md)',
                border: `1px solid ${isOutside ? 'rgba(176, 94, 72, 0.30)' : 'var(--ink-15)'}`,
                background: 'transparent',
                color: isOutside ? 'var(--rust)' : C.text,
                fontSize: 12.5, fontWeight: 500,
                cursor: cancelling ? 'default' : 'pointer',
                fontFamily: 'inherit',
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? '…' : cancelLabel}
            </button>
          )}
          {onReview && (
            <button
              onClick={onReview}
              style={{
                padding: '8px 14px', borderRadius: 'var(--r-md)',
                border: `1px solid ${C.borderMed}`,
                background: C.bg, color: C.text,
                fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Recensisci
            </button>
          )}
        </div>
      )}
    </div>
  )
}
