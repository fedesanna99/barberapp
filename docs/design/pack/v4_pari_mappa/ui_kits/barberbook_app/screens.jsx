/* Barberbook · screens.jsx
   Login · Feed · Discover · Profile · Menu */

const { useState: useStateScr, useMemo: useMemoScr } = React;

/* ----- Demo data ----- */
const DEMO_BARBERS = [
  { id: "1", name: "Marco Barba",   initials: "MB", city: "Cagliari centro", rating: 4.9, tags: ["Skin fade","Beard sculpt"], followers: 1240, price: 22, openNow: true,  km: 0.4 },
  { id: "2", name: "Fadi Nour",     initials: "FN", city: "Poetto",          rating: 4.8, tags: ["Arabic shave","Fade"],       followers: 892,  price: 25, openNow: true,  km: 1.2 },
  { id: "3", name: "Nico Testa",    initials: "NT", city: "Is Mirrionis",    rating: 4.7, tags: ["Classic","Texture"],          followers: 567,  price: 20, openNow: false, km: 2.1 },
  { id: "4", name: "Tariq Khalid",  initials: "TK", city: "Villanova",       rating: 4.9, tags: ["Taper","Line up"],            followers: 2103, price: 24, openNow: true,  km: 2.8 },
  { id: "5", name: "Luca Barbieri", initials: "LB", city: "Quartu",          rating: 4.6, tags: ["French crop","Beard"],        followers: 734,  price: 20, openNow: true,  km: 4.5 },
];

const DEMO_POSTS = [
  { id: "p1", barberId: "1", label: "Skin fade · Line up",  caption: "Mid skin fade, hard part, beard sculpt. Prenota direttamente dall'app.", timeAgo: "2 h fa", likes: 312, comments: 18, top: true },
  { id: "p2", barberId: "4", label: "Taper · Beard trim",   caption: "Taper morbido con barba sfumata sotto. Sessione da 45 minuti.", timeAgo: "5 h fa", likes: 198, comments: 11 },
  { id: "p3", barberId: "2", label: "Arabic shave",         caption: "Rasatura tradizionale con razor caldo. Una pratica che vale i suoi 30 minuti.", timeAgo: "8 h fa", likes: 187, comments: 9 },
  { id: "p4", barberId: "5", label: "French crop",          caption: "Crop francese con texture. Cliente abituale, ora ogni tre settimane.", timeAgo: "ieri", likes: 245, comments: 14 },
];

/* Three vertical bars, ink·clay·ink — the Barberbook mark. */
function PoleMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: "block" }}>
      <rect x="14" y="6" width="5" height="36" rx="2.5" fill="var(--ink)"/>
      <rect x="22" y="6" width="5" height="36" rx="2.5" fill="var(--clay)"/>
      <rect x="30" y="6" width="5" height="36" rx="2.5" fill="var(--ink)"/>
    </svg>
  );
}

/* ============================================================
   LOGIN (Welcome + form)
   ============================================================ */
