import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { C } from '../lib/colors'
import { supabase, IS_DEMO } from '../lib/supabase'
import { isValidEmail } from '../lib/validation'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined

interface Props {
  onRegister:  (asBarber: boolean) => void
  onGoToLogin: () => void
}

type Role  = 'client' | 'barber'
type Field = 'name' | 'email' | 'password' | 'confirm'

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: C.border, width: '0%' }
  if (pw.length < 6)   return { label: 'Debole', color: C.red,    width: '33%' }
  if (pw.length < 10)  return { label: 'Medio',  color: C.accent, width: '66%' }
  return { label: 'Forte', color: C.green, width: '100%' }
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  const strength = passwordStrength(password)

  async function handleRegister() {
    setError(null)
    if (!name.trim())          { setError('Inserisci il tuo nome'); return }
    if (!isValidEmail(email))  { setError('Inserisci una email valida'); return }
    if (password.length < 6)   { setError('La password deve essere di almeno 6 caratteri'); return }
    if (password !== confirm)  { setError('Le password non coincidono'); return }
    if (HCAPTCHA_SITE_KEY && !captchaToken && !IS_DEMO) {
      setError('Completa la verifica anti-bot per continuare')
      return
    }
    setLoading(true)
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 700))
      setLoading(false)
      onRegister(role === 'barber')
      return
    }
    const { error: e } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: name.trim(), role },
        captchaToken: captchaToken ?? undefined,
      },
    })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (e) { setLoading(false); setError(e.message); return }
    setLoading(false)
    onRegister(role === 'barber')
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 24px', background: C.bg, overflowY: 'auto',
      animation: 'fadeSlideIn .25s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
        <button onClick={onGoToLogin}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.text, display: 'flex' }}>
          <i className="ph-thin ph-arrow-left" style={{ fontSize: 22 }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.025em', color: C.text }}>CutBook</span>
        </div>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ marginTop: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em', margin: 0 }}>
          Crea un account.
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: C.muted }}>Bastano email e password.</p>
      </div>

      {/* Role toggle */}
      <div style={{ display: 'flex', background: C.surface, borderRadius: 'var(--r-md)', padding: 3, gap: 3, marginTop: 22, border: `1px solid ${C.border}` }}>
        {(['client', 'barber'] as Role[]).map(r => {
          const active = role === r
          return (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? C.bg : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(10,10,10,0.06)' : 'none',
                fontFamily: 'inherit', fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? C.text : C.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 120ms var(--ease)',
              }}
            >
              <i className={`ph-thin ${r === 'client' ? 'ph-user' : 'ph-scissors'}`} style={{ fontSize: 16 }} />
              {r === 'client' ? 'Cliente' : 'Barbiere'}
            </button>
          )
        })}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        <Field label="Nome completo">
          <input
            type="text" placeholder="Mario Rossi" value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
            style={inputStyle(focused === 'name')}
          />
        </Field>

        <Field label="Email">
          <input
            type="email" placeholder="nome@esempio.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            style={inputStyle(focused === 'email')}
          />
        </Field>

        <Field label="Password">
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'} placeholder="Minimo 6 caratteri" value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
              style={{ ...inputStyle(focused === 'password'), paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
              <i className={`ph-thin ${showPw ? 'ph-eye-closed' : 'ph-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
          {password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, borderRadius: 9999, background: C.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 9999, transition: 'all .25s var(--ease)' }} />
              </div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 4, display: 'block' }}>{strength.label}</span>
            </div>
          )}
        </Field>

        <Field label="Conferma password">
          <div style={{ position: 'relative' }}>
            <input
              type={showCf ? 'text' : 'password'} placeholder="Ripeti la password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onFocus={() => setFocused('confirm')} onBlur={() => setFocused(null)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ ...inputStyle(focused === 'confirm'), paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowCf(p => !p)} style={eyeBtn}>
              <i className={`ph-thin ${showCf ? 'ph-eye-closed' : 'ph-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </Field>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
            <i className="ph-thin ph-warning-circle" style={{ color: C.red, fontSize: 16 }} />
            <span style={{ fontSize: 12.5, color: C.red }}>{error}</span>
          </div>
        )}

        {HCAPTCHA_SITE_KEY && !IS_DEMO && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
          </div>
        )}

        <button onClick={handleRegister} disabled={loading} style={{
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
            ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 18, animation: 'spin .8s linear infinite' }} /> Creazione…</>
            : (role === 'barber' ? 'Registrati come barbiere' : 'Crea account')}
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: '24px 0 18px', textAlign: 'center', fontSize: 13.5, color: C.muted }}>
        Hai già un account?{' '}
        <button onClick={onGoToLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: C.text, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
          Accedi
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{label}</span>
      {children}
    </label>
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
