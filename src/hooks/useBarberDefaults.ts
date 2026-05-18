import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface BarberDefaults {
  slotMinutes: number
  price:       number
}

const FALLBACK: BarberDefaults = { slotMinutes: 30, price: 25 }

// Read-only view of a barber's booking defaults (slot length + ballpark
// price). Anyone can SELECT barbers (public read RLS), so no auth needed.
// Falls back to 30 min / €25 in demo or while loading.
export function useBarberDefaults(barberId: string | undefined): BarberDefaults {
  const [defaults, setDefaults] = useState<BarberDefaults>(FALLBACK)

  useEffect(() => {
    if (IS_DEMO || !barberId) {
      setDefaults(FALLBACK)
      return
    }
    supabase
      .from('barbers')
      .select('default_slot_minutes, default_price')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (data) setDefaults({
          slotMinutes: data.default_slot_minutes ?? FALLBACK.slotMinutes,
          price:       Number(data.default_price ?? FALLBACK.price),
        })
      })
  }, [barberId])

  return defaults
}
