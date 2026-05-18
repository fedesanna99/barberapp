import { useCallback, useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'

export interface ReviewRow {
  id:           string
  barberId:     string
  clientId:     string
  authorName:   string
  authorAvatar?: string
  rating:       number    // 1..5
  comment:      string | null
  createdAt:    string
  updatedAt:    string
}

// ── Demo store ─────────────────────────────────────────────────────────────
// Mirrors useComments: module-level state so reviews survive sheet reopens
// within a single demo session. Seeded with a few cherry-picked entries so
// the profile screen isn't empty on first load.
const DEMO_SEED: ReviewRow[] = [
  { id: 's1', barberId: '1', clientId: 'demo-andrea',  authorName: 'Andrea G.', rating: 5, comment: 'Skin fade pulitissimo, prossimo taglio sicuro.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 's2', barberId: '1', clientId: 'demo-luca',    authorName: 'Luca R.',   rating: 5, comment: 'Bravissimo, sempre puntuale.',                     createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: 's3', barberId: '1', clientId: 'demo-marco',   authorName: 'Marco T.',  rating: 4, comment: 'Buon lavoro sulla barba.',                          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: 's4', barberId: '2', clientId: 'demo-youssef', authorName: 'Youssef K.',rating: 5, comment: 'Arabic shave fantastico.',                          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: 's5', barberId: '4', clientId: 'demo-paolo',   authorName: 'Paolo V.',  rating: 5, comment: 'Line up perfetta, consigliatissimo.',               createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
]
let demoReviews: ReviewRow[] = [...DEMO_SEED]

function recomputeBarberAvg(barberId: string): { rating: number; count: number } {
  const rs = demoReviews.filter(r => r.barberId === barberId)
  if (rs.length === 0) return { rating: 0, count: 0 }
  const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length
  return { rating: Math.round(avg * 10) / 10, count: rs.length }
}

// Exposed so screens (e.g. profile preview cards) can fold demo reviews
// into the displayed star count if they need to. Currently unused by App.
export function getDemoBarberRating(barberId: string): { rating: number; count: number } | null {
  if (!IS_DEMO) return null
  return recomputeBarberAvg(barberId)
}

// ── Hook ───────────────────────────────────────────────────────────────────
// Reads all reviews for a barber, exposes:
//  • myReview      — current user's review if any (so the UI can show edit/delete instead of create)
//  • canReview     — true iff the user has at least one done booking with this barber
//  • aggregate     — { rating, count } computed from the loaded list (kept in sync optimistically)
//  • upsert/remove — mutation helpers
//
// We don't realtime-subscribe; the typical interaction (one user
// leaving one review) doesn't need it and the barbers.rating
// updates flow through the standard reads anyway.
export function useReviews(barberId: string | undefined, userId: string | undefined) {
  const [reviews,  setReviews]   = useState<ReviewRow[]>([])
  const [loading,  setLoading]   = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false)

  // Load reviews
  useEffect(() => {
    if (!barberId) { setReviews([]); return }
    if (IS_DEMO) {
      setReviews(demoReviews.filter(r => r.barberId === barberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('reviews')
      .select('id, barber_id, client_id, rating, comment, created_at, updated_at, profiles:client_id(display_name, avatar_url)')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setReviews(
          (data ?? []).map((r: any) => ({
            id:           r.id,
            barberId:     r.barber_id,
            clientId:     r.client_id,
            authorName:   r.profiles?.display_name ?? 'Utente',
            authorAvatar: r.profiles?.avatar_url ?? undefined,
            rating:       r.rating,
            comment:      r.comment,
            createdAt:    r.created_at,
            updatedAt:    r.updated_at,
          })),
        )
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [barberId])

  // Compute eligibility (has at least one done booking with this barber)
  useEffect(() => {
    if (!barberId || !userId) { setCanReview(false); setEligibilityLoaded(true); return }
    if (IS_DEMO) {
      // Demo: pretend every logged-in user has cut with every barber so they can play with the UI.
      setCanReview(true)
      setEligibilityLoaded(true)
      return
    }
    let cancelled = false
    supabase
      .from('bookings')
      .select('id', { head: true, count: 'exact' })
      .eq('client_id', userId)
      .eq('barber_id', barberId)
      .eq('status', 'done')
      .then(({ count }) => {
        if (cancelled) return
        setCanReview((count ?? 0) > 0)
        setEligibilityLoaded(true)
      })
    return () => { cancelled = true }
  }, [barberId, userId])

  // In demo mode we always pin a fake author id ('demo-me') so the user's own
  // review still shows up as "mine" even if they're not signed in.
  const effectiveUserId = IS_DEMO ? (userId ?? 'demo-me') : userId
  const myReview = effectiveUserId
    ? reviews.find(r => r.clientId === effectiveUserId) ?? null
    : null
  const aggregate = (() => {
    if (reviews.length === 0) return { rating: 0, count: 0 }
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    return { rating: Math.round(avg * 10) / 10, count: reviews.length }
  })()

  // Create OR update — we always upsert against (barber_id, client_id) so
  // double-tap on "save" can't ever insert a second row.
  const upsertReview = useCallback(async (rating: number, comment: string | null): Promise<{ error?: string }> => {
    if (!barberId) return { error: 'missing_barber' }
    if (rating < 1 || rating > 5) return { error: 'invalid_rating' }
    const cleanComment = comment?.trim() || null

    if (IS_DEMO) {
      const cid = userId ?? 'demo-me'
      const existing = demoReviews.find(r => r.barberId === barberId && r.clientId === cid)
      const now = new Date().toISOString()
      if (existing) {
        existing.rating  = rating
        existing.comment = cleanComment
        existing.updatedAt = now
      } else {
        demoReviews.push({
          id:         'demo-' + crypto.randomUUID(),
          barberId,
          clientId:   cid,
          authorName: 'Tu',
          rating,
          comment:    cleanComment,
          createdAt:  now,
          updatedAt:  now,
        })
      }
      setReviews(demoReviews.filter(r => r.barberId === barberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      return {}
    }

    if (!userId) return { error: 'not_authenticated' }
    const { error } = await supabase
      .from('reviews')
      .upsert(
        { barber_id: barberId, client_id: userId, rating, comment: cleanComment },
        { onConflict: 'barber_id,client_id' },
      )
    if (error) return { error: error.message }

    // Refetch to pick up server-generated ids/timestamps and the joined profile
    const { data } = await supabase
      .from('reviews')
      .select('id, barber_id, client_id, rating, comment, created_at, updated_at, profiles:client_id(display_name, avatar_url)')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false })
    setReviews(
      (data ?? []).map((r: any) => ({
        id:           r.id,
        barberId:     r.barber_id,
        clientId:     r.client_id,
        authorName:   r.profiles?.display_name ?? 'Utente',
        authorAvatar: r.profiles?.avatar_url ?? undefined,
        rating:       r.rating,
        comment:      r.comment,
        createdAt:    r.created_at,
        updatedAt:    r.updated_at,
      })),
    )
    return {}
  }, [barberId, userId])

  const removeReview = useCallback(async (): Promise<{ error?: string }> => {
    if (!barberId) return { error: 'missing_barber' }
    if (IS_DEMO) {
      const cid = userId ?? 'demo-me'
      demoReviews = demoReviews.filter(r => !(r.barberId === barberId && r.clientId === cid))
      setReviews(demoReviews.filter(r => r.barberId === barberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      return {}
    }
    if (!userId) return { error: 'not_authenticated' }
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('barber_id', barberId)
      .eq('client_id', userId)
    if (error) return { error: error.message }
    setReviews(prev => prev.filter(r => r.clientId !== userId))
    return {}
  }, [barberId, userId])

  return {
    reviews,
    loading,
    myReview,
    canReview,
    eligibilityLoaded,
    aggregate,
    upsertReview,
    removeReview,
    // Use this when you need to highlight "my review" in a list — accounts for
    // the demo-mode fallback id when no real user is signed in.
    effectiveUserId,
  }
}
