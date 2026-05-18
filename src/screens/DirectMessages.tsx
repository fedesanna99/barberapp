import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { ListRowSkeleton } from '../components/Skeleton'
import { supabase, IS_DEMO } from '../lib/supabase'
import {
  useDirectMessagesList,
  useDirectThread,
  sendDirectMessage,
  setConversationStatus,
  findConversation,
} from '../hooks/useDirectMessages'
import type { ConvStatus } from '../types/supabase'

interface Props {
  userId?: string
  onClose: () => void
  // Optional: open straight into a conversation with this profile.
  initialPeer?: { profileId: string; displayName: string | null; avatarUrl?: string | null; role?: 'client' | 'barber' } | null
}

interface PeerInfo {
  profileId:   string
  displayName: string | null
  avatarUrl:   string | null
  role:        'client' | 'barber'
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'adesso'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}g`
}

// Task 16/17/18 — DM root: shows the conversation list, then a thread on tap.
export function DirectMessages({ userId, onClose, initialPeer }: Props) {
  const [activePeer, setActivePeer] = useState<PeerInfo | null>(
    initialPeer
      ? {
          profileId:   initialPeer.profileId,
          displayName: initialPeer.displayName,
          avatarUrl:   initialPeer.avatarUrl ?? null,
          role:        initialPeer.role ?? 'client',
        }
      : null,
  )

  if (activePeer && userId) {
    return (
      <DMThread
        meId={userId}
        peer={activePeer}
        onBack={() => setActivePeer(null)}
        onClose={onClose}
      />
    )
  }

  return <DMList userId={userId} onClose={onClose} onOpenPeer={setActivePeer} />
}

function DMList({ userId, onClose, onOpenPeer }: {
  userId: string | undefined
  onClose: () => void
  onOpenPeer: (peer: PeerInfo) => void
}) {
  const { items, loading } = useDirectMessagesList(userId)

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px 8px', flexShrink: 0,
        borderBottom: `0.5px solid ${C.border}`,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 22, color: C.text }} />
        </button>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: C.text }}>Messaggi</span>
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
          <i className="ti ti-messages-off" style={{ fontSize: 44, color: C.hint, opacity: 0.5 }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Nessuna conversazione</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
            Quando scriverai a un barbiere (o riceverai un messaggio), la conversazione apparirà qui.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map(c => (
            <div
              key={c.id}
              onClick={() => onOpenPeer({
                profileId: c.peerId,
                displayName: c.peerName,
                avatarUrl: c.peerAvatar,
                role: c.peerRole,
              })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: `0.5px solid ${C.border}`, cursor: 'pointer',
              }}
            >
              {c.peerAvatar
                ? <img src={c.peerAvatar} style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover', flexShrink: 0 }} />
                : <Avatar initials={initials(c.peerName)} size={44} accent={c.peerRole === 'barber' ? C.green : C.muted} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.peerName ?? 'Profilo'}
                  </span>
                  <span style={{ fontSize: 11, color: C.hint, flexShrink: 0 }}>{timeAgo(c.updatedAt)}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.lastMessage ?? '—'}
                </div>
              </div>
              {c.status === 'closed' && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: C.surface, color: C.hint,
                }}>
                  CHIUSA
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DMThread({ meId, peer, onBack, onClose }: {
  meId: string
  peer: PeerInfo
  onBack: () => void
  onClose: () => void
}) {
  const [convId, setConvId]   = useState<string | null>(null)
  const [status, setStatus]   = useState<ConvStatus>('open')
  const [loaded, setLoaded]   = useState(false)
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const { messages, loading } = useDirectThread(convId, meId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (IS_DEMO) { setLoaded(true); return }
    let cancelled = false
    findConversation(meId, peer.profileId).then(c => {
      if (cancelled) return
      setConvId(c?.id ?? null)
      setStatus((c?.status as ConvStatus) ?? 'open')
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [meId, peer.profileId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    if (IS_DEMO) { setText(''); return }
    setSending(true)
    setText('')
    // Task 17 — lazy-create happens inside sendDirectMessage when no conv yet.
    // Task 18 — sendDirectMessage reopens a closed conv before insert.
    const { conversationId, error } = await sendDirectMessage(meId, peer.profileId, t)
    setSending(false)
    if (error) { alert(`Invio fallito: ${error}`); return }
    if (conversationId) { setConvId(conversationId); setStatus('open') }
  }

  async function toggleClose() {
    if (!convId) return
    const next: ConvStatus = status === 'open' ? 'closed' : 'open'
    const prev = status
    setStatus(next)
    const { error } = await setConversationStatus(convId, next)
    if (error) { setStatus(prev); alert(`Operazione fallita: ${error}`) }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: `0.5px solid ${C.border}`, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 20, color: C.muted }} />
        </button>
        {peer.avatarUrl
          ? <img src={peer.avatarUrl} style={{ width: 34, height: 34, borderRadius: 17, objectFit: 'cover' }} />
          : <Avatar initials={initials(peer.displayName)} size={34} accent={peer.role === 'barber' ? C.green : C.muted} />
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{peer.displayName ?? 'Profilo'}</div>
          <div style={{ fontSize: 11, color: status === 'open' ? C.green : C.hint }}>
            {status === 'open' ? 'Conversazione aperta' : 'Conversazione chiusa'}
          </div>
        </div>
        {convId && (
          <button
            onClick={toggleClose}
            title={status === 'open' ? 'Chiudi conversazione' : 'Riapri conversazione'}
            style={{
              background: 'none', border: `1px solid ${C.borderMed}`,
              padding: '4px 10px', borderRadius: 8,
              color: C.muted, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {status === 'open' ? 'Chiudi' : 'Riapri'}
          </button>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <i className="ti ti-x" style={{ fontSize: 20, color: C.muted }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!loaded || loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 40, color: C.hint, fontSize: 13, padding: '40px 24px' }}>
            <i className="ti ti-message-2" style={{ fontSize: 32, opacity: 0.5, marginBottom: 8 }} />
            <div style={{ marginTop: 6 }}>
              Nessun messaggio ancora.<br />
              Scrivi qui sotto per iniziare la conversazione — sarà visibile solo a te e a {peer.displayName ?? 'questo profilo'}.
            </div>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === meId
            const time = new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', padding: '8px 12px',
                  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: mine ? C.accent : C.surface,
                  border: mine ? 'none' : `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 13, color: mine ? '#fff' : C.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.65)' : C.hint, marginTop: 3, textAlign: 'right' }}>
                    {time}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        flexShrink: 0, padding: '8px 12px 16px',
        borderTop: `0.5px solid ${C.border}`,
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
          placeholder={status === 'closed' ? 'Scrivi per riaprire la conversazione…' : 'Scrivi un messaggio…'}
          rows={1}
          style={{
            flex: 1, borderRadius: 16,
            border: `1.5px solid ${C.borderMed}`, background: C.surface,
            padding: '9px 13px', fontSize: 13, color: C.text, fontFamily: 'inherit',
            outline: 'none', resize: 'none', maxHeight: 80, lineHeight: 1.4,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: text.trim() ? C.accent : C.surface,
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background .15s',
          }}
        >
          {sending
            ? <i className="ti ti-loader-2" style={{ fontSize: 16, color: '#fff', animation: 'spin 0.8s linear infinite' }} />
            : <i className="ti ti-send" style={{ fontSize: 16, color: text.trim() ? '#fff' : C.hint }} />
          }
        </button>
      </div>
    </div>
  )
}

// Helper used elsewhere to deep-link to a barber profile's chat without
// duplicating the DM screen's mount/open logic.
export async function openDmFromBarber(_meId: string, _peerProfileId: string): Promise<void> {
  if (IS_DEMO) return
  await supabase  // no-op: kept for symmetry / future hooks
}
