import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { useFeed, accentFromId, initialsFromName, extractStoragePath } from '../hooks/useFeed'
import type { FeedPost } from '../hooks/useFeed'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { writeLog } from '../hooks/useAdminLogs'
import { PostSkeleton } from '../components/Skeleton'
import { useBarbers } from '../hooks/useBarbers'
import { useSavedPosts } from '../hooks/useSavedPosts'
import type { BarberWithProfile } from '../types/supabase'
import { supabase, IS_DEMO } from '../lib/supabase'
import { uploadPostPhoto, uploadUserPostPhoto, validateImageType } from '../hooks/useUpload'
import { CommentsSheet } from './CommentsSheet'
import { PostMedia } from '../components/PostMedia'

function toStoryBarber(b: BarberWithProfile): DemoBarber {
  const name = b.profile.display_name ?? b.shop_name ?? 'Barbiere'
  return {
    id:        b.id,
    name,
    initials:  initialsFromName(name),
    city:      b.city ?? '',
    dist:      0,
    rating:    b.rating,
    tags:      b.specialties?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
    followers: b.followers_count,
    accent:    accentFromId(b.id),
    acceptingBookings: b.accepting_bookings,
    profileId: b.profile_id,
    reviewsCount: b.reviews_count,
  }
}

interface FeedProps {
  userId?:             string
  barberId?:           string
  onBook:              (barber: DemoBarber) => void
  onViewProfile:       (barber: DemoBarber) => void
  isBarber?:           boolean
  showLiked?:          boolean
  onShowLikedChange?:  (v: boolean) => void
  showSaved?:          boolean
  onShowSavedChange?:  (v: boolean) => void
}

function postToBarber(p: FeedPost): DemoBarber {
  return {
    id:        p.barberId ?? p.id,
    name:      p.barberName,
    initials:  p.barberInitials,
    city:      p.barberCity,
    dist:      0,
    // Task 8 — was hardcoded 4.8 (a fake fallback that leaked into the profile
    // sheet's rating stat). Use 0 + reviewsCount=0 so ratingDisplay() picks the
    // neutral "Nuovo" label; BarberProfileSheet refetches the real numbers.
    rating:    0,
    reviewsCount: 0,
    tags:      [],
    followers: 0,
    accent:    p.barberAccent,
    profileId: p.barberProfileId,
  }
}

