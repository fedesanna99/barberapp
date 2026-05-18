import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

// A profile (user or barber) the current user follows. `barberId` is populated
// only when the followee has a `barbers` row — surfaces that still need the
// barber id (booking, dashboard) keep working without a second lookup.
export interface FollowedProfile {
  profileId:   string
  displayName: string | null
  role:        'client' | 'barber' | null
  barberId:    string | null
}

export function useFollows(userId: string | undefined) {
  const [follows, setFollows] = useState<FollowedProfile[]>([])

  useEffect(() => {
    if (IS_DEMO || !userId) return
    let cancelled = false
    supabase
      .from('follows')
      .select('followee_id, profile:profiles!follows_followee_id_fkey(display_name, role, barbers(id))')
      .eq('follower_id', userId)
      .then(({ data }) => {
        if (cancelled || !data) return
        setFollows(
          (data as unknown as {
            followee_id: string
            profile: {
              display_name: string | null
              role: 'client' | 'barber'
              barbers: { id: string }[] | { id: string } | null
            } | null
          }[]).map(row => {
            const b = row.profile?.barbers
            const barberId = Array.isArray(b) ? (b[0]?.id ?? null) : (b?.id ?? null)
            return {
              profileId:   row.followee_id,
              displayName: row.profile?.display_name ?? null,
              role:        row.profile?.role ?? null,
              barberId,
            }
          }),
        )
      })
    return () => { cancelled = true }
  }, [userId])

  return follows
}
