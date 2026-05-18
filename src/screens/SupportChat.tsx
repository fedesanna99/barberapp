import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { useSupportChat } from '../hooks/useSupportChat'
import type { SupportMessage } from '../types/supabase'

interface Props {
  userId:  string
  onClose: () => void
}

export function SupportChat({ userId, onClose }: Props) {
  const { messages, loading, sending, sendMessage } = useSupportChat(userId)
  const [text, setText]   = useState('')
  const bottomRef         = useRef<HTMLDivElement>(null)
  const textareaRef       = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const t = text.trim()
    if (!t || sending) return
    setText('')
    textareaRef.current?.focus()
    await sendMessage(t)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--scrim)',
      display: 'flex', alignItems: 'flex-end',
      zIndex: 100, animation: 'scrimIn 200ms var(--ease)',
    }}>
      <div style={{
        width: '100%', background: C.bg,
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        height: '82%',
        boxShadow: 'var(--shadow-sheet)',
        animation: 'sheetUp 260ms var(--ease)',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 9999, margin: '10px auto 0', flexShrink: 0 }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px 12px',
          borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: C.accentLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ph-thin ph-headset" style={{ fontSize: 18, color: C.accentDeep }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
              Supporto CutBook
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
              <span style={{ fontSize: 11, color: C.green }}>Online</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ph-thin ph-x" style={{ fontSize: 20, color: C.muted }} />
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ph-thin ph-spinner-gap" style={{ fontSize: 26, color: C.muted, animation: 'spin .8s linear infinite' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, textAlign: 'center', padding: '40px 28px',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ph-thin ph-chat-circle" style={{ fontSize: 20, color: C.hint }} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
                Come possiamo aiutarti?
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, maxWidth: 280 }}>
                Scrivi un messaggio per iniziare la chat.
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isOwn={!msg.is_admin} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{
          flexShrink: 0,
          padding: '10px 16px 18px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Scrivi un messaggio…"
            rows={1}
            style={{
              flex: 1, borderRadius: 'var(--r-pill)',
              border: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              padding: '10px 14px',
              fontSize: 13.5, color: C.text,
              fontFamily: 'inherit',
              outline: 'none', resize: 'none',
              maxHeight: 90, lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="Invia"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: text.trim() ? C.text : C.surface,
              border: 'none',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 120ms var(--ease)',
            }}
          >
            {sending
              ? <i className="ph-thin ph-spinner-gap" style={{ fontSize: 18, color: C.bg, animation: 'spin .8s linear infinite' }} />
              : <i className="ph-thin ph-paper-plane-tilt" style={{ fontSize: 18, color: text.trim() ? C.bg : C.hint }} />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg, isOwn }: { msg: SupportMessage; isOwn: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '78%',
        padding: '9px 13px',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isOwn ? C.text : C.surface,
        border: isOwn ? 'none' : `1px solid ${C.border}`,
      }}>
        {!isOwn && (
          <div style={{ fontSize: 10.5, fontWeight: 600, color: C.accentDeep, marginBottom: 4 }}>
            Supporto
          </div>
        )}
        <div style={{
          fontSize: 14, color: isOwn ? C.bg : C.text,
          lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: isOwn ? 'rgba(255,255,255,0.6)' : C.hint,
          marginTop: 4, textAlign: 'right',
        }}>
          {time}
        </div>
      </div>
    </div>
  )
}
