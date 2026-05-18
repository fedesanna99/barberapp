import { useState } from 'react'
import { C } from '../lib/colors'
import { supabase } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'

interface Props {
  onDone: () => void
}

export function ResetPassword({ onDone }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [focused, setFocused]   = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 6)  { setError('La password deve essere di almeno 6 caratteri'); return }
    if (password !== confirm) { setError('Le password non coincidono'); return }
    setLoading(true)
    const { error: e } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (e) {
      writeLog('auth.reset.failed', `Aggiornamento password fallito: ${e.message}`, 'warning')
      setError(e.message)
      return
    }
    writeLog('auth.reset.completed', 'Password aggiornata con successo', 'info')
    onDone()
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 24px', background: C.bg, overflowY: 'auto',
      animation: 'fadeSlideIn .25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.accent }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.025em', color: C.text }}>CutBook</span>
      </div>

      <div style={{ marginTop: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em', margin: 0 }}>
          Nuova password.
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: C.muted }}>Scegline una nuova per il tuo account.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>Nuova password</span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} placeholder="Minimo 6 caratteri" value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
              style={{ ...inputStyle(focused === 'pw'), paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
              <i className={`ph-thin ${showPw ? 'ph-eye-closed' : 'ph-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>Conferma password</span>
          <input
            type={showPw ? 'text' : 'password'} placeholder="Ripeti la password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onFocus={() => setFocused('cf')} onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle(focused === 'cf')}
          />
        </label>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
            <i className="ph-thin ph-warning-circle" style={{ color: C.red, fontSize: 16 }} />
            <span style={{ fontSize: 12.5, color: C.red }}>{error}</span>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '14px 20px',
          borderRadius: 'var(--r-md)',
          border: `1px solid ${C.text}`,
          background: C.text, color: C.bg,
          fontFamily: 'inherit', fontWeight: 500, fontSize: 15,
          cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.7 : 1, marginTop: 4,
        }}>
          {loading
            ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 18, animation: 'spin .8s linear infinite' }} /> Aggiornamento…</>
            : 'Aggiorna password'}
        </button>
      </div>
    </div>
  )
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '12px 14px',
    border: `1px solid ${focused ? C.text : C.border}`,
    background: C.bg, borderRadius: 'var(--r-md)',
    fontSize: 14, color: C.text, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms var(--ease)',
  }
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted,
}
