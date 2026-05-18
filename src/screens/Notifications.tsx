import { C } from '../lib/colors'

interface Props {
  onClose: () => void
}

// Placeholder until a real notifications system lands.
// See BACKLOG.md ❌ MISSING #1 / #5.
export function Notifications({ onClose }: Props) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: C.bg, zIndex: 50,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 8px', flexShrink: 0,
        borderBottom: `0.5px solid ${C.border}`,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>Notifiche</span>
      </div>

      {/* Empty state */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '0 32px', textAlign: 'center',
      }}>
        <i className="ti ti-bell-off" style={{ fontSize: 44, color: C.hint, opacity: 0.5 }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Nessuna notifica</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
          Quando avrai aggiornamenti sulle tue prenotazioni o nuovi messaggi, li vedrai qui.
        </div>
      </div>
    </div>
  )
}
