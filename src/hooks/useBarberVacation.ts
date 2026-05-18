import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Vacation toggle: when `acceptingBookings` is false the barber is on pause and
// the Book button is disabled everywhere. Server-side enforcement lives in the
// `bookings_insert` RLS policy (migration 026), so this is the UI half only.
export function useBarberVacation(barberId: string | undefined) {
  const [acceptingBookings, setState] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!barberId) { setLoaded(false); return }
    let cancelled = false
    supabase
      .from('barbers')
      .select('accepting_bookings')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setState(data.accepting_bookings)
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [barberId])

  async function setAcceptingBookings(value: boolean) {
    setState(value)
    if (!barberId) return { error: null }
    const { error } = await supabase
      .from('barbers')
      .update({ accepting_bookings: value })
      .eq('id', barberId)
    if (error) setState(!value)
    return { error }
  }

  return { acceptingBookings, setAcceptingBookings, loaded }
}
