import { C } from '../lib/colors'
import type { BookingWithBarber } from '../hooks/useBooking'

/**
 * Alert sticky in cima a MyAppointments quando il refund Stripe è fallito
 * (refund_status='failed_pending_manual'). NON è un toast effimero — il
 * problema è economico, non può sparire dopo 4s. Persiste finché il supporto
 * non aggiorna refund_status a 'succeeded' o 'resolved_manually' (PR-tris V4).
 *
 * Cleared state: gestito dal parent via localStorage marker — quando una
 * booking esce dalla lista failed_pending_manual, una sola visualizzazione
 * di "Rimborso completato" sage check, poi sparisce al refresh successivo.
 */

interface Props {
  booking:      BookingWithBarber
  onContact:    () => void
}

const MONTHS_IT_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${dt.getDate()} ${MONTHS_IT_SHORT[dt.getMonth()]}`
}

function formatEur(n: number): string {
  return Number.isInteger(n) ? `€${n}` : `€${n.toFixed(2).replace('.', ',')}`
}

export function RefundFailedAlert({ booking, onContact }: Props) {
  const price = Number(booking.service?.price ?? booking.barbers?.default_price ?? 0)
  return (
    <div style={{
      padding: '14px 16px', marginBottom: 12,
      background: 'var(--rust-soft)',
      border: '1px solid rgba(176, 94, 72, 0.30)',
      borderRadius: 'var(--r-md)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--rust)', color: 'var(--paper-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: 600, fontSize: 16,
      }}>
        !
      </div>
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: C.text }}>
        <div style={{ fontWeight: 500, marginBottom: 3 }}>
          Rimborso in elaborazione manuale
        </div>
        <div style={{ color: 'var(--rust)', fontSize: 12 }}>
          Il rimborso di <span className="bb-mono" style={{ color: 'var(--rust)' }}>{formatEur(price)}</span>{' '}
          per la prenotazione del <span className="bb-mono">{shortDate(booking.date)}</span>{' '}
          non è andato a buon fine automaticamente. Il nostro team lo sta gestendo —
          ti contatteremo entro <span className="bb-mono">48h</span>.
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            onClick={onContact}
            style={{
              padding: '7px 14px', borderRadius: 'var(--r-md)',
              background: 'var(--rust)', color: 'var(--paper-3)',
              border: '1px solid var(--rust)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Contatta il supporto
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Mostrato UNA volta quando una booking esce dalla lista failed_pending_manual
 * (refund_status passa a 'succeeded' o 'resolved_manually'). localStorage marker
 * gestisce il "una sola volta" — vedi MyAppointments per il dedup logic.
 */
export function RefundResolvedBanner({ price, onDismiss }: { price: number; onDismiss: () => void }) {
  return (
    <div style={{
      padding: '14px 16px', marginBottom: 12,
      background: 'var(--sage-soft)',
      border: '1px solid rgba(124, 140, 110, 0.30)',
      borderRadius: 'var(--r-md)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      cursor: 'pointer',
    }}
    onClick={onDismiss}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--sage)', color: 'var(--paper-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: 600, fontSize: 14,
      }} aria-hidden="true">
        ✓
      </div>
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: C.text }}>
        <div style={{ fontWeight: 500, marginBottom: 3 }}>
          Rimborso completato.
        </div>
        <div style={{ color: 'var(--sage)', fontSize: 12 }}>
          <span className="bb-mono">{Number.isInteger(price) ? `€${price}` : `€${price.toFixed(2).replace('.', ',')}`}</span>{' '}
          tornati sulla tua carta.
        </div>
      </div>
    </div>
  )
}
