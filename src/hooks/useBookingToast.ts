import { useEffect, useRef } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { Booking } from '../types/supabase'

function fmtShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// Fires a toast when a client's booking status changes to confirmed or cancelled.
// Only active in production (IS_DEMO → no-op).
export function useBookingToast(
  userId: string | undefined,
  onToast: (msg: string) => void,
) {
  const onToastRef = useRef(onToast)
  useEffect(() => { onToastRef.current = onToast })

  useEffect(() => {
    if (IS_DEMO || !userId) return

    const channel = supabase
      .channel(`booking_toast_${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'bookings',
          filter: `client_id=eq.${userId}`,
        },
        async payload => {
          const booking = payload.new as Booking
          const status  = booking.status
          if (status !== 'confirmed' && status !== 'cancelled') return

          // Fetch barber display name for the message
          const { data } = await supabase
            .from('barbers')
            .select('profile:profiles(display_name)')
            .eq('id', booking.barber_id)
            .single()
          const name = (data as unknown as { profile: { display_name: string | null } | null } | null)
            ?.profile?.display_name ?? 'Your barber'

          const when = `${fmtShort(booking.date)} · ${booking.time_slot}`
          if (status === 'confirmed') {
            onToastRef.current(`${name} confirmed · ${when}`)
          } else {
            onToastRef.current(`${name} cancelled · ${when}`)
          }
        },
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [userId])
}
