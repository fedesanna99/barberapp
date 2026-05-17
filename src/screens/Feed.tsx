import { useState, useRef } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS } from '../lib/demoData'
import type { DemoBarber } from '../lib/demoData'
import { useFeed, accentFromId, initialsFromName } from '../hooks/useFeed'
import type { FeedPost } from '../hooks/useFeed'
import { supabase, IS_DEMO } from '../lib/supabase'
import { uploadPostPhoto } from '../hooks/useUpload'
import { CommentsSheet } from './CommentsSheet'
import type { Comment } from './CommentsSheet'

const SEED_COMMENTS: Comment[] = [
  { id: 's1', postId: '1', author: 'Luca R.',    text: 'Fuoco 🔥 quella linea è chirurgica'   },
  { id: 's2', postId: '1', author: 'Marco T.',   text: 'Devo prenotare prima possibile'        },
  { id: 's3', postId: '2', author: 'Andrea G.',  text: 'Lo shave arabo è una cosa seria 👌'   },
  { id: 's4', postId: '2', author: 'Youssef K.', text: 'Il migliore in zona senza dubbi'       },
  { id: 's5', postId: '3', author: 'Paolo V.',   text: 'French crop perfetto, bravo!'          },
  { id: 's6', postId: '4', author: 'Gianni M.',  text: 'Classic never dies ✂️'                },
]

interface FeedProps {
  userId?:             string
  barberId?:           string
  onBook:              (barber: DemoBarber) => void
  onViewProfile:       (barber: DemoBarber) => void
  isBarber?:           boolean
  showLiked?:          boolean
  onShowLikedChange?:  (v: boolean) => void
}

function postToBarber(p: FeedPost): DemoBarber {
  return {
    id:        p.barberId,
    name:      p.barberName,
    initials:  p.barberInitials,
    city:      p.barberCity,
    dist:      0,
    rating:    4.8,
    tags:      [],
    followers: 0,
    accent:    p.barberAccent,
  }
}

