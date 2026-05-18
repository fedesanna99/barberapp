import { C } from '../lib/colors'

interface Props {
  title:        string
  message?:     string
  confirmLabel?: string
  cancelLabel?:  string
  destructive?: boolean
  icon?:        string  // Phosphor icon name without prefix, e.g. "trash"
  onConfirm:    () => void
  onCancel:     () => void
}

/**
 * Bottom-sheet confirmation dialog. Modern Minimal: flat scrim, ink primary
 * button, coral isn't used here — destructive maps to red.
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
  const iconBg    = destructive ? C.redSoft : C.surface
  const iconColor = destructive ? C.red : C.text

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'absolute', inset: 0, background: 'var(--scrim)',
        display: 'flex', alignItems: 'flex-end', zIndex: 200,
        animation: 'scrimIn 200ms var(--ease)',
      }}
    >
      <div style={{
        background: C.bg,
        borderRadius: '20px 20px 0 0',
        width: '100%',
        padding: '8px 0 24px',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px 0 18px' }} />

        {icon && (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: iconBg, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <i className={`ph-thin ph-${icon}`} style={{ fontSize: 24, color: iconColor }} />
          </div>
        )}

        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: 18, letterSpacing: '-0.02em',
          color: C.text, textAlign: 'center',
          padding: '0 24px', marginBottom: 6,
        }}>
          {title}
        </div>

        {message && (
          <div style={{
            fontSize: 13, color: C.muted, textAlign: 'center',
            padding: '0 28px', lineHeight: 1.5, marginBottom: 4,
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, width: '100%', padding: '18px 20px 0' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
              background: C.bg, color: C.text,
              border: `1px solid ${C.borderMed}`,
              fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)',
              background: confirmBg, color: C.bg,
              border: `1px solid ${confirmBg}`,
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
