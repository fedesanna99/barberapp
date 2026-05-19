import { useState, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase, IS_DEMO } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import { isValidEmail } from '../lib/validation'
import { Icon, type IconName } from '../components/Icon'
import { Button, PoleMark, Hairline } from '../components/primitives'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined

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
  const [googleRole, setGoogleRole] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)

  function resetCaptcha() {
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
  }

  async function handleSignIn() {
    setError(null)
    if (!isValidEmail(email)) { setError('Inserisci una email valida'); return }
    if (!password)            { setError('Inserisci la password'); return }
    if (HCAPTCHA_SITE_KEY && !captchaToken && !IS_DEMO) {
      setError('Completa la verifica anti-bot per continuare')
      return
    }
    setLoading(true)
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 700))
      setLoading(false)
      writeLog('auth.login', `Accesso riuscito (demo)`, 'info', { userEmail: email || 'demo@barberbook.it' })
      onLogin(false)
      return
    }

    const { data, error: e } = await supabase.auth.signInWithPassword({
      email, password,
      options: { captchaToken: captchaToken ?? undefined },
    })
    resetCaptcha()
    if (e) {
      writeLog('auth.failed', `Tentativo di accesso fallito: ${e.message}`, 'warning', { userEmail: email })
      setLoading(false)
      setError(e.message)
      return
    }
    let asBarber = false
    let asAdmin  = false
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', data.user.id)
        .single()
      asBarber = profile?.role === 'barber'
      asAdmin  = profile?.is_admin === true
    }
    writeLog('auth.login', 'Accesso riuscito', 'info', { userId: data.user?.id, userEmail: email })
    setLoading(false)
    onLogin(asBarber, asAdmin)
  }

  function handleGoogle() {
    if (IS_DEMO) { setGoogleRole(true); return }
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  async function handleForgotPassword() {
    setError(null)
    setForgotSent(false)
    if (!isValidEmail(email)) {
      setError('Inserisci la tua email per recuperare la password')
      return
    }
    if (HCAPTCHA_SITE_KEY && !captchaToken && !IS_DEMO) {
      setError('Completa la verifica anti-bot per continuare')
      return
    }
    setForgotLoading(true)
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 500))
      setForgotLoading(false)
      setForgotSent(true)
      return
    }
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
      captchaToken: captchaToken ?? undefined,
    })
    resetCaptcha()
    setForgotLoading(false)
    if (e) {
      writeLog('auth.reset.failed', `Reset password fallito: ${e.message}`, 'warning', { userEmail: email })
      setError(e.message)
      return
    }
    writeLog('auth.reset.requested', 'Email di reset password inviata', 'info', { userEmail: email })
    setForgotSent(true)
  }

  if (googleRole) {
    return (
      <div className="bb-screen" style={{ padding: '0 24px', background: 'var(--paper-3)', display: 'flex', flexDirection: 'column' }}>
        <div className="bb-safe-top" />
        <Header />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <h1 style={hero()}>Chi sei?</h1>
          <p style={subhero()}>Scegli il tuo ruolo per continuare.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <RoleButton icon="user"     label="Cliente"  onClick={() => { writeLog('auth.login', 'Accesso Google come cliente (demo)', 'info'); onLogin(false, false) }} />
            <RoleButton icon="scissors" label="Barbiere" onClick={() => { writeLog('auth.login', 'Accesso Google come barbiere (demo)', 'info'); onLogin(true, false) }} />
            <RoleButton icon="shield"   label="Admin"    onClick={() => { writeLog('auth.login', 'Accesso Google come admin (demo)', 'info'); onLogin(false, true) }} />
          </div>
          <button onClick={() => setGoogleRole(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-60)', fontFamily: 'inherit', marginTop: 12 }}>
            Indietro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bb-screen" style={{ padding: '0 24px', background: 'var(--paper-3)', display: 'flex', flexDirection: 'column', animation: 'fadeSlideIn .25s ease' }}>
      <div className="bb-safe-top" />
      <Header />

      <div style={{ marginTop: 28 }}>
        <h1 style={hero()}>Bentornato.</h1>
        <p style={subhero()}>Accedi con la tua email o con Google.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <Field label="Email">
          <input
            type="email"
            placeholder="nome@esempio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={inputStyle()}
          />
        </Field>

        <Field
          label="Password"
          trailing={(
            <button onClick={handleForgotPassword} disabled={forgotLoading}
              style={{ background: 'none', border: 'none', cursor: forgotLoading ? 'default' : 'pointer', fontSize: 12, color: 'var(--clay)', fontFamily: 'inherit', padding: 0, opacity: forgotLoading ? 0.6 : 1 }}>
              {forgotLoading ? 'Invio…' : 'Dimenticata?'}
            </button>
          )}
        >
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ ...inputStyle(), paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} aria-label={showPw ? 'Nascondi password' : 'Mostra password'} style={eyeBtn}>
              <Icon name="eye" size={18} color="var(--ink-60)" />
            </button>
          </div>
        </Field>

        {error && <ErrorRow text={error} />}
        {forgotSent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--sage-soft)' }}>
            <Icon name="mail" size={16} color="var(--sage)" />
            <span style={{ fontSize: 12.5, color: 'var(--sage)' }}>Email di recupero inviata. Controlla la posta (anche lo spam).</span>
          </div>
        )}

        {HCAPTCHA_SITE_KEY && !IS_DEMO && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
          </div>
        )}

        <Button kind="filled" size="lg" disabled={loading} onClick={handleSignIn} style={{ width: '100%' }}>
          {loading
            ? <><Icon name="refresh" size={16} style={{ animation: 'spin .8s linear infinite' }} /> Accesso in corso…</>
            : 'Accedi'}
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0' }}>
        <Hairline /><span style={{ fontSize: 11.5, color: 'var(--ink-40)', whiteSpace: 'nowrap' }}>oppure</span><Hairline />
      </div>

      <button onClick={handleGoogle} style={googleBtn}>
        <Icon name="google" size={18} weight="fill" color="var(--ink)" /> Continua con Google
      </button>

      <div style={{ marginTop: 'auto', padding: '24px 0 18px', textAlign: 'center', fontSize: 13.5, color: 'var(--ink-60)' }}>
        Nuovo qui?{' '}
        <button onClick={onGoToRegister} style={linkBtn}>Crea un account</button>
      </div>
    </div>
  )
}

