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

  async function handleSubmit() {
    setError(null)
    if (password.length < 6)   { setError('La password deve essere di almeno 6 caratteri'); return }
    if (password !== confirm)  { setError('Le password non coincidono'); return }
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
      padding: '36px 28px 28px', background: C.bg, overflowY: 'auto',
      animation: 'fadeSlideIn .25s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `linear-gradient(135deg, ${C.accent} 0%, #A67828 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px rgba(201,150,58,0.3)`,
        }}>
          <i className="ti ti-lock-cog" style={{ fontSize: 30, color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Imposta nuova password</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, textAlign: 'center' }}>
          Scegli una nuova password per il tuo account
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Nuova password</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-lock" style={iconStyle} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Minimo 6 caratteri"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
              <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Conferma password</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-lock-check" style={iconStyle} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Ripeti la password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 10, background: 'rgba(226,75,74,0.08)' }}>
            <i className="ti ti-alert-circle" style={{ color: C.red, fontSize: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.red }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', height: 50, borderRadius: 14, border: 'none',
            background: loading ? C.accentLight : C.accent,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            color: loading ? C.accent : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .15s', marginTop: 2,
          }}
        >
          {loading
            ? <><i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 0.8s linear infinite' }} /> Aggiornamento…</>
            : 'Aggiorna password'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6,
}

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
  fontSize: 18, color: C.hint, pointerEvents: 'none',
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 48, borderRadius: 12,
  border: `1.5px solid ${C.borderMed}`,
  background: 'var(--color-background-secondary)',
  paddingLeft: 42, paddingRight: 14,
  fontSize: 15, color: 'var(--color-text-primary)', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s',
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.hint,
}
