import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface BarberInfo {
  shop_name: string
  address: string
  phone: string
  social_link: string
}

const DEMO_INFO: BarberInfo = {
  shop_name:   '',
  address:     '',
  phone:       '',
  social_link: '',
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'it,en' } },
    )
    const data: { lat: string; lon: string }[] = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* silent */ }
  return null
}

export function useBarberInfo(barberId: string | undefined, profileId: string | undefined) {
  const [info, setInfo] = useState<BarberInfo>(DEMO_INFO)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (IS_DEMO || !barberId) return
    supabase
      .from('barbers')
      .select('shop_name, phone, address, social_link')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (data) setInfo({
          shop_name:   (data as BarberInfo).shop_name   ?? '',
          address:     (data as BarberInfo).address     ?? '',
          phone:       (data as BarberInfo).phone       ?? '',
          social_link: (data as BarberInfo).social_link ?? '',
        })
      })
  }, [barberId])

  async function saveInfo(next: BarberInfo): Promise<void> {
    setInfo(next)
    if (IS_DEMO || !barberId || !profileId) return
    setSaving(true)
    try {
      await supabase.from('barbers').update({
        shop_name:   next.shop_name   || null,
        phone:       next.phone       || null,
        address:     next.address     || null,
        social_link: next.social_link || null,
      } as never).eq('id', barberId)

      if (next.address) {
        const coords = await geocodeAddress(next.address)
        if (coords) {
          await supabase.from('profiles').update({ lat: coords.lat, lng: coords.lng }).eq('id', profileId)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return { info, saving, saveInfo }
}
