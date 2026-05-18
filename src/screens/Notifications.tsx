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
  if (m < 1)  return 'adesso'
  if (m < 60) return `${m} m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h fa`
  return `${Math.floor(h / 24)} g fa`
}

export function Notifications({ userId, onClose }: Props) {
  const { items, loading, unreadCount, markRead, markAllRead } = useNotifications(userId)

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ph-thin ph-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          Notifiche
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12.5, color: C.accent, fontFamily: 'inherit', padding: 4, fontWeight: 500,
            }}
          >
            Segna tutte lette
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ListRowSkeleton avatar={40} />
          <ListRowSkeleton avatar={40} />
          <ListRowSkeleton avatar={40} />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '0 32px', textAlign: 'center',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ph-thin ph-bell" style={{ fontSize: 20, color: C.hint }} />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Nessuna notifica
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, maxWidth: 260 }}>
            Quando avrai aggiornamenti sulle tue prenotazioni o nuovi messaggi, li vedrai qui.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 24px' }}>
          {items.map(n => <NotificationRow key={n.id} item={n} onMarkRead={markRead} />)}
        </div>
      )}
    </div>
  )
}

function NotificationRow({ item, onMarkRead }: { item: Notification; onMarkRead: (id: string) => void }) {
  const isBroadcast = item.recipient_id === null
  const safeHtml = sanitizeNotificationHtml(item.body_html)
  const unread = !item.is_read && !isBroadcast

  return (
    <div
      onClick={() => unread && onMarkRead(item.id)}
      style={{
        display: 'flex', gap: 12,
        padding: '14px 20px',
        background: unread ? C.accentLight + '40' : 'transparent',
        borderBottom: `1px solid ${C.border}`,
        cursor: unread ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: isBroadcast ? C.surfaceAlt : C.accentLight,
        color:      isBroadcast ? C.muted : C.accentDeep,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={`ph-thin ${isBroadcast ? 'ph-megaphone' : 'ph-bell'}`} style={{ fontSize: 18 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.title}</span>
          <span style={{ fontSize: 11, color: C.hint, flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
        </div>
        {safeHtml && (
          <div
            style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.55, wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        )}
        {isBroadcast && (
          <span style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 10.5, fontWeight: 500, padding: '3px 8px', borderRadius: 9999,
            background: C.surfaceAlt, color: C.muted,
          }}>
            Annuncio per tutti
          </span>
        )}
      </div>
      {unread && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, marginTop: 8, flexShrink: 0 }} />
      )}
    </div>
  )
}