export function Feed({ userId, barberId, onBook, onViewProfile, isBarber, showLiked = false, onShowLikedChange }: FeedProps) {
  const feed = useFeed(userId)

  const [saved,        setSaved]        = useState<Record<string, boolean>>({})
  const [comments,     setComments]     = useState<Comment[]>(SEED_COMMENTS)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [showNewPost,  setShowNewPost]  = useState(false)

  function toggleSave(id: string) { setSaved(s => ({ ...s, [id]: !s[id] })) }

  function addComment(postId: string, text: string) {
    setComments(prev => [...prev, { id: crypto.randomUUID(), postId, author: 'You', text }])
  }

  function deleteComment(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function toggleLike(post: FeedPost) {
    const isLiked = feed.likedIds.has(post.id)
    feed.setLiked(post.id, !isLiked)  // optimistic update
    if (IS_DEMO || !userId) return
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
    } else {
      await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
    }
  }

  async function addPost(caption: string, label: string, file?: File): Promise<void> {
    if (IS_DEMO) {
      const demoId = barberId ?? '1'
      feed.prependPost({
        id:              crypto.randomUUID(),
        barberId:        demoId,
        barberName:      'You',
        barberInitials:  'YO',
        barberCity:      '',
        barberAccent:    C.accent,
        barberAvatarUrl: undefined,
        likesCount:      0,
        caption,
        label,
        createdAt: new Date().toISOString(),
        timeAgo:   'Just now',
        imageUrl:  file ? URL.createObjectURL(file) : undefined,
      })
      return
    }
    if (!barberId) throw new Error('Barber profile not found — make sure your account has a barbers row in the DB')
    if (!file) throw new Error('No photo selected')
    const imageUrl = await uploadPostPhoto(file, barberId)
    const { data, error } = await supabase
      .from('posts')
      .insert({ barber_id: barberId, image_url: imageUrl, caption, label })
      .select('*, barbers ( id, city, profile:profiles!profile_id ( display_name, avatar_url ) )')
      .single()
    if (error) throw new Error(`DB insert failed: ${error.message}`)
    if (!data) throw new Error('No data returned from insert')
    const b = (data.barbers as any)
    feed.prependPost({
      id: data.id,
      barberId: b.id,
      barberName: b.profile.display_name ?? 'Barber',
      barberInitials: initialsFromName(b.profile.display_name),
      barberCity: b.city ?? '',
      barberAccent: accentFromId(b.id),
      barberAvatarUrl: b.profile.avatar_url ?? undefined,
      likesCount: 0,
      caption: data.caption ?? '',
      label: data.label ?? '',
      createdAt: data.created_at,
      timeAgo: 'Just now',
      imageUrl: data.image_url,
    })
  }

  const visiblePosts  = showLiked ? feed.posts.filter(p => feed.likedIds.has(p.id)) : feed.posts
  const activePost    = feed.posts.find(p => p.id === activePostId) ?? null
  const sheetComments = activePostId !== null ? comments.filter(c => c.postId === activePostId) : []

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top bar */}
        {showLiked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
            <button
              onClick={() => onShowLikedChange?.(false)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
            </button>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Liked posts</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.8, color: C.text, fontFamily: 'Georgia, serif' }}>
              CutBook
            </span>
            <div style={{ display: 'flex', gap: 18 }}>
              {isBarber && (
                <i
                  className="ti ti-camera-plus"
                  onClick={() => setShowNewPost(true)}
                  style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
                />
              )}
              <i
                className="ti ti-heart"
                onClick={() => onShowLikedChange?.(true)}
                style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
              />
              <i className="ti ti-send" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
            </div>
          </div>
        )}

        {/* Stories row (demo barbers) */}
        {!showLiked && (
          <div style={{ display: 'flex', gap: 12, padding: '4px 16px 14px', overflowX: 'auto' }}>
            {BARBERS.map(b => (
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
            No liked posts yet
          </div>
        )}

        {/* Post list */}
        {visiblePosts.map((post, idx) => {
          const isLiked = feed.likedIds.has(post.id)
          const isSaved = saved[post.id]
          const count   = comments.filter(c => c.postId === post.id).length

          return (
            <div key={post.id}>
              {idx > 0 && <div style={{ height: 6, background: C.surface }} />}

              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
                  onClick={() => onViewProfile(postToBarber(post))}
                >
                  <Avatar initials={post.barberInitials} size={36} accent={post.barberAccent} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{post.barberName}</div>
                    <div style={{ fontSize: 11, color: C.hint }}>{post.barberCity} · {post.timeAgo}</div>
                  </div>
                </div>
                <button
                  onClick={() => onBook(postToBarber(post))}
                  style={{ padding: '6px 13px', borderRadius: 8, background: C.text, color: C.bg, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                >
                  Book
                </button>
              </div>

              {/* Post image */}
              <div style={{
                width: '100%', height: 220,
                background: post.barberAccent + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`,
              }}>
                {post.imageUrl
                  ? <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <i className="ti ti-scissors" style={{ fontSize: 52, color: post.barberAccent, opacity: 0.35 }} />
                }
                {post.label && (
                  <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                    {post.label}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px 4px' }}>
                <button onClick={() => toggleLike(post)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-heart" style={{ fontSize: 22, color: isLiked ? C.red : C.muted }} />
                </button>
                <button onClick={() => setActivePostId(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-message-circle" style={{ fontSize: 22, color: C.muted }} />
                </button>
                <i className="ti ti-send" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
                <div style={{ flex: 1 }} />
                <button onClick={() => toggleSave(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: 22, color: isSaved ? C.text : C.muted }} />
                </button>
              </div>

              <div style={{ padding: '0 16px 2px', fontSize: 13, fontWeight: 500, color: C.text }}>
                {post.likesCount + (isLiked ? 1 : 0)} likes
              </div>
              <div style={{ padding: '0 16px 4px', fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 500 }}>{post.barberName}</span>{' '}{post.caption}
              </div>
              <div
                onClick={() => setActivePostId(post.id)}
                style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint, cursor: 'pointer' }}
              >
                {count > 0 ? `View all ${count} comment${count !== 1 ? 's' : ''}` : 'Add a comment…'}
              </div>
            </div>
          )
        })}

        {/* Load more */}
        {feed.loading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.hint }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {feed.hasMore && !feed.loading && (
          <div
            onClick={feed.loadMore}
            style={{ textAlign: 'center', padding: '16px 0', color: C.accent, fontSize: 13, cursor: 'pointer' }}
          >
            Load more
          </div>
        )}
      </div>

      {/* Comments sheet */}
      {activePost && (
        <CommentsSheet
          postLabel={activePost.label || activePost.caption}
          comments={sheetComments}
          isBarber={!!isBarber}
          onAdd={text => addComment(activePost.id, text)}
          onDelete={deleteComment}
          onClose={() => setActivePostId(null)}
        />
      )}

      {/* New post sheet */}
      {showNewPost && (
        <NewPostSheet
          onAdd={async (caption, label, file) => {
            await addPost(caption, label, file)
            setShowNewPost(false)
          }}
          onClose={() => setShowNewPost(false)}
          requirePhoto={!IS_DEMO}
        />
      )}
    </div>
  )
}

function NewPostSheet({
  onAdd,
  onClose,
  requirePhoto,
}: {
  onAdd: (caption: string, label: string, file?: File) => Promise<void>
  onClose: () => void
  requirePhoto?: boolean
}) {
  const [caption,  setCaption]  = useState('')
  const [label,    setLabel]    = useState('')
  const [file,     setFile]     = useState<File | null>(null)
  const [preview,  setPreview]  = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const canPost = caption.trim().length > 0 && label.trim().length > 0 && (!requirePhoto || file !== null)

  async function handlePost() {
    if (!canPost || loading) return
    setLoading(true)
    setPostError(null)
    try {
      await onAdd(caption.trim(), label.trim(), file ?? undefined)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Upload failed')
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
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: C.text }}>New post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        {/* Photo picker */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
                <span style={{ fontSize: 11, color: '#fff' }}>Tap to change</span>
              </div>
            </>
          ) : (
            <>
              <i className="ti ti-camera-plus" style={{ fontSize: 30, color: C.hint }} />
              <span style={{ fontSize: 12, color: C.hint }}>
                {requirePhoto ? 'Tap to add a photo (required)' : 'Tap to add a photo'}
              </span>
            </>
          )}
        </div>

        {/* Inputs */}
        <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption…"
            rows={3}
            style={{
              padding: '9px 14px', borderRadius: 10,
              border: `0.5px solid ${C.borderMed}`, fontSize: 13,
              background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
              resize: 'none',
            }}
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Style label (e.g. Skin fade + line up)"
            style={{
              padding: '9px 14px', borderRadius: 10,
              border: `0.5px solid ${C.borderMed}`, fontSize: 13,
              background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
            }}
          />
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
              ? <><i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 0.8s linear infinite' }} /> Uploading…</>
              : 'Post'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
