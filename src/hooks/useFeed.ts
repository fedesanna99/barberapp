import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { BARBERS, POSTS } from '../lib/demoData'

export interface FeedPost {
  id: string
  // null when the author is a normal user (not a barber)
  barberId: string | null
  // Always the author's profiles.id (was historically called barberProfileId; kept
  // for backwards-compat in the existing call sites).
  barberProfileId: string
  barberName: string
  barberInitials: string
  // City is only meaningful for barber posts (from barbers.city); empty otherwise.
  barberCity: string
  barberAccent: string
  barberAvatarUrl?: string
  likesCount: number
  commentsCount: number
  caption: string
  label: string
  createdAt: string
  timeAgo: string
  imageUrl?: string
  // Task 2: true when the post is from a non-barber user — hides barber-only
  // UI (Prenota CTA, etc.) and routes profile clicks to the user profile.
  isUserPost?: boolean
  // Task 13 — at most 1 tagged profile per post (UI + DB enforce it).
  taggedProfileId?: string | null
  taggedName?: string | null
  taggedRole?: 'client' | 'barber' | null
  // Barber coordinates — needed to compute haversine distance when opening profile from Feed
  barberLat?: number | null
  barberLng?: number | null
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
    barberProfileId: String(p.barberId),
    barberName: b.name,
    barberInitials: b.initials,
    barberCity: b.city,
    barberAccent: b.accent,
    barberAvatarUrl: undefined,
    likesCount: p.likes,
    commentsCount: 0,
    caption: p.caption,
    label: p.label,
    createdAt: new Date().toISOString(),
    timeAgo: p.timeAgo,
    imageUrl: p.imageUrl,
    isUserPost: false,
    barberLat: b.lat ?? null,
    barberLng: b.lng ?? null,
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

  // Task 11 — local-state removal after a hard-delete in `posts`.
  const removePostLocal = useCallback((postId: string) => {
    if (IS_DEMO) demoPosts = demoPosts.filter(p => p.id !== postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }, [])

  // Task 11 — local-state caption patch after a DB update.
  const updatePostCaption = useCallback((postId: string, caption: string) => {
    if (IS_DEMO) demoPosts = demoPosts.map(p => p.id === postId ? { ...p, caption } : p)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, caption } : p))
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

    // Task 2: posts now have an `author_id` (any profile) — barber_id is optional
    // (null for user posts). Fetch profile via author_id; city only when barber_id exists.
    supabase
      .from('posts')
      .select('*, barbers ( id, city, profiles ( lat, lng ) )')
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1)
      .then(async ({ data: postsData, error }) => {
        if (cancelled) return
        if (error) { setLoading(false); return }

        const authorIds = [...new Set((postsData ?? []).map(p => (p as any).author_id as string).filter(Boolean))]
        const taggedIds = [...new Set((postsData ?? [])
          .map(p => (p as any).tagged_profile_id as string | null)
          .filter((x): x is string => !!x))]
        const profileIdsToFetch = [...new Set([...authorIds, ...taggedIds])]
        const { data: profilesData } = profileIdsToFetch.length > 0
          ? await supabase
              .from('profiles')
              .select('id, display_name, avatar_url, role')
              .in('id', profileIdsToFetch)
          : { data: [] }

        if (cancelled) return

        const profileMap = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))

        const batch: FeedPost[] = (postsData ?? []).map(p => {
          const authorId = (p as any).author_id as string
          const prof: any = profileMap[authorId] ?? {}
          const barberRow = p.barbers as any | null
          const isUserPost = !barberRow
          const accentSeed = barberRow?.id ?? authorId ?? p.id
          const taggedId = (p as any).tagged_profile_id as string | null
          const taggedProf: any = taggedId ? profileMap[taggedId] ?? null : null
          return {
            id: p.id,
            barberId: barberRow?.id ?? null,
            barberProfileId: authorId,
            barberName: prof.display_name ?? (isUserPost ? 'Utente' : 'Barber'),
            barberInitials: initialsFromName(prof.display_name ?? null),
            barberCity: barberRow?.city ?? '',
            barberAccent: accentFromId(accentSeed),
            barberAvatarUrl: prof.avatar_url ?? undefined,
            likesCount: p.likes_count,
            commentsCount: (p as any).comments_count ?? 0,
            caption: p.caption ?? '',
            label: (p as any).label ?? '',
            createdAt: p.created_at,
            timeAgo: timeAgo(p.created_at),
            imageUrl: p.image_url ?? undefined,
            isUserPost,
            taggedProfileId: taggedId ?? null,
            taggedName: taggedProf?.display_name ?? null,
            taggedRole: taggedProf?.role ?? null,
            barberLat: (barberRow?.profiles as any)?.lat ?? null,
            barberLng: (barberRow?.profiles as any)?.lng ?? null,
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
    removePostLocal,
    updatePostCaption,
  }
}

// Task 11 — extract the storage object key from a Supabase public URL so we
// can also delete the underlying image when a post is hard-deleted. Returns
// null when the URL doesn't match the expected shape (e.g. blob: in demo).
export function extractStoragePath(url: string | undefined, bucket: string): string | null {
  if (!url) return null
  const m = url.match(new RegExp(`/storage/v1/object/public/${bucket}/([^?]+)`))
  return m ? m[1] : null
}
