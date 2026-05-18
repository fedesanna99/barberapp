import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

// Persistent bookmark/save tracking on Feed posts. Mirrors the
// likedIds set in useFeed but lives in its own table (saved_posts)
// with insert/delete instead of a counter.
//
// In demo / logged-out, the toggle stays in memory only (lost on
// reload) — matches how demo mode handles other writes.
export function useSavedPosts(userId: string | undefined) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (IS_DEMO || !userId) {
      setSavedIds(new Set())
      return
    }
    supabase
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setSavedIds(new Set(data.map(r => r.post_id)))
      })
  }, [userId])

  const toggleSaved = useCallback(async (postId: string): Promise<{ error: string | null }> => {
    const isSaved = savedIds.has(postId)
    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev)
      if (isSaved) next.delete(postId); else next.add(postId)
      return next
    })
    if (IS_DEMO || !userId) return { error: null }
    const { error } = isSaved
      ? await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', postId)
      : await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
    if (error) {
      // Rollback on DB failure (e.g. RLS denial, offline)
      setSavedIds(prev => {
        const next = new Set(prev)
        if (isSaved) next.add(postId); else next.delete(postId)
        return next
      })
      return { error: error.message }
    }
    return { error: null }
  }, [userId, savedIds])

  return { savedIds, toggleSaved }
}
