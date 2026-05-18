import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
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

export function useAvailability(barberId: string | undefined, date: Date | null, slotMinutes = 30) {
  const [slots, setSlots]   = useState<string[]>([])
  const [booked, setBooked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    channelRef.current?.unsubscribe()
    channelRef.current = null

    if (!barberId || !date) {
      setSlots([])
      setBooked(new Set())
      return
    }

    const dow     = date.getDay()
    // H1: format in local time so the date string matches the day-of-week
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    setLoading(true)

    type AvailRow  = { start_time: string; end_time: string; break_start: string | null; break_end: string | null }
    type BookingRow = { time_slot: string; date: string; status: string }

    Promise.all([
      supabase
        .from('availability')
        .select('start_time, end_time, break_start, break_end')
        .eq('barber_id', barberId)
        .eq('day_of_week', dow),
      supabase
        .from('bookings')
        .select('time_slot')
        .eq('barber_id', barberId)
        .eq('date', dateStr)
        .in('status', ['pending', 'confirmed']),
    ]).then(([avail, existing]) => {
      const win = (avail.data as AvailRow[] | null)?.[0]
      if (!win) {
        setSlots([])
        setBooked(new Set())
        setLoading(false)
        return
      }

      const allRaw = generateSlots(win.start_time, win.end_time, slotMinutes)
      const all = win.break_start && win.break_end
        ? allRaw.filter(slot => {
            const [sh, sm] = slot.split(':').map(Number)
            const slotMin = sh * 60 + sm
            const bs = win.break_start!.slice(0, 5).split(':').map(Number)
            const be = win.break_end!.slice(0, 5).split(':').map(Number)
            return slotMin < bs[0] * 60 + bs[1] || slotMin >= be[0] * 60 + be[1]
          })
        : allRaw
      // C4: PostgREST returns time as "HH:MM:SS"; slice to "HH:MM" to match generated slots
      const taken = new Set((existing.data as BookingRow[] | null ?? []).map(b => b.time_slot.slice(0, 5)))
      setSlots(all)
      setBooked(taken)
      setLoading(false)
    })

    // Keep the booked set in sync while the sheet is open so the slot grid
    // reflects bookings made by other users in real time.
    channelRef.current = supabase
      .channel(`availability_${barberId}_${dateStr}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `barber_id=eq.${barberId}` },
        payload => {
          const row = (payload.new ?? payload.old) as BookingRow
          if (!row || row.date !== dateStr) return
          const slot = row.time_slot.slice(0, 5)
          if (payload.eventType === 'DELETE' || row.status === 'cancelled' || row.status === 'done') {
            setBooked(prev => { const next = new Set(prev); next.delete(slot); return next })
          } else if (row.status === 'pending' || row.status === 'confirmed') {
            setBooked(prev => new Set([...prev, slot]))
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe(); channelRef.current = null }
  }, [barberId, date?.toDateString(), slotMinutes])

  return { slots, booked, loading }
}