function ScreenLogin({ onLogin }) {
  const [view, setView] = useStateScr("welcome");

  if (view === "welcome") {
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
          <Button kind="filled" size="lg" onClick={() => setView("login")} style={{ width: "100%" }}>Inizia</Button>
          <Button kind="ghost" size="lg" onClick={() => setView("login")} style={{ width: "100%" }}>
            Hai già un account? <span style={{ color: "var(--ink)", fontWeight: 600, marginLeft: 4 }}>Accedi</span>
          </Button>
        </div>
        <div style={{ textAlign: "center", paddingBottom: 18, fontSize: 11.5, color: "var(--ink-40)" }}>
          Continuando accetti i Termini e l'Informativa privacy.
        </div>
      </div>
    );
  }

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
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.025em", margin: 0 }}>
          Bentornato.
        </h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: "var(--ink-60)" }}>
          Accedi con email o con Google.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Email</span>
          <input type="email" defaultValue="andrea@pari.app" style={inputStyle()} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-60)" }}>Password</span>
            <a style={{ fontSize: 12, color: "var(--clay)", textDecoration: "none", cursor: "pointer" }}>Dimenticata?</a>
          </div>
          <input type="password" defaultValue="••••••••••" style={inputStyle()} />
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
        <a onClick={() => onLogin("client")} style={{ color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
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

function inputStyle() {
  return {
    padding: "12px 14px",
    border: "1px solid var(--ink-15)",
    background: "var(--paper-2)",
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--ink)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
}

/* ============================================================
   FEED
   ============================================================ */
function ScreenFeed({ barbers, posts, onOpenBooking, onOpenProfile, onOpenMessages, onOpenNotifications, notifCount = 3, dmCount = 2 }) {
  const byId = Object.fromEntries(barbers.map(b => [b.id, b]));
  const [likes, setLikes] = useStateScr(() => new Set(["p3"]));
  const [saves, setSaves] = useStateScr(() => new Set());

  function toggle(set, setSet, id) {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <div className="wordmark">
          <PoleMark size={32} />
          Pari
        </div>
        <div className="actions">
          <IconBtn name="bell" size={22} color="var(--ink-80)" onClick={onOpenNotifications} badge={notifCount > 0 ? notifCount : null} label="Notifiche" />
          <IconBtn name="send" size={22} color="var(--ink-80)" onClick={onOpenMessages} badge={dmCount > 0 ? dmCount : null} label="Messaggi" />
        </div>
      </div>

      {/* Stories */}
      <div style={{ display: "flex", gap: 14, padding: "4px 20px 18px", overflowX: "auto" }}>
        {barbers.map((b, i) => {
          // Alternate clay & sage rings on top barbers for visual rhythm
          const ringColor = i < 3 ? (i % 2 === 0 ? "var(--clay)" : "var(--sage)") : "transparent";
          return (
            <div key={b.id} onClick={() => onOpenProfile(b)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", minWidth: 58 }}>
              <Avatar initials={b.initials} size={54} ring={i < 3} ringColor={ringColor} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--ink-60)", maxWidth: 58, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.name.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      <Hairline />

      {/* Posts */}
      {posts.map((p, idx) => {
        const b = byId[p.barberId];
        const liked = likes.has(p.id);
        const saved = saves.has(p.id);
        return (
          <article key={p.id} style={{ paddingBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px 12px" }}>
              <div onClick={() => onOpenProfile(b)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }}>
                <Avatar initials={b.initials} size={40} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.015em" }}>{b.name}</span>
                    {p.top && <Pill tone="clay">Top</Pill>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
                    {b.city} · {p.timeAgo}
                  </div>
                </div>
              </div>
              <Button kind="filled" size="sm" onClick={() => onOpenBooking(b)}>Prenota</Button>
            </div>

            <PhotoBlock initials={b.initials} label={p.label} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 6px" }}>
              <IconBtn
                name="heart"
                size={24}
                color={liked ? "var(--rust)" : "var(--ink)"}
                weight={liked ? "fill" : "regular"}
                onClick={() => toggle(likes, setLikes, p.id)}
              />
              <IconBtn name="chat" size={24} color="var(--ink)" />
              <IconBtn name="send" size={24} color="var(--ink)" />
              <div style={{ flex: 1 }} />
              <IconBtn
                name="bookmark"
                size={24}
                color="var(--ink)"
                weight={saved ? "fill" : "regular"}
                onClick={() => toggle(saves, setSaves, p.id)}
              />
            </div>

            <div style={{ padding: "0 20px 4px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {(p.likes + (liked ? 1 : 0)).toLocaleString("it-IT")} mi piace
            </div>
            <div style={{ padding: "4px 20px 4px", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>
              <span style={{ fontWeight: 600, marginRight: 5 }}>{b.name.split(" ")[0].toLowerCase()}</span>
              {p.caption}
            </div>
            <div style={{ padding: "4px 20px 16px", fontSize: 12.5, color: "var(--ink-40)", cursor: "pointer" }}>
              Vedi tutti i {p.comments} commenti
            </div>

            {idx < posts.length - 1 && <Hairline />}
          </article>
        );
      })}

      <div style={{ textAlign: "center", padding: "32px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <ClayRule width={32} />
        <div style={{ fontSize: 12.5, color: "var(--ink-40)" }}>Sei in pari.</div>
      </div>
    </div>
  );
}

/* ============================================================
   DISCOVER
   ============================================================ */
function ScreenDiscover({ barbers, onOpenBooking, onOpenProfile }) {
  const [view, setView] = useStateScr("list");
  const [filter, setFilter] = useStateScr("tutti");

  const filters = [["tutti","Tutti"],["aperti","Aperti ora"],["vicino","Vicino"],["top","Top"]];
  const filtered = barbers.filter(b => {
    if (filter === "aperti") return b.openNow;
    if (filter === "vicino") return b.km <= 2;
    if (filter === "top")    return b.rating >= 4.8;
    return true;
  });

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500 }}>Cerca a</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="pin" size={16} color="var(--clay)" />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.025em" }}>Cagliari</span>
            <Icon name="caretDown" size={14} color="var(--ink-60)" />
          </div>
        </div>
        <div className="actions">
          <IconBtn name="funnel" size={22} color="var(--ink-80)" label="Filtri" />
        </div>
      </div>

      <div style={{ padding: "0 20px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 12, background: "var(--paper-2)",
        }}>
          <Icon name="search" size={18} color="var(--ink-60)" />
          <input
            type="text"
            placeholder="Cerca un barbiere, una via…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, fontFamily: "inherit", color: "var(--ink)" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 20px 14px", overflowX: "auto" }}>
        {filters.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{
              padding: "7px 14px",
              background: filter === k ? "var(--ink)" : "var(--paper-2)",
              color: filter === k ? "var(--linen)" : "var(--ink-80)",
              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
              cursor: "pointer", borderRadius: 9999, whiteSpace: "nowrap",
              border: filter === k ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
            }}
          >{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", padding: "0 20px 16px" }}>
        <div style={{ display: "flex", background: "var(--paper-2)", borderRadius: 10, padding: 3, flex: 1, border: "1px solid var(--ink-08)" }}>
          {[["list","Lista","list"], ["map","Mappa","map"]].map(([k, l, ic]) => (
            <button key={k} onClick={() => setView(k)}
              style={{
                flex: 1, padding: "8px 0",
                background: view === k ? "var(--paper)" : "transparent",
                color: view === k ? "var(--ink)" : "var(--ink-60)",
                border: "none", borderRadius: 8,
                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: view === k ? "0 1px 2px rgba(70,65,59,0.06)" : "none",
              }}
            >
              <Icon name={ic} size={16}/>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <DiscoverMap barbers={filtered.length ? filtered : barbers} onOpenBooking={onOpenBooking} />
      ) : (
        <DiscoverList barbers={filtered} onOpenBooking={onOpenBooking} onOpenProfile={onOpenProfile} />
      )}
    </div>
  );
}

function DiscoverList({ barbers, onOpenBooking, onOpenProfile }) {
  if (barbers.length === 0) {
    return (
      <div style={{ padding: "48px 28px", textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Icon name="search" size={20} color="var(--ink-40)"/>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em" }}>
          Nessun barbiere con questo filtro.
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6 }}>
          Prova a togliere qualche restrizione.
        </div>
      </div>
    );
  }
  return (
    <div>
      {barbers.map((b, i) => (
        <React.Fragment key={b.id}>
          <div onClick={() => onOpenProfile(b)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer" }}>
            <Avatar initials={b.initials} size={54} ring={b.rating >= 4.9} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.015em" }}>{b.name}</span>
                {b.openNow ? <Pill tone="success">Aperto</Pill> : <Pill tone="danger">In pausa</Pill>}
              </div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--ink-60)" }}>
                {b.city} · {b.km.toFixed(1).replace(".", ",")} km
              </div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-60)" }}>
                <Icon name="star" size={12} color="var(--clay)" weight="fill"/>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{b.rating.toFixed(1).replace(".", ",")}</span>
                <span style={{ color: "var(--ink-25)" }}>·</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.tags.join(" · ")}</span>
              </div>
            </div>
            <Button kind="hairline" size="sm" onClick={e => { e.stopPropagation(); onOpenBooking(b); }}>Prenota</Button>
          </div>
          {i < barbers.length - 1 && <Hairline inset={20} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function DiscoverMap({ barbers, onOpenBooking }) {
  const [sel, setSel] = useStateScr(1);
  const selected = barbers[sel] ?? barbers[0];
  const pinPositions = [
    { l: "20%", t: "28%" }, { l: "62%", t: "36%" }, { l: "40%", t: "58%" },
    { l: "76%", t: "62%" }, { l: "30%", t: "78%" },
  ];

  return (
    <div style={{ position: "relative", margin: "0 20px 20px", borderRadius: 16, overflow: "hidden", border: "1px solid var(--ink-08)", height: 500, background: "var(--paper-2)" }}>
      <svg viewBox="0 0 400 500" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="bb-streets" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <line x1="0" y1="24" x2="48" y2="24" stroke="rgba(70,65,59,0.05)" strokeWidth="1" />
            <line x1="24" y1="0" x2="24" y2="48" stroke="rgba(70,65,59,0.03)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="500" fill="url(#bb-streets)" />
        <path d="M0 140 Q200 220 400 120" fill="none" stroke="rgba(70,65,59,0.10)" strokeWidth="2" />
        <path d="M0 320 Q200 260 400 360" fill="none" stroke="rgba(70,65,59,0.08)" strokeWidth="2" />
        <path d="M120 0 L150 500" stroke="rgba(70,65,59,0.06)" strokeWidth="1.5" />
        <path d="M280 0 L300 500" stroke="rgba(70,65,59,0.05)" strokeWidth="1.5" />
        <path d="M0 420 L400 460 L400 500 L0 500 Z" fill="rgba(176,127,97,0.06)" />
      </svg>

      <div style={{
        position: "absolute", left: "48%", top: "44%",
        width: 14, height: 14, borderRadius: "50%",
        background: "var(--sage)",
        boxShadow: "0 0 0 4px rgba(124,140,110,0.22)",
      }} />

      {pinPositions.slice(0, barbers.length).map((p, i) => {
        const b = barbers[i];
        const isSelected = sel === i;
        return (
          <div key={i} onClick={() => setSel(i)}
            style={{
              position: "absolute", left: p.l, top: p.t,
              transform: "translate(-50%, -100%)",
              cursor: "pointer", transition: "transform 180ms var(--ease)",
            }}>
            <div style={{
              width: isSelected ? 40 : 32, height: isSelected ? 40 : 32,
              borderRadius: "50%",
              background: isSelected ? "var(--ink)" : "var(--paper)",
              border: isSelected ? "none" : `2px solid var(--ink)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 10px rgba(70,65,59,0.18)",
              transition: "all 180ms var(--ease)",
            }}>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 700,
                fontSize: isSelected ? 16 : 13,
                color: isSelected ? "var(--linen)" : "var(--ink)",
                letterSpacing: "-0.02em",
              }}>
                {b.initials[0]}
              </span>
            </div>
          </div>
        );
      })}

      {selected && (
        <div style={{
          position: "absolute", left: 12, right: 12, bottom: 12,
          padding: 14, background: "var(--paper)",
          borderRadius: 12, boxShadow: "0 8px 24px rgba(70,65,59,0.15), 0 0 0 1px var(--ink-08)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Avatar initials={selected.initials} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em" }}>{selected.name}</span>
              {selected.openNow && <Pill tone="success">Aperto</Pill>}
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: "var(--ink-60)" }}>
              {selected.city} · {selected.km.toFixed(1).replace(".",",")} km · <span style={{ color: "var(--ink)", fontWeight: 600 }}>{selected.rating.toFixed(1).replace(".",",")}</span>
            </div>
          </div>
          <Button kind="filled" size="sm" onClick={() => onOpenBooking(selected)}>Prenota</Button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROFILE
   ============================================================ */
function ScreenProfile({ role, onOpenSettings }) {
  const [tab, setTab] = useStateScr("appuntamenti");

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <div className="wordmark" style={{ fontSize: 19 }}>Profilo</div>
        <div className="actions">
          <IconBtn name="share" size={22} color="var(--ink-80)" />
          <IconBtn name="settings" size={22} color="var(--ink-80)" onClick={onOpenSettings} />
        </div>
      </div>

      <div style={{ margin: "0 20px 16px", padding: 18, background: "var(--paper)", border: "1px solid var(--ink-08)", borderRadius: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar initials="AG" size={72} ring ringColor="var(--sage)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Pill tone={role === "barber" ? "clay" : "neutral"}>{role === "barber" ? "Barbiere" : "Cliente"}</Pill>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.022em" }}>Andrea Goretti</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 4 }}>
              Cagliari · iscritto a febbraio
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--ink-08)" }}>
          <Stat value="8" label="Tagli" />
          <Stat value="3" label="Barbieri" />
          <Stat value="42" label="Salvati" />
        </div>
      </div>

      <div style={{ display: "flex", padding: "0 20px", borderBottom: "1px solid var(--ink-08)" }}>
        {[["appuntamenti", "Appuntamenti"], ["storico", "Storico"], ["salvati", "Salvati"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "12px 0", border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
            }}
          >
            {l}
            {tab === k && (
              <div style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "var(--clay)", borderRadius: 9999 }} />
            )}
          </button>
        ))}
      </div>

      {tab === "appuntamenti" && (
        <div style={{ padding: "8px 20px 24px" }}>
          {[
            { d: "sab 24 mag", t: "10:00", b: "Marco Barba", s: "Skin fade", initials: "MB" },
            { d: "lun 2 giu",  t: "11:30", b: "Fadi Nour",   s: "Beard trim", initials: "FN" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: i === 0 ? "1px solid var(--ink-08)" : "none" }}>
              <div style={{ minWidth: 64, padding: "8px 6px", background: "var(--paper)", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--ink-60)" }}>{a.d.split(" ")[0]}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: 1.15, color: "var(--ink)" }}>{a.d.split(" ")[1]}</div>
                <div style={{ fontSize: 10.5, fontWeight: 500, color: "var(--ink-60)" }}>{a.d.split(" ")[2]}</div>
              </div>
              <Avatar initials={a.initials} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.015em" }}>{a.b}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 2 }}>
                  {a.t} · {a.s} · 30 min
                </div>
              </div>
              <IconBtn name="caret" size={18} color="var(--ink-40)" />
            </div>
          ))}
        </div>
      )}

      {tab === "storico" && (
        <div style={{ padding: "8px 20px 24px" }}>
          {[
            { d: "12 mag", b: "Marco Barba", s: "Skin fade", initials: "MB" },
            { d: "28 apr", b: "Fadi Nour",   s: "Arabic shave", initials: "FN" },
            { d: "10 apr", b: "Marco Barba", s: "Skin fade", initials: "MB" },
            { d: "22 mar", b: "Nico Testa",  s: "Classic cut", initials: "NT" },
          ].map((h, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none" }}>
              <Avatar initials={h.initials} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{h.b}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 2 }}>{h.s}</div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-60)" }}>{h.d}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "salvati" && (
        <div style={{ padding: "12px 20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[0,1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{
                aspectRatio: "1 / 1",
                background: `linear-gradient(${135 + i * 12}deg, #5A4D40 0%, #2E2820 100%)`,
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "rgba(237,233,225,0.10)" }}>{(i + 1).toString().padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MENU
   ============================================================ */
function ScreenMenu({ role, onChangeRole, onLogout, onOpenMessages, onOpenNotifications }) {
  const items = [
    ["bookmark", "Post salvati", null],
    ["heart",    "Post che ti piacciono", null],
    ["chat",     "Messaggi", onOpenMessages, 2],
    ["bell",     "Notifiche", onOpenNotifications, 3],
    ["calendar", "Appuntamenti", null],
    ["help",     "Supporto", null],
  ];

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <div className="wordmark" style={{ fontSize: 19 }}>Menu</div>
      </div>

      <div style={{ margin: "4px 20px 16px", padding: "14px 16px", background: "var(--paper)", border: "1px solid var(--ink-08)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--clay-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="refresh" size={18} color="var(--clay-deep)"/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-60)" }}>Modalità demo</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
            Stai usando l'app come <strong>{role === "barber" ? "barbiere" : "cliente"}</strong>.
          </div>
        </div>
        <Button kind="hairline" size="sm" onClick={onChangeRole}>Cambia</Button>
      </div>

      <Hairline />

      <div style={{ padding: "8px 0" }}>
        {items.map(([icon, label, action, badge], i) => (
          <React.Fragment key={label}>
            <div onClick={action ?? (() => {})} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: action ? "pointer" : "default" }}>
              <Icon name={icon} size={22} color="var(--ink-80)" style={{ width: 24 }}/>
              <span style={{ flex: 1, fontSize: 14.5 }}>{label}</span>
              {badge != null && (
                <span style={{
                  minWidth: 20, height: 20, padding: "0 6px",
                  borderRadius: 9999, background: "var(--clay)", color: "var(--paper-2)",
                  fontSize: 11, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{badge}</span>
              )}
              <Icon name="caret" size={16} color="var(--ink-40)"/>
            </div>
            {i < items.length - 1 && <Hairline inset={20} />}
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: "24px 20px 8px" }}>
        <Button kind="danger" onClick={onLogout} style={{ width: "100%" }}>Esci</Button>
      </div>

      <div style={{ textAlign: "center", padding: "16px 20px 24px", fontSize: 11, color: "var(--ink-40)" }}>
        Pari · v1.0 · Cagliari
      </div>
    </div>
  );
}

Object.assign(window, {
  ScreenLogin, ScreenFeed, ScreenDiscover, ScreenProfile, ScreenMenu,
  DEMO_BARBERS, DEMO_POSTS, PoleMark,
});
