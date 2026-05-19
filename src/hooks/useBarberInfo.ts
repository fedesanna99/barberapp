import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'

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

interface NominatimHit {
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    suburb?: string
  }
}

// Heuristic: split "Via Foo 14, Cagliari" or "Via Foo 14 cagliari" into
// (street, city). If we can't tell, return (input, undefined) so we fall
// back to free-text search.
function splitAddress(input: string): { street: string; city?: string } {
  const trimmed = input.trim().replace(/\s+/g, ' ')
  // 1) Explicit comma — last segment is the city
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const city = parts[parts.length - 1]
      const street = parts.slice(0, -1).join(', ')
      return { street, city }
    }
  }
  // 2) No comma — assume the last word is the city when there are >=3 words.
  // Avoids stealing numbers (e.g. "Via X 14" → keep all as street).
  const tokens = trimmed.split(' ')
  if (tokens.length >= 3) {
    const last = tokens[tokens.length - 1]
    if (!/^\d+$/.test(last) && last.length > 2) {
      return { street: tokens.slice(0, -1).join(' '), city: last }
    }
  }
  return { street: trimmed }
}

// Returns a hit whose city matches `wantedCity` (case insensitive).
// Returns null if `wantedCity` is set but no result matches — so the caller
// can decide whether to fall back.
function pickStrict(hits: NominatimHit[], wantedCity?: string): NominatimHit | null {
  if (hits.length === 0) return null
  if (!wantedCity) return hits[0]
  const w = wantedCity.toLowerCase()
  return hits.find(h => {
    const c = (h.address?.city || h.address?.town || h.address?.village || h.address?.municipality || '').toLowerCase()
    return c === w
  }) ?? null
}

async function nominatim(params: string): Promise<NominatimHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=it&${params}`
  return fetch(url, { headers: { 'Accept-Language': 'it,en' } }).then(r => r.json()) as Promise<NominatimHit[]>
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const { street, city } = splitAddress(address)
  // Pull off a leading/trailing house number ("Via X 14" → street="Via X", num="14")
  const numMatch = street.match(/^\s*(\d+)\s+(.+)$|^(.+?)\s+(\d+)\s*$/)
  const streetNoNum = numMatch ? (numMatch[2] || numMatch[3]).trim() : street

  try {
    if (city) {
      // 1) Structured with house number, filter to matching city.
      let hit = pickStrict(await nominatim(`street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}`), city)
      if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
      // 2) Structured WITHOUT the house number (some streets only have a centroid in OSM).
      if (streetNoNum !== street) {
        hit = pickStrict(await nominatim(`street=${encodeURIComponent(streetNoNum)}&city=${encodeURIComponent(city)}`), city)
        if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
      }
      // 3) Free-text but still strict on city — refuses to silently snap to another town.
      hit = pickStrict(await nominatim(`q=${encodeURIComponent(address)}`), city)
      if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
      // 4) Last resort: pin to the city itself rather than wrong-town accuracy.
      hit = (await nominatim(`city=${encodeURIComponent(city)}`))[0] ?? null
      if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
    } else {
      // No city hint — accept the top free-text result.
      const hit = (await nominatim(`q=${encodeURIComponent(address)}`))[0]
      if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) }
    }
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
    const clean: BarberInfo = {
      ...next,
      shop_name:   limitText(next.shop_name.trim(), TEXT_LIMITS.shopName),
      address:     limitText(next.address.trim(), TEXT_LIMITS.address),
      phone:       limitText(next.phone.trim(), TEXT_LIMITS.phone),
      social_link: limitText(next.social_link.trim(), TEXT_LIMITS.socialLink),
    }
    // Parse + validate the numeric defaults; fall back to current/sensible values
    // rather than rejecting outright (the input is text and may be empty mid-typing).
    const slotMin = Math.max(1, Math.min(240, parseInt(clean.default_slot_minutes, 10) || 30))
    const price   = Math.max(0, parseFloat(clean.default_price.replace(',', '.')) || 0)
    setInfo({ ...clean, default_slot_minutes: String(slotMin), default_price: String(price) })
    if (IS_DEMO || !barberId || !profileId) return null
    setSaving(true)
    try {
      const { error } = await supabase.from('barbers').update({
        shop_name:            clean.shop_name   || null,
        phone:                clean.phone       || null,
        address:              clean.address     || null,
        social_link:          clean.social_link || null,
        default_slot_minutes: slotMin,
        default_price:        price,
      }).eq('id', barberId)

      if (error) {
        console.error('[saveInfo]', error)
        setSaveError(error.message)
        return error.message
      }

      if (clean.address) {
        const coords = await geocodeAddress(clean.address)
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
