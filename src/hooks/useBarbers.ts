import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { haversineKm } from '../lib/geo'
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

export type SortMode = 'nearby' | 'popular' | 'new' | 'toprated'

// Re-export so existing call sites that imported it from this hook keep working.
export { haversineKm } from '../lib/geo'

export function useBarbers(
  sort: SortMode,
  userLat?: number,
  userLng?: number,
  search = '',
) {
  const [barbers, setBarbers] = useState<BarberWithProfile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)

    let query = supabase.from('barbers').select('*')
    if (sort === 'popular')  query = query.order('followers_count', { ascending: false })
    if (sort === 'new')      query = query.order('created_at',     { ascending: false })
    if (sort === 'toprated') query = query.order('rating',         { ascending: false })

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

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        result = result.filter(b =>
          (b.profile.display_name ?? '').toLowerCase().includes(q) ||
          (b.shop_name ?? '').toLowerCase().includes(q) ||
          (b.city ?? '').toLowerCase().includes(q) ||
          (b.specialties ?? '').toLowerCase().includes(q),
        )
      }

      if (sort === 'nearby' && userLat != null && userLng != null) {
        result = result
          .filter(b => b.profile.lat != null && b.profile.lng != null)
          .sort((a, b) =>
            haversineKm({ lat: userLat, lng: userLng }, { lat: a.profile.lat!, lng: a.profile.lng! }) -
            haversineKm({ lat: userLat, lng: userLng }, { lat: b.profile.lat!, lng: b.profile.lng! }),
          )
      }

      setBarbers(result)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [sort, userLat, userLng, search])

  return { barbers, loading }
}
