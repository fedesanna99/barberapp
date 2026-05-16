import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Availability } from '../types/supabase'

export function useAvailabilitySettings(barberId: string | undefined) {
  const [rows, setRows] = useState<Availability[]>([])

  useEffect(() => {
    if (!barberId) return
    supabase
      .from('availability')
      .select('*')
      .eq('barber_id', barberId)
      .then(({ data }) => setRows((data ?? []) as Availability[]))
  }, [barberId])

  async function upsertDay(day_of_week: number, start_time: string, end_time: string) {
    if (!barberId) return
    const { data } = await supabase
      .from('availability')
      .upsert(
        { barber_id: barberId, day_of_week, start_time, end_time },
        { onConflict: 'barber_id,day_of_week' },
      )
      .select()
      .single()
    if (data) {
      setRows(prev => {
        const idx = prev.findIndex(r => r.day_of_week === day_of_week)
        return idx >= 0
          ? prev.map((r, i) => (i === idx ? (data as Availability) : r))
          : [...prev, data as Availability]
      })
    }
  }

  async function removeDay(day_of_week: number) {
    if (!barberId) return
    await supabase
      .from('availability')
      .delete()
      .eq('barber_id', barberId)
      .eq('day_of_week', day_of_week)
    setRows(prev => prev.filter(r => r.day_of_week !== day_of_week))
  }

  return { rows, upsertDay, removeDay }
}
