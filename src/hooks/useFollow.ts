import { useState, useEffect } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export function useFollow(userId: string | undefined, barberId: string | undefined) {
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [followersCount, setFollowersCount] = useState<number | null>(null)
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    if (IS_DEMO || !userId || !barberId) return
    Promise.all([
      supabase.from('follows')
        .select('follower_id')
        .eq('follower_id', userId)
        .eq('barber_id', barberId)
        .maybeSingle(),
      supabase.from('barbers')
        .select('followers_count')
        .eq('id', barberId)
        .single(),
    ]).then(([followRes, barberRes]) => {
      setIsFollowing(!!followRes.data)
      if (barberRes.data) setFollowersCount(barberRes.data.followers_count)
    })
  }, [userId, barberId])

  async function toggle() {
    if (loading) return
    setLoading(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowersCount(c => c !== null ? c + (wasFollowing ? -1 : 1) : c)

    if (!IS_DEMO && userId && barberId) {
      if (wasFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', userId)
          .eq('barber_id', barberId)
      } else {
        await supabase.from('follows').insert({ follower_id: userId, barber_id: barberId })
      }
    }
    setLoading(false)
  }

  return { isFollowing, followersCount, toggle, loading }
}
