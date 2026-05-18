import { C } from '../lib/colors'
import { useNotifications } from '../hooks/useNotifications'
import { sanitizeNotificationHtml } from '../lib/sanitizeHtml'
import { ListRowSkeleton } from '../components/Skeleton'
import type { Notification } from '../types/supabase'

interface Props {
  userId?: string
  onClose: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'adesso'
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  return `${Math.floor(h / 24)}g fa`
}

export function Notifications({ userId, onClose }: Props) {
  const { items, loading, unreadCount, markRead, markAllRead } = useNotifications(userId)

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
        <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: C.text }}>Notifiche</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: C.accent, fontFamily: 'inherit', padding: 4,
            }}
          >
            Segna tutte lette
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ListRowSkeleton avatar={36} />
          <ListRowSkeleton avatar={36} />
          <ListRowSkeleton avatar={36} />
        </div>
      ) : items.length === 0 ? (
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
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 24px' }}>
          {items.map(n => <NotificationRow key={n.id} item={n} onMarkRead={markRead} />)}
        </div>
      )}
    </div>
  )
}

function NotificationRow({ item, onMarkRead }: { item: Notification; onMarkRead: (id: string) => void }) {
  const isBroadcast = item.recipient_id === null
  // Task 9: body_html is admin-authored and sanitized with an allow-list (see
  // src/lib/sanitizeHtml.ts) before being rendered via dangerouslySetInnerHTML.
  // No script/style/iframe/on* can survive.
  const safeHtml = sanitizeNotificationHtml(item.body_html)

  return (
    <div
      onClick={() => !item.is_read && !isBroadcast && onMarkRead(item.id)}
      style={{
        display: 'flex', gap: 12,
        padding: '12px 16px',
        background: !item.is_read && !isBroadcast ? 'rgba(201,150,58,0.05)' : 'transparent',
        borderBottom: `0.5px solid ${C.border}`,
        cursor: !item.is_read && !isBroadcast ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isBroadcast ? 'rgba(120,120,140,0.13)' : 'rgba(201,150,58,0.15)',
        color: isBroadcast ? C.muted : C.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={`ti ${isBroadcast ? 'ti-broadcast' : 'ti-bell'}`} style={{ fontSize: 18 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.title}</span>
          <span style={{ fontSize: 10, color: C.hint, flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
        </div>
        {safeHtml && (
          <div
            style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.45, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
        {isBroadcast && (
          <span style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(120,120,140,0.13)', color: C.muted,
          }}>
            Annuncio per tutti
          </span>
        )}
      </div>
      {!item.is_read && !isBroadcast && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, marginTop: 6, flexShrink: 0 }} />
      )}
    </div>
  )
}