/* ---- helpers ----------------------------------------------------- */

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 16 }}>
      <PoleMark size={32} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Barberbook</span>
    </div>
  )
}

function Field({ label, trailing, children }: { label: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-60)' }}>{label}</span>
        {trailing}
      </div>
      {children}
    </label>
  )
}

function ErrorRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--rust-soft)' }}>
      <Icon name="warning" size={16} color="var(--rust)" />
      <span style={{ fontSize: 12.5, color: 'var(--rust)' }}>{text}</span>
    </div>
  )
}

function RoleButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 50,
      borderRadius: 'var(--r-md)',
      border: '1px solid var(--ink-25)',
      background: 'var(--paper-2)', color: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
    }}>
      <Icon name={icon} size={20} /> {label}
    </button>
  )
}

function hero(): CSSProperties {
  return {
    fontFamily: 'var(--font-display)', fontWeight: 600,
    fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em',
    color: 'var(--ink)', margin: 0,
  }
}

function subhero(): CSSProperties {
  return { margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-60)', lineHeight: 1.55 }
}

function inputStyle(): CSSProperties {
  return {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--ink-15)',
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

const googleBtn: CSSProperties = {
  width: '100%', padding: '12px 0',
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--ink-15)',
  background: 'var(--paper)', color: 'var(--ink)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}

const linkBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13.5, color: 'var(--ink)', fontWeight: 600,
  fontFamily: 'inherit', padding: 0,
}
