import { useState, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase, IS_DEMO } from '../lib/supabase'
import { isValidEmail } from '../lib/validation'
import { Icon } from '../components/Icon'
import { Button, PoleMark } from '../components/primitives'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined

interface Props {
  onRegister:  (asBarber: boolean) => void
  onGoToLogin: () => void
}

type Role  = 'client' | 'barber'

function passwordStrength(pw: string): { label: string; color: string; width: string } {
  if (pw.length === 0) return { label: '', color: 'var(--ink-15)', width: '0%' }
  if (pw.length < 6)   return { label: 'Debole', color: 'var(--rust)', width: '33%' }
  if (pw.length < 10)  return { label: 'Discreta', color: 'var(--clay)', width: '66%' }
  return { label: 'Forte', color: 'var(--sage)', width: '100%' }
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
    <div className="bb-screen" style={{ padding: '0 24px', background: 'var(--paper-3)', display: 'flex', flexDirection: 'column', animation: 'fadeSlideIn .25s ease' }}>
      <div className="bb-safe-top" />

      <div style={{ paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onGoToLogin} aria-label="Indietro"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ink)', display: 'flex' }}>
          <Icon name="back" size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PoleMark size={28} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Barberbook</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, lineHeight: 1.1, letterSpacing: '-0.025em', margin: 0 }}>
          Crea il tuo account.
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-60)' }}>Bastano due minuti.</p>
      </div>

      {/* Role picker — card style */}
      <div style={{ marginTop: 18 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)' }}>Cosa stai cercando?</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          {(
            [
              { v: 'client' as Role,  title: 'Cliente',  body: 'Prenota tagli e segui i barbieri.', icon: 'user' as const },
              { v: 'barber' as Role,  title: 'Barbiere', body: 'Gestisci bottega e prenotazioni.',  icon: 'shop' as const },
            ]
          ).map(opt => {
            const active = role === opt.v
            return (
              <button key={opt.v} type="button" onClick={() => setRole(opt.v)} style={{
                padding: 12,
                background: active ? 'var(--clay-soft)' : 'var(--paper-2)',
                border: active ? '1px solid var(--clay)' : '1px solid var(--ink-08)',
                borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 6,
                transition: 'all 120ms var(--ease)',
              }}>
                <Icon name={opt.icon} size={20}
                  color={active ? 'var(--clay-deep)' : 'var(--ink-60)'} />
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: active ? 'var(--clay-deep)' : 'var(--ink)',
                  letterSpacing: '-0.015em',
                }}>{opt.title}</div>
                <div style={{
                  fontSize: 11.5,
                  color: active ? 'var(--clay-deep)' : 'var(--ink-60)',
                  opacity: active ? 0.85 : 1,
                  lineHeight: 1.4,
                }}>{opt.body}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <Field label="Nome completo">
          <input type="text" placeholder="Mario Rossi" value={name}
            onChange={e => setName(e.target.value)} style={inputStyle()} />
        </Field>
        <Field label="Email">
          <input type="email" placeholder="nome@esempio.com" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle()} />
        </Field>
        <Field label="Password">
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} placeholder="Minimo 6 caratteri" value={password}
              onChange={e => setPassword(e.target.value)} style={{ ...inputStyle(), paddingRight: 42 }} />
            <button type="button" onClick={() => setShowPw(p => !p)} aria-label="Mostra/nascondi" style={eyeBtn}>
              <Icon name="eye" size={18} color="var(--ink-60)" />
            </button>
          </div>
          {password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ height: 3, borderRadius: 9999, background: 'var(--ink-08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 9999, transition: 'all .25s var(--ease)' }} />
              </div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 4, display: 'block' }}>{strength.label}</span>
            </div>
          )}
        </Field>
        <Field label="Conferma password">
          <div style={{ position: 'relative' }}>
            <input type={showCf ? 'text' : 'password'} placeholder="Ripeti la password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={{ ...inputStyle(confirm !== '' && confirm !== password), paddingRight: 42 }} />
            <button type="button" onClick={() => setShowCf(p => !p)} aria-label="Mostra/nascondi" style={eyeBtn}>
              <Icon name="eye" size={18} color="var(--ink-60)" />
            </button>
          </div>
          {confirm && confirm !== password && (
            <div style={{ fontSize: 11, color: 'var(--rust)', marginTop: 4 }}>Le password non coincidono.</div>
          )}
        </Field>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--rust-soft)' }}>
            <Icon name="warning" size={16} color="var(--rust)" />
            <span style={{ fontSize: 12.5, color: 'var(--rust)' }}>{error}</span>
          </div>
        )}

        {HCAPTCHA_SITE_KEY && !IS_DEMO && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
          </div>
        )}

        <Button kind="filled" size="lg" disabled={loading} onClick={handleRegister} style={{ width: '100%', marginTop: 4 }}>
          {loading
            ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Creazione…</>
            : (role === 'barber' ? 'Registrati come barbiere' : 'Crea account')}
        </Button>
      </div>

      <div style={{ marginTop: 'auto', padding: '24px 0 18px', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-60)' }}>
        Hai già un account?{' '}
        <button onClick={onGoToLogin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, color: 'var(--ink)', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
          Accedi
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)' }}>{label}</span>
      {children}
    </label>
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
