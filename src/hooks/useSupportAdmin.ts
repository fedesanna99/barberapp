import { useState, useEffect, useRef } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { SupportConversation, SupportMessage } from '../types/supabase'
import { demoStore } from './useSupportChat'

// ── Types ─────────────────────────────────────────────────────────────────

export type ConvWithUser = SupportConversation & {
  userName: string
  lastMessage: string | null
}

// ── Conversation list hook (admin inbox) ──────────────────────────────────

export function useSupportAdmin() {
  const [conversations, setConversations] = useState<ConvWithUser[]>([])
  const [loading, setLoading]             = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (IS_DEMO) {
      buildDemoList()
      demoStore.subs.add(buildDemoList)
      return () => { demoStore.subs.delete(buildDemoList) }
    }

    load()

    const channel = supabase
      .channel('support_admin_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, () => load())
      .subscribe()

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildDemoList() {
    if (!demoStore.conv) { setConversations([]); setLoading(false); return }
    const msgs = demoStore.messages
    const last = msgs.length > 0 ? msgs[msgs.length - 1].content : null
    setConversations([{ ...demoStore.conv, userName: 'Demo User', lastMessage: last }])
    setLoading(false)
  }

  async function load() {
    const { data: convs } = await supabase
      .from('support_conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!convs || convs.length === 0) { setConversations([]); setLoading(false); return }

    const userIds = convs.map(c => c.user_id)
    const convIds = convs.map(c => c.id)

    const [{ data: profiles }, { data: lastMsgs }] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', userIds),
      supabase
        .from('support_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
    ])

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) {
      profileMap[p.id] = p.display_name ?? 'Utente'
    }

    const lastMsgMap: Record<string, string> = {}
    for (const m of lastMsgs ?? []) {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m.content
    }

    setConversations(convs.map(c => ({
      ...c,
      userName: profileMap[c.user_id] ?? 'Utente',
      lastMessage: lastMsgMap[c.id] ?? null,
    })))
    setLoading(false)
  }

  return { conversations, loading, reload: load }
}

// ── Single conversation chat hook (admin thread view) ─────────────────────

export function useSupportAdminChat(
  conversationId: string | null,
  adminId: string | undefined,
) {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading]   = useState(false)
  const [sending, setSending]   = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }

    if (IS_DEMO) {
      setMessages([...demoStore.messages])
      const update = () => setMessages([...demoStore.messages])
      demoStore.subs.add(update)
      return () => { demoStore.subs.delete(update) }
    }

    setLoading(true)
    supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`support_admin_chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const msg = payload.new as SupportMessage
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        },
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setMessages([])
    }
  }, [conversationId])

  async function sendReply(content: string) {
    const trimmed = content.trim()
    if (!trimmed || !adminId) return { error: 'missing' as const }

    if (IS_DEMO) {
      if (!demoStore.conv) return { error: 'no conversation' as const }
      const msg: SupportMessage = {
        id: crypto.randomUUID(),
        conversation_id: demoStore.conv.id,
        sender_id: adminId,
        is_admin: true,
        content: trimmed,
        created_at: new Date().toISOString(),
      }
      demoStore.messages = [...demoStore.messages, msg]
      demoStore.notify()
      return { error: null }
    }

    if (!conversationId) return { error: 'no conversation' as const }

    setSending(true)
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: conversationId,
      sender_id: adminId,
      is_admin: true,
      content: trimmed,
    })
    setSending(false)
    return { error: error?.message ?? null }
  }

  async function closeConversation() {
    if (!conversationId || IS_DEMO) return
    await supabase
      .from('support_conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId)
  }

  return { messages, loading, sending, sendReply, closeConversation }
}
