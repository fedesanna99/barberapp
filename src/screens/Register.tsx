import { useState } from 'react'
import { C } from '../lib/colors'
import { supabase, IS_DEMO } from '../lib/supabase'
import { isValidEmail } from '../lib/validation'

interface Props {
  onRegister: (asBarber: boolean) => void
  onGoToLogin: () => void
}

type Role = 'client' | 'barber'
type Field = 'name' | 'email' | 'password' | 'confirm'

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: C.border, width: '0%' }
  if (pw.length < 6)   return { label: 'Debole', color: '#E24B4A', width: '33%' }
  if (pw.length < 10)  return { label: 'Medio', color: '#EF9F27', width: '66%' }
  return { label: 'Forte', color: '#1D9E75', width: '100%' }
}

export function Register({ onRegister, onGoToLogin }: Props) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole]       = useState<Role>('client')
  const [showPw, setShowPw]   = useState(false)
  const [showCf, setShowCf]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [focused, setFocused] = useState<Field | null>(null)

  const strength = passwordStrength(password)

  function border(field: Field) {
    return focused === field ? C.accent : C.borderMed
  }

  async function handleRegister() {
    setError(null)
    if (!name.trim())          { setError('Inserisci il tuo nome'); return }
    if (!isValidEmail(email))  { setError('Inserisci una email valida'); return }
    if (password.length < 6)   { setError('La password deve essere di almeno 6 caratteri'); return }
    if (password !== confirm)  { setError('Le password non coincidono'); return }

    setLoading(true)

    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 900))
      setLoading(false)
      onRegister(role === 'barber')
      return
    }

    const { error: e } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim(), role } },
    })
    if (e) { setLoading(false); setError(e.message); return }

    // The handle_new_user trigger (migration 017) reads role from raw_user_meta_data
    // and inserts a barbers row when role='barber'; handle_new_barber then flips
    // profiles.role. Nothing else to do client-side.
    setLoading(false)
    onRegister(role === 'barber')
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '20px 28px 28px', background: C.bg, overflowY: 'auto',
      animation: 'fadeSlideIn .25s ease',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          onClick={onGoToLogin}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, color: C.text, display: 'flex' }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 22 }} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Crea account</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>Unisciti a CutBook oggi</p>
        </div>
      </div>

      {/* Role toggle */}
      <div style={{
        display: 'flex', background: C.surface, borderRadius: 12,
        padding: 4, gap: 4, marginBottom: 20,
      }}>
        {(['client', 'barber'] as Role[]).map(r => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              flex: 1, height: 38, borderRadius: 9, border: 'none', cursor: 'pointer',
              background: role === r ? C.bg : 'transparent',
              boxShadow: role === r ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              fontFamily: 'inherit', fontSize: 14, fontWeight: role === r ? 600 : 400,
              color: role === r ? C.text : C.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .15s',
            }}
          >
            <i className={`ti ${r === 'client' ? 'ti-user' : 'ti-scissors'}`} style={{ fontSize: 16, color: role === r ? C.accent : C.hint }} />
            {r === 'client' ? 'Cliente' : 'Barbiere'}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Name */}
        <div>
          <label style={labelStyle}>Nome completo</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-user" style={iconStyle(focused === 'name')} />
            <input
              type="text"
              placeholder="Mario Rossi"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              style={inputStyle(border('name'))}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-mail" style={iconStyle(focused === 'email')} />
            <input
              type="email"
              placeholder="nome@esempio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              style={inputStyle(border('email'))}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={labelStyle}>Password</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-lock" style={iconStyle(focused === 'password')} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Minimo 6 caratteri"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              style={{ ...inputStyle(border('password')), paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
              <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 3, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 2, transition: 'width .3s, background .3s' }} />
              </div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 3, display: 'block' }}>{strength.label}</span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label style={labelStyle}>Conferma password</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-lock-check" style={iconStyle(focused === 'confirm')} />
            <input
              type={showCf ? 'text' : 'password'}
              placeholder="Ripeti la password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ ...inputStyle(border('confirm')), paddingRight: 44 }}
            />
            <button type="button" onClick={() => setShowCf(p => !p)} style={eyeBtn}>
              <i className={`ti ${showCf ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 10, background: 'rgba(226,75,74,0.08)' }}>
            <i className="ti ti-alert-circle" style={{ color: '#E24B4A', fontSize: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#E24B4A' }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleRegister}
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
            ? <><i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 0.8s linear infinite' }} /> Creazione account…</>
            : (role === 'barber' ? 'Registrati come Barbiere' : 'Crea account')}
        </button>
      </div>

      {/* Login link */}
      <div style={{ marginTop: 'auto', paddingTop: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: C.muted }}>Hai già un account? </span>
        <button
          onClick={onGoToLogin}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.accent, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
        >
          Accedi
        </button>
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)',
  display: 'block', marginBottom: 6,
}

function iconStyle(active: boolean): React.CSSProperties {
  return {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
    fontSize: 18, color: active ? C.accent : 'var(--color-text-tertiary)',
    pointerEvents: 'none',
  }
}

function inputStyle(borderColor: string): React.CSSProperties {
  return {
    width: '100%', height: 48, borderRadius: 12,
    border: `1.5px solid ${borderColor}`,
    background: 'var(--color-background-secondary)',
    paddingLeft: 42, paddingRight: 14,
    fontSize: 15, color: 'var(--color-text-primary)', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .15s',
  }
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
  color: 'var(--color-text-tertiary)',
}
