/* Pari · Auth — Register + ResetPassword views.
   The existing ScreenLogin keeps welcome + sign-in form intact;
   this file adds the missing surfaces from the spec:
     - Register (role picker, name, email, password+strength, captcha placeholder)
     - Reset password (request email)
     - Reset confirmation (success state)
     - New password (after recovery deep-link → spec §4.3)

   PariScreenAuth wraps everything so the prototype can land on
   any view via initial-state. Internally it tracks `view`. */

const { useState: useStateAuth, useMemo: useMemoAuth } = React;

/* ---- helpers --------------------------------------------------- */
function pariPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const pariAuthInputStyle = () => ({
  padding: "12px 14px",
  border: "1px solid var(--ink-15)",
  background: "var(--paper-2)",
  borderRadius: 10,
  fontFamily: "inherit", fontSize: 14, color: "var(--ink)",
  width: "100%", outline: "none", boxSizing: "border-box",
});

/* ============================================================
   PARI · Auth screen — composes the 5 views.
   onLogin(role)        → user signed in / signed up
   defaultView           → initial view ("welcome" by default)
   ============================================================ */
function PariScreenAuth({ onLogin, defaultView = "welcome" }) {
  const [view, setView] = useStateAuth(defaultView);

  if (view === "welcome")        return <PariAuthWelcome  onLogin={onLogin} setView={setView} />;
  if (view === "login")          return <PariAuthLogin    onLogin={onLogin} setView={setView} />;
  if (view === "register")       return <PariAuthRegister onLogin={onLogin} setView={setView} />;
  if (view === "reset-request")  return <PariAuthReset    setView={setView} />;
  if (view === "reset-sent")     return <PariAuthResetSent setView={setView} />;
  if (view === "new-password")   return <PariAuthNewPwd   onLogin={onLogin} setView={setView} />;
  return null;
}

/* ============================================================
   WELCOME — hero + Inizia (→ register) + Accedi (→ login) + demo barber
   ============================================================ */
function PariAuthWelcome({ onLogin, setView }) {
  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ display: "flex", alignItems: "center", gap: 2, paddingTop: 16 }}>
        <PoleMark size={32} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.035em" }}>Pari</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 0" }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 42, lineHeight: 1.05, letterSpacing: "-0.035em",
          color: "var(--ink)", margin: 0,
        }}>
          La sedia giusta,<br/>
          <span style={{ color: "var(--clay)" }}>prenotata in 10 secondi.</span>
        </h1>
        <p style={{ marginTop: 18, fontSize: 14.5, color: "var(--ink-60)", lineHeight: 1.55, maxWidth: 320 }}>
          Segui i barbieri della tua città, salva i tagli che ti piacciono, e prenota la prossima sessione senza chiamare.
        </p>

        <div style={{ marginTop: 28, padding: 14, background: "var(--paper)", border: "1px solid var(--ink-08)", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials="MB" size={42} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Marco Barba</div>
            <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
              Sab 24 · 10:00 · Skin fade
            </div>
          </div>
          <Pill tone="success">Confermato</Pill>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        <Button kind="filled" size="lg" onClick={() => setView("register")} style={{ width: "100%" }}>Inizia</Button>
        <Button kind="ghost" size="lg" onClick={() => setView("login")} style={{ width: "100%" }}>
          Hai già un account? <span style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 4 }}>Accedi</span>
        </Button>
      </div>
      <div style={{ textAlign: "center", paddingBottom: 14, fontSize: 11.5, color: "var(--ink-40)" }}>
        Continuando accetti i Termini e l'Informativa privacy.
      </div>
      <div style={{ paddingBottom: 18, textAlign: "center", fontSize: 11, color: "var(--ink-40)" }}>
        <a onClick={() => onLogin("barber")} style={{ color: "var(--ink-60)", cursor: "pointer", textDecoration: "underline" }}>
          (demo) entra come barbiere
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   LOGIN form — email + password + Google.
   Adds links to register + reset.
   ============================================================ */
