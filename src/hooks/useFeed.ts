import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { BARBERS, POSTS } from '../lib/demoData'
import type { PostWithBarber } from '../types/supabase'

export interface FeedPost {
  id: string
  barberId: string
  barberName: string
  barberInitials: string
  barberCity: string
  barberAccent: string
  barberAvatarUrl?: string
  likesCount: number
  caption: string
  label: string
  createdAt: string
  timeAgo: string
  imageUrl?: string
}

const ACCENT_PALETTE = ['#5DCAA5', '#85B7EB', '#EF9F27', '#AFA9EC', '#F09595', '#72BCD4', '#E8B86D']

export function accentFromId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ACCENT_PALETTE[Math.abs(h) % ACCENT_PALETTE.length]
}

export function initialsFromName(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const DEMO_FEED: FeedPost[] = POSTS.map(p => {
  const b = BARBERS.find(b => b.id === p.barberId)!
  return {
    id: String(p.id),
    barberId: String(p.barberId),
    barberName: b.name,
    barberInitials: b.initials,
    barberCity: b.city,
    barberAccent: b.accent,
    barberAvatarUrl: undefined,
    likesCount: p.likes,
    caption: p.caption,
    label: p.label,
    createdAt: new Date().toISOString(),
    timeAgo: p.timeAgo,
    imageUrl: p.imageUrl,
  }
})

const PAGE = 12

export function useFeed(userId: string | undefined) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const prependPost = useCallback((p: FeedPost) => setPosts(prev => [p, ...prev]), [])

  const setLiked = useCallback((postId: string, on: boolean) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      on ? next.add(postId) : next.delete(postId)
      return next
    })
  }, [])

  // Reset state (and load liked IDs) when the logged-in user changes
  useEffect(() => {
    if (IS_DEMO) {
      setPosts(DEMO_FEED)
      setHasMore(false)
      return
    }
    if (!userId) return
    setPosts([])
    setPage(0)
    setHasMore(true)
    setLikedIds(new Set())
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (data) setLikedIds(new Set(data.map(r => r.post_id)))
      })
  }, [userId])

  // Fetch one page of posts from followed barbers
  useEffect(() => {
    if (IS_DEMO || !userId || !hasMore) return
    setLoading(true)

    supabase
      .from('follows')
      .select('barber_id')
      .eq('follower_id', userId)
      .then(({ data: followRows }) => {
        const ids = (followRows ?? []).map(r => r.barber_id)
        if (ids.length === 0) {
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
              city,
              profile:profiles!barbers_profile_id_fkey ( display_name, avatar_url )
            )
          `)
          .in('barber_id', ids)
          .order('created_at', { ascending: false })
          .range(page * PAGE, (page + 1) * PAGE - 1)
          .then(({ data, error }) => {
            if (error) { setLoading(false); return }
            const batch = (data ?? [] as PostWithBarber[]).map(p => {
              const raw = p as PostWithBarber
              return {
                id: raw.id,
                barberId: raw.barbers.id,
                barberName: raw.barbers.profile.display_name ?? 'Barber',
                barberInitials: initialsFromName(raw.barbers.profile.display_name),
                barberCity: raw.barbers.city ?? '',
                barberAccent: accentFromId(raw.barbers.id),
                barberAvatarUrl: raw.barbers.profile.avatar_url ?? undefined,
                likesCount: raw.likes_count,
                caption: raw.caption ?? '',
                label: raw.label ?? '',
                createdAt: raw.created_at,
                timeAgo: timeAgo(raw.created_at),
                imageUrl: raw.image_url,
              } satisfies FeedPost
            })
            setPosts(prev => page === 0 ? batch : [...prev, ...batch])
            if (batch.length < PAGE) setHasMore(false)
            setLoading(false)
          })
      })
  }, [userId, page])

  return {
    posts,
    likedIds,
    loading,
    hasMore,
    loadMore: () => { if (hasMore && !loading) setPage(p => p + 1) },
    prependPost,
    setLiked,
  }
}
