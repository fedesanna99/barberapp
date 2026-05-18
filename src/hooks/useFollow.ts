import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

// Follow any profile (user or barber). When the followee is a barber, the trigger
// in migration 028 keeps `barbers.followers_count` in sync so other surfaces
// (sort-by-popular, story counts) stay accurate; we still display the count from
// a direct query so user follows have a number too.
export function useFollow(userId: string | undefined, followeeProfileId: string | undefined) {
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followersCount, setFollowersCount] = useState<number | null>(null)
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    if (IS_DEMO || !userId || !followeeProfileId) return
    let cancelled = false
    Promise.all([
      supabase.from('follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('followee_id', followeeProfileId)
        .maybeSingle(),
      supabase.from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followee_id', followeeProfileId),
    ]).then(([followRes, countRes]) => {
      if (cancelled) return
      setIsFollowing(!!followRes.data)
      setFollowersCount(countRes.count ?? 0)
    })
    return () => { cancelled = true }
  }, [userId, followeeProfileId])

  async function toggle() {
    if (loading) return
    // Self-follow is blocked by both UI and DB CHECK; bail early.
    if (userId && followeeProfileId && userId === followeeProfileId) return
    setLoading(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowersCount(c => c !== null ? c + (wasFollowing ? -1 : 1) : c)

    if (!IS_DEMO && userId && followeeProfileId) {
      if (wasFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', userId)
          .eq('followee_id', followeeProfileId)
      } else {
        await supabase.from('follows').insert({ follower_id: userId, followee_id: followeeProfileId })
      }
    }
    setLoading(false)
  }

  return { isFollowing, followersCount, toggle, loading }
}
