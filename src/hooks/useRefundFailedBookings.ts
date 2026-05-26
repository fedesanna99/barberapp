import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { BookingWithBarber } from './useBooking'

/**
 * Realtime query su bookings con refund_status='failed_pending_manual'
 * del cliente loggato. Alimenta l'alert sticky in MyAppointments (PR-tris V4).
 *
 * Quando il supporto risolve manualmente (cambia refund_status a 'resolved_manually'
 * o 'succeeded'), Realtime invia un UPDATE e la riga sparisce da questa lista —
 * il consumer puo' usare la transition per mostrare il "cleared" toast una volta
 * (vedi RefundFailedAlert + localStorage marker).
 *
 * Index supporting query: idx_bookings_refund_status_failed (mig. 040).
 */

const SELECT = '*, barbers(id, default_price, profile:profiles(display_name, avatar_url)), service:services(price)'

export interface UseRefundFailedBookingsResult {
  bookings:  BookingWithBarber[]
  loading:   boolean
}

export function useRefundFailedBookings(clientId: string | undefined): UseRefundFailedBookingsResult {
  const [bookings, setBookings] = useState<BookingWithBarber[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const channelSuffix = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  useEffect(() => {
    if (!clientId) {
      setBookings([])
      setLoading(false)
      return
    }
    setLoading(true)

    // Initial fetch — filter su refund_status server-side per evitare di
    // tirarsi tutte le bookings del cliente in client.
    supabase
      .from('bookings')
      .select(SELECT)
      .eq('client_id', clientId)
      .eq('refund_status', 'failed_pending_manual')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setLoading(false); return }
        if (data) setBookings(data as BookingWithBarber[])
        setLoading(false)
      })

    // Realtime: ascolta UPDATE su tutta la tabella bookings del cliente.
    // Filtriamo lato client perché non possiamo combinare filter su 2 colonne
    // (Supabase Realtime accetta UN solo filter). Su un UPDATE che cambia
    // refund_status verso/da 'failed_pending_manual' aggiorniamo l'array.
    channelRef.current = supabase
      .channel(`refund_failed_${clientId}_${channelSuffix.current}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `client_id=eq.${clientId}` },
        payload => {
          const next = payload.new as { id: string; refund_status?: string }
          const old  = payload.old as { id: string; refund_status?: string }
          if (next.refund_status === 'failed_pending_manual') {
            // Aggiunto o aggiornato — fetch della singola row con joins.
            supabase
              .from('bookings')
              .select(SELECT)
              .eq('id', next.id)
              .single()
              .then(({ data }) => {
                if (data) setBookings(prev => {
                  const idx = prev.findIndex(b => b.id === next.id)
                  const row = data as BookingWithBarber
                  return idx >= 0
                    ? prev.map((b, i) => i === idx ? row : b)
                    : [row, ...prev]
                })
              })
          } else if (old.refund_status === 'failed_pending_manual') {
            // Risolto (succeeded o resolved_manually): rimuovi dalla lista.
            setBookings(prev => prev.filter(b => b.id !== next.id))
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [clientId])

  return { bookings, loading }
}
