import { useState, useEffect, useRef } from 'react'
import { supabase, IS_DEMO } from '../lib/supabase'
import { TEXT_LIMITS, limitText } from '../lib/textLimits'
import type { SupportConversation, SupportMessage } from '../types/supabase'

// ── Shared demo store (mutable object so importers can mutate fields) ─────

export const demoStore = {
  conv: null as SupportConversation | null,
  messages: [] as SupportMessage[],
  subs: new Set<() => void>(),
  notify() { this.subs.forEach(fn => fn()) },
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useSupportChat(userId: string | undefined) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages]         = useState<SupportMessage[]>([])
  const [loading, setLoading]           = useState(false)
  const [sending, setSending]           = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!userId) return

    if (IS_DEMO) {
      setConversation(demoStore.conv)
      setMessages([...demoStore.messages])
      const update = () => {
        setConversation(demoStore.conv ? { ...demoStore.conv } : null)
        setMessages([...demoStore.messages])
      }
      demoStore.subs.add(update)
      return () => { demoStore.subs.delete(update) }
    }

    openConversation(userId)

    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function openConversation(uid: string) {
    setLoading(true)

    // Get existing or create new (UNIQUE constraint prevents duplicates).
    let { data: conv } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    if (!conv) {
      const { data: newConv } = await supabase
        .from('support_conversations')
        .insert({ user_id: uid })
        .select()
        .single()
      conv = newConv
    }

    if (!conv) { setLoading(false); return }
    setConversation(conv)

    const { data: msgs } = await supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })

    setMessages(msgs ?? [])
    setLoading(false)

    // Subscribe to new messages in this conversation.
    const channel = supabase
      .channel(`support_chat:${conv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${conv.id}`,
        },
        payload => {
          const msg = payload.new as SupportMessage
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        },
      )
      .subscribe()

    channelRef.current = channel
  }

  async function sendMessage(content: string) {
    const trimmed = limitText(content.trim(), TEXT_LIMITS.supportMessage)
    if (!trimmed || !userId) return { error: 'missing' as const }

    if (IS_DEMO) {
      if (!demoStore.conv) {
        demoStore.conv = {
          id: crypto.randomUUID(),
          user_id: userId,
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      const msg: SupportMessage = {
        id: crypto.randomUUID(),
        conversation_id: demoStore.conv.id,
        sender_id: userId,
        is_admin: false,
        content: trimmed,
        created_at: new Date().toISOString(),
      }
      demoStore.messages = [...demoStore.messages, msg]
      demoStore.notify()
      return { error: null }
    }

    if (!conversation) return { error: 'no conversation' as const }

    setSending(true)
    const { error } = await supabase.from('support_messages').insert({
      conversation_id: conversation.id,
      sender_id: userId,
      is_admin: false,
      content: trimmed,
    })
    setSending(false)
    return { error: error?.message ?? null }
  }

  return { conversation, messages, loading, sending, sendMessage }
}
