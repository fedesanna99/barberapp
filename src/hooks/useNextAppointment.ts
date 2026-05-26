import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface NextAppointment {
  id:           string
  date:         string   // 'YYYY-MM-DD'
  time_slot:    string   // 'HH:MM:SS'
  barber_name:  string | null
}

/**
 * Prossimo appuntamento futuro del cliente loggato (status pending o
 * confirmed). Null se nessuno disponibile — caller responsible per
 * null-hidden UI (Q5 decretato: agenda pill non si renderizza affatto se
 * cliente senza appuntamenti).
 *
 * Filtro futuro lato server via OR:
 *   - data > oggi  (qualunque ora)
 *   - data = oggi AND time_slot > ora corrente
 * Cosi gli appuntamenti di stamane gia passati non risalgono.
 */
export function useNextAppointment(clientId: string | null) {
  const [next, setNext]       = useState<NextAppointment | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setNext(null)
      return
    }
    let alive = true
    setLoading(true)

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const nowHhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    type BookingRow = {
      id:        string
      date:      string
      time_slot: string
      barbers: {
        profile: { display_name: string | null } | null
      } | null
    }

    supabase
      .from('bookings')
      .select('id, date, time_slot, barbers(profile:profiles(display_name))')
      .eq('client_id', clientId)
      .in('status', ['pending', 'confirmed'])
      // Filter futuri: combo (date > today) OR (date = today AND time_slot > now)
      .or(`date.gt.${todayStr},and(date.eq.${todayStr},time_slot.gt.${nowHhmm})`)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (error || !data) {
          setNext(null)
        } else {
          const row = data as BookingRow
          setNext({
            id:          row.id,
            date:        row.date,
            time_slot:   row.time_slot,
            barber_name: row.barbers?.profile?.display_name ?? null,
          })
        }
        setLoading(false)
      })

    return () => { alive = false }
  }, [clientId])

  return { next, loading }
}
