import { C } from '../lib/colors'

interface Props {
  title:        string
  message?:     string
  confirmLabel?: string
  cancelLabel?:  string
  destructive?: boolean
  icon?:        string
  onConfirm:    () => void
  onCancel:     () => void
}

/**
 * Bottom-sheet confirmation dialog. Replaces window.confirm() for
 * destructive in-app actions (delete comment, cancel booking, etc.)
 * with a styled prompt that matches the rest of the bottom sheets.
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel  = 'Annulla',
  destructive  = false,
  icon,
  onConfirm,
  onCancel,
}: Props) {
  const confirmBg = destructive ? C.red : C.text
  const iconBg    = destructive ? `${C.red}1F` : C.surface
  const iconColor = destructive ? C.red : C.text

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', zIndex: 200,
      }}
    >
      <div style={{
        background: C.bg, borderRadius: '20px 20px 0 0', width: '100%',
        padding: '8px 0 24px', animation: 'sheetUp .25s ease-out',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: C.borderMed, borderRadius: 2, margin: '4px 0 18px' }} />

        {/* Icon */}
        {icon && (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: iconBg, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: 24, color: iconColor }} />
          </div>
        )}

        {/* Title */}
        <div style={{
          fontSize: 16, fontWeight: 600, color: C.text,
          textAlign: 'center', padding: '0 24px', marginBottom: 4,
        }}>
          {title}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            fontSize: 13, color: C.muted, textAlign: 'center',
            padding: '0 32px', lineHeight: 1.4, marginBottom: 4,
          }}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%', padding: '18px 16px 0' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: C.surface, color: C.text, border: 'none',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: confirmBg, color: C.bg, border: 'none',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
