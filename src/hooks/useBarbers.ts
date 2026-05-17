import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Barber, BarberWithProfile } from '../types/supabase'

export function useBarberByProfile(profileId: string | undefined): string | undefined {
  const [barberId, setBarberId] = useState<string | undefined>()
  useEffect(() => {
    if (!profileId) {
      setBarberId(undefined)
      return
    }
    supabase
      .from('barbers')
      .select('id')
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => { if (data) setBarberId(data.id) })
  }, [profileId])
  return barberId
}

export type SortMode = 'nearby' | 'popular' | 'new'

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useBarbers(
  sort: SortMode,
  userLat?: number,
  userLng?: number,
) {
  const [barbers, setBarbers] = useState<BarberWithProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)

    // Fetch barbers without nested profile embed to avoid ambiguous FK issues
    let query = supabase.from('barbers').select('*')

    if (sort === 'popular') query = query.order('followers_count', { ascending: false })
    if (sort === 'new')     query = query.order('created_at',     { ascending: false })

    let cancelled = false

    query.then(async ({ data: barbersData, error }) => {
      if (cancelled) return
      if (error) { console.error('[useBarbers]', error); setLoading(false); return }

      const rows = (barbersData ?? []) as Barber[]

      const profileIds = [...new Set(rows.map(b => b.profile_id))]
      const { data: profilesData } = profileIds.length > 0
        ? await supabase.from('profiles').select('id, display_name, avatar_url, lat, lng').in('id', profileIds)
        : { data: [] }

      if (cancelled) return

      const profileMap = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))

      let result: BarberWithProfile[] = rows.map(b => ({
        ...b,
        profile: profileMap[b.profile_id] ?? { display_name: null, avatar_url: null, lat: null, lng: null },
      }))

      if (sort === 'nearby' && userLat != null && userLng != null) {
        result = result
          .filter(b => b.profile.lat != null && b.profile.lng != null)
          .sort((a, b) =>
            haversineKm(userLat, userLng, a.profile.lat!, a.profile.lng!) -
            haversineKm(userLat, userLng, b.profile.lat!, b.profile.lng!),
          )
      }

      setBarbers(result)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [sort, userLat, userLng])

  return { barbers, loading }
}
