import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { DEMO_SERVICES } from '../lib/demoData'

export type Service = {
  id: string
  barber_id: string
  name: string
  price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
}

function toService(row: Record<string, unknown>): Service {
  return { ...row as Service, price: Number(row.price) }
}

// activeOnly = true → solo servizi attivi (usato dal cliente nel booking)
// activeOnly = false → tutti (usato dal barbiere nella gestione)
export function useServices(barberId: string | undefined, activeOnly = false) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)

  async function fetch() {
    if (IS_DEMO || !barberId) {
      const demo = DEMO_SERVICES.map(s => ({
        ...s, barber_id: barberId ?? '', is_active: true, created_at: '',
      }))
      setServices(activeOnly ? demo.filter(s => s.is_active) : demo)
      return
    }
    setLoading(true)
    let q = supabase
      .from('services')
      .select('*')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: true })
    if (activeOnly) q = q.eq('is_active', true)
    const { data } = await q
    setLoading(false)
    if (data) setServices(data.map(toService))
  }

  useEffect(() => { fetch() }, [barberId, activeOnly])

  async function addService(name: string, price: number, durationMinutes: number) {
    if (!barberId) return { error: new Error('Nessun barbiere selezionato') }
    const { data, error } = await supabase
      .from('services')
      .insert({ barber_id: barberId, name, price, duration_minutes: durationMinutes })
      .select()
      .single()
    if (data) setServices(prev => [...prev, toService(data)])
    return { error }
  }

  async function updateService(
    id: string,
    fields: Partial<Pick<Service, 'name' | 'price' | 'duration_minutes' | 'is_active'>>,
  ) {
    const { error } = await supabase.from('services').update(fields).eq('id', id)
    if (!error) setServices(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s))
    return { error }
  }

  async function deleteService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (!error) setServices(prev => prev.filter(s => s.id !== id))
    return { error }
  }

  return { services, loading, refetch: fetch, addService, updateService, deleteService }
}
