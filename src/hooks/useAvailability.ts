import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Returns HH:MM strings for every slot_minutes-minute slot in [start, end).
function generateSlots(start: string, end: string, slotMinutes = 30): string[] {
  const slots: string[] = []
  let [h, m] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const endTotal = eh * 60 + em

  while (h * 60 + m < endTotal) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += slotMinutes
    if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
  }
  return slots
}

export function useAvailability(barberId: string | undefined, date: Date | null) {
  const [slots, setSlots]   = useState<string[]>([])
  const [booked, setBooked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!barberId || !date) {
      setSlots([])
      setBooked(new Set())
      return
    }

    const dow     = date.getDay()
    const dateStr = date.toISOString().split('T')[0]
    setLoading(true)

    type AvailRow = { start_time: string; end_time: string }
    type BookingRow = { time_slot: string }

    Promise.all([
      supabase
        .from('availability')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .eq('day_of_week', dow),
      supabase
        .from('bookings')
        .select('time_slot')
        .eq('barber_id', barberId)
        .eq('date', dateStr)
        .neq('status', 'cancelled'),
    ]).then(([avail, existing]) => {
      const win = (avail.data as AvailRow[] | null)?.[0]
      if (!win) {
        setSlots([])
        setBooked(new Set())
        setLoading(false)
        return
      }

      const all   = generateSlots(win.start_time, win.end_time)
      const taken = new Set((existing.data as BookingRow[] | null ?? []).map(b => b.time_slot))
      setSlots(all)
      setBooked(taken)
      setLoading(false)
    })
  }, [barberId, date?.toDateString()])

  return { slots, booked, loading }
}
