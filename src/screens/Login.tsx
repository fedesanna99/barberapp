import { useState, useRef } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { C } from '../lib/colors'
import { supabase, IS_DEMO } from '../lib/supabase'
import { writeLog } from '../hooks/useAdminLogs'
import { isValidEmail } from '../lib/validation'

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
      writeLog('auth.login', `Accesso riuscito (demo)`, 'info', { userEmail: email || 'demo@cutbook.it' })
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', background: C.bg, animation: 'fadeSlideIn .25s ease' }}>
        <Wordmark padTop={24} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <h1 style={hero()}>Chi sei?</h1>
          <p style={subhero()}>Scegli il tuo ruolo per continuare.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <RoleButton icon="ph-thin ph-user"          label="Cliente"  onClick={() => { writeLog('auth.login', 'Accesso Google come cliente (demo)', 'info'); onLogin(false, false) }} />
            <RoleButton icon="ph-thin ph-scissors"      label="Barbiere" onClick={() => { writeLog('auth.login', 'Accesso Google come barbiere (demo)', 'info'); onLogin(true, false) }} />
            <RoleButton icon="ph-thin ph-shield-check"  label="Admin"    onClick={() => { writeLog('auth.login', 'Accesso Google come admin (demo)', 'info'); onLogin(false, true) }} />
          </div>
          <button onClick={() => setGoogleRole(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.muted, fontFamily: 'inherit', marginTop: 12 }}>
            Indietro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', background: C.bg, overflowY: 'auto', animation: 'fadeSlideIn .25s ease' }}>
      <Wordmark padTop={24} />

      <div style={{ marginTop: 28 }}>
        <h1 style={hero()}>Bentornato.</h1>
        <p style={subhero()}>Accedi con la tua email o con Google.</p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <Field label="Email">
          <input
            type="email"
            placeholder="nome@esempio.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={inputStyle(focused === 'email')}
          />
        </Field>

        <Field
          label="Password"
          trailing={(
            <button onClick={handleForgotPassword} disabled={forgotLoading}
              style={{ background: 'none', border: 'none', cursor: forgotLoading ? 'default' : 'pointer', fontSize: 12, color: C.accent, fontFamily: 'inherit', padding: 0, opacity: forgotLoading ? 0.6 : 1 }}>
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
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              style={{ ...inputStyle(focused === 'password'), paddingRight: 42 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={eyeBtn}>
              <i className={`ph-thin ${showPw ? 'ph-eye-closed' : 'ph-eye'}`} style={{ fontSize: 18 }} />
            </button>
          </div>
        </Field>

        {error && <ErrorRow text={error} />}
        {forgotSent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.greenSoft }}>
            <i className="ph-thin ph-envelope-simple-open" style={{ color: C.green, fontSize: 16 }} />
            <span style={{ fontSize: 12.5, color: C.green }}>Email di recupero inviata. Controlla la posta (anche lo spam).</span>
          </div>
        )}

        {HCAPTCHA_SITE_KEY && !IS_DEMO && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
          </div>
        )}

        <button onClick={handleSignIn} disabled={loading} style={primaryBtn(loading)}>
          {loading
            ? <><i className="ph-thin ph-spinner-gap" style={{ fontSize: 18, animation: 'spin .8s linear infinite' }} /> Accesso in corso…</>
            : 'Accedi'}
        </button>
      </div>

      <Divider label="oppure" />

      <button onClick={handleGoogle} style={googleBtn}>
        <GoogleLogo /> Continua con Google
      </button>

      <div style={{ marginTop: 'auto', padding: '24px 0 18px', textAlign: 'center', fontSize: 13.5, color: C.muted }}>
        Nuovo qui?{' '}
        <button onClick={onGoToRegister} style={linkBtn}>Crea un account</button>
      </div>
    </div>
  )
}

/* ---- helper components ------------------------------------------------- */

function Wordmark({ padTop = 16 }: { padTop?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: padTop }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.accent }} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.025em', color: C.text }}>CutBook</span>
    </div>
  )
}

function Field({ label, trailing, children }: { label: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: C.muted }}>{label}</span>
        {trailing}
      </div>
      {children}
    </label>
  )
}

function ErrorRow({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--r-md)', background: C.redSoft }}>
      <i className="ph-thin ph-warning-circle" style={{ color: C.red, fontSize: 16 }} />
      <span style={{ fontSize: 12.5, color: C.red }}>{text}</span>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 11.5, color: C.hint }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

function RoleButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 50,
      borderRadius: 'var(--r-md)',
      border: `1px solid ${C.borderMed}`,
      background: C.bg, color: C.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: 'inherit', fontSize: 14.5, fontWeight: 500, cursor: 'pointer',
    }}>
      <i className={icon} style={{ fontSize: 20 }} /> {label}
    </button>
  )
}

/* ---- shared styles ----------------------------------------------------- */

function hero(): React.CSSProperties {
  return {
    fontFamily: 'var(--font-display)', fontWeight: 600,
    fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.025em',
    color: C.text, margin: 0,
  }
}

function subhero(): React.CSSProperties {
  return { margin: '6px 0 0', fontSize: 13.5, color: C.muted, lineHeight: 1.55 }
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

function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px 20px',
    borderRadius: 'var(--r-md)',
    border: `1px solid ${C.text}`,
    background: C.text, color: C.bg,
    fontFamily: 'inherit', fontWeight: 500, fontSize: 15,
    cursor: loading ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: loading ? 0.7 : 1,
  }
}

const googleBtn: React.CSSProperties = {
  width: '100%', padding: '12px 0',
  borderRadius: 'var(--r-md)',
  border: `1px solid ${C.border}`,
  background: C.bg, color: C.text,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13.5, color: C.text, fontWeight: 600,
  fontFamily: 'inherit', padding: 0,
}
