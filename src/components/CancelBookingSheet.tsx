import { C } from '../lib/colors'
import { Icon } from './Icon'
import type { BookingWithBarber } from '../hooks/useBooking'

/* Cancel booking sheet (Pari V4 PR-tris Sezione C).
   Tre variant in base a payment_status + hours_until_appointment vs window:
     - within-paid:  pagato online, entro la finestra → refund automatico
     - outside-paid: pagato online, fuori dalla finestra → NO refund (cliente perde i soldi)
     - cash:         pagato sul posto (o non ancora pagato) → niente da rimborsare

   Pattern wrapper: scrim absolute inset-0 + sheet bottom + animazioni
   (scrimIn/sheetUp). Coerente con ConfirmSheet ma body custom.
   TODO follow-up out-of-scope: estrarre SheetWrapper reusable
   (ConfirmSheet + CancelBookingSheet + altri sheet futuri). */

export type CancelVariant = 'within-paid' | 'outside-paid' | 'cash'

const DAYS_IT_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

function bookingDateMs(date: string, timeSlot: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = timeSlot.slice(0, 5).split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).getTime()
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DAYS_IT_SHORT[dt.getDay()]} ${dt.getDate()}`
}

function priceOf(booking: BookingWithBarber): number {
  return Number(booking.service?.price ?? booking.barbers?.default_price ?? 0)
}

function formatEur(n: number): string {
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2).replace('.', ',')}`
}

export function getCancelVariant(booking: BookingWithBarber): CancelVariant {
  if (booking.payment_status !== 'paid') return 'cash'
  const apptMs = bookingDateMs(booking.date, booking.time_slot)
  const hoursUntil = (apptMs - Date.now()) / 3_600_000
  return hoursUntil >= booking.cancellation_window_hours ? 'within-paid' : 'outside-paid'
}

interface Props {
  booking:   BookingWithBarber
  busy?:     boolean
  onConfirm: () => void
  onCancel:  () => void
}

export function CancelBookingSheet({ booking, busy = false, onConfirm, onCancel }: Props) {
  const variant = getCancelVariant(booking)
  const price = priceOf(booking)
  const day = dayLabel(booking.date)
  const timeShort = booking.time_slot.slice(0, 5)
  const window = booking.cancellation_window_hours
  const isOutside = variant === 'outside-paid'

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onCancel() }}
      style={{
        position: 'absolute', inset: 0, background: 'var(--scrim)',
        display: 'flex', alignItems: 'flex-end', zIndex: 200,
        animation: 'scrimIn 200ms var(--ease)',
      }}
    >
      <div style={{
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        width: '100%',
        padding: '8px 0 24px',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 18px' }} />

        <div style={{ padding: '0 22px' }}>
          {/* Eyebrow */}
          <div
            className="bb-eyebrow"
            style={{ color: isOutside ? 'var(--rust)' : undefined, marginBottom: 8 }}
          >
            {isOutside ? 'Attenzione' : 'Annullare?'}
          </div>

          {/* Title — Instrument Serif */}
          <h2 className="bb-h2-display" style={{ marginBottom: 10 }}>
            {isOutside ? 'Annulli senza rimborso.' : 'Annulli la prenotazione.'}
          </h2>

          {/* Body paragraph */}
          {variant === 'within-paid' && (
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, margin: '0 0 16px' }}>
              Lo slot delle <span className="bb-mono" style={{ color: C.text }}>{timeShort}</span> di {day} si libera per altri clienti.
            </p>
          )}
          {variant === 'outside-paid' && (
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, margin: '0 0 16px' }}>
              Sei fuori dalla finestra di cancellazione gratuita (<span className="bb-mono" style={{ color: C.text }}>{window}h</span> prima). Lo slot si libererà ma i soldi non tornano indietro.
            </p>
          )}
          {variant === 'cash' && (
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, margin: '0 0 16px' }}>
              Lo slot delle <span className="bb-mono" style={{ color: C.text }}>{timeShort}</span> di {day} si libera per altri clienti. <strong style={{ color: C.text }}>Non hai pagato niente</strong>, quindi non c'è nulla da rimborsare.
            </p>
          )}

          {/* Refund line — only paid variants */}
          {variant === 'within-paid' && (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--sage-soft)',
                border: '1px solid rgba(124, 140, 110, 0.30)',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 13, color: C.text }}>Riceverai il rimborso</span>
                <span className="bb-mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage)' }}>
                  {formatEur(price)}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: '0 0 18px', lineHeight: 1.45 }}>
                Torna sulla tua carta in <span className="bb-mono">5–10</span> giorni lavorativi.
              </p>
            </>
          )}
          {variant === 'outside-paid' && (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--rust-soft)',
                border: '1px solid rgba(176, 94, 72, 0.25)',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 13, color: C.text }}>Rimborso</span>
                <span
                  className="bb-mono"
                  style={{ fontSize: 16, fontWeight: 600, color: 'var(--rust)', textDecoration: 'line-through' }}
                >
                  {formatEur(price)}
                </span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--rust)', margin: '0 0 18px', lineHeight: 1.45 }}>
                I <span className="bb-mono">{formatEur(price)}</span> già pagati <strong>non verranno rimborsati</strong>.
              </p>
            </>
          )}
        </div>

        {/* Actions — stacked block-block */}
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '14px 0', borderRadius: 'var(--r-md)',
              background: busy ? 'var(--ink-15)' : 'var(--rust)',
              color: busy ? C.muted : 'var(--paper-3)',
              border: `1px solid ${busy ? 'transparent' : 'var(--rust)'}`,
              fontSize: 14, fontWeight: 500, cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {busy && <Icon name="refresh" size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
            {variant === 'outside-paid' ? 'Annulla comunque' : 'Sì, annulla'}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '14px 0', borderRadius: 'var(--r-md)',
              background: 'transparent', color: C.text,
              border: '1px solid transparent',
              fontSize: 14, fontWeight: 500, cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Indietro
          </button>
        </div>
      </div>
    </div>
  )
}
