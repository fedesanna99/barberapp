import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface CommentRow {
  id:            string
  postId:        string
  authorId:      string | null
  authorName:    string
  authorAvatar?: string
  content:       string
  likesCount:    number
  likedByMe:     boolean
  createdAt:     string
}

// Demo mode keeps comments in module-level state so they survive
// reopening the sheet within a session. Seed mirrors the names that
// were hardcoded in Feed.tsx before this hook existed.
const DEMO_SEED: CommentRow[] = [
  { id: 's1', postId: '1', authorId: null, authorName: 'Luca R.',    content: 'Fuoco quella linea è chirurgica',  likesCount: 4, likedByMe: false, createdAt: new Date().toISOString() },
  { id: 's2', postId: '1', authorId: null, authorName: 'Marco T.',   content: 'Devo prenotare prima possibile',   likesCount: 2, likedByMe: false, createdAt: new Date().toISOString() },
  { id: 's3', postId: '2', authorId: null, authorName: 'Andrea G.',  content: 'Lo shave arabo è una cosa seria',  likesCount: 7, likedByMe: false, createdAt: new Date().toISOString() },
  { id: 's4', postId: '2', authorId: null, authorName: 'Youssef K.', content: 'Il migliore in zona senza dubbi',  likesCount: 3, likedByMe: false, createdAt: new Date().toISOString() },
  { id: 's5', postId: '3', authorId: null, authorName: 'Paolo V.',   content: 'French crop perfetto, bravo!',     likesCount: 5, likedByMe: false, createdAt: new Date().toISOString() },
  { id: 's6', postId: '4', authorId: null, authorName: 'Gianni M.',  content: 'Classic never dies',               likesCount: 6, likedByMe: false, createdAt: new Date().toISOString() },
]
let demoComments: CommentRow[] = [...DEMO_SEED]

export function useComments(postId: string | null, userId: string | undefined) {
  const [comments,  setComments]  = useState<CommentRow[]>([])
  const [meProfile, setMeProfile] = useState<{ name: string, avatar?: string } | null>(null)

  // Current user's profile, used to render optimistic adds with the
  // real name/avatar before the insert round-trip returns.
  useEffect(() => {
    if (IS_DEMO || !userId) { setMeProfile(null); return }
    supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        setMeProfile({
          name:   data?.display_name ?? 'Tu',
          avatar: data?.avatar_url ?? undefined,
        })
      })
  }, [userId])

  useEffect(() => {
    if (!postId) { setComments([]); return }
    if (IS_DEMO) {
      setComments(demoComments.filter(c => c.postId === postId))
      return
    }
    let cancelled = false
    ;(async () => {
      const [{ data: rows }, likedRes] = await Promise.all([
        supabase
          .from('comments')
          .select('id, post_id, author_id, content, likes_count, created_at, profiles:author_id(display_name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true }),
        userId
          ? supabase.from('comment_likes').select('comment_id').eq('user_id', userId)
          : Promise.resolve({ data: null as { comment_id: string }[] | null }),
      ])
      if (cancelled) return
      const likedSet = new Set((likedRes.data ?? []).map(r => r.comment_id))
      setComments(
        (rows ?? []).map((r: any) => ({
          id:           r.id,
          postId:       r.post_id,
          authorId:     r.author_id,
          authorName:   r.profiles?.display_name ?? 'Utente',
          authorAvatar: r.profiles?.avatar_url ?? undefined,
          content:      r.content,
          likesCount:   r.likes_count,
          likedByMe:    likedSet.has(r.id),
          createdAt:    r.created_at,
        }))
      )
    })()
    return () => { cancelled = true }
  }, [postId, userId])

  // All mutations roll back optimistically on failure AND return the error
  // message so the caller can surface it via toast (the hook itself stays
  // UI-agnostic).
  type MutResult = { error: string | null }

  const add = useCallback(async (content: string): Promise<MutResult> => {
    if (!postId) return { error: null }
    if (IS_DEMO) {
      const c: CommentRow = {
        id:           'demo-' + crypto.randomUUID(),
        postId,
        authorId:     null,
        authorName:   'Tu',
        content,
        likesCount:   0,
        likedByMe:    false,
        createdAt:    new Date().toISOString(),
      }
      demoComments = [...demoComments, c]
      setComments(prev => [...prev, c])
      return { error: null }
    }
    if (!userId) return { error: null }
    const tempId = 'optim-' + crypto.randomUUID()
    const optimistic: CommentRow = {
      id:           tempId,
      postId,
      authorId:     userId,
      authorName:   meProfile?.name ?? 'Tu',
      authorAvatar: meProfile?.avatar,
      content,
      likesCount:   0,
      likedByMe:    false,
      createdAt:    new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: userId, content })
      .select('id, created_at')
      .single()
    if (error || !data) {
      setComments(prev => prev.filter(c => c.id !== tempId))
      return { error: error?.message ?? 'Errore sconosciuto' }
    }
    setComments(prev => prev.map(c =>
      c.id === tempId ? { ...c, id: data.id, createdAt: data.created_at } : c
    ))
    return { error: null }
  }, [postId, userId, meProfile])

  const remove = useCallback(async (commentId: string): Promise<MutResult> => {
    if (IS_DEMO) {
      demoComments = demoComments.filter(c => c.id !== commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      return { error: null }
    }
    if (!userId) return { error: null }
    const snapshot = comments
    setComments(prev => prev.filter(c => c.id !== commentId))
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (error) {
      setComments(snapshot)
      return { error: error.message }
    }
    return { error: null }
  }, [comments, userId])

  const toggleLike = useCallback(async (commentId: string): Promise<MutResult> => {
    const target = comments.find(c => c.id === commentId)
    if (!target) return { error: null }
    const wasLiked = target.likedByMe
    const flip = (c: CommentRow): CommentRow => c.id === commentId
      ? { ...c, likedByMe: !wasLiked, likesCount: c.likesCount + (wasLiked ? -1 : 1) }
      : c
    const unflip = (c: CommentRow): CommentRow => c.id === commentId
      ? { ...c, likedByMe: wasLiked, likesCount: c.likesCount + (wasLiked ? 1 : -1) }
      : c

    if (IS_DEMO) {
      demoComments = demoComments.map(flip)
      setComments(prev => prev.map(flip))
      return { error: null }
    }
    if (!userId) return { error: null }
    setComments(prev => prev.map(flip))
    const { error } = wasLiked
      ? await supabase.from('comment_likes').delete().eq('user_id', userId).eq('comment_id', commentId)
      : await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId })
    if (error) {
      setComments(prev => prev.map(unflip))
      return { error: error.message }
    }
    return { error: null }
  }, [comments, userId])

  return { comments, add, remove, toggleLike }
}
