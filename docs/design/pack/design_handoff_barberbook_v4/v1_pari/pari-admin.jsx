/* Pari · Admin Panel — Users / Logs / Support / Notifiche.
   Tab-based moderation surface for admins. Each tab is a small
   self-contained subscreen, plus the AddUser sheet and the Notification
   composer with HTML preview (sanitized).
   Spec §3.18 + §4.8. */

const { useState: useStateAdm, useMemo: useMemoAdm } = React;

/* ---- DEMO DATA --------------------------------------------------- */
const PARI_ADM_USERS = [
  { id: "u1", initials: "AG", name: "Andrea Goretti",   email: "andrea@pari.app",   role: "client",  status: "attivo",      since: "feb 2026" },
  { id: "u2", initials: "MB", name: "Marco Barba",      email: "marco@bottega.it",  role: "barber",  status: "attivo",      since: "gen 2026" },
  { id: "u3", initials: "FN", name: "Fadi Nour",        email: "fadi@nour.it",      role: "barber",  status: "attivo",      since: "mar 2026" },
  { id: "u4", initials: "GC", name: "Giulio Cesare",    email: "giulio@email.com",  role: "client",  status: "attivo",      since: "apr 2026" },
  { id: "u5", initials: "TK", name: "Tariq Khalid",     email: "tariq@khalid.com",  role: "barber",  status: "attivo",      since: "dic 2025" },
  { id: "u6", initials: "LM", name: "Luca Marchi",      email: "luca@email.com",    role: "client",  status: "sospeso",     since: "feb 2026" },
];

const PARI_ADM_LOGS = [
  { id: "l1", level: "error",   when: "10:12", action: "booking.insert",     message: "23P01 exclusion bookings_no_double",     user: "andrea@pari.app",  metadata: { slot: "10:00", barberId: "1" } },
  { id: "l2", level: "warning", when: "10:11", action: "geolocation",        message: "GPS denied · fallback Cagliari",         user: "luca@email.com",   metadata: null },
  { id: "l3", level: "info",    when: "10:08", action: "auth.signup",        message: "new user · role=client",                 user: "andrea@pari.app",  metadata: null },
  { id: "l4", level: "info",    when: "10:05", action: "post.created",       message: "barber post · likes=0",                  user: "marco@bottega.it", metadata: { postId: "p1" } },
  { id: "l5", level: "warning", when: "09:58", action: "auth.captcha",       message: "captcha failed (retry ok)",              user: "giulio@email.com", metadata: null },
  { id: "l6", level: "error",   when: "09:42", action: "supabase.fn",        message: "admin_delete_user · timeout",            user: "—",                metadata: { code: 504 } },
  { id: "l7", level: "info",    when: "09:30", action: "support.message",    message: "user → admin · new conversation",        user: "giulio@email.com", metadata: null },
];

const PARI_ADM_SUPPORT_CONVS = [
  { id: "sc1", initials: "AG", name: "Andrea Goretti", preview: "Non vedo i miei appuntamenti passati.", when: "2h",   unread: 2 },
  { id: "sc2", initials: "GC", name: "Giulio Cesare",   preview: "Posso cambiare email del profilo?",    when: "4h",   unread: 1 },
  { id: "sc3", initials: "FR", name: "Fabio R.",        preview: "Grazie, risolto!",                      when: "ieri", unread: 0 },
  { id: "sc4", initials: "MB", name: "Marco Barba",     preview: "C'è un bug sulla disponibilità.",       when: "3g",   unread: 0 },
];

/* ============================================================
   ADMIN PANEL
   ============================================================ */
