import { useState } from 'react'
import { C } from '../lib/colors'
import { supabase, IS_DEMO } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import { isValidEmail } from '../lib/validation'

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

interface Props {
  onLogin: (asBarber?: boolean, asAdmin?: boolean) => void
  onGoToRegister: () => void
}

export function Login({ onLogin, onGoToRegister }: Props) {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [focused, setFocused]     = useState<string | null>(null)
  const [googleRole, setGoogleRole] = useState(false)

  function border(field: string) {
    return focused === field ? C.accent : C.borderMed
  }

  async function handleSignIn() {
    setError(null)
    if (!isValidEmail(email)) { setError('Inserisci una email valida'); return }
    if (!password)            { setError('Inserisci la password'); return }

    setLoading(true)

    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 750))
      setLoading(false)
      writeLog('auth.login', `Accesso riuscito (demo)`, 'info', { userEmail: email || 'demo@cutbook.it' })
      onLogin(false)
      return
    }

    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) {
      writeLog('auth.failed', `Tentativo di accesso fallito: ${e.message}`, 'warning', { userEmail: email })
      setLoading(false)
      setError(e.message)
      return
    }

    // Check actual role stored in the profiles table
    let asBarber = false
    let asAdmin  = false
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      asBarber = profile?.role === 'barber'
      asAdmin  = profile?.role === 'admin'
    }
    writeLog('auth.login', 'Accesso riuscito', 'info', { userId: data.user?.id, userEmail: email })
    setLoading(false)
    onLogin(asBarber, asAdmin)
  }

  function handleGoogle() {
    if (IS_DEMO) { setGoogleRole(true); return }
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  if (googleRole) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', background: C.bg, gap: 16, animation: 'fadeSlideIn .25s ease' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `linear-gradient(135deg, ${C.accent} 0%, #A67828 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-scissors" style={{ fontSize: 30, color: '#fff' }} />
        </div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.text }}>Chi sei?</p>
        <p style={{ margin: '-8px 0 8px', fontSize: 13, color: C.muted }}>Scegli il tuo ruolo per continuare</p>
        <button onClick={() => { writeLog('auth.login', 'Accesso Google come cliente (demo)', 'info'); onLogin(false, false) }} style={roleBtn('client')}>
          <i className="ti ti-user" style={{ fontSize: 22 }} /> Cliente
        </button>
        <button onClick={() => { writeLog('auth.login', 'Accesso Google come barbiere (demo)', 'info'); onLogin(true, false) }} style={roleBtn('barber')}>
          <i className="ti ti-scissors" style={{ fontSize: 22 }} /> Barbiere
        </button>
        <button onClick={() => { writeLog('auth.login', 'Accesso Google come admin (demo)', 'info'); onLogin(false, true) }} style={roleBtn('admin')}>
          <i className="ti ti-shield-lock" style={{ fontSize: 22 }} /> Admin
        </button>
        <button onClick={() => setGoogleRole(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.hint, fontFamily: 'inherit', padding: 4 }}>
          ← indietro
        </button>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '36px 28px 28px', background: C.bg, overflowY: 'auto',
      animation: 'fadeSlideIn .25s ease',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `linear-gradient(135deg, ${C.accent} 0%, #A67828 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px rgba(201,150,58,0.3)`,
        }}>
          <i className="ti ti-scissors" style={{ fontSize: 30, color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Accedi a CutBook</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Inserisci le tue credenziali</p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Email */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Email</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-mail" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: focused === 'email' ? C.accent : C.hint, pointerEvents: 'none' }} />
            <input
              type="email"
              placeholder="nome@esempio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={inputStyle(border('email'))}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <i className="ti ti-lock" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: focused === 'password' ? C.accent : C.hint, pointerEvents: 'none' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ ...inputStyle(border('password')), paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.hint }}
            >
              <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 10, background: 'rgba(226,75,74,0.08)' }}>
            <i className="ti ti-alert-circle" style={{ color: C.red, fontSize: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.red }}>{error}</span>
          </div>
        )}

        {/* Sign in */}
        <button
          onClick={handleSignIn}
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
            ? <><i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 0.8s linear infinite' }} /> Accesso in corso…</>
            : 'Accedi'}
        </button>

        {/* Forgot */}
        <div style={{ textAlign: 'right', marginTop: -6 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.accent, fontFamily: 'inherit', padding: 0 }}>
            Password dimenticata?
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 11, color: C.hint, whiteSpace: 'nowrap' }}>oppure continua con</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* Google */}
      <button
        onClick={handleGoogle}
        style={{
          width: '100%', height: 48, borderRadius: 14,
          border: `1.5px solid ${C.borderMed}`,
          background: C.bg, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: 'inherit', fontWeight: 600, fontSize: 15, color: C.text,
        }}
      >
        <GoogleLogo /> Google
      </button>

      {/* Register link */}
      <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: C.muted }}>Non hai un account? </span>
        <button
          onClick={onGoToRegister}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.accent, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
        >
          Registrati
        </button>
      </div>
    </div>
  )
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

function roleBtn(role: 'client' | 'barber' | 'admin'): React.CSSProperties {
  const outlined = role !== 'client'
  return {
    width: '100%', height: 52, borderRadius: 14,
    border: outlined ? `1.5px solid ${C.accent}` : 'none',
    background: outlined ? C.accentLight : C.accent,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
    color: outlined ? C.accent : '#fff',
  }
}