export function Feed({ userId, barberId, onBook, onViewProfile, isBarber, showLiked = false, onShowLikedChange, showSaved = false, onShowSavedChange }: FeedProps) {
  const feed = useFeed(userId, barberId)
  // Stories row: real popular barbers in prod, fallback to BARBERS demo
  const { barbers: realStoryBarbers } = useBarbers('popular')
  const storyBarbers: DemoBarber[] = IS_DEMO || realStoryBarbers.length === 0
    ? BARBERS
    : realStoryBarbers.slice(0, 8).map(toStoryBarber)

  const { savedIds, toggleSaved } = useSavedPosts(userId)

  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [showNewPost,  setShowNewPost]  = useState(false)
  // Task 11 — per-post menu / edit / confirm-delete state.
  const [menuPostId,   setMenuPostId]   = useState<string | null>(null)
  const [editPost,     setEditPost]     = useState<FeedPost | null>(null)
  const [delPost,      setDelPost]      = useState<FeedPost | null>(null)
  const [editCaption,  setEditCaption]  = useState('')

  async function toggleLike(post: FeedPost) {
    const isLiked = feed.likedIds.has(post.id)
    feed.setLiked(post.id, !isLiked)
    feed.updatePostLikesCount(post.id, isLiked ? -1 : 1)
    if (IS_DEMO || !userId) return
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
    } else {
      await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
    }
  }

  // Task 13 — selected tag chip (1 profile per post). Reset when composer closes.
  const [tagPick, setTagPick] = useState<{ id: string; name: string; role: 'client' | 'barber' } | null>(null)

  async function addPost(caption: string, label: string, file?: File): Promise<void> {
    if (IS_DEMO) {
      const demoId = barberId ?? '1'
      feed.prependPost({
        id:              crypto.randomUUID(),
        barberId:        isBarber ? demoId : null,
        barberProfileId: userId ?? demoId,
        barberName:      'You',
        barberInitials:  'YO',
        barberCity:      '',
        barberAccent:    C.accent,
        barberAvatarUrl: undefined,
        likesCount:      0,
        commentsCount:   0,
        caption,
        label,
        createdAt: new Date().toISOString(),
        timeAgo:   'Adesso',
        imageUrl:  file ? URL.createObjectURL(file) : undefined,
        isUserPost: !isBarber,
      })
      return
    }
    if (!userId) throw new Error('Devi essere loggato per pubblicare')
    if (!file)   throw new Error('Nessuna foto selezionata')
    // Barber path keeps barber_id (so the post appears in their grid); user path
    // sets barber_id=null and uploads under users/{uid}/ in Storage.
    const imageUrl = isBarber && barberId
      ? await uploadPostPhoto(file, barberId)
      : await uploadUserPostPhoto(file, userId)
    const insertPayload: { author_id: string; barber_id: string | null; image_url: string; caption: string; label: string | null; tagged_profile_id: string | null } = {
      author_id: userId,
      barber_id: isBarber && barberId ? barberId : null,
      image_url: imageUrl,
      caption,
      // Label is barber-only (style tag) — kept optional in the schema.
      label: isBarber ? label : null,
      tagged_profile_id: tagPick?.id ?? null,
    }
    const [{ data: post, error }, barberQ, { data: profileRow }] = await Promise.all([
      supabase.from('posts').insert(insertPayload).select('id, created_at, caption, label, image_url').single(),
      isBarber && barberId
        ? supabase.from('barbers').select('id, city').eq('id', barberId).single()
        : Promise.resolve({ data: null }),
      supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single(),
    ])
    if (error) throw new Error(`Salvataggio fallito: ${error.message}`)
    if (!post)  throw new Error('Nessun dato restituito dal salvataggio')
    const barberRow = (barberQ as any).data as { id: string; city: string | null } | null
    feed.prependPost({
      id: post.id,
      barberId: barberRow?.id ?? null,
      barberProfileId: userId,
      barberName: profileRow?.display_name ?? (isBarber ? 'Barbiere' : 'Utente'),
      barberInitials: initialsFromName(profileRow?.display_name ?? null),
      barberCity: barberRow?.city ?? '',
      barberAccent: accentFromId(barberRow?.id ?? userId),
      barberAvatarUrl: profileRow?.avatar_url ?? undefined,
      likesCount: 0,
      commentsCount: 0,
      caption: post.caption ?? '',
      label: (post as any).label ?? '',
      createdAt: post.created_at,
      timeAgo: 'Adesso',
      imageUrl: post.image_url ?? undefined,
      isUserPost: !isBarber,
      taggedProfileId: tagPick?.id ?? null,
      taggedName:      tagPick?.name ?? null,
      taggedRole:      tagPick?.role ?? null,
    })
    setTagPick(null)
  }

  const visiblePosts  = showSaved
    ? feed.posts.filter(p => savedIds.has(p.id))
    : showLiked
      ? feed.posts.filter(p => feed.likedIds.has(p.id))
      : feed.posts
  const activePost    = feed.posts.find(p => p.id === activePostId) ?? null

  // Task 11 — hard-delete a post the current user owns. Steps (order matters):
  // 1) delete the row in `posts` (RLS: only the author succeeds). likes and
  //    comments cascade via FK ON DELETE CASCADE.
  // 2) best-effort delete of the image in Storage so the bucket actually
  //    reclaims the bytes. If this fails the row is already gone, so we just
  //    log the orphan path for manual cleanup (per project decision: "DB
  //    limitato, niente file orfani silenziosi").
  // 3) drop the post from local feed state.
  async function deletePost(post: FeedPost) {
    if (IS_DEMO) {
      feed.removePostLocal(post.id)
      return
    }
    if (!userId) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      writeLog('post.delete.failed', `Eliminazione fallita: ${error.message}`, 'error', { userId, metadata: { post_id: post.id } })
      throw new Error(error.message)
    }
    // The image lives in the `posts` bucket; extract the object key from the public URL.
    const path = extractStoragePath(post.imageUrl, 'posts')
    if (path) {
      const { error: storageErr } = await supabase.storage.from('posts').remove([path])
      if (storageErr) {
        writeLog(
          'post.delete.storage_orphan',
          `Post eliminato ma immagine orfana in storage: posts/${path} (${storageErr.message})`,
          'warning',
          { userId, metadata: { post_id: post.id, storage_path: path } },
        )
      }
    }
    feed.removePostLocal(post.id)
  }

  async function saveCaption(post: FeedPost, next: string) {
    const trimmed = next.trim()
    if (trimmed === (post.caption ?? '').trim()) return
    if (IS_DEMO) {
      feed.updatePostCaption(post.id, trimmed)
      return
    }
    const { error } = await supabase
      .from('posts')
      .update({ caption: trimmed || null })
      .eq('id', post.id)
    if (error) throw new Error(error.message)
    feed.updatePostCaption(post.id, trimmed)
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top bar */}
        {showSaved ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
            <button
              onClick={() => onShowSavedChange?.(false)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Post salvati</span>
          </div>
        ) : showLiked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
            <button
              onClick={() => onShowLikedChange?.(false)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Post che ti piacciono</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.8, color: C.text, fontFamily: 'Georgia, serif' }}>
              CutBook
            </span>
            <div style={{ display: 'flex', gap: 18 }}>
              <i
                className="ti ti-camera-plus"
                onClick={() => setShowNewPost(true)}
                style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
                title="Nuovo post"
              />
              <i
                className="ti ti-heart"
                onClick={() => onShowLikedChange?.(true)}
                style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* Stories row (demo barbers) */}
        {!showLiked && !showSaved && (
          <div style={{ display: 'flex', gap: 12, padding: '4px 16px 14px', overflowX: 'auto' }}>
            {storyBarbers.map(b => (
              <div key={b.id} onClick={() => onViewProfile(b)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', minWidth: 58 }}>
                <div style={{ padding: 2.5, borderRadius: '50%', background: `linear-gradient(135deg,${C.accent},#E8B86D)` }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: b.accent + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 500, color: b.accent,
                    border: `2px solid ${C.bg}`,
                  }}>
                    {b.initials}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 58, textAlign: 'center' }}>
                  {b.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Empty liked feed */}
        {showLiked && visiblePosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.hint, fontSize: 13 }}>
            <i className="ti ti-heart" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            Nessun post che ti piace, ancora
          </div>
        )}

        {/* Empty saved feed */}
        {showSaved && visiblePosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.hint, fontSize: 13 }}>
            <i className="ti ti-bookmark" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            Nessun post salvato. Tocca il segnalibro su un post per metterlo qui.
          </div>
        )}

        {/* Post list */}
        {visiblePosts.map((post, idx) => {
          const isLiked = feed.likedIds.has(post.id)
          const isSaved = savedIds.has(post.id)
          const count   = post.commentsCount
          const isOwnPost = !!barberId && !!post.barberId && String(barberId) === String(post.barberId)
          // Hide barber-specific UI elements on user posts (Prenota CTA, label chip).
          const isUserPost = post.isUserPost === true
          // Task 11 — author-based ownership (works for both barber and user posts).
          const isMine = !!userId && String(userId) === String(post.barberProfileId)

          return (
            <div key={post.id}>
              {idx > 0 && <div style={{ height: 6, background: C.surface }} />}

              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: isUserPost ? 'default' : 'pointer' }}
                  onClick={() => { if (!isUserPost) onViewProfile(postToBarber(post)) }}
                >
                  <Avatar initials={post.barberInitials} size={36} accent={post.barberAccent} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{post.barberName}</div>
                    <div style={{ fontSize: 11, color: C.hint }}>
                      {isUserPost ? post.timeAgo : `${post.barberCity}${post.barberCity ? ' · ' : ''}${post.timeAgo}`}
                    </div>
                  </div>
                </div>
                {!isUserPost && !isOwnPost && !isMine && (
                  <button
                    onClick={() => onBook(postToBarber(post))}
                    style={{ padding: '6px 13px', borderRadius: 8, background: C.text, color: C.bg, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                  >
                    Prenota
                  </button>
                )}
                {isMine && (
                  <button
                    onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
                    aria-label="Azioni post"
                    style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}
                  >
                    <i className="ti ti-dots" style={{ fontSize: 20, color: C.muted }} />
                  </button>
                )}
              </div>

              {/* Post image */}
              <PostMedia imageUrl={post.imageUrl} fallbackAccent={post.barberAccent} withBorder>
                {post.label && !isUserPost && (
                  <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                    {post.label}
                  </div>
                )}
              </PostMedia>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px 4px' }}>
                <button onClick={() => toggleLike(post)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-heart" style={{ fontSize: 22, color: isLiked ? C.red : C.muted }} />
                </button>
                <button onClick={() => setActivePostId(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-message-circle" style={{ fontSize: 22, color: C.muted }} />
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => toggleSaved(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  <i className="ti ti-bookmark" style={{ fontSize: 22, color: isSaved ? C.text : C.muted }} />
                </button>
              </div>

              <div style={{ padding: '0 16px 2px', fontSize: 13, fontWeight: 500, color: C.text }}>
                {post.likesCount === 1 ? '1 mi piace' : `${post.likesCount} mi piace`}
              </div>
              <div style={{ padding: '0 16px 4px', fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 500 }}>{post.barberName}</span>{' '}{post.caption}
              </div>
              {post.taggedProfileId && post.taggedName && (
                <div style={{ padding: '0 16px 4px' }}>
                  <button
                    onClick={async () => {
                      // Task 13 — click on the tagged chip goes to the tagged profile.
                      // Barbers: navigate to BarberProfileSheet (needs barbers.id from profile_id).
                      // Users: no dedicated profile sheet yet — chip stays clickable but no-op
                      // (will be wired when the user-profile screen lands).
                      if (post.taggedRole !== 'barber') return
                      if (IS_DEMO) return
                      const { data } = await supabase
                        .from('barbers')
                        .select('id, city, specialties, rating, reviews_count, accepting_bookings, profile_id, followers_count, profiles:profiles!barbers_profile_id_fkey(display_name, avatar_url)')
                        .eq('profile_id', post.taggedProfileId)
                        .maybeSingle()
                      const b: any = data
                      if (!b) return
                      const prof = (b.profiles as any) ?? {}
                      onViewProfile({
                        id:        b.id,
                        name:      prof.display_name ?? post.taggedName ?? 'Barbiere',
                        initials:  initialsFromName(prof.display_name ?? post.taggedName ?? null),
                        city:      b.city ?? '',
                        dist:      0,
                        rating:    b.rating,
                        tags:      b.specialties?.split(',').map((s: string) => s.trim()).filter(Boolean) ?? [],
                        followers: b.followers_count,
                        accent:    accentFromId(b.id),
                        acceptingBookings: b.accepting_bookings,
                        profileId: b.profile_id,
                        reviewsCount: b.reviews_count,
                      })
                    }}
                    title={post.taggedRole === 'barber' ? 'Vai al profilo' : 'Profilo utente'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 12,
                      border: `0.5px solid ${C.borderMed}`,
                      background: 'transparent', cursor: post.taggedRole === 'barber' ? 'pointer' : 'default',
                      fontSize: 11, color: C.accent, fontFamily: 'inherit',
                    }}
                  >
                    <i className="ti ti-at" style={{ fontSize: 11 }} />
                    {post.taggedName}
                  </button>
                </div>
              )}
              <div
                onClick={() => setActivePostId(post.id)}
                style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint, cursor: 'pointer' }}
              >
                {count > 0 ? (count === 1 ? 'Vedi 1 commento' : `Vedi tutti i ${count} commenti`) : 'Aggiungi un commento…'}
              </div>
            </div>
          )
        })}

        {/* Load more */}
        {feed.loading && visiblePosts.length === 0 && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}
        {feed.loading && visiblePosts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.hint }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {feed.hasMore && !feed.loading && (
          <div
            onClick={feed.loadMore}
            style={{ textAlign: 'center', padding: '16px 0', color: C.accent, fontSize: 13, cursor: 'pointer' }}
          >
            Carica altri
          </div>
        )}
      </div>

      {/* Comments sheet */}
      {activePost && (
        <CommentsSheet
          postId={activePost.id}
          postLabel={activePost.label || activePost.caption}
          userId={userId}
          postOwnerProfileId={activePost.barberProfileId}
          onClose={() => setActivePostId(null)}
        />
      )}

      {/* New post sheet */}
      {showNewPost && (
        <NewPostSheet
          isBarber={!!isBarber}
          tagPick={tagPick}
          onTagPick={setTagPick}
          onAdd={async (caption, label, file) => {
            await addPost(caption, label, file)
            setShowNewPost(false)
          }}
          onClose={() => { setShowNewPost(false); setTagPick(null) }}
          requirePhoto={!IS_DEMO}
        />
      )}

      {/* Task 11 — own-post action sheet */}
      {menuPostId && (() => {
        const p = feed.posts.find(x => x.id === menuPostId)
        if (!p) return null
        return (
          <PostActionSheet
            post={p}
            onClose={() => setMenuPostId(null)}
            onEdit={() => { setEditPost(p); setEditCaption(p.caption ?? ''); setMenuPostId(null) }}
            onDelete={() => { setDelPost(p); setMenuPostId(null) }}
          />
        )
      })()}

      {/* Task 11 — edit caption */}
      {editPost && (
        <EditCaptionSheet
          initial={editCaption}
          onClose={() => setEditPost(null)}
          onSave={async (next) => {
            try {
              await saveCaption(editPost, next)
              setEditPost(null)
            } catch (e) {
              alert(`Salvataggio fallito: ${e instanceof Error ? e.message : 'errore'}`)
            }
          }}
        />
      )}

      {/* Task 11 — confirm delete */}
      {delPost && (
        <ConfirmSheet
          title="Eliminare il post?"
          message="L'operazione è permanente e libera lo spazio su Storage."
          icon="ti-trash"
          destructive
          confirmLabel="Elimina"
          onConfirm={async () => {
            const p = delPost
            setDelPost(null)
            try { await deletePost(p) }
            catch (e) { alert(`Eliminazione fallita: ${e instanceof Error ? e.message : 'errore'}`) }
          }}
          onCancel={() => setDelPost(null)}
        />
      )}
    </div>
  )
}

