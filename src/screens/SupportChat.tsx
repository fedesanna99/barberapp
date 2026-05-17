import { useState, useRef, useEffect } from 'react'
import { C } from '../lib/colors'
import { useSupportChat } from '../hooks/useSupportChat'
import type { SupportMessage } from '../types/supabase'

interface Props {
  userId: string
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
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end',
      zIndex: 100, animation: 'fadeSlideIn .2s ease',
    }}>
      <div style={{
        width: '100%', background: C.bg,
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        height: '82%',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 16px 12px',
          borderBottom: `0.5px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: C.accentLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-headset" style={{ fontSize: 19, color: C.accent }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Supporto CutBook</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
              <span style={{ fontSize: 11, color: C.green }}>Online</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          }}>
            <i className="ti ti-x" style={{ fontSize: 21, color: C.muted }} />
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 26, color: C.muted, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, textAlign: 'center', paddingTop: 32,
            }}>
              <i className="ti ti-message-circle" style={{ fontSize: 44, color: C.hint }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  Ciao! Come possiamo aiutarti?
                </div>
                <div style={{ fontSize: 13, color: C.hint }}>
                  Scrivi un messaggio per iniziare la chat.
                </div>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <Bubble key={msg.id} msg={msg} isOwn={!msg.is_admin} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          flexShrink: 0,
          padding: '8px 12px 20px',
          borderTop: `0.5px solid ${C.border}`,
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Scrivi un messaggio…"
            rows={1}
            style={{
              flex: 1, borderRadius: 20,
              border: `1.5px solid ${C.borderMed}`,
              background: C.surface,
              padding: '10px 14px',
              fontSize: 14, color: C.text,
              fontFamily: 'inherit',
              outline: 'none', resize: 'none',
              maxHeight: 90, lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: text.trim() ? C.accent : C.surface,
              border: 'none',
              cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background .15s',
            }}
          >
            {sending
              ? <i className="ti ti-loader-2" style={{ fontSize: 18, color: '#fff', animation: 'spin 0.8s linear infinite' }} />
              : <i className="ti ti-send" style={{ fontSize: 18, color: text.trim() ? '#fff' : C.hint }} />
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
        maxWidth: '76%',
        padding: '8px 12px',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isOwn ? C.accent : C.surface,
        border: isOwn ? 'none' : `1px solid ${C.border}`,
      }}>
        {!isOwn && (
          <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 3 }}>
            Supporto
          </div>
        )}
        <div style={{
          fontSize: 14, color: isOwn ? '#fff' : C.text,
          lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: 10,
          color: isOwn ? 'rgba(255,255,255,0.6)' : C.hint,
          marginTop: 3, textAlign: 'right',
        }}>
          {time}
        </div>
      </div>
    </div>
  )
}
