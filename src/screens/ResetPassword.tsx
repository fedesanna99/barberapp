import { useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import { Icon } from '../components/Icon'
import { Button, PoleMark } from '../components/primitives'

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
    <div className="bb-screen" style={{ padding: '0 24px', background: 'var(--paper-3)', display: 'flex', flexDirection: 'column', animation: 'fadeSlideIn .25s ease' }}>
      <div className="bb-safe-top" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16 }}>
        <PoleMark size={28} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Barberbook</span>
      </div>

      <div style={{ marginTop: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em', margin: 0 }}>
          Nuova password.
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-60)' }}>Scegline una nuova per il tuo account.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)' }}>Nuova password</span>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder="Minimo 6 caratteri" value={password}
              onChange={e => setPassword(e.target.value)} style={{ ...inputStyle(), paddingRight: 42 }} />
            <button type="button" onClick={() => setShowPw(p => !p)} aria-label="Mostra/nascondi" style={eyeBtn}>
              <Icon name="eye" size={18} color="var(--ink-60)" />
            </button>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)' }}>Conferma password</span>
          <input type={showPw ? 'text' : 'password'} placeholder="Ripeti la password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle(confirm !== '' && confirm !== password)} />
        </label>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--rust-soft)' }}>
            <Icon name="warning" size={16} color="var(--rust)" />
            <span style={{ fontSize: 12.5, color: 'var(--rust)' }}>{error}</span>
          </div>
        )}

        <Button kind="filled" size="lg" disabled={loading} onClick={handleSubmit} style={{ width: '100%', marginTop: 4 }}>
          {loading
            ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Aggiornamento…</>
            : 'Aggiorna password'}
        </Button>
      </div>
    </div>
  )
}

function inputStyle(error = false): CSSProperties {
  return {
    width: '100%', padding: '12px 14px',
    border: `1px solid ${error ? 'var(--rust)' : 'var(--ink-15)'}`,
    background: 'var(--paper-2)', borderRadius: 'var(--r-md)',
    fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 120ms var(--ease)',
  }
}

const eyeBtn: CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink-60)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