function PariAuthLogin({ onLogin, setView }) {
  const [email, setEmail] = useStateAuth("andrea@pari.app");
  const [pw, setPw]       = useStateAuth("••••••••••");

  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <IconBtn name="back" size={22} color="var(--ink)" onClick={() => setView("welcome")} />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PoleMark size={28} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.035em" }}>Pari</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ marginTop: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>Bentornato.</h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-60)" }}>Accedi con email o con Google.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={pariAuthInputStyle()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Password</span>
            <a onClick={() => setView("reset-request")}
               style={{ fontSize: 12, color: "var(--clay)", textDecoration: "none", cursor: "pointer" }}>
              Dimenticata?
            </a>
          </div>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} style={pariAuthInputStyle()} />
        </label>
      </div>

      <div style={{ marginTop: 22 }}>
        <Button kind="filled" size="lg" onClick={() => onLogin("client")} style={{ width: "100%" }}>Accedi</Button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0" }}>
        <Hairline /><span style={{ fontSize: 11.5, color: "var(--ink-40)", whiteSpace: "nowrap" }}>oppure</span><Hairline />
      </div>

      <button onClick={() => onLogin("client")} style={{
        padding: "11px 0", border: "1px solid var(--ink-15)", background: "var(--paper)",
        borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        fontFamily: "inherit", fontSize: 14, color: "var(--ink)", cursor: "pointer", fontWeight: 500,
      }}>
        <Icon name="google" size={18} color="var(--ink)" weight="fill"/>
        Continua con Google
      </button>

      <div style={{ marginTop: "auto", textAlign: "center", padding: "28px 0 18px", fontSize: 13, color: "var(--ink-60)" }}>
        Nuovo qui?{" "}
        <a onClick={() => setView("register")} style={{ color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
          Crea un account
        </a>
      </div>

      <div style={{ paddingBottom: 18, textAlign: "center", fontSize: 11, color: "var(--ink-40)" }}>
        <a onClick={() => onLogin("barber")} style={{ color: "var(--ink-60)", cursor: "pointer", textDecoration: "underline" }}>
          (demo) entra come barbiere
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   REGISTER — role picker + name + email + password (strength) + captcha
   ============================================================ */
function PariAuthRegister({ onLogin, setView }) {
  const [role, setRole]   = useStateAuth("client");
  const [name, setName]   = useStateAuth("");
  const [email, setEmail] = useStateAuth("");
  const [pw, setPw]       = useStateAuth("");
  const [pw2, setPw2]     = useStateAuth("");
  const [captcha, setCaptcha] = useStateAuth(false);

  const strength = pariPasswordStrength(pw);
  const strengthLabel = ["Troppo debole","Debole","Discreta","Buona","Forte"][strength];
  const match = pw && pw2 && pw === pw2;
  const canSubmit = name.trim() && email.includes("@") && strength >= 2 && match && captcha;

  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <IconBtn name="back" size={22} color="var(--ink)" onClick={() => setView("login")} />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PoleMark size={28} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.035em" }}>Pari</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ marginTop: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>Crea il tuo account.</h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-60)" }}>Bastano due minuti.</p>
      </div>

      {/* Role picker */}
      <div style={{ marginTop: 18 }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Cosa stai cercando?</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          {[
            { v: "client",  title: "Cliente",  body: "Prenota tagli e segui i barbieri.", icon: "user" },
            { v: "barber",  title: "Barbiere", body: "Gestisci bottega e prenotazioni.",  icon: "shop" },
          ].map(opt => {
            const active = role === opt.v;
            return (
              <button key={opt.v} onClick={() => setRole(opt.v)} style={{
                padding: "12px 12px",
                background: active ? "var(--clay-soft)" : "var(--paper-2)",
                border: active ? "1px solid var(--clay)" : "1px solid var(--ink-08)",
                borderRadius: 12, cursor: "pointer",
                fontFamily: "inherit", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 6,
                transition: "all 120ms var(--ease)",
              }}>
                <Icon name={opt.icon} size={20}
                  color={active ? "var(--clay-deep)" : "var(--ink-60)"} />
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: active ? "var(--clay-deep)" : "var(--ink)",
                  letterSpacing: "-0.015em",
                }}>{opt.title}</div>
                <div style={{
                  fontSize: 11.5,
                  color: active ? "var(--clay-deep)" : "var(--ink-60)",
                  opacity: active ? 0.85 : 1,
                  lineHeight: 1.4,
                }}>{opt.body}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Nome</span>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Andrea Goretti" style={pariAuthInputStyle()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="andrea@email.com" style={pariAuthInputStyle()} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Password</span>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Almeno 8 caratteri" style={pariAuthInputStyle()} />
          {pw && (
            <div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength
                      ? (strength <= 1 ? "var(--rust)" : strength <= 2 ? "var(--clay)" : "var(--sage)")
                      : "var(--ink-08)",
                    transition: "background 160ms var(--ease)",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 4 }}>{strengthLabel}</div>
            </div>
          )}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Conferma password</span>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
            style={{
              ...pariAuthInputStyle(),
              borderColor: pw2 && !match ? "var(--rust)" : "var(--ink-15)",
            }} />
          {pw2 && !match && (
            <div style={{ fontSize: 11, color: "var(--rust)" }}>Le password non coincidono.</div>
          )}
        </label>
      </div>

      {/* Captcha placeholder */}
      <div style={{
        marginTop: 16, padding: "12px 14px",
        background: "var(--paper-2)", border: "1px solid var(--ink-15)",
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
      }} onClick={() => setCaptcha(c => !c)}>
        <div style={{
          width: 20, height: 20, borderRadius: 5,
          border: "1.5px solid var(--ink-25)",
          background: captcha ? "var(--sage)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {captcha && <Icon name="caret" size={12} color="white" />}
        </div>
        <div style={{ flex: 1, fontSize: 12.5, color: "var(--ink-80)" }}>Non sono un robot</div>
        <div style={{
          fontSize: 9, color: "var(--ink-40)",
          fontFamily: "var(--font-mono)",
        }}>hCaptcha</div>
      </div>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <Button kind="filled" size="lg" disabled={!canSubmit}
          onClick={() => onLogin(role)} style={{ width: "100%" }}>
          Crea account
        </Button>
      </div>

      <div style={{ marginTop: "auto", textAlign: "center", padding: "14px 0 18px", fontSize: 13, color: "var(--ink-60)" }}>
        Hai già un account?{" "}
        <a onClick={() => setView("login")} style={{ color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
          Accedi
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   RESET PASSWORD — request email
   ============================================================ */
function PariAuthReset({ setView }) {
  const [email, setEmail] = useStateAuth("");
  const valid = email.includes("@") && email.includes(".");

  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <IconBtn name="back" size={22} color="var(--ink)" onClick={() => setView("login")} />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PoleMark size={28} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.035em" }}>Pari</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ marginTop: 36 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>
          Recupera la password.
        </h1>
        <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.5 }}>
          Ti mandiamo un link sicuro all'indirizzo che hai usato per registrarti.
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="andrea@email.com" style={pariAuthInputStyle()} />
        </label>
      </div>

      <div style={{ marginTop: 22 }}>
        <Button kind="filled" size="lg" disabled={!valid}
          onClick={() => setView("reset-sent")} style={{ width: "100%" }}>
          Invia link
        </Button>
      </div>

      <div style={{ marginTop: "auto", textAlign: "center", padding: "28px 0 18px", fontSize: 13, color: "var(--ink-60)" }}>
        Ricordata?{" "}
        <a onClick={() => setView("login")} style={{ color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
          Torna all'accesso
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   RESET SENT — confirmation
   ============================================================ */
function PariAuthResetSent({ setView }) {
  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <IconBtn name="close" size={22} color="var(--ink)" onClick={() => setView("login")} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", padding: "0 8px" }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "var(--sage-soft)", border: "1px solid var(--sage)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px",
        }}>
          <Icon name="send" size={26} color="var(--sage)" />
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0,
        }}>Controlla la tua email.</h1>
        <p style={{
          marginTop: 12, fontSize: 14, color: "var(--ink-60)",
          lineHeight: 1.55, maxWidth: 320, margin: "12px auto 0",
        }}>
          Se l'email è registrata, riceverai un link per impostare una nuova password. Apri il link da questo dispositivo.
        </p>
      </div>

      <div style={{ paddingBottom: 32 }}>
        {/* For demo purposes: jump to new-password view */}
        <Button kind="hairline" size="lg" onClick={() => setView("new-password")} style={{ width: "100%" }}>
          (demo) ho ricevuto il link
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   NEW PASSWORD — after recovery deep-link.
   §3.1 + §4.3: token validation, password strength.
   ============================================================ */
function PariAuthNewPwd({ onLogin, setView }) {
  const [pw, setPw]   = useStateAuth("");
  const [pw2, setPw2] = useStateAuth("");
  const strength = pariPasswordStrength(pw);
  const strengthLabel = ["Troppo debole","Debole","Discreta","Buona","Forte"][strength];
  const match = pw && pw2 && pw === pw2;
  const canSubmit = strength >= 2 && match;

  return (
    <div className="bb-screen" style={{ padding: "0 24px", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div className="bb-safe-top" />
      <div style={{ paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 30 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <PoleMark size={28} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.035em" }}>Pari</span>
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ marginTop: 36 }}>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0,
        }}>Nuova password.</h1>
        <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.5 }}>
          Scegli una password che useremo per i prossimi accessi.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Nuova password</span>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Almeno 8 caratteri" style={pariAuthInputStyle()} />
          {pw && (
            <div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength
                      ? (strength <= 1 ? "var(--rust)" : strength <= 2 ? "var(--clay)" : "var(--sage)")
                      : "var(--ink-08)",
                    transition: "background 160ms var(--ease)",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 4 }}>{strengthLabel}</div>
            </div>
          )}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Conferma password</span>
          <input type="password" value={pw2} onChange={e => setPw2(e.target.value)}
            style={{
              ...pariAuthInputStyle(),
              borderColor: pw2 && !match ? "var(--rust)" : "var(--ink-15)",
            }} />
          {pw2 && !match && (
            <div style={{ fontSize: 11, color: "var(--rust)" }}>Le password non coincidono.</div>
          )}
        </label>
      </div>

      <div style={{ marginTop: 22 }}>
        <Button kind="filled" size="lg" disabled={!canSubmit}
          onClick={() => onLogin("client")} style={{ width: "100%" }}>
          Salva e accedi
        </Button>
      </div>
    </div>
  );
}

Object.assign(window, { PariScreenAuth });
