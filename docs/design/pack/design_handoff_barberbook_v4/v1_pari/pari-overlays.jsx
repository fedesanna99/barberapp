/* Pari · Overlays — Notifiche, Messaggi (lista + thread), Supporto.
   Each opens as a fullscreen overlay over the main app. All share the
   same shell pattern: safe-top + topbar + scrollable body. */

const { useState: useStateOv, useEffect: useEffectOv, useRef: useRefOv } = React;

/* ============================================================
   NOTIFICHE
   Mix of broadcast (recipient_id null) and targeted notifications.
   Body is "sanitized HTML" — represented here as plain bold spans.
   ============================================================ */
const PARI_NOTIFS_DEFAULT = [
  {
    id: "n1", type: "booking", unread: true, when: "2h fa",
    initials: "MB", tone: "sage",
    body: <span><strong>Marco Barba</strong> ha confermato il tuo taglio. Sab 24 mag · 10:00.</span>,
  },
  {
    id: "n2", type: "dm", unread: true, when: "3h fa",
    initials: "GC", tone: "ink",
    body: <span>Nuovo messaggio da <strong>Giulio Cesare</strong>.</span>,
  },
  {
    id: "n3", type: "broadcast", unread: true, when: "ieri",
    iconName: "scissors", tone: "clay",
    body: <span><strong>Tagli estivi.</strong> Scopri gli stili più richiesti dei barbieri di Cagliari.</span>,
  },
  {
    id: "n4", type: "follow", unread: false, when: "2g fa",
    initials: "AT", tone: "sage",
    body: <span><strong>Alessio T.</strong> ha iniziato a seguirti.</span>,
  },
  {
    id: "n5", type: "review", unread: false, when: "5g fa",
    initials: "MB", tone: "clay",
    body: <span>Hai pubblicato una recensione su <strong>Marco Barba</strong>.</span>,
  },
  {
    id: "n6", type: "system", unread: false, when: "1 sett. fa",
    iconName: "refresh", tone: "ink",
    body: <span>Nuova versione dell'app disponibile.</span>,
  },
];

function PariNotificationsOverlay({ onClose }) {
  const [items, setItems] = useStateOv(PARI_NOTIFS_DEFAULT);
  const unread = items.filter(i => i.unread).length;

  function markRead(id) {
    setItems(arr => arr.map(n => n.id === id ? { ...n, unread: false } : n));
  }
  function markAllRead() {
    setItems(arr => arr.map(n => ({ ...n, unread: false })));
  }

  return (
    <PariOverlayShell title="Notifiche" onClose={onClose}
      headerRight={unread > 0 ? (
        <button onClick={markAllRead} style={{
          border: "none", background: "transparent", padding: "4px 0", cursor: "pointer",
          fontFamily: "inherit", fontSize: 12, fontWeight: 500,
          color: "var(--clay-deep)",
        }}>Segna tutte lette</button>
      ) : null}
    >
      {unread > 0 && (
        <div style={{
          padding: "10px 20px 0",
          fontSize: 11.5, color: "var(--ink-50)",
        }}>{unread} da leggere</div>
      )}
      {items.length === 0 ? (
        <PariOverlayEmpty icon="bell"
          title="Nessuna notifica."
          body="Le notifiche su prenotazioni, messaggi e novità appariranno qui." />
      ) : (
        <div style={{ padding: "8px 0 24px" }}>
          {items.map(n => (
            <button key={n.id} onClick={() => markRead(n.id)}
              style={{
                width: "100%",
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 20px",
                border: "none",
                borderBottom: "1px solid var(--ink-08)",
                background: n.unread ? "var(--paper-2)" : "transparent",
                cursor: "pointer",
                fontFamily: "inherit", textAlign: "left",
                transition: "background 120ms var(--ease)",
              }}>
              {n.iconName ? (
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: n.tone === "clay" ? "var(--clay-soft)"
                            : n.tone === "sage" ? "var(--sage-soft)"
                            : "var(--paper)",
                  border: "1px solid var(--ink-08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon name={n.iconName} size={16}
                    color={n.tone === "clay" ? "var(--clay-deep)"
                         : n.tone === "sage" ? "var(--sage)"
                         : "var(--ink-80)"} />
                </div>
              ) : (
                <Avatar initials={n.initials} size={36} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, lineHeight: 1.5,
                  color: n.unread ? "var(--ink)" : "var(--ink-60)",
                }}>{n.body}</div>
                <div style={{
                  fontSize: 11, color: "var(--ink-50)", marginTop: 4,
                  fontFamily: "var(--font-mono)",
                }}>{n.when}</div>
              </div>
              {n.unread && (
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "var(--clay)", marginTop: 8, flexShrink: 0,
                }} />
              )}
            </button>
          ))}
        </div>
      )}
    </PariOverlayShell>
  );
}

