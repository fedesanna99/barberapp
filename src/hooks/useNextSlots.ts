import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Shape ritornata dalla RPC public.next_available_slots (migration 041).
 * Mix di available+taken ordinati cronologicamente.
 */
export interface NextSlot {
  slot_date:      string   // 'YYYY-MM-DD' (Postgres date → JSON string)
  slot_time:      string   // 'HH:MM:SS' (Postgres time → JSON string, slice 0..5 per HH:MM)
  slot_available: boolean
}

/**
 * Wrap della RPC next_available_slots per i quick slots della Barber
 * Preview Card del Discover (Pari V4). Mixed available+taken — l'UI mostra
 * strikethrough sui taken.
 *
 * NOTA bug latente (system-wide consistente con useAvailability.ts +
 * bookings_no_double partial index): la RPC marca solo time_slot esatto come
 * taken, NON considera service duration overlap. Vedi
 * FIX_BLOCK_4_5_NEXT_SLOTS_NOTES.md sezione bug overlap.
 */
export function useNextSlots(barberId: string | null, count = 6) {
  const [slots, setSlots]     = useState<NextSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!barberId) {
      setSlots([])
      setError(null)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)

    supabase
      .rpc('next_available_slots', {
        p_barber_id: barberId,
        p_count:     count,
      })
      .then(({ data, error: rpcError }) => {
        if (!alive) return
        if (rpcError) {
          setError(rpcError.message)
          setSlots([])
        } else {
          setSlots((data ?? []) as NextSlot[])
          setError(null)
        }
        setLoading(false)
      })

    return () => { alive = false }
  }, [barberId, count])

  return { slots, loading, error }
}