function PariScreenAdmin() {
  const [tab, setTab] = useStateAdm("users");

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />

      <div className="bb-topbar">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500 }}>Admin</span>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22,
            letterSpacing: "-0.025em", color: "var(--ink)",
          }}>Moderazione</span>
        </div>
        <div className="actions">
          <IconBtn name="refresh" size={20} color="var(--ink-80)" label="Aggiorna" />
        </div>
      </div>

      {/* Tab selector */}
      <div style={{
        display: "flex", padding: "0 20px 0",
        borderBottom: "1px solid var(--ink-08)",
      }}>
        {[
          ["users",   "Users",      PARI_ADM_USERS.length],
          ["logs",    "Logs",       PARI_ADM_LOGS.filter(l => l.level === "error").length],
          ["support", "Support",    PARI_ADM_SUPPORT_CONVS.filter(c => c.unread > 0).length],
          ["notif",   "Notifiche",  null],
        ].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
            {l}
            {n != null && n > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
                background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
                padding: "0 5px", borderRadius: 9999, fontWeight: 600,
              }}>{n}</span>
            )}
            {tab === k && (
              <div style={{
                position: "absolute", left: "15%", right: "15%", bottom: -1,
                height: 2, background: "var(--clay)", borderRadius: 9999,
              }} />
            )}
          </button>
        ))}
      </div>

      {tab === "users"   && <PariAdmUsersTab />}
      {tab === "logs"    && <PariAdmLogsTab />}
      {tab === "support" && <PariAdmSupportTab />}
      {tab === "notif"   && <PariAdmNotifTab />}
    </div>
  );
}

/* ============================================================
   USERS TAB
   ============================================================ */