/* ============================================================
   DM LIST + THREAD
   ============================================================ */
const PARI_DM_CONVERSATIONS = [
  { id: "c1", initials: "MB", name: "Marco Barba",   preview: "Confermato per le 10. A sabato.",   when: "2h",  unread: 0 },
  { id: "c2", initials: "GC", name: "Giulio Cesare", preview: "Perfetto, ci sentiamo lunedì.",     when: "3h",  unread: 2 },
  { id: "c3", initials: "FN", name: "Fadi Nour",     preview: "Posso anticipare a martedì?",       when: "ieri", unread: 1 },
  { id: "c4", initials: "AT", name: "Alessio T.",    preview: "Grazie per la prenotazione!",       when: "2g",  unread: 0 },
  { id: "c5", initials: "TK", name: "Tariq Khalid",  preview: "Va bene, ti aspetto.",              when: "1 sett.", unread: 0 },
];

const PARI_DM_THREAD = {
  c1: [
    { id: "m1", from: "them", text: "Ciao Andrea! Hai bisogno di prenotare?",            when: "10:14" },
    { id: "m2", from: "me",   text: "Ciao Marco, sabato libero per uno skin fade?",      when: "10:17" },
    { id: "m3", from: "them", text: "Sì, alle 10 va bene?",                                when: "10:18" },
    { id: "m4", from: "me",   text: "Perfetto, prenoto adesso.",                          when: "10:20" },
    { id: "m5", from: "them", text: "Confermato per le 10. A sabato.",                    when: "10:21" },
  ],
};

function PariMessagesOverlay({ onClose }) {
  const [openThread, setOpenThread] = useStateOv(null);

  if (openThread) {
    return <PariDMThreadOverlay
      conversation={openThread}
      onBack={() => setOpenThread(null)}
      onClose={onClose}
    />;
  }
  return <PariDMListOverlay onClose={onClose} onOpen={setOpenThread} />;
}

function PariDMListOverlay({ onClose, onOpen }) {
  const [query, setQuery] = useStateOv("");
  const filtered = PARI_DM_CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <PariOverlayShell title="Messaggi" onClose={onClose}>
      <div style={{ padding: "10px 20px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 12, background: "var(--paper-2)",
        }}>
          <Icon name="search" size={16} color="var(--ink-60)" />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Cerca una conversazione…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13, fontFamily: "inherit", color: "var(--ink)",
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <PariOverlayEmpty icon="send"
          title="Nessuna conversazione."
          body="Inizia a chattare con un barbiere dal suo profilo." />
      ) : (
        <div style={{ paddingBottom: 24 }}>
          {filtered.map(c => (
            <button key={c.id} onClick={() => onOpen(c)} style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px",
              border: "none",
              borderBottom: "1px solid var(--ink-08)",
              background: "transparent", cursor: "pointer",
              fontFamily: "inherit", textAlign: "left",
            }}>
              <Avatar initials={c.initials} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{
                    fontSize: 14, fontWeight: c.unread > 0 ? 600 : 500, color: "var(--ink)",
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
                    fontSize: 12.5, color: c.unread > 0 ? "var(--ink-80)" : "var(--ink-60)",
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
      )}
    </PariOverlayShell>
  );
}

