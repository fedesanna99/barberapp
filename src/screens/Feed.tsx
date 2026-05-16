import { useState, useRef } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { BARBERS, POSTS as SEED_POSTS, getBarberById } from '../lib/demoData'
import type { DemoPost, DemoBarber } from '../lib/demoData'
import { CommentsSheet } from './CommentsSheet'
import type { Comment } from './CommentsSheet'

const SEED_COMMENTS: Comment[] = [
  { id: 's1', postId: 1, author: 'Luca R.',    text: 'Fuoco 🔥 quella linea è chirurgica'   },
  { id: 's2', postId: 1, author: 'Marco T.',   text: 'Devo prenotare prima possibile'        },
  { id: 's3', postId: 2, author: 'Andrea G.',  text: 'Lo shave arabo è una cosa seria 👌'   },
  { id: 's4', postId: 2, author: 'Youssef K.', text: 'Il migliore in zona senza dubbi'       },
  { id: 's5', postId: 3, author: 'Paolo V.',   text: 'French crop perfetto, bravo!'          },
  { id: 's6', postId: 4, author: 'Gianni M.',  text: 'Classic never dies ✂️'                },
]

interface FeedProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
  isBarber?:     boolean
}

export function Feed({ onBook, onViewProfile, isBarber }: FeedProps) {
  const [posts,           setPosts]           = useState<DemoPost[]>(SEED_POSTS)
  const [liked,           setLiked]           = useState<Record<number, boolean>>({})
  const [saved,           setSaved]           = useState<Record<number, boolean>>({})
  const [comments,        setComments]        = useState<Comment[]>(SEED_COMMENTS)
  const [activePostId,    setActivePostId]    = useState<number | null>(null)
  const [showLiked,       setShowLiked]       = useState(false)
  const [showNewPost,     setShowNewPost]     = useState(false)

  const toggleLike = (id: number) => setLiked(l => ({ ...l, [id]: !l[id] }))
  const toggleSave = (id: number) => setSaved(s => ({ ...s, [id]: !s[id] }))

  function addComment(postId: number, text: string) {
    setComments(prev => [...prev, { id: crypto.randomUUID(), postId, author: 'You', text }])
  }

  function deleteComment(id: string) {
    setComments(prev => prev.filter(c => c.id !== id))
  }

  function addPost(caption: string, label: string, imageUrl?: string) {
    const newPost: DemoPost = {
      id: Date.now(),
      barberId: 1,
      likes: 0,
      caption,
      label,
      timeAgo: 'Just now',
      comments: 0,
      imageUrl,
    }
    setPosts(prev => [newPost, ...prev])
    setShowNewPost(false)
  }

  const visiblePosts  = showLiked ? posts.filter(p => liked[p.id]) : posts
  const activePost    = posts.find(p => p.id === activePostId) ?? null
  const sheetComments = activePostId !== null ? comments.filter(c => c.postId === activePostId) : []

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Top bar */}
        {showLiked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 8px' }}>
            <button
              onClick={() => setShowLiked(false)}
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
                onClick={() => setShowLiked(true)}
                style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }}
              />
              <i className="ti ti-send" style={{ fontSize: 22, color: C.muted, cursor: 'pointer' }} />
            </div>
          </div>
        )}

        {/* Stories row */}
        {!showLiked && <div style={{ display: 'flex', gap: 12, padding: '4px 16px 14px', overflowX: 'auto' }}>
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
        </div>}

        {/* Posts */}
        {showLiked && visiblePosts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.hint, fontSize: 13 }}>
            <i className="ti ti-heart" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            No liked posts yet
          </div>
        )}
        {visiblePosts.map((post, idx) => {
          const barber      = getBarberById(post.barberId)!
          const isLiked     = liked[post.id]
          const isSaved     = saved[post.id]
          const count       = comments.filter(c => c.postId === post.id).length

          return (
            <div key={post.id}>
              {idx > 0 && <div style={{ height: 6, background: C.surface }} />}

              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }} onClick={() => onViewProfile(barber)}>
                  <Avatar initials={barber.initials} size={36} accent={barber.accent} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{barber.name}</div>
                    <div style={{ fontSize: 11, color: C.hint }}>{barber.city} · {post.timeAgo}</div>
                  </div>
                </div>
                <button
                  onClick={() => onBook(barber)}
                  style={{ padding: '6px 13px', borderRadius: 8, background: C.text, color: C.bg, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
                >
                  Book
                </button>
              </div>

              {/* Post image */}
              <div style={{
                width: '100%', height: 220,
                background: barber.accent + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                borderTop: `0.5px solid ${C.border}`, borderBottom: `0.5px solid ${C.border}`,
              }}>
                {post.imageUrl
                  ? <img src={post.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <i className="ti ti-scissors" style={{ fontSize: 52, color: barber.accent, opacity: 0.35 }} />
                }
                <div style={{ position: 'absolute', bottom: 10, left: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
                  {post.label}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px 4px' }}>
                <button onClick={() => toggleLike(post.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
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
                {post.likes + (isLiked ? 1 : 0)} likes
              </div>
              <div style={{ padding: '0 16px 4px', fontSize: 13, color: C.text }}>
                <span style={{ fontWeight: 500 }}>{barber.name}</span>{' '}{post.caption}
              </div>
              {count > 0 && (
                <div
                  onClick={() => setActivePostId(post.id)}
                  style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint, cursor: 'pointer' }}
                >
                  View all {count} comment{count !== 1 ? 's' : ''}
                </div>
              )}
              {count === 0 && (
                <div
                  onClick={() => setActivePostId(post.id)}
                  style={{ padding: '0 16px 14px', fontSize: 12, color: C.hint, cursor: 'pointer' }}
                >
                  Add a comment…
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Comments sheet */}
      {activePost !== null && (
        <CommentsSheet
          postLabel={activePost.label}
          comments={sheetComments}
          isBarber={!!isBarber}
          onAdd={text => addComment(activePost.id, text)}
          onDelete={deleteComment}
          onClose={() => setActivePostId(null)}
        />
      )}

      {/* New post sheet */}
      {showNewPost && (
        <NewPostSheet onAdd={addPost} onClose={() => setShowNewPost(false)} />
      )}
    </div>
  )
}

function NewPostSheet({ onAdd, onClose }: { onAdd: (caption: string, label: string, imageUrl?: string) => void; onClose: () => void }) {
  const [caption,  setCaption]  = useState('')
  const [label,    setLabel]    = useState('')
  const [preview,  setPreview]  = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)


  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const canPost = caption.trim().length > 0 && label.trim().length > 0

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
              <span style={{ fontSize: 12, color: C.hint }}>Tap to add a photo</span>
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
          <button
            onClick={() => canPost && onAdd(caption.trim(), label.trim(), preview ?? undefined)}
            style={{
              padding: 13, borderRadius: 12,
              background: canPost ? C.text : C.borderMed,
              color: C.bg, fontSize: 14, fontWeight: 500,
              border: 'none', cursor: canPost ? 'pointer' : 'default', fontFamily: 'inherit',
              transition: 'background .15s',
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
