import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { BARBERS, POSTS } from '../lib/demoData'

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
  if (h < 1) return 'Adesso'
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}

// Module-level mutable store so barber posts survive screen switches in demo mode
let demoPosts: FeedPost[] = POSTS.map(p => {
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

export function useFeed(userId: string | undefined, _ownBarberId?: string) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const prependPost = useCallback((p: FeedPost) => {
    if (IS_DEMO) demoPosts = [p, ...demoPosts]
    setPosts(prev => [p, ...prev])
  }, [])

  const setLiked = useCallback((postId: string, on: boolean) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      on ? next.add(postId) : next.delete(postId)
      return next
    })
  }, [])

  const updatePostLikesCount = useCallback((postId: string, delta: number) => {
    if (IS_DEMO) demoPosts = demoPosts.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + delta } : p)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likesCount: p.likesCount + delta } : p))
  }, [])

  useEffect(() => {
    if (IS_DEMO) {
      setPosts(demoPosts)
      setHasMore(false)
      return
    }
    if (!userId) {
      setPosts([])
      setLikedIds(new Set())
      setPage(0)
      setHasMore(true)
      return
    }
    setPosts([])
    setPage(0)
    setHasMore(true)
    setLikedIds(new Set())
    let cancelled = false
    supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return
        if (data) setLikedIds(new Set(data.map(r => r.post_id)))
      })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    if (IS_DEMO || !userId) return
    if (page > 0 && !hasMore) return
    setLoading(true)

    let cancelled = false

    supabase
      .from('posts')
      .select('*, barbers ( id, city, profile_id )')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .then(async ({ data: postsData, error }) => {
        if (cancelled) return
        if (error) { setLoading(false); return }

        const profileIds = [...new Set((postsData ?? []).map(p => (p.barbers as any).profile_id as string))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', profileIds)

        if (cancelled) return

        const profileMap = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))

        const batch: FeedPost[] = (postsData ?? []).map(p => {
          const b = p.barbers as any
          const prof = profileMap[b.profile_id] ?? {}
          return {
            id: p.id,
            barberId: b.id,
            barberName: prof.display_name ?? 'Barber',
            barberInitials: initialsFromName(prof.display_name ?? null),
            barberCity: b.city ?? '',
            barberAccent: accentFromId(b.id),
            barberAvatarUrl: prof.avatar_url ?? undefined,
            likesCount: p.likes_count,
            caption: p.caption ?? '',
            label: (p as any).label ?? '',
            createdAt: p.created_at,
            timeAgo: timeAgo(p.created_at),
            imageUrl: p.image_url ?? undefined,
          }
        })

        setPosts(prev => page === 0 ? batch : [...prev, ...batch])
        if (batch.length < PAGE) setHasMore(false)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId, page])

  return {
    posts,
    likedIds,
    loading,
    hasMore,
    loadMore: () => { if (hasMore && !loading) setPage(p => p + 1) },
    prependPost,
    setLiked,
    updatePostLikesCount,
  }
}
