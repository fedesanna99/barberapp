import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface BarberDefaults {
  slotMinutes:               number
  price:                     number
  cancellationWindowHours:   number
}

const FALLBACK: BarberDefaults = { slotMinutes: 30, price: 25, cancellationWindowHours: 24 }

// Read-only view of a barber's booking defaults (slot length + price +
// cancellation window). Anyone can SELECT barbers (public read RLS), so
// no auth needed. Falls back to 30 min / €25 / 24h window in demo / loading.
// `cancellationWindowHours` here is the CURRENT default on the barber row —
// not the snapshot on a specific booking (that lives on bookings.cancellation_window_hours).
export function useBarberDefaults(barberId: string | undefined): BarberDefaults {
  const [defaults, setDefaults] = useState<BarberDefaults>(FALLBACK)

  useEffect(() => {
    if (IS_DEMO || !barberId) {
      setDefaults(FALLBACK)
      return
    }
    supabase
      .from('barbers')
      .select('default_slot_minutes, default_price, cancellation_window_hours')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (data) setDefaults({
          slotMinutes:             data.default_slot_minutes ?? FALLBACK.slotMinutes,
          price:                   Number(data.default_price ?? FALLBACK.price),
          cancellationWindowHours: data.cancellation_window_hours ?? FALLBACK.cancellationWindowHours,
        })
      })
  }, [barberId])

  return defaults
}
