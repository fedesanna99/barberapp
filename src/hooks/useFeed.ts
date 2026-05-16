import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PostWithBarber } from '../types/supabase'

const PAGE = 12

export function useFeed(userId: string | undefined) {
  const [posts, setPosts]   = useState<PostWithBarber[]>([])
  const [page, setPage]     = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setPosts([])
    setPage(0)
    setHasMore(true)
  }, [userId])

  useEffect(() => {
    if (!userId || !hasMore) return
    setLoading(true)

    // Fetch followed barber IDs first, then fetch their posts
    supabase
      .from('follows')
      .select('barber_id')
      .eq('follower_id', userId)
      .then(({ data: followRows }) => {
        const ids = (followRows ?? []).map(r => r.barber_id)
        if (ids.length === 0) {
          setPosts([])
          setHasMore(false)
          setLoading(false)
          return
        }

        supabase
          .from('posts')
          .select(`
            *,
            barbers (
              id,
              profile:profiles ( display_name, avatar_url )
            )
          `)
          .in('barber_id', ids)
          .order('created_at', { ascending: false })
          .range(page * PAGE, (page + 1) * PAGE - 1)
          .then(({ data, error }) => {
            if (error) { setLoading(false); return }
            const batch = (data ?? []) as PostWithBarber[]
            setPosts(prev => page === 0 ? batch : [...prev, ...batch])
            if (batch.length < PAGE) setHasMore(false)
            setLoading(false)
          })
      })
  }, [userId, page])

  return {
    posts,
    loading,
    hasMore,
    loadMore: () => { if (hasMore && !loading) setPage(p => p + 1) },
  }
}
