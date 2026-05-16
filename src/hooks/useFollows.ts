import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface FollowedBarber {
  barberId: string
  displayName: string | null
}

export function useFollows(userId: string | undefined) {
  const [follows, setFollows] = useState<FollowedBarber[]>([])

  useEffect(() => {
    if (IS_DEMO || !userId) return
    supabase
      .from('follows')
      .select('barber_id, barbers(profile:profiles(display_name))')
      .eq('follower_id', userId)
      .then(({ data }) => {
        if (!data) return
        setFollows(
          (data as unknown as { barber_id: string; barbers: { profile: { display_name: string | null } | null } | null }[])
            .map(row => ({
              barberId:    row.barber_id,
              displayName: row.barbers?.profile?.display_name ?? null,
            })),
        )
      })
  }, [userId])

  return follows
}
