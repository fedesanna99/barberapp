import { useState, useEffect, useRef } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { initialsFromName } from '../hooks/useFeed'
import { useComments } from '../hooks/useComments'
import type { ToastEvent } from '../components/Toast'

interface Props {
  postId:             string
  postLabel:          string
  userId?:            string
  postOwnerProfileId?: string
  onClose:            () => void
  onToast?:           (t: ToastEvent) => void
}

export function CommentsSheet({ postId, postLabel, userId, postOwnerProfileId, onClose, onToast }: Props) {
  const { comments, add, remove, toggleLike } = useComments(postId, userId)
  const [text, setText] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  async function submit() {
    const t = text.trim()
    if (!t) return
    setText('')
    const { error } = await add(t)
    if (error) {
      setText(t)
      onToast?.({ kind: 'error', title: 'Commento non inviato', message: error })
    }
  }

  async function handleRemove(id: string) {
    const { error } = await remove(id)
    if (error) onToast?.({ kind: 'error', title: 'Eliminazione fallita', message: error })
  }

  async function handleToggleLike(id: string) {
    const { error } = await toggleLike(id)
    if (error) onToast?.({ kind: 'error', title: 'Azione fallita', message: error })
  }

  const isPostOwner = !!userId && userId === postOwnerProfileId
  const canDelete = (authorId: string | null) =>
    (!!authorId && authorId === userId) || isPostOwner

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-end', zIndex: 100, animation: 'scrimIn 200ms var(--ease)' }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        maxHeight: '82%', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
              Commenti
            </div>
            <div style={{ fontSize: 11.5, color: C.hint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {postLabel}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} color={C.muted} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 4px' }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Icon name="chat" size={20} color="var(--clay-deep)" />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.015em', color: C.text }}>
                Nessun commento
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>Sii il primo a scrivere.</div>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                {c.authorAvatar
                  ? <img src={c.authorAvatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <Avatar initials={initialsFromName(c.authorName)} size={36} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5, wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 600 }}>{c.authorName}</span>{' '}{c.content}
                  </div>
                  {canDelete(c.authorId) && (
                    <button
                      onClick={() => setPendingDelete(c.id)}
                      style={{ background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer', fontSize: 11.5, color: C.hint, fontFamily: 'inherit' }}
                    >
                      Elimina
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleToggleLike(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0 0', flexShrink: 0, minWidth: 22 }}
                >
                  <Icon name="heart" size={16} color={c.likedByMe ? C.red : C.hint} weight={c.likedByMe ? 'fill' : 'regular'} />
                  {c.likesCount > 0 && (
                    <span style={{ fontSize: 10, color: C.hint, marginTop: 2 }}>{c.likesCount}</span>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px 18px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Aggiungi un commento…"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 'var(--r-pill)',
              border: `1px solid ${C.border}`, fontSize: 13.5,
              background: C.surfaceAlt, color: C.text, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={submit}
            aria-label="Invia"
            style={{
              background: 'var(--clay)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="send" size={16} color="var(--paper-3)" />
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmSheet
          title="Eliminare commento?"
          message="Questa azione non può essere annullata."
          confirmLabel="Elimina"
          cancelLabel="Annulla"
          destructive
          icon="trash"
          onConfirm={() => { handleRemove(pendingDelete); setPendingDelete(null) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
