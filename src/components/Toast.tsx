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

const STYLE: Record<ToastKind, { bg: string; icon: string }> = {
  success: { bg: C.green,  icon: 'ti-circle-check'   },
  error:   { bg: C.red,    icon: 'ti-alert-triangle' },
  info:    { bg: C.accent, icon: 'ti-info-circle'    },
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    // Task 15 — durata ridotta da 5s a 3s (−2 s) per ridurre l'attesa visiva.
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const s = STYLE[toast.kind]

  return (
    <div style={{
      position:    'absolute',
      top:         10,
      left:        10,
      right:       10,
      background:  s.bg,
      borderRadius: 12,
      padding:     '12px 16px',
      display:     'flex',
      alignItems:  'center',
      gap:         10,
      zIndex:      200,
      animation:   'toastIn .35s cubic-bezier(.34,1.56,.64,1)',
    }}>
      <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: '#fff', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{toast.title}</div>
        {toast.message && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {toast.message}
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <i className="ti ti-x" style={{ fontSize: 16, color: 'rgba(255,255,255,.7)' }} />
      </button>
    </div>
  )
}
