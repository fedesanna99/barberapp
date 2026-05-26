import { useEffect } from 'react'
import { C } from '../lib/colors'

// PR-tris (V4): 'warning' nuovo kind = rust soft background + gutter rust.
// Mappatura design → kind:
//   - cancel-refunded, cancel-cash, decline-by-barber → 'success' (sage gutter, dark card)
//   - cancel-no-refund                                → 'warning' (rust gutter, rust-soft card)
//   - errori tecnici (API down, validation)           → 'error'   (red gutter, dark card)
export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastEvent {
  kind:     ToastKind
  title:    string
  message?: string
}

interface ToastProps {
  toast:   ToastEvent
  onClose: () => void
}

const GUTTER: Record<ToastKind, string> = {
  success: C.green,
  error:   C.red,
  info:    C.accent,
  warning: 'var(--rust)',
}

/**
 * Modern Minimal toast: dark ink card by default, coloured gutter on the
 * left, sans title and muted message. 'warning' variant ribalta: rust-soft
 * background + dark ink text per il "outside window" payload (perdere soldi
 * non è un errore tecnico — è un avviso patrimoniale).
 */
export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, toast.kind === 'warning' ? 4000 : 3000)
    return () => clearTimeout(t)
  }, [onClose, toast.kind])

  const isWarning = toast.kind === 'warning'

  return (
    <div
      onClick={onClose}
      style={{
        position:    'absolute',
        top:         14,
        left:        14,
        right:       14,
        background:  isWarning ? 'var(--rust-soft)' : C.text,
        color:       isWarning ? C.text : C.bg,
        border:      isWarning ? '1px solid rgba(176, 94, 72, 0.25)' : 'none',
        borderRadius: 'var(--r-md)',
        padding:     '14px 16px',
        display:     'flex',
        alignItems:  'stretch',
        gap:         12,
        zIndex:      200,
        cursor:      'pointer',
        boxShadow:   'var(--shadow-toast)',
        animation:   'toastIn 360ms var(--ease-spring)',
      }}
    >
      <div style={{ width: 4, borderRadius: 9999, background: GUTTER[toast.kind], alignSelf: 'stretch', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{
            fontSize: 12,
            color: isWarning ? 'var(--rust)' : 'rgba(255,255,255,0.65)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
