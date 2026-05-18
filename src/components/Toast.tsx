import { useEffect } from 'react'
import { C } from '../lib/colors'

export type ToastKind = 'success' | 'error' | 'info'

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
}

/**
 * Modern Minimal toast: dark ink card, coloured gutter on the left, sans
 * title and muted message. No icon — gutter alone carries the kind.
 */
export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position:    'absolute',
        top:         14,
        left:        14,
        right:       14,
        background:  C.text,
        color:       C.bg,
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
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
