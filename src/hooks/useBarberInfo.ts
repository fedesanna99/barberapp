import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface BarberInfo {
  shop_name: string
  address: string
  phone: string
  social_link: string
  // Per-barber booking defaults. Stored as strings in the form so the
  // text inputs in EditBarberInfoSheet can hold empty/invalid values
  // mid-typing; parsed to int/numeric in saveInfo.
  default_slot_minutes: string
  default_price: string
}

const DEMO_INFO: BarberInfo = {
  shop_name:            '',
  address:              '',
  phone:                '',
  social_link:          '',
  default_slot_minutes: '30',
  default_price:        '25',
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
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEMO || !barberId) return
    supabase
      .from('barbers')
      .select('shop_name, phone, address, social_link, default_slot_minutes, default_price')
      .eq('id', barberId)
      .single()
      .then(({ data }) => {
        if (data) setInfo({
          shop_name:            data.shop_name   ?? '',
          address:              data.address     ?? '',
          phone:                data.phone       ?? '',
          social_link:          data.social_link ?? '',
          default_slot_minutes: String(data.default_slot_minutes ?? 30),
          default_price:        String(data.default_price ?? 25),
        })
      })
  }, [barberId])

  async function saveInfo(next: BarberInfo): Promise<string | null> {
    setSaveError(null)
    // Parse + validate the numeric defaults; fall back to current/sensible values
    // rather than rejecting outright (the input is text and may be empty mid-typing).
    const slotMin = Math.max(1, Math.min(240, parseInt(next.default_slot_minutes, 10) || 30))
    const price   = Math.max(0, parseFloat(next.default_price.replace(',', '.')) || 0)
    setInfo({ ...next, default_slot_minutes: String(slotMin), default_price: String(price) })
    if (IS_DEMO || !barberId || !profileId) return null
    setSaving(true)
    try {
      const { error } = await supabase.from('barbers').update({
        shop_name:            next.shop_name   || null,
        phone:                next.phone       || null,
        address:              next.address     || null,
        social_link:          next.social_link || null,
        default_slot_minutes: slotMin,
        default_price:        price,
      }).eq('id', barberId)

      if (error) {
        console.error('[saveInfo]', error)
        setSaveError(error.message)
        return error.message
      }

      if (next.address) {
        const coords = await geocodeAddress(next.address)
        if (coords) {
          await supabase.from('profiles').update({ lat: coords.lat, lng: coords.lng }).eq('id', profileId)
        }
      }
      return null
    } finally {
      setSaving(false)
    }
  }

  return { info, saving, saveError, saveInfo }
}
