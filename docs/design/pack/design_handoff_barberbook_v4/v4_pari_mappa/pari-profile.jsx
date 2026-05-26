/* Pari · Profilo (cliente) — refined.
   Hero with editable avatar, bio, stat row.
   "Prossimo appuntamento" card prominent at top.
   Seguiti pills horizontal scroll.
   Tab segmented (I tuoi tagli / Storico / Recensioni) with 3-col grid
   of user_posts and an "Aggiungi" tile in the last cell. */

const { useState: useStateProf, useMemo: useMemoProf } = React;

/* ---- Demo data — user_posts (foto del proprio taglio) ---------- */
const PARI_USER_POSTS = [
  { id: "u1", barberId: "1", label: "Skin fade",     when: "12 mar",  hue: 0  },
  { id: "u2", barberId: "4", label: "Taper",         when: "26 feb",  hue: 14 },
  { id: "u3", barberId: "2", label: "Arabic shave",  when: "5 feb",   hue: 28 },
  { id: "u4", barberId: "5", label: "French crop",   when: "21 gen",  hue: 42 },
  { id: "u5", barberId: "1", label: "Skin fade",     when: "8 gen",   hue: 56 },
];

const PARI_PAST_APPOINTMENTS = [
  { d: "ven 12 apr", t: "10:30", b: "Marco Barba",   s: "Skin fade",   initials: "MB", status: "done" },
  { d: "sab 23 mar", t: "16:00", b: "Tariq Khalid",  s: "Taper · Beard", initials: "TK", status: "done" },
  { d: "dom 18 feb", t: "11:00", b: "Marco Barba",   s: "Skin fade",   initials: "MB", status: "done" },
  { d: "ven 5 feb",  t: "14:30", b: "Fadi Nour",     s: "Arabic shave", initials: "FN", status: "cancelled" },
];

const PARI_SAVED_POSTS = [
  { id: "s1", barber: "Marco Barba",    label: "Skin fade · Line up", hue: 0  },
  { id: "s2", barber: "Tariq Khalid",   label: "Taper · Beard",       hue: 14 },
  { id: "s3", barber: "Fadi Nour",      label: "Arabic shave",        hue: 28 },
  { id: "s4", barber: "Luca Barbieri",  label: "French crop",         hue: 42 },
  { id: "s5", barber: "Marco Barba",    label: "Skin fade",           hue: 56 },
  { id: "s6", barber: "Tariq Khalid",   label: "Line up",             hue: 70 },
];

const PARI_REVIEWS = [
  { b: "Marco Barba",  initials: "MB", rating: 5, when: "12 apr", text: "Sempre preciso, capisce dove andare al primo colpo." },
  { b: "Tariq Khalid", initials: "TK", rating: 5, when: "23 mar", text: "Bottega tranquilla, prezzo onesto. Tornerò." },
];

/* ============================================================
   PARI · Screen Profile (CLIENT path)
   For barber/admin we fall back to the existing ScreenProfile.
   ============================================================ */