function PariDMThreadOverlay({ conversation, onBack, onClose }) {
  const [text, setText] = useStateOv("");
  const [messages, setMessages] = useStateOv(PARI_DM_THREAD[conversation.id] || [
    { id: "first", from: "them", text: "Ciao! Come posso aiutarti?", when: "10:00" },
  ]);
  const scrollRef = useRefOv(null);

  useEffectOv(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send() {
    if (!text.trim()) return;
    const now = new Date();
    const stamp = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    setMessages(m => [...m, { id: `n${m.length}`, from: "me", text: text.trim(), when: stamp }]);
    setText("");
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "var(--paper-3)",
      display: "flex", flexDirection: "column",
      animation: "pari-slide-up 240ms var(--ease)",
    }}>
      <div className="bb-safe-top" />
      <div className="bb-topbar" style={{ paddingBottom: 10 }}>
        <IconBtn name="back" size={22} color="var(--ink)" onClick={onBack} label="Indietro" />
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          paddingLeft: 4, cursor: "pointer",
        }}>
          <Avatar initials={conversation.initials} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{conversation.name}</div>
            <div style={{ fontSize: 11, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sage)" }} />
              attivo ora
            </div>
          </div>
        </div>
        <IconBtn name="close" size={20} color="var(--ink-80)" onClick={onClose} label="Chiudi" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto",
        padding: "12px 20px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {messages.map((m, i) => {
          const mine = m.from === "me";
          const prev = messages[i-1];
          const sameAuthorPrev = prev && prev.from === m.from;
          return (
            <div key={m.id} style={{
              alignSelf: mine ? "flex-end" : "flex-start",
              maxWidth: "78%",
              display: "flex", flexDirection: "column",
              gap: 2, marginTop: sameAuthorPrev ? 0 : 6,
            }}>
              <div style={{
                padding: "8px 12px",
                background: mine ? "var(--clay)" : "var(--paper)",
                color: mine ? "white" : "var(--ink)",
                borderRadius: mine
                  ? "14px 14px 4px 14px"
                  : "14px 14px 14px 4px",
                fontSize: 13.5, lineHeight: 1.45,
                letterSpacing: "-0.005em",
                border: mine ? "none" : "1px solid var(--ink-08)",
                boxShadow: mine ? "0 1px 2px rgba(70,65,59,0.06)" : "none",
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

      {/* Input bar */}
      <div style={{
        padding: "10px 14px 14px",
        borderTop: "1px solid var(--ink-08)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 9999,
          background: "var(--paper-2)",
        }}>
          <input
            type="text" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Scrivi un messaggio…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "inherit", color: "var(--ink)",
            }}
          />
        </div>
        <button onClick={send} disabled={!text.trim()} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: text.trim() ? "var(--clay)" : "var(--ink-15)",
          border: "none", cursor: text.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 120ms var(--ease)",
        }}>
          <Icon name="send" size={18} color="white" />
        </button>
      </div>

      <style>{`
        @keyframes pari-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   SUPPORT CHAT
   Same shape as DM thread, peer is "Supporto Pari" (admin).
   ============================================================ */
function PariSupportOverlay({ onClose }) {
  const [text, setText] = useStateOv("");
  const [messages, setMessages] = useStateOv([
    { id: "s1", from: "them", text: "Ciao Andrea! Come possiamo aiutarti?", when: "09:30" },
    { id: "s2", from: "me",   text: "Non riesco a vedere le mie prenotazioni passate.", when: "09:31" },
    { id: "s3", from: "them", text: "Diamo un'occhiata. Su quale dispositivo stai usando l'app?", when: "09:32" },
  ]);
  const scrollRef = useRefOv(null);

  useEffectOv(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function send() {
    if (!text.trim()) return;
    const now = new Date();
    const stamp = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    setMessages(m => [...m, { id: `s${m.length}`, from: "me", text: text.trim(), when: stamp }]);
    setText("");
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "var(--paper-3)",
      display: "flex", flexDirection: "column",
      animation: "pari-slide-up 240ms var(--ease)",
    }}>
      <div className="bb-safe-top" />
      <div className="bb-topbar" style={{ paddingBottom: 10 }}>
        <IconBtn name="back" size={22} color="var(--ink)" onClick={onClose} label="Indietro" />
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10, paddingLeft: 4,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--clay-soft)",
            border: "1px solid var(--clay)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon name="help" size={16} color="var(--clay-deep)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em",
            }}>Supporto Pari</div>
            <div style={{ fontSize: 11, color: "var(--sage)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sage)" }} />
              attivo · risponde subito
            </div>
          </div>
        </div>
        <div style={{ width: 22 }} />
      </div>

      {/* Welcome banner */}
      <div style={{
        margin: "10px 20px 0",
        padding: "10px 14px",
        background: "var(--paper)",
        border: "1px solid var(--ink-08)", borderRadius: 12,
        fontSize: 12, color: "var(--ink-60)", lineHeight: 1.5,
      }}>
        Rispondiamo entro 24h. Per emergenze, contatta direttamente il barbiere
        dal suo profilo.
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto",
        padding: "12px 20px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {messages.map((m, i) => {
          const mine = m.from === "me";
          const prev = messages[i-1];
          const sameAuthorPrev = prev && prev.from === m.from;
          return (
            <div key={m.id} style={{
              alignSelf: mine ? "flex-end" : "flex-start",
              maxWidth: "78%",
              display: "flex", flexDirection: "column", gap: 2,
              marginTop: sameAuthorPrev ? 0 : 6,
            }}>
              <div style={{
                padding: "8px 12px",
                background: mine ? "var(--clay)" : "var(--paper)",
                color: mine ? "white" : "var(--ink)",
                borderRadius: mine
                  ? "14px 14px 4px 14px"
                  : "14px 14px 14px 4px",
                fontSize: 13.5, lineHeight: 1.45,
                letterSpacing: "-0.005em",
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
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          padding: "8px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 9999,
          background: "var(--paper-2)",
        }}>
          <input
            type="text" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Scrivi al supporto…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13.5, fontFamily: "inherit", color: "var(--ink)",
            }}
          />
        </div>
        <button onClick={send} disabled={!text.trim()} style={{
          width: 38, height: 38, borderRadius: "50%",
          background: text.trim() ? "var(--clay)" : "var(--ink-15)",
          border: "none", cursor: text.trim() ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="send" size={18} color="white" />
        </button>
      </div>

      <style>{`
        @keyframes pari-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   SHELL — reusable overlay shell for Notifiche + DM list
   ============================================================ */
function PariOverlayShell({ title, headerRight, onClose, children }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "var(--paper-3)",
      display: "flex", flexDirection: "column",
      animation: "pari-slide-up 240ms var(--ease)",
    }}>
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <IconBtn name="back" size={22} color="var(--ink)" onClick={onClose} label="Indietro" />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 18, letterSpacing: "-0.022em",
        }}>{title}</div>
        <div style={{ minWidth: 22, display: "flex", justifyContent: "flex-end" }}>
          {headerRight}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
      <style>{`
        @keyframes pari-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   SHARED EMPTY STATE for overlays
   ============================================================ */
function PariOverlayEmpty({ icon, title, body }) {
  return (
    <div style={{ padding: "56px 32px 32px", textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <Icon name={icon} size={20} color="var(--ink-40)" />
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500,
        fontSize: 18, letterSpacing: "-0.022em", color: "var(--ink)",
      }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55, maxWidth: 280, margin: "6px auto 0" }}>
        {body}
      </div>
    </div>
  );
}

Object.assign(window, {
  PariNotificationsOverlay, PariMessagesOverlay, PariSupportOverlay,
});
