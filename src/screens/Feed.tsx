import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { PoleMark } from '../components/primitives'
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
import { SOFT_PHOTO_FILTER } from '../lib/photoTone'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import type { ToastEvent } from '../components/Toast'

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
  onToast?:            (t: ToastEvent) => void
}

function postToBarber(p: FeedPost): DemoBarber {
  return {
    id:        p.barberId ?? p.id,
    name:      p.barberName,
    initials:  p.barberInitials,
    city:      p.barberCity,
    dist:      0,
    rating:    0,
    reviewsCount: 0,
    tags:      [],
    followers: 0,
    accent:    p.barberAccent,
    profileId: p.barberProfileId,
    lat:       p.barberLat ?? undefined,
    lng:       p.barberLng ?? undefined,
  }
}

export function Feed({ userId, barberId, onBook, onViewProfile, isBarber, showLiked = false, onShowLikedChange, showSaved = false, onShowSavedChange, onToast }: FeedProps) {
  const feed = useFeed(userId, barberId)
  const { barbers: realStoryBarbers } = useBarbers('popular')
  const storyBarbers: DemoBarber[] = IS_DEMO || realStoryBarbers.length === 0
    ? BARBERS
    : realStoryBarbers.slice(0, 8).map(toStoryBarber)

  const { savedIds, toggleSaved } = useSavedPosts(userId)

  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [showNewPost,  setShowNewPost]  = useState(false)
  const [menuPostId,   setMenuPostId]   = useState<string | null>(null)
  const [editPost,     setEditPost]     = useState<FeedPost | null>(null)
  const [delPost,      setDelPost]      = useState<FeedPost | null>(null)
  const [editCaption,  setEditCaption]  = useState('')

  async function toggleLike(post: FeedPost) {
    const wasLiked = feed.likedIds.has(post.id)
    feed.setLiked(post.id, !wasLiked)
    feed.updatePostLikesCount(post.id, wasLiked ? -1 : 1)
    if (IS_DEMO || !userId) return
    const { error } = wasLiked
      ? await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
      : await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
    if (error) {
      // Rollback the optimistic update so the UI matches the DB.
      feed.setLiked(post.id, wasLiked)
      feed.updatePostLikesCount(post.id, wasLiked ? 1 : -1)
      onToast?.({ kind: 'error', title: 'Azione fallita', message: error.message })
    }
  }

  const [tagPick, setTagPick] = useState<{ id: string; name: string; role: 'client' | 'barber' } | null>(null)

  async function addPost(caption: string, label: string, file?: File): Promise<void> {
    const cleanCaption = limitText(caption.trim(), TEXT_LIMITS.postCaption)
    const cleanLabel = limitText(label.trim(), TEXT_LIMITS.postLabel)
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
        caption: cleanCaption,
        label: cleanLabel,
        createdAt: new Date().toISOString(),
        timeAgo:   'adesso',
        imageUrl:  file ? URL.createObjectURL(file) : undefined,
        isUserPost: !isBarber,
      })
      return
    }
    if (!userId) throw new Error('Devi essere loggato per pubblicare')
    if (!file)   throw new Error('Nessuna foto selezionata')
    const imageUrl = isBarber && barberId
      ? await uploadPostPhoto(file, barberId)
      : await uploadUserPostPhoto(file, userId)
    const insertPayload: { author_id: string; barber_id: string | null; image_url: string; caption: string; label: string | null; tagged_profile_id: string | null } = {
      author_id: userId,
      barber_id: isBarber && barberId ? barberId : null,
      image_url: imageUrl,
      caption: cleanCaption,
      label: isBarber ? cleanLabel : null,
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
      timeAgo: 'adesso',
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
    const trimmed = limitText(next.trim(), TEXT_LIMITS.postCaption)
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
          <SubHeader title="Post salvati" onBack={() => onShowSavedChange?.(false)} />
        ) : showLiked ? (
          <SubHeader title="Post che ti piacciono" onBack={() => onShowLikedChange?.(false)} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PoleMark size={28} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, lineHeight: 1, letterSpacing: '-0.035em', color: C.text }}>Barberbook</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => setShowNewPost(true)} aria-label="Nuovo post" style={iconBtn()}>
                <Icon name="plus" size={22} color={C.muted} />
              </button>
              <button onClick={() => onShowLikedChange?.(true)} aria-label="Mi piace" style={iconBtn()}>
                <Icon name="heart" size={22} color={C.muted} />
              </button>
            </div>
          </div>
        )}

        {/* Stories row */}
        {!showLiked && !showSaved && (
          <div style={{ display: 'flex', gap: 14, padding: '4px 20px 18px', overflowX: 'auto' }}>
            {storyBarbers.map((b, i) => (
              <div key={b.id} onClick={() => onViewProfile(b)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 58 }}>
                <div style={{ width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Avatar initials={b.initials} size={54} ring={i < 3} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: C.muted, maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 1, background: C.border }} />

        {/* Empty states */}
        {showLiked && visiblePosts.length === 0 && (
          <EmptyState icon="heart" title="Nessun post che ti piace" subtitle="Tocca il cuore su un post per metterlo qui." />
        )}
        {showSaved && visiblePosts.length === 0 && (
          <EmptyState icon="bookmark" title="Nessun post salvato" subtitle="Tocca il segnalibro su un post per metterlo qui." />
        )}

        {/* Post list */}
        {visiblePosts.map((post, idx) => {
          const isLiked = feed.likedIds.has(post.id)
          const isSaved = savedIds.has(post.id)
          const count   = post.commentsCount
          const isOwnPost = !!barberId && !!post.barberId && String(barberId) === String(post.barberId)
          const isUserPost = post.isUserPost === true
          const isMine = !!userId && String(userId) === String(post.barberProfileId)

          return (
            <article key={post.id} style={{ paddingBottom: 8 }}>
              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 12px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: isUserPost ? 'default' : 'pointer', minWidth: 0 }}
                  onClick={() => { if (!isUserPost) onViewProfile(postToBarber(post)) }}
                >
                  <Avatar initials={post.barberInitials} size={40} photo={post.barberAvatarUrl} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600, color: C.text, letterSpacing: '-0.015em' }}>
                      {post.barberName}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {isUserPost ? post.timeAgo : `${post.barberCity}${post.barberCity ? ' · ' : ''}${post.timeAgo}`}
                    </div>
                  </div>
                </div>
                {!isUserPost && !isOwnPost && !isMine && (
                  <button
                    onClick={() => onBook(postToBarber(post))}
                    style={{
                      padding: '7px 13px', borderRadius: 8,
                      background: C.text, color: C.bg,
                      fontSize: 12.5, border: `1px solid ${C.text}`,
                      cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
                    }}
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
                    <Icon name="menu" size={20} color={C.muted} />
                  </button>
                )}
              </div>

              {/* Post image */}
              <PostMedia imageUrl={post.imageUrl}>
                {post.label && !isUserPost && (
                  <div style={{
                    position: 'absolute', bottom: 12, left: 16,
                    padding: '4px 10px', borderRadius: 9999,
                    background: 'rgba(20,17,13,0.65)', color: 'var(--paper-3)',
                    fontSize: 11, fontWeight: 500,
                  }}>
                    {post.label}
                  </div>
                )}
              </PostMedia>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 6px' }}>
                <IconAction
                  icon="heart"
                  weight={isLiked ? 'fill' : 'regular'}
                  color={isLiked ? C.red : C.text}
                  onClick={() => toggleLike(post)}
                />
                <IconAction
                  icon="chat"
                  color={C.text}
                  onClick={() => setActivePostId(post.id)}
                />
                <IconAction icon="send" color={C.text} />
                <div style={{ flex: 1 }} />
                <IconAction
                  icon="bookmark"
                  weight={isSaved ? 'fill' : 'regular'}
                  color={C.text}
                  onClick={async () => {
                    const { error } = await toggleSaved(post.id)
                    if (error) onToast?.({ kind: 'error', title: 'Salvataggio fallito', message: error })
                  }}
                />
              </div>

              <div style={{ padding: '0 20px 4px', fontSize: 13, fontWeight: 600, color: C.text }}>
                {post.likesCount === 1 ? '1 mi piace' : `${post.likesCount.toLocaleString('it-IT')} mi piace`}
              </div>
              <div style={{ padding: '4px 20px 4px', fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>
                <span style={{ fontWeight: 600, marginRight: 5 }}>{post.barberName}</span>
                {post.caption}
              </div>
              {post.taggedProfileId && post.taggedName && (
                <div style={{ padding: '4px 20px 4px' }}>
                  <button
                    onClick={async () => {
                      const tpid = post.taggedProfileId
                      if (!tpid || post.taggedRole !== 'barber') return
                      if (IS_DEMO) return
                      const { data } = await supabase
                        .from('barbers')
                        .select('id, city, specialties, rating, reviews_count, accepting_bookings, profile_id, followers_count, profiles:profiles!barbers_profile_id_fkey(display_name, avatar_url)')
                        .eq('profile_id', tpid)
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
                      padding: '3px 10px', borderRadius: 9999,
                      border: `1px solid ${C.border}`,
                      background: 'transparent',
                      cursor: post.taggedRole === 'barber' ? 'pointer' : 'default',
                      fontSize: 11.5, color: C.accent, fontFamily: 'inherit',
                    }}
                  >
                    <Icon name="user" size={11} color={C.accent} />
                    {post.taggedName}
                  </button>
                </div>
              )}
              <div
                onClick={() => setActivePostId(post.id)}
                style={{ padding: '4px 20px 16px', fontSize: 12.5, color: C.hint, cursor: 'pointer' }}
              >
                {count > 0
                  ? (count === 1 ? 'Vedi 1 commento' : `Vedi tutti i ${count} commenti`)
                  : 'Aggiungi un commento…'}
              </div>

              {idx < visiblePosts.length - 1 && <div style={{ height: 1, background: C.border }} />}
            </article>
          )
        })}

        {feed.loading && visiblePosts.length === 0 && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}
        {feed.loading && visiblePosts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.hint }}>
            <Icon name="refresh" size={20} style={{ animation: 'spin .8s linear infinite' }} />
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

        {!feed.loading && !feed.hasMore && visiblePosts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ height: 2, width: 32, background: C.accent, borderRadius: 9999 }} />
            <div style={{ fontSize: 12.5, color: C.hint }}>Sei in pari.</div>
          </div>
        )}
      </div>

      {activePost && (
        <CommentsSheet
          postId={activePost.id}
          postLabel={activePost.label || activePost.caption}
          userId={userId}
          postOwnerProfileId={activePost.barberProfileId}
          onClose={() => setActivePostId(null)}
          onToast={onToast}
        />
      )}

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

      {editPost && (
        <EditCaptionSheet
          initial={editCaption}
          onClose={() => setEditPost(null)}
          onSave={async (next) => {
            try {
              await saveCaption(editPost, next)
              setEditPost(null)
            } catch (e) {
              onToast?.({ kind: 'error', title: 'Salvataggio fallito', message: e instanceof Error ? e.message : 'Errore sconosciuto' })
            }
          }}
        />
      )}

      {delPost && (
        <ConfirmSheet
          title="Eliminare il post?"
          message="L'operazione è permanente e libera lo spazio su Storage."
          icon="trash"
          destructive
          confirmLabel="Elimina"
          onConfirm={async () => {
            const p = delPost
            setDelPost(null)
            try { await deletePost(p) }
            catch (e) { onToast?.({ kind: 'error', title: 'Eliminazione fallita', message: e instanceof Error ? e.message : 'Errore sconosciuto' }) }
          }}
          onCancel={() => setDelPost(null)}
        />
      )}
    </div>
  )
}