function PariScreenProfile({ role, onOpenProfile, onOpenBooking, onOpenAppointments, onNewPost }) {
  /* Defer to legacy profile for barber/admin views — those will be
     refined in a separate pass (info salone, tab Post/Recensioni). */
  if (role !== "client") return <ScreenProfile role={role} />;

  const [tab, setTab] = useStateProf("tagli"); // tagli | storico | recensioni
  const followed = (typeof DEMO_BARBERS !== "undefined" ? DEMO_BARBERS : []).slice(0, 4);

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />

      {/* Topbar */}
      <div className="bb-topbar">
        <div className="wordmark" style={{ fontSize: 19 }}>Profilo</div>
        <div className="actions">
          <IconBtn name="share" size={22} color="var(--ink-80)" label="Condividi" />
          <IconBtn name="settings" size={22} color="var(--ink-80)" label="Impostazioni" />
        </div>
      </div>

      {/* Hero — compact, no containing card */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 20px 12px" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar initials="AG" size={64} ring ringColor="var(--sage)" />
          <div style={{
            position: "absolute", right: -2, bottom: -2,
            width: 22, height: 22, borderRadius: "50%",
            background: "var(--ink)",
            border: "2px solid var(--paper-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <Icon name="scissors" size={11} color="var(--paper-3)" />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Pill tone="neutral">Cliente</Pill>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: 22, letterSpacing: "-0.025em", margin: 0, lineHeight: 1.1,
            color: "var(--ink)",
          }}>Andrea Goretti</h1>
          <div style={{
            marginTop: 4, fontSize: 12, color: "var(--ink-60)",
            display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap",
          }}>
            <Icon name="pin" size={11} color="var(--ink-40)" />
            <span>Cagliari</span>
            <span style={{ color: "var(--ink-25)" }}>·</span>
            <span>iscritto a febbraio</span>
          </div>
        </div>
      </div>

      {/* Inline stats — one row, no card */}
      <div style={{
        padding: "0 20px 14px",
        display: "flex", flexWrap: "wrap", gap: 14,
        fontSize: 12, color: "var(--ink-60)",
      }}>
        <span>
          <strong style={{ color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>12</strong> tagli
        </span>
        <span>
          <strong style={{ color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>4</strong> seguiti
        </span>
        <span>
          <strong style={{ color: "var(--ink)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{PARI_SAVED_POSTS.length}</strong> salvati
        </span>
      </div>

      {/* Bio */}
      <div style={{ padding: "0 20px 14px", fontSize: 13.5, color: "var(--ink-80)", lineHeight: 1.55 }}>
        Appassionato di skin fade e barbe corte. Sempre alla ricerca del barbiere giusto.
      </div>

      {/* Edit / Condividi inline */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 8 }}>
        <Button kind="hairline" size="sm" style={{ flex: 1 }}>Modifica</Button>
        <Button kind="hairline" size="sm" style={{ flex: 1 }}>Condividi</Button>
      </div>

      {/* Prossimo appuntamento */}
      <div onClick={() => onOpenAppointments && onOpenAppointments()} style={{
        margin: "0 20px 16px", padding: "12px 14px",
        background: "var(--clay-soft)", border: "1px solid var(--clay-tint)",
        borderRadius: 12, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          minWidth: 56, padding: "6px 4px",
          background: "var(--paper-3)", borderRadius: 10,
          textAlign: "center",
          border: "1px solid var(--clay-tint)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "var(--clay-deep)", textTransform: "uppercase", letterSpacing: "0.04em" }}>sab</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: 1.1, color: "var(--clay-deep)" }}>24</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: "var(--clay-deep)" }}>mag</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10.5, color: "var(--clay-deep)", fontWeight: 500,
            letterSpacing: "0.06em", textTransform: "uppercase",
            marginBottom: 2,
          }}>Prossimo appuntamento</div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: 16, color: "var(--clay-deep)", letterSpacing: "-0.018em",
          }}>Marco Barba</div>
          <div style={{ fontSize: 12.5, color: "var(--clay-deep)", marginTop: 1, opacity: 0.8 }}>
            <span style={{ fontFamily: "var(--font-mono)" }}>10:00</span> · Skin fade · 30 min
          </div>
        </div>
        <Icon name="caret" size={18} color="var(--clay-deep)" />
      </div>

      {/* Seguiti — pills row */}
      <div style={{ padding: "0 20px 10px" }}>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 10,
        }}>
          <div className="bb-eyebrow">Seguiti</div>
          <button style={{
            border: "none", background: "transparent", padding: 0, cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, color: "var(--ink-60)",
          }}>vedi tutti</button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {followed.map(b => (
            <button key={b.id} onClick={() => onOpenProfile && onOpenProfile(b)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 12px 5px 5px",
              background: "var(--paper-2)", border: "1px solid var(--ink-08)",
              borderRadius: 9999, cursor: "pointer",
              fontFamily: "inherit", color: "var(--ink)",
              flexShrink: 0,
            }}>
              <Avatar initials={b.initials} size={28} />
              <span style={{ fontSize: 12.5, fontWeight: 500 }}>{b.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", padding: "10px 20px 0",
        borderBottom: "1px solid var(--ink-08)", marginTop: 10,
      }}>
        {[
          ["tagli",    "I tuoi tagli", PARI_USER_POSTS.length],
          ["storico",  "Storico",       PARI_PAST_APPOINTMENTS.length],
          ["salvati",  "Salvati",       PARI_SAVED_POSTS.length],
        ].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              letterSpacing: "-0.005em",
            }}>
            {l}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10.5,
              color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
              background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
              padding: "0 5px", borderRadius: 9999, fontWeight: 600,
            }}>{n}</span>
            {tab === k && (
              <div style={{
                position: "absolute", left: "20%", right: "20%", bottom: -1,
                height: 2, background: "var(--clay)", borderRadius: 9999,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "tagli" && <PariUserPostsGrid posts={PARI_USER_POSTS} onNewPost={onNewPost} />}
      {tab === "storico" && <PariPastAppointmentsList items={PARI_PAST_APPOINTMENTS} />}
      {tab === "salvati" && <PariSavedGrid posts={PARI_SAVED_POSTS} />}

      <div style={{ height: 24 }} />
    </div>
  );
}

/* ============================================================
   I TUOI TAGLI — 3-col grid + "Aggiungi" tile
   ============================================================ */
function PariUserPostsGrid({ posts, onNewPost }) {
  return (
    <div style={{
      padding: "12px 20px 16px",
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
    }}>
      {posts.map(p => (
        <div key={p.id} style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: `linear-gradient(135deg, hsl(${24 + p.hue}, 22%, 38%) 0%, hsl(${20 + p.hue}, 26%, 22%) 100%)`,
          borderRadius: 6,
          overflow: "hidden",
          cursor: "pointer",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}>
          <div style={{
            padding: "6px 8px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.4))",
            display: "flex", flexDirection: "column", gap: 1,
          }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{p.label}</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9,
              color: "rgba(255,255,255,0.55)",
            }}>{p.when}</span>
          </div>
        </div>
      ))}

      {/* Aggiungi tile */}
      <button onClick={onNewPost} style={{
        aspectRatio: "1 / 1", borderRadius: 6,
        background: "var(--paper-2)",
        border: "1.5px dashed var(--ink-25)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, cursor: "pointer", color: "var(--ink-60)",
        fontFamily: "inherit", padding: 0,
      }}>
        <Icon name="scissors" size={20} color="currentColor" />
        <span style={{ fontSize: 10.5, fontWeight: 500 }}>Aggiungi</span>
      </button>
    </div>
  );
}

