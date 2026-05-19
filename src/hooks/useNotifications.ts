import { useEffect, useState, useCallback } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import type { Notification } from '../types/supabase'

// Notifications visible to the current user: own + broadcast (recipient_id IS NULL).
// Broadcasts don't carry a per-user read flag (no read-receipt table — out of
// scope), so the unread count covers only personal notifications.
export function useNotifications(userId: string | undefined) {
  const [items, setItems]     = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (IS_DEMO || !userId) {
      setItems([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`recipient_id.eq.${userId},recipient_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50)
    setItems((data ?? []) as Notification[])
    setLoading(false)
  }, [userId])

  useEffect(() => { void load() }, [load])

  const unreadCount = items.filter(n => n.recipient_id === userId && !n.is_read).length

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    if (IS_DEMO || !userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }, [userId])

  const markAllRead = useCallback(async () => {
    if (IS_DEMO || !userId) return
    const unreadIds = items.filter(n => n.recipient_id === userId && !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    setItems(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
  }, [items, userId])

  return { items, loading, unreadCount, reload: load, markRead, markAllRead }
}

// Admin helper to push a notification to one user or as broadcast (recipientId = null).
export async function sendNotification(params: {
  recipientId: string | null
  title: string
  bodyHtml?: string | null
  type?: string
}): Promise<{ error: string | null }> {
  if (IS_DEMO) return { error: null }
  const title = limitText(params.title.trim(), TEXT_LIMITS.notificationTitle)
  const bodyHtml = params.bodyHtml ? limitText(params.bodyHtml.trim(), TEXT_LIMITS.notificationBody) || null : null
  if (!title) return { error: 'Titolo obbligatorio' }
  const { error } = await supabase.from('notifications').insert({
    recipient_id: params.recipientId,
    title,
    body_html:    bodyHtml,
    type:         params.type ?? 'admin',
  })
  return { error: error?.message ?? null }
}
