import { useEffect, useRef, useState } from 'react'
import { C } from '../lib/colors'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
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
import type { ToastEvent } from '../components/Toast'

interface Props {
  userId?:    string
  onClose:    () => void
  initialPeer?: { profileId: string; displayName: string | null; avatarUrl?: string | null; role?: 'client' | 'barber' } | null
  onToast?:   (t: ToastEvent) => void
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
  if (m < 1)  return 'adesso'
  if (m < 60) return `${m} m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h`
  return `${Math.floor(h / 24)} g`
}

export function DirectMessages({ userId, onClose, initialPeer, onToast }: Props) {
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
        onToast={onToast}
      />
    )
  }

  return <DMList userId={userId} onClose={onClose} onOpenPeer={setActivePeer} />
}

function DMList({ userId, onClose, onOpenPeer }: {
  userId:      string | undefined
  onClose:     () => void
  onOpenPeer:  (peer: PeerInfo) => void
}) {
  const { items, loading } = useDirectMessagesList(userId)

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onClose} aria-label="Indietro" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <Icon name="back" size={22} color={C.text} />
        </button>
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
          Messaggi
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ListRowSkeleton avatar={44} />
          <ListRowSkeleton avatar={44} />
          <ListRowSkeleton avatar={44} />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '0 32px', textAlign: 'center',
        }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chat" size={20} color="var(--clay-deep)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            Nessuna conversazione
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, maxWidth: 280 }}>
            Quando scriverai a un barbiere (o riceverai un messaggio), la conversazione apparirà qui.
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {items.map((c, i) => (
            <div key={c.id}>
              {i > 0 && <div style={{ height: 1, background: C.border, marginLeft: 20 }} />}
              <div
                onClick={() => onOpenPeer({
                  profileId: c.peerId,
                  displayName: c.peerName,
                  avatarUrl: c.peerAvatar,
                  role: c.peerRole,
                })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', cursor: 'pointer',
                }}
              >
                <Avatar initials={initials(c.peerName)} size={44} photo={c.peerAvatar ?? null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.peerName ?? 'Profilo'}
                    </span>
                    <span style={{ fontSize: 11.5, color: C.hint, flexShrink: 0 }}>{timeAgo(c.updatedAt)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastMessage ?? '—'}
                  </div>
                </div>
                {c.status === 'closed' && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 500, padding: '3px 9px', borderRadius: 9999,
                    background: C.surfaceAlt, color: C.muted,
                  }}>
                    Chiusa
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DMThread({ meId, peer, onBack, onClose, onToast }: {
  meId: string
  peer: PeerInfo
  onBack: () => void
  onClose: () => void
  onToast?: (t: ToastEvent) => void
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
    const { conversationId, error } = await sendDirectMessage(meId, peer.profileId, t)
    setSending(false)
    if (error) { onToast?.({ kind: 'error', title: 'Invio fallito', message: error }); return }
    if (conversationId) { setConvId(conversationId); setStatus('open') }
  }

  async function toggleClose() {
    if (!convId) return
    const next: ConvStatus = status === 'open' ? 'closed' : 'open'
    const prev = status
    setStatus(next)
    const { error } = await setConversationStatus(convId, next)
    if (error) { setStatus(prev); onToast?.({ kind: 'error', title: 'Operazione fallita', message: error }) }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <button onClick={onBack} aria-label="Indietro" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="back" size={20} color={C.muted} />
        </button>
        <Avatar initials={initials(peer.displayName)} size={36} photo={peer.avatarUrl ?? null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
            {peer.displayName ?? 'Profilo'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'open' ? C.green : C.hint }} />
            <span style={{ fontSize: 11, color: status === 'open' ? C.green : C.hint }}>
              {status === 'open' ? 'Aperta' : 'Chiusa'}
            </span>
          </div>
        </div>
        {convId && (
          <button
            onClick={toggleClose}
            title={status === 'open' ? 'Chiudi conversazione' : 'Riapri conversazione'}
            style={{
              background: C.bg, border: `1px solid ${C.borderMed}`,
              padding: '6px 10px', borderRadius: 'var(--r-md)',
              color: C.text, fontSize: 11.5, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {status === 'open' ? 'Chiudi' : 'Riapri'}
          </button>
        )}
        <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <Icon name="close" size={20} color={C.muted} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!loaded || loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="refresh" size={24} color={C.muted} style={{ animation: 'spin .8s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 32px', color: C.muted, fontSize: 13.5, lineHeight: 1.55 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--clay-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <Icon name="chat" size={20} color="var(--clay-deep)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.015em', color: C.text, marginBottom: 6 }}>
              Nessun messaggio.
            </div>
            Scrivi qui sotto per iniziare la conversazione — sarà visibile solo a te e a {peer.displayName ?? 'questo profilo'}.
          </div>
        ) : (
          messages.map(m => {
            const mine = m.sender_id === meId
            const time = new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', padding: '9px 13px',
                  borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: mine ? 'var(--clay)' : C.surface,
                  border: mine ? 'none' : `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 13.5, color: mine ? 'var(--paper-3)' : C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.body}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: mine ? 'rgba(252,250,245,0.7)' : C.hint, marginTop: 4, textAlign: 'right' }}>
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
        flexShrink: 0, padding: '10px 16px 16px',
        borderTop: `1px solid ${C.border}`,
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 4000))}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
            placeholder={status === 'closed' ? 'Scrivi per riaprire la conversazione…' : 'Scrivi un messaggio…'}
            rows={1}
            maxLength={4000}
            style={{
              width: '100%', borderRadius: 'var(--r-pill)',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              padding: '10px 14px', fontSize: 13.5, color: C.text, fontFamily: 'inherit',
              outline: 'none', resize: 'none', maxHeight: 80, lineHeight: 1.4,
              boxSizing: 'border-box',
            }}
          />
          {text.length > 3800 && (
            <span style={{
              position: 'absolute', right: 12, bottom: -16,
              fontSize: 10, color: text.length >= 4000 ? C.red : C.hint,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {text.length}/4000
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Invia"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: text.trim() ? 'var(--clay)' : C.surface,
            border: 'none', cursor: text.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 120ms var(--ease)',
          }}
        >
          {sending
            ? <Icon name="refresh" size={16} color="var(--paper-3)" style={{ animation: 'spin .8s linear infinite' }} />
            : <Icon name="send" size={16} color={text.trim() ? 'var(--paper-3)' : C.hint} />
          }
        </button>
      </div>
    </div>
  )
}

export async function openDmFromBarber(_meId: string, _peerProfileId: string): Promise<void> {
  if (IS_DEMO) return
  await supabase
}