/* ============================================================
   STORICO — list of past appointments
   ============================================================ */
function PariPastAppointmentsList({ items }) {
  return (
    <div style={{ padding: "4px 20px 16px" }}>
      {items.map((a, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 0",
          borderBottom: i < items.length - 1 ? "1px solid var(--ink-08)" : "none",
        }}>
          <div style={{
            minWidth: 56, padding: "5px 4px",
            background: "var(--paper-2)", borderRadius: 8,
            textAlign: "center", border: "1px solid var(--ink-08)",
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 500, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{a.d.split(" ")[0]}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, lineHeight: 1.1, color: "var(--ink-80)" }}>{a.d.split(" ")[1]}</div>
            <div style={{ fontSize: 9.5, fontWeight: 500, color: "var(--ink-60)" }}>{a.d.split(" ")[2]}</div>
          </div>
          <Avatar initials={a.initials} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em" }}>{a.b}</div>
            <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>{a.t}</span> · {a.s}
            </div>
          </div>
          {a.status === "done" ? (
            <Button kind="hairline" size="sm">Recensisci</Button>
          ) : (
            <Pill tone="danger">Annullato</Pill>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   SALVATI — 3-col grid of saved posts, no Aggiungi tile
   ============================================================ */
function PariSavedGrid({ posts }) {
  if (posts.length === 0) {
    return (
      <div style={{ padding: "48px 32px 32px", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--paper)", border: "1px solid var(--ink-08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <Icon name="bookmark" size={20} color="var(--ink-40)" />
        </div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 500,
          fontSize: 18, letterSpacing: "-0.022em", color: "var(--ink)",
        }}>Nessun post salvato.</div>
        <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55 }}>
          Salva un post dal Feed per metterlo da parte.
        </div>
      </div>
    );
  }
  return (
    <div style={{
      padding: "12px 20px 16px",
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      gap: 4,
    }}>
      {posts.map(p => (
        <div key={p.id} style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: `linear-gradient(135deg, hsl(${24 + p.hue}, 22%, 38%) 0%, hsl(${20 + p.hue}, 26%, 22%) 100%)`,
          borderRadius: 6, overflow: "hidden", cursor: "pointer",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}>
          <div style={{
            padding: "6px 8px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.45))",
            display: "flex", flexDirection: "column", gap: 1,
          }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500,
              color: "rgba(255,255,255,0.92)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{p.label}</span>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 9,
              color: "rgba(255,255,255,0.55)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{p.barber}</span>
          </div>
          <div style={{
            position: "absolute", top: 6, right: 6,
            width: 18, height: 18, borderRadius: "50%",
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="bookmark" size={10} color="white" weight="fill" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   RECENSIONI — list with star rating + comment
   ============================================================ */
function PariReviewsList({ items }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "48px 32px 32px", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--paper)", border: "1px solid var(--ink-08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <Icon name="star" size={20} color="var(--ink-40)" />
        </div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 500,
          fontSize: 18, letterSpacing: "-0.022em", color: "var(--ink)",
        }}>Nessuna recensione ancora.</div>
        <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55 }}>
          Le tue recensioni appariranno qui dopo aver completato un appuntamento.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 20px 16px" }}>
      {items.map((r, i) => (
        <div key={i} style={{
          padding: "14px 0",
          borderBottom: i < items.length - 1 ? "1px solid var(--ink-08)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials={r.initials} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.015em" }}>{r.b}</div>
              <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "inline-flex", gap: 2 }}>
                  {[1,2,3,4,5].map(n => (
                    <Icon key={n} name="star" size={12}
                      color={n <= r.rating ? "var(--clay)" : "var(--ink-15)"}
                      weight={n <= r.rating ? "fill" : "regular"}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11.5, color: "var(--ink-50)" }}>· {r.when}</span>
              </div>
            </div>
          </div>
          <div style={{
            marginTop: 10, fontSize: 13.5, color: "var(--ink-80)",
            lineHeight: 1.55,
          }}>{r.text}</div>
        </div>
      ))}
    </div>
  );
}

/* Expose to window so pari-prototype-app.jsx can pick it up. */
Object.assign(window, { PariScreenProfile });
