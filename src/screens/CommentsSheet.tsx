import { useState, useEffect, useRef } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { initialsFromName } from '../hooks/useFeed'
import { useComments } from '../hooks/useComments'

interface Props {
  postId:             string
  postLabel:          string
  userId?:            string
  postOwnerProfileId?: string
  onClose:            () => void
}

export function CommentsSheet({ postId, postLabel, userId, postOwnerProfileId, onClose }: Props) {
  const { comments, add, remove, toggleLike } = useComments(postId, userId)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  async function submit() {
    const t = text.trim()
    if (!t) return
    setText('')
    await add(t)
  }

  const isPostOwner = !!userId && userId === postOwnerProfileId
  const canDelete = (authorId: string | null) =>
    (!!authorId && authorId === userId) || isPostOwner

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', zIndex: 100 }}
    >
      <div style={{ background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '80%', display: 'flex', flexDirection: 'column', animation: 'sheetUp .3s ease-out' }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px 10px', flexShrink: 0, borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Commenti</div>
            <div style={{ fontSize: 11, color: C.hint, marginTop: 1 }}>{postLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" style={{ fontSize: 18, color: C.muted }} />
          </button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 4px' }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: C.hint, fontSize: 13 }}>
              <i className="ti ti-message-circle-off" style={{ fontSize: 26, display: 'block', marginBottom: 6 }} />
              Nessun commento. Sii il primo!
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                {c.authorAvatar
                  ? <img src={c.authorAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `0.5px solid ${C.border}` }} />
                  : <Avatar initials={initialsFromName(c.authorName)} size={32} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.45, wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 500 }}>{c.authorName}</span>{' '}{c.content}
                  </div>
                  {canDelete(c.authorId) && (
                    <button
                      onClick={() => remove(c.id)}
                      style={{ background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer', fontSize: 11, color: C.hint, fontFamily: 'inherit' }}
                    >
                      Elimina
                    </button>
                  )}
                </div>
                <button
                  onClick={() => toggleLike(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0 0', flexShrink: 0, minWidth: 22 }}
                >
                  <i className="ti ti-heart" style={{ fontSize: 14, color: c.likedByMe ? C.red : C.hint }} />
                  {c.likesCount > 0 && (
                    <span style={{ fontSize: 10, color: C.hint, marginTop: 1 }}>{c.likesCount}</span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div style={{ borderTop: `0.5px solid ${C.border}`, padding: '10px 16px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Aggiungi un commento…"
            style={{
              flex: 1, padding: '9px 14px', borderRadius: 20,
              border: `0.5px solid ${C.borderMed}`, fontSize: 13,
              background: C.surface, color: C.text, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={submit}
            style={{
              background: C.text, border: 'none', borderRadius: '50%',
              width: 34, height: 34, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-send" style={{ fontSize: 15, color: C.bg }} />
          </button>
        </div>
      </div>
    </div>
  )
}
