import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, IS_DEMO } from '../lib/supabase'
import type { ConvStatus, DirectMessage } from '../types/supabase'

// Conversation entry with the peer's display info pre-joined so the list
// renders without a second roundtrip per row.
export interface DMConversation {
  id:            string
  peerId:        string
  peerName:      string | null
  peerAvatar:    string | null
  peerRole:      'client' | 'barber'
  status:        ConvStatus
  updatedAt:     string
  lastMessage:   string | null
  lastSenderId:  string | null
}

// Order the two profile ids so `participant_a < participant_b` matches the
// CHECK constraint in `031_direct_messages.sql`. The DB has a UNIQUE index on
// the ordered pair, so this same order lets us look up an existing row.
function orderPair(me: string, peer: string): { a: string; b: string } {
  return me < peer ? { a: me, b: peer } : { a: peer, b: me }
}

// List my conversations + Realtime updates on new messages so the list stays
// sorted by latest activity.
export function useDirectMessagesList(userId: string | undefined) {
  const [items, setItems]     = useState<DMConversation[]>([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const reload = useCallback(async () => {
    if (IS_DEMO || !userId) { setItems([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, participant_a, participant_b, status, updated_at,
        a:profiles!conversations_participant_a_fkey(id, display_name, avatar_url, role),
        b:profiles!conversations_participant_b_fkey(id, display_name, avatar_url, role)
      `)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(50)

    // For each conv, fetch the last message in a single batch (one query per
    // conv would be wasteful; do a single IN query).
    const convIds = (data ?? []).map(c => c.id)
    let lastByConv: Record<string, DirectMessage> = {}
    if (convIds.length > 0) {
      // Lateral-style: order by created_at desc and take the most recent per id
      // (works fine for the small page of 50 we display).
      const { data: msgs } = await supabase
        .from('direct_messages')
        .select('id, conversation_id, sender_id, body, created_at, read_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
      for (const m of msgs ?? []) {
        if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m as DirectMessage
      }
    }

    const list: DMConversation[] = (data ?? []).map((c: any) => {
      const me = userId
      const peer = c.participant_a === me ? c.b : c.a
      const last = lastByConv[c.id] ?? null
      return {
        id:           c.id,
        peerId:       peer?.id ?? (c.participant_a === me ? c.participant_b : c.participant_a),
        peerName:     peer?.display_name ?? null,
        peerAvatar:   peer?.avatar_url ?? null,
        peerRole:     peer?.role ?? 'client',
        status:       c.status,
        updatedAt:    c.updated_at,
        lastMessage:  last?.body ?? null,
        lastSenderId: last?.sender_id ?? null,
      }
    })
    setItems(list)
    setLoading(false)
  }, [userId])

  useEffect(() => { void reload() }, [reload])

  useEffect(() => {
    if (IS_DEMO || !userId) return
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel(`dm_list_${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => { void reload() },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => { void reload() },
      )
      .subscribe()
    return () => { channelRef.current?.unsubscribe(); channelRef.current = null }
  }, [userId, reload])

  return { items, loading, reload }
}

// Resolve a conversation between me and `peerId`. Returns null when none
// exists yet (task 17: don't create until the user actually sends).
export async function findConversation(meId: string, peerId: string): Promise<{ id: string; status: ConvStatus } | null> {
  const { a, b } = orderPair(meId, peerId)
  const { data } = await supabase
    .from('conversations')
    .select('id, status')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .maybeSingle()
  return data as any
}

// Send the first message (lazy-create the conversation if missing), or just
// insert into an existing one. Returns the conversation id.
// Reopens (task 18) by setting status='open' before inserting when needed.
export async function sendDirectMessage(meId: string, peerId: string, body: string): Promise<{
  conversationId: string | null
  error: string | null
}> {
  const trimmed = body.trim()
  if (!trimmed) return { conversationId: null, error: 'empty' }
  let conv = await findConversation(meId, peerId)
  if (!conv) {
    const { a, b } = orderPair(meId, peerId)
    const { data: inserted, error } = await supabase
      .from('conversations')
      .insert({ participant_a: a, participant_b: b })
      .select('id, status')
      .single()
    if (error) return { conversationId: null, error: error.message }
    conv = inserted as any
  } else if (conv.status === 'closed') {
    // Task 18 — sending into a closed conversation re-opens it.
    await supabase.from('conversations').update({ status: 'open' as ConvStatus }).eq('id', conv.id)
  }
  const { error: msgErr } = await supabase
    .from('direct_messages')
    .insert({ conversation_id: conv!.id, sender_id: meId, body: trimmed })
  return { conversationId: conv!.id, error: msgErr?.message ?? null }
}

// Per-thread state: messages + realtime.
export function useDirectThread(conversationId: string | null, meId: string | undefined) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading]   = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }
    let cancelled = false
    setLoading(true)
    supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setMessages((data ?? []) as DirectMessage[])
        setLoading(false)
        // Mark unread incoming as read.
        if (meId && (data ?? []).some(m => m.sender_id !== meId && !m.read_at)) {
          void supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_id', meId)
            .is('read_at', null)
        }
      })
    return () => { cancelled = true }
  }, [conversationId, meId])

  useEffect(() => {
    if (!conversationId) return
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel(`dm_thread_${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${conversationId}` },
        payload => setMessages(prev => {
          // Dedup by id. In dev React.StrictMode mounts the effect twice,
          // briefly keeping two server-side subs to the same channel; both
          // would receive the same INSERT and the row would render twice
          // until the next fetch. This guard makes the listener idempotent.
          const m = payload.new as DirectMessage
          return prev.some(x => x.id === m.id) ? prev : [...prev, m]
        }),
      )
      .subscribe()
    return () => { channelRef.current?.unsubscribe(); channelRef.current = null }
  }, [conversationId])

  return { messages, loading }
}

// Toggle conversation status (close / reopen). Used by task 18.
export async function setConversationStatus(conversationId: string, status: ConvStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.from('conversations').update({ status }).eq('id', conversationId)
  return { error: error?.message ?? null }
}