// ── Task 11 sub-components ─────────────────────────────────────────────────

function PostActionSheet({ post, onClose, onEdit, onDelete }: {
  post: FeedPost
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', zIndex: 200,
      }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        animation: 'sheetUp .25s ease-out',
      }}>
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 14px' }} />
        <div style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint }}>
          {post.label || post.caption || 'Il tuo post'}
        </div>
        <button
          onClick={onEdit}
          style={sheetBtn(false)}
        >
          <i className="ti ti-edit" style={{ fontSize: 18, color: C.text }} />
          <span>Modifica caption</span>
        </button>
        <button
          onClick={onDelete}
          style={sheetBtn(true)}
        >
          <i className="ti ti-trash" style={{ fontSize: 18, color: C.red }} />
          <span style={{ color: C.red }}>Elimina post</span>
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 16px',
            background: 'none', border: 'none',
            color: C.muted, fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit', borderTop: `0.5px solid ${C.border}`,
          }}
        >
          Annulla
        </button>
      </div>
    </div>
  )
}

function sheetBtn(_destructive: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'none', border: 'none',
    fontSize: 14, color: C.text, cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
    borderTop: `0.5px solid ${C.border}`,
  }
}

function EditCaptionSheet({ initial, onClose, onSave }: {
  initial: string
  onClose: () => void
  onSave: (next: string) => Promise<void>
}) {
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', zIndex: 200,
      }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        animation: 'sheetUp .25s ease-out',
      }}>
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 10px' }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>Modifica caption</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>
        <div style={{ padding: '4px 16px 14px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: `0.5px solid ${C.borderMed}`, background: C.surface,
              color: C.text, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={async () => {
              if (saving) return
              setSaving(true)
              try { await onSave(text) }
              finally { setSaving(false) }
            }}
            disabled={saving}
            style={{
              width: '100%', marginTop: 12, padding: 13, borderRadius: 12,
              background: saving ? C.borderMed : C.text, color: C.bg,
              fontSize: 14, fontWeight: 500, border: 'none',
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewPostSheet({
  onAdd,
  onClose,
  requirePhoto,
  isBarber,
  tagPick,
  onTagPick,
}: {
  onAdd: (caption: string, label: string, file?: File) => Promise<void>
  onClose: () => void
  requirePhoto?: boolean
  isBarber: boolean
  tagPick: { id: string; name: string; role: 'client' | 'barber' } | null
  onTagPick: (pick: { id: string; name: string; role: 'client' | 'barber' } | null) => void
}) {
  const [caption,  setCaption]  = useState('')
  const [label,    setLabel]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Task 13 — tag picker: barbers can tag clients, clients can tag barbers.
  const [tagSearch, setTagSearch] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; display_name: string | null; role: 'client' | 'barber' }[]>([])
  const oppositeRole: 'client' | 'barber' = isBarber ? 'client' : 'barber'

  useEffect(() => {
    if (tagPick) return  // already chosen
    const q = tagSearch.trim()
    if (q.length < 2) { setTagSuggestions([]); return }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('role', oppositeRole)
      .ilike('display_name', `%${q}%`)
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return
        setTagSuggestions((data ?? []) as any)
      })
    return () => { cancelled = true }
  }, [tagSearch, oppositeRole, tagPick])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      validateImageType(f)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'File non valido')
      e.target.value = ''
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  // Label is barber-only (style tag, e.g. "Skin fade") — required for barbers,
  // hidden for clients (their posts don't carry it).
  const canPost = caption.trim().length > 0
    && (!isBarber || label.trim().length > 0)
    && (!requirePhoto || file !== null)

  async function handlePost() {
    if (!canPost || loading) return
    setLoading(true)
    setPostError(null)
    try {
      await onAdd(caption.trim(), label.trim(), file ?? undefined)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Caricamento fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
    >
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', display: 'flex', flexDirection: 'column', animation: 'sheetUp .3s ease-out' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>Nuovo post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        {/* Photo picker */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 130, background: C.surface, borderBottom: `0.5px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          {preview ? (
            <>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <i className="ti ti-camera" style={{ fontSize: 22, color: '#fff' }} />
                <span style={{ fontSize: 11, color: '#fff' }}>Tocca per cambiare</span>
              </div>
            </>
          ) : (
            <>
              <i className="ti ti-camera-plus" style={{ fontSize: 30, color: C.hint }} />
              <span style={{ fontSize: 12, color: C.hint }}>
                {requirePhoto ? 'Tocca per aggiungere una foto (richiesta)' : 'Tocca per aggiungere una foto'}
              </span>
            </>
          )}
        </div>

        {/* Inputs */}
        <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Didascalia…"
            rows={3}
            style={{
              padding: '9px 14px', borderRadius: 10,
              border: `0.5px solid ${C.borderMed}`, fontSize: 13,
              background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
              resize: 'none',
            }}
          />
          {isBarber && (
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Etichetta stile (es. Skin fade + line up)"
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: `0.5px solid ${C.borderMed}`, fontSize: 13,
                background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
              }}
            />
          )}

          {/* Task 13 — tag picker (1 profile per post) */}
          <div>
            {tagPick ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 8px 5px 10px', borderRadius: 16,
                background: C.accentLight, color: C.accent,
                fontSize: 12, fontWeight: 500,
              }}>
                <i className="ti ti-at" style={{ fontSize: 13 }} />
                {tagPick.name}
                <button
                  onClick={() => onTagPick(null)}
                  aria-label="Rimuovi tag"
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    display: 'inline-flex', cursor: 'pointer', color: C.accent,
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 13 }} />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder={isBarber ? 'Tagga un cliente (cerca per nome)' : 'Tagga un barbiere (cerca per nome)'}
                  style={{
                    width: '100%', padding: '9px 14px', borderRadius: 10,
                    border: `0.5px solid ${C.borderMed}`, fontSize: 13,
                    background: C.surface, color: C.text, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                {tagSuggestions.length > 0 && (
                  <div style={{
                    marginTop: 4, maxHeight: 160, overflowY: 'auto',
                    border: `0.5px solid ${C.border}`, borderRadius: 10,
                    background: C.bg,
                  }}>
                    {tagSuggestions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onTagPick({ id: s.id, name: s.display_name ?? 'Profilo', role: s.role })
                          setTagSearch('')
                          setTagSuggestions([])
                        }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer',
                          borderBottom: `0.5px solid ${C.border}`,
                          fontSize: 13, color: C.text,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <i className={`ti ${s.role === 'barber' ? 'ti-scissors' : 'ti-user'}`} style={{ fontSize: 13, color: C.muted }} />
                        {s.display_name ?? 'Profilo'}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {postError && (
            <div style={{ fontSize: 12, color: '#e53935', padding: '6px 10px', background: '#ffebee', borderRadius: 8 }}>
              {postError}
            </div>
          )}
          <button
            onClick={handlePost}
            disabled={!canPost || loading}
            style={{
              padding: 13, borderRadius: 12,
              background: canPost && !loading ? C.text : C.borderMed,
              color: C.bg, fontSize: 14, fontWeight: 500,
              border: 'none', cursor: canPost && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Caricamento…</>
              : 'Pubblica'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