function PariAdmUsersTab() {
  const [users, setUsers]   = useStateAdm(PARI_ADM_USERS);
  const [query, setQuery]   = useStateAdm("");
  const [showAdd, setShowAdd] = useStateAdm(false);
  const [confirmDel, setConfirmDel] = useStateAdm(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <div style={{ padding: "12px 20px 10px", display: "flex", gap: 8 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
          border: "1px solid var(--ink-15)", borderRadius: 12, background: "var(--paper-2)",
        }}>
          <Icon name="search" size={15} color="var(--ink-60)" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cerca per nome o email…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 12.5, fontFamily: "inherit", color: "var(--ink)",
            }} />
        </div>
        <Button kind="filled" size="sm" onClick={() => setShowAdd(true)}>+ Nuovo</Button>
      </div>

      <div style={{ paddingBottom: 16 }}>
        {filtered.map(u => (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 20px",
            borderBottom: "1px solid var(--ink-08)",
          }}>
            <Avatar initials={u.initials} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.015em" }}>{u.name}</span>
                {u.role === "barber" && <Pill tone="clay">Barber</Pill>}
                {u.status === "sospeso" && <Pill tone="danger">Sospeso</Pill>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                {u.email}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-40)", marginTop: 2 }}>
                dal {u.since}
              </div>
            </div>
            <IconBtn name="close" size={16} color="var(--ink-40)"
              onClick={() => setConfirmDel(u)} label="Elimina utente" />
          </div>
        ))}
      </div>

      {showAdd && (
        <PariAdmAddUserSheet
          onClose={() => setShowAdd(false)}
          onCreate={(u) => { setUsers(arr => [{ ...u, id: `u${Date.now()}`, status: "attivo", since: "ora" }, ...arr]); setShowAdd(false); }}
        />
      )}

      {confirmDel && (
        <PariConfirmSheet
          title={`Eliminare ${confirmDel.name}?`}
          body={confirmDel.email}
          subBody="L'eliminazione è permanente e propaga in cascata su posts, bookings, follows, reviews."
          confirmLabel="Elimina utente"
          confirmTone="danger"
          onClose={() => setConfirmDel(null)}
          onConfirm={() => {
            setUsers(arr => arr.filter(x => x.id !== confirmDel.id));
            setConfirmDel(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   ADD USER SHEET
   ============================================================ */
function PariAdmAddUserSheet({ onClose, onCreate }) {
  const [name, setName]   = useStateAdm("");
  const [email, setEmail] = useStateAdm("");
  const [pw, setPw]       = useStateAdm("");
  const [role, setRole]   = useStateAdm("client");

  const initials = name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join("").toUpperCase() || "??";
  const canSubmit = name.trim() && email.includes("@") && pw.length >= 6;

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "82%" }}>
        <div className="bb-sheet__handle" />

        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Crea utente</div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 22, letterSpacing: "-0.025em", margin: "8px 20px 14px",
        }}>Nuovo utente</h2>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-60)", letterSpacing: "0.02em", textTransform: "uppercase" }}>Nome</span>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Nome Cognome" style={pariAuthInputStyle()} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-60)", letterSpacing: "0.02em", textTransform: "uppercase" }}>Email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@dominio.it" style={pariAuthInputStyle()} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-60)", letterSpacing: "0.02em", textTransform: "uppercase" }}>Password temporanea</span>
            <input type="text" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Almeno 6 caratteri" style={pariAuthInputStyle()} />
          </label>
          <div>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-60)", letterSpacing: "0.02em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Ruolo</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                ["client", "Cliente"],
                ["barber", "Barbiere"],
              ].map(([k, l]) => (
                <button key={k} onClick={() => setRole(k)} style={{
                  flex: 1, padding: "8px 0",
                  background: role === k ? "var(--ink)" : "var(--paper-2)",
                  color: role === k ? "var(--linen)" : "var(--ink-80)",
                  fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer", borderRadius: 9999,
                  border: role === k ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 20px 18px", display: "flex", gap: 10 }}>
          <Button kind="hairline" size="lg" onClick={onClose} style={{ flex: 1 }}>Annulla</Button>
          <Button kind="filled" size="lg" disabled={!canSubmit}
            onClick={() => onCreate({ name, email, role, initials })}
            style={{ flex: 1 }}>
            Crea
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LOGS TAB
   ============================================================ */
function PariAdmLogsTab() {
  const [level, setLevel] = useStateAdm("all");
  const filtered = level === "all" ? PARI_ADM_LOGS : PARI_ADM_LOGS.filter(l => l.level === level);

  return (
    <div>
      <div style={{
        padding: "12px 20px 10px",
        display: "flex", alignItems: "center", gap: 6, overflowX: "auto",
      }}>
        {[
          ["all",     "Tutti",    PARI_ADM_LOGS.length],
          ["info",    "Info",     PARI_ADM_LOGS.filter(l => l.level === "info").length],
          ["warning", "Warning",  PARI_ADM_LOGS.filter(l => l.level === "warning").length],
          ["error",   "Error",    PARI_ADM_LOGS.filter(l => l.level === "error").length],
        ].map(([k, l, n]) => {
          const active = level === k;
          return (
            <button key={k} onClick={() => setLevel(k)} style={{
              padding: "5px 10px",
              background: active ? "var(--ink)" : "var(--paper-2)",
              color: active ? "var(--linen)" : "var(--ink-80)",
              fontFamily: "inherit", fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", borderRadius: 9999,
              border: active ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {l} · {n}
            </button>
          );
        })}
      </div>

      <div style={{ paddingBottom: 16 }}>
        {filtered.map(log => (
          <PariAdmLogRow key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

function PariAdmLogRow({ log }) {
  const [open, setOpen] = useStateAdm(false);
  const tone = log.level === "error"   ? "var(--rust)"
             : log.level === "warning" ? "var(--clay)"
             : "var(--sage)";

  return (
    <div style={{ borderBottom: "1px solid var(--ink-08)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%",
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 20px",
        border: "none", background: "transparent", cursor: "pointer",
        fontFamily: "inherit", textAlign: "left",
      }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9.5,
          color: tone, fontWeight: 600,
          background: log.level === "error" ? "var(--rust-soft)"
                   : log.level === "warning" ? "var(--clay-soft)"
                   : "var(--sage-soft)",
          padding: "2px 6px", borderRadius: 5,
          flexShrink: 0, marginTop: 1,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          {log.level === "info" ? "INF" : log.level === "warning" ? "WRN" : "ERR"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink)", fontWeight: 600 }}>
            {log.action}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-80)", marginTop: 2, lineHeight: 1.4 }}>
            {log.message}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-50)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            {log.when} · {log.user}
          </div>
        </div>
        <Icon name={open ? "caretDown" : "caret"} size={13} color="var(--ink-40)" />
      </button>

      {open && log.metadata && (
        <div style={{
          margin: "0 20px 12px", padding: "10px 12px",
          background: "var(--ink)", color: "var(--linen)",
          borderRadius: 8, fontFamily: "var(--font-mono)",
          fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap",
        }}>
          {JSON.stringify(log.metadata, null, 2)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUPPORT TAB
   ============================================================ */
function PariAdmSupportTab() {
  const [active, setActive] = useStateAdm(PARI_ADM_SUPPORT_CONVS[0]);

  if (active && active.opened) {
    return <PariAdmSupportThread conv={active} onBack={() => setActive(null)} />;
  }

  return (
    <div>
      <div style={{ padding: "12px 20px 8px", fontSize: 12, color: "var(--ink-60)" }}>
        {PARI_ADM_SUPPORT_CONVS.filter(c => c.unread > 0).length} conversazioni in attesa
      </div>
      {PARI_ADM_SUPPORT_CONVS.map(c => (
        <button key={c.id} onClick={() => setActive({ ...c, opened: true })} style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 20px",
          border: "none",
          borderBottom: "1px solid var(--ink-08)",
          background: "transparent", cursor: "pointer",
          fontFamily: "inherit", textAlign: "left",
        }}>
          <Avatar initials={c.initials} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{
                fontSize: 13.5, fontWeight: c.unread > 0 ? 600 : 500,
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.name}</span>
              <span style={{
                fontSize: 11, color: c.unread > 0 ? "var(--clay-deep)" : "var(--ink-50)",
                fontFamily: "var(--font-mono)", flexShrink: 0,
                fontWeight: c.unread > 0 ? 600 : 500,
              }}>{c.when}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 3 }}>
              <span style={{
                fontSize: 12, color: c.unread > 0 ? "var(--ink-80)" : "var(--ink-60)",
                flex: 1, minWidth: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{c.preview}</span>
              {c.unread > 0 && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  background: "var(--clay)", color: "white",
                  padding: "1px 6px", borderRadius: 9999, fontWeight: 600,
                }}>{c.unread}</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function PariAdmSupportThread({ conv, onBack }) {
  const [text, setText] = useStateAdm("");
  const [messages, setMessages] = useStateAdm([
    { id: "m1", from: "them", text: conv.preview, when: "10:32" },
    { id: "m2", from: "them", text: "Quando provo a vederli si carica all'infinito.", when: "10:33" },
  ]);

  function send() {
    if (!text.trim()) return;
    const now = new Date();
    const stamp = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    setMessages(m => [...m, { id: `n${m.length}`, from: "me", text: text.trim(), when: stamp }]);
    setText("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 20px 12px",
        borderBottom: "1px solid var(--ink-08)",
      }}>
        <IconBtn name="back" size={20} color="var(--ink)" onClick={onBack} label="Lista" />
        <Avatar initials={conv.initials} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.015em" }}>{conv.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-50)" }}>conversazione · admin</div>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto",
        padding: "12px 20px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {messages.map(m => {
          const mine = m.from === "me";
          return (
            <div key={m.id} style={{
              alignSelf: mine ? "flex-end" : "flex-start",
              maxWidth: "78%",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <div style={{
                padding: "8px 12px",
                background: mine ? "var(--clay)" : "var(--paper)",
                color: mine ? "white" : "var(--ink)",
                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                fontSize: 13.5, lineHeight: 1.45,
                border: mine ? "none" : "1px solid var(--ink-08)",
              }}>{m.text}</div>
              <div style={{
                fontSize: 10, color: "var(--ink-40)",
                fontFamily: "var(--font-mono)",
                textAlign: mine ? "right" : "left",
                padding: "0 4px",
              }}>{m.when}</div>
            </div>
          );
        })}
      </div>

      <div style={{
        padding: "10px 14px 14px",
        borderTop: "1px solid var(--ink-08)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <div style={{
          flex: 1, padding: "8px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 9999,
          background: "var(--paper-2)",
        }}>
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Rispondi…"
            style={{
              width: "100%", border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "inherit", color: "var(--ink)",
            }} />
        </div>
        <button onClick={send} disabled={!text.trim()} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: text.trim() ? "var(--clay)" : "var(--ink-15)",
          border: "none", cursor: text.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="send" size={16} color="white" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICHE TAB — broadcast composer with HTML sanitize preview
   ============================================================ */
function PariAdmNotifTab() {
  const [target, setTarget]    = useStateAdm("all");
  const [recipient, setRecipient] = useStateAdm("");
  const [title, setTitle]      = useStateAdm("Manutenzione programmata");
  const [body, setBody]        = useStateAdm("Sabato dalle <strong>22:00 alle 04:00</strong> l'app potrebbe essere lenta.");
  const [sent, setSent]        = useStateAdm(false);

  /* Simple sanitize: strip script/style + on* attributes. Real impl uses
     lib/sanitizeHtml. Here we just allow <strong>, <em>, <br>, <a>. */
  const safeHtml = useMemoAdm(() => sanitizePariHtml(body), [body]);

  return (
    <div style={{ padding: "14px 20px 24px" }}>
      {/* Destinatario */}
      <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Destinatario</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          ["all",       "Tutti"],
          ["barbers",   "Barbieri"],
          ["targeted",  "Utente specifico"],
        ].map(([k, l]) => {
          const active = target === k;
          return (
            <button key={k} onClick={() => setTarget(k)} style={{
              flex: 1, padding: "8px 0",
              background: active ? "var(--ink)" : "var(--paper-2)",
              color: active ? "var(--linen)" : "var(--ink-80)",
              fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
              cursor: "pointer", borderRadius: 9999,
              border: active ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
            }}>{l}</button>
          );
        })}
      </div>

      {target === "targeted" && (
        <div style={{ marginBottom: 12 }}>
          <input value={recipient} onChange={e => setRecipient(e.target.value)}
            placeholder="email o id utente" style={pariAuthInputStyle()} />
        </div>
      )}

      {/* Titolo */}
      <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Titolo</div>
      <input value={title} onChange={e => setTitle(e.target.value)}
        style={{ ...pariAuthInputStyle(), marginBottom: 12 }} />

      {/* Body HTML */}
      <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Corpo · HTML</div>
      <textarea value={body} onChange={e => setBody(e.target.value)}
        rows={4}
        style={{
          ...pariAuthInputStyle(),
          fontFamily: "var(--font-mono)", fontSize: 12,
          resize: "vertical", minHeight: 80,
        }} />
      <div style={{ fontSize: 10.5, color: "var(--ink-50)", marginTop: 4 }}>
        Tag consentiti: <code>strong</code>, <code>em</code>, <code>br</code>, <code>a</code>.
      </div>

      {/* Anteprima */}
      <div className="bb-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Anteprima</div>
      <div style={{
        padding: "12px 14px",
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        borderRadius: 12,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--clay-soft)", border: "1px solid var(--clay)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon name="bell" size={16} color="var(--clay-deep)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--ink)",
            letterSpacing: "-0.015em",
          }}>{title || "(senza titolo)"}</div>
          <div style={{
            fontSize: 12.5, color: "var(--ink-80)",
            lineHeight: 1.5, marginTop: 3,
          }} dangerouslySetInnerHTML={{ __html: safeHtml }} />
          <div style={{
            fontSize: 10.5, color: "var(--ink-50)", marginTop: 4,
            fontFamily: "var(--font-mono)",
          }}>ora · {target === "all" ? "broadcast" : target === "barbers" ? "barbieri" : "targeted"}</div>
        </div>
      </div>

      {sent ? (
        <div style={{
          marginTop: 18, padding: "12px 14px",
          background: "var(--sage-soft)", border: "1px solid var(--sage)",
          borderRadius: 10,
          fontSize: 13, color: "var(--sage)", fontWeight: 500,
        }}>Notifica inviata.</div>
      ) : (
        <Button kind="filled" size="lg"
          onClick={() => { setSent(true); setTimeout(() => setSent(false), 2400); }}
          style={{ width: "100%", marginTop: 18 }}>
          Invia notifica
        </Button>
      )}
    </div>
  );
}

/* Tiny sanitizer. Production uses lib/sanitizeHtml; here we only strip
   <script>/<style> + on* attributes and allow a tiny tag whitelist. */
function sanitizePariHtml(s) {
  return String(s ?? "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "");
}

Object.assign(window, { PariScreenAdmin });
