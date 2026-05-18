import { useState } from 'react'
import { C } from '../lib/colors'
import { StarRating } from './StarRating'
import type { ReviewRow } from '../hooks/useReviews'

interface Props {
  barberName: string
  existing?:  ReviewRow | null
  onClose:    () => void
  onSubmit:   (rating: number, comment: string | null) => Promise<{ error?: string }>
  onDelete?:  () => Promise<{ error?: string }>
}

const MAX_COMMENT = 500

export function ReviewSheet({ barberName, existing, onClose, onSubmit, onDelete }: Props) {
  const [rating,   setRating]   = useState<number>(existing?.rating ?? 0)
  const [comment,  setComment]  = useState<string>(existing?.comment ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const isEdit = !!existing

  async function handleSubmit() {
    if (rating < 1) { setError('Tocca le stelle per assegnare un voto'); return }
    setSaving(true)
    setError(null)
    const res = await onSubmit(rating, comment.trim() || null)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onClose()
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!window.confirm('Eliminare la tua recensione?')) return
    setDeleting(true)
    setError(null)
    const res = await onDelete()
    setDeleting(false)
    if (res.error) { setError(res.error); return }
    onClose()
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'absolute', inset: 0, background: 'var(--scrim)',
        display: 'flex', alignItems: 'flex-end', zIndex: 250,
        animation: 'scrimIn 200ms var(--ease)',
      }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        padding: '8px 0 24px', maxHeight: '92%', overflowY: 'auto',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 16px' }} />

        <div style={{ padding: '0 20px 6px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: C.text, letterSpacing: '-0.02em' }}>
            {isEdit ? 'Modifica recensione' : 'Lascia una recensione'}
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{barberName}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 6px' }}>
          <StarRating value={rating} onChange={setRating} size={36} gap={8} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: C.hint, minHeight: 16 }}>
          {rating > 0 ? `${rating} su 5` : 'Tocca per votare'}
        </div>

        <div style={{ padding: '14px 20px 6px' }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="Racconta com'è andata (opzionale)…"
            rows={4}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              color: C.text, fontSize: 13.5, fontFamily: 'inherit',
              resize: 'none', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: C.hint, marginTop: 4 }}>
            {comment.length}/{MAX_COMMENT}
          </div>
        </div>

        {error && (
          <div style={{ padding: '0 20px 8px', fontSize: 12.5, color: C.red, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, padding: '6px 20px 0' }}>
          <button
            onClick={onClose}
            disabled={saving || deleting}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
              background: C.bg, color: C.text,
              border: `1px solid ${C.borderMed}`,
              fontSize: 14, fontWeight: 500,
              cursor: saving || deleting ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving || deleting ? 0.6 : 1,
            }}
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || deleting || rating < 1}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
              background: rating < 1 ? C.surface : C.text,
              color:      rating < 1 ? C.hint : C.bg,
              border: `1px solid ${rating < 1 ? C.border : C.text}`,
              fontSize: 14, fontWeight: 500,
              cursor: saving || deleting || rating < 1 ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '…' : isEdit ? 'Salva' : 'Pubblica'}
          </button>
        </div>

        {isEdit && onDelete && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              style={{
                background: 'none', border: 'none', color: C.red,
                fontSize: 12.5, fontWeight: 500,
                cursor: saving || deleting ? 'default' : 'pointer',
                fontFamily: 'inherit', padding: '6px 12px',
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Eliminazione…' : 'Elimina recensione'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