/* ---- helpers ----------------------------------------------------------- */

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 16px' }}>
      <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
        <Icon name="back" size={22} color={C.text} />
      </button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: C.text }}>
        {title}
      </span>
    </div>
  )
}

function iconBtn(): React.CSSProperties {
  return { background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }
}

function IconAction({ icon, color, onClick, weight = 'regular' }: { icon: IconName; color: string; onClick?: () => void; weight?: 'regular' | 'fill' }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', padding: 4, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={24} color={color} weight={weight} />
    </button>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle: string }) {
  return (
    <div style={{ padding: '48px 28px', textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon name={icon} size={20} color="var(--clay-deep)" />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em', color: C.text }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{subtitle}</div>
    </div>
  )
}

/* ---- Post action sheet (own posts) ------------------------------------- */

function PostActionSheet({ post, onClose, onEdit, onDelete }: {
  post:    FeedPost
  onClose: () => void
  onEdit:  () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 14px' }} />
        <div style={{ padding: '0 20px 14px', fontSize: 12, color: C.hint }}>
          {post.label || post.caption || 'Il tuo post'}
        </div>
        <button onClick={onEdit} style={sheetBtn(false)}>
          <Icon name="edit" size={18} color={C.text} />
          <span>Modifica caption</span>
        </button>
        <button onClick={onDelete} style={sheetBtn(true)}>
          <Icon name="trash" size={18} color={C.red} />
          <span style={{ color: C.red }}>Elimina post</span>
        </button>
        <button onClick={onClose} style={{
          width: '100%', padding: '14px 20px',
          background: 'none', border: 'none', borderTop: `1px solid ${C.border}`,
          color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Annulla
        </button>
      </div>
    </div>
  )
}

function sheetBtn(_destructive: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px 20px',
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'none', border: 'none', borderTop: `1px solid ${C.border}`,
    fontSize: 14, color: C.text, cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
  }
}

function EditCaptionSheet({ initial, onClose, onSave }: {
  initial: string
  onClose: () => void
  onSave:  (next: string) => Promise<void>
}) {
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 200, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 8px' }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 20px 10px' }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Modifica caption
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>
        <div style={{ padding: '4px 20px 14px' }}>
          <textarea
            value={text}
            maxLength={TEXT_LIMITS.postCaption}
            onChange={e => setText(limitText(e.target.value, TEXT_LIMITS.postCaption))}
            rows={4}
            autoFocus
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              color: C.text, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={async () => { if (saving) return; setSaving(true); try { await onSave(text) } finally { setSaving(false) } }}
            disabled={saving}
            style={{
              width: '100%', marginTop: 12, padding: 13, borderRadius: 'var(--r-md)',
              background: saving ? C.surface : 'var(--clay)',
              color: saving ? C.muted : 'var(--paper-3)',
              fontSize: 14, fontWeight: 500,
              border: `1px solid ${saving ? C.border : 'var(--clay)'}`,
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Salvataggio…</>
              : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- New post sheet ---------------------------------------------------- */

function NewPostSheet({
  onAdd, onClose, requirePhoto, isBarber, tagPick, onTagPick,
}: {
  onAdd:    (caption: string, label: string, file?: File) => Promise<void>
  onClose:  () => void
  requirePhoto?: boolean
  isBarber: boolean
  tagPick:  { id: string; name: string; role: 'client' | 'barber' } | null
  onTagPick: (pick: { id: string; name: string; role: 'client' | 'barber' } | null) => void
}) {
  const [caption,  setCaption]  = useState('')
  const [label,    setLabel]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tagSearch, setTagSearch] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; display_name: string | null; role: 'client' | 'barber' }[]>([])
  const oppositeRole: 'client' | 'barber' = isBarber ? 'client' : 'barber'

  useEffect(() => {
    if (tagPick) return
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

  const canPost = caption.trim().length > 0
    && (!isBarber || label.trim().length > 0)
    && (!requirePhoto || file !== null)

  async function handlePost() {
    if (!canPost || loading) return
    setLoading(true)
    setPostError(null)
    try {
      await onAdd(
        limitText(caption.trim(), TEXT_LIMITS.postCaption),
        limitText(label.trim(), TEXT_LIMITS.postLabel),
        file ?? undefined,
      )
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Caricamento fallito')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 100, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Nuovo post
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 140, background: C.surfaceAlt,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, flexShrink: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          {preview ? (
            <>
              <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: SOFT_PHOTO_FILTER }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(20,17,13,0.45)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Icon name="image" size={22} color={C.bg} />
                <span style={{ fontSize: 12, color: C.bg }}>Tocca per cambiare</span>
              </div>
            </>
          ) : (
            <>
              <Icon name="image" size={28} color={C.hint} />
              <span style={{ fontSize: 12.5, color: C.muted }}>
                {requirePhoto ? 'Tocca per aggiungere una foto (richiesta)' : 'Tocca per aggiungere una foto'}
              </span>
            </>
          )}
        </div>

        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={caption}
            maxLength={TEXT_LIMITS.postCaption}
            onChange={e => setCaption(limitText(e.target.value, TEXT_LIMITS.postCaption))}
            placeholder="Didascalia…"
            rows={3}
            style={{
              padding: '11px 14px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, fontSize: 13.5,
              background: C.surfaceAlt, color: C.text, outline: 'none', fontFamily: 'inherit',
              resize: 'none',
            }}
          />
          {isBarber && (
            <input
              value={label}
              maxLength={TEXT_LIMITS.postLabel}
              onChange={e => setLabel(limitText(e.target.value, TEXT_LIMITS.postLabel))}
              placeholder="Etichetta stile (es. Skin fade + line up)"
              style={{
                padding: '11px 14px', borderRadius: 'var(--r-md)',
                border: `1px solid ${C.border}`, fontSize: 13.5,
                background: C.surfaceAlt, color: C.text, outline: 'none', fontFamily: 'inherit',
              }}
            />
          )}

          <div>
            {tagPick ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 8px 5px 10px', borderRadius: 9999,
                background: C.accentLight, color: C.accentDeep,
                fontSize: 12.5, fontWeight: 500,
              }}>
                <Icon name="user" size={13} color={C.accentDeep} />
                {tagPick.name}
                <button
                  onClick={() => onTagPick(null)}
                  aria-label="Rimuovi tag"
                  style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'pointer', color: C.accentDeep }}
                >
                  <Icon name="close" size={13} color={C.accentDeep} />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder={isBarber ? 'Tagga un cliente' : 'Tagga un barbiere'}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 'var(--r-md)',
                    border: `1px solid ${C.border}`, fontSize: 13.5,
                    background: C.surfaceAlt, color: C.text, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                {tagSuggestions.length > 0 && (
                  <div style={{
                    marginTop: 4, maxHeight: 160, overflowY: 'auto',
                    border: `1px solid ${C.border}`, borderRadius: 'var(--r-md)',
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
                          padding: '10px 14px', cursor: 'pointer',
                          borderBottom: `1px solid ${C.border}`,
                          fontSize: 13.5, color: C.text,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <Icon name={s.role === 'barber' ? 'scissors' : 'user'} size={14} color={C.muted} />
                        {s.display_name ?? 'Profilo'}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {postError && (
            <div style={{ fontSize: 12.5, color: C.red, padding: '8px 12px', background: C.redSoft, borderRadius: 'var(--r-md)' }}>
              {postError}
            </div>
          )}
          <button
            onClick={handlePost}
            disabled={!canPost || loading}
            style={{
              padding: 13, borderRadius: 'var(--r-md)',
              background: canPost && !loading ? 'var(--clay)' : C.surface,
              color: canPost && !loading ? 'var(--paper-3)' : C.hint,
              fontSize: 14, fontWeight: 500,
              border: `1px solid ${canPost && !loading ? 'var(--clay)' : C.border}`,
              cursor: canPost && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Pubblicazione…</>
              : 'Pubblica'}
          </button>
        </div>
      </div>
    </div>
  )
}
