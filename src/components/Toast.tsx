import { useEffect } from 'react'
import { C } from '../lib/colors'

interface ToastProps {
  message: string
  onClose: () => void
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position:    'absolute',
      top:         10,
      left:        10,
      right:       10,
      background:  C.green,
      borderRadius: 12,
      padding:     '12px 16px',
      display:     'flex',
      alignItems:  'center',
      gap:         10,
      zIndex:      200,
      animation:   'toastIn .35s cubic-bezier(.34,1.56,.64,1)',
    }}>
      <i className="ti ti-calendar-check" style={{ fontSize: 20, color: '#fff', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>Appointment confirmed!</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', marginTop: 1 }}>{message}</div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
        <i className="ti ti-x" style={{ fontSize: 16, color: 'rgba(255,255,255,.7)' }} />
      </button>
    </div>
  )
}
