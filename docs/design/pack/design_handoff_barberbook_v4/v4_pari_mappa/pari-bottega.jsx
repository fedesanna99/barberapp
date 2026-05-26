/* Pari · Bottega (barbiere dashboard).
   Tab Prenotazioni / Disponibilità.
   Prenotazioni: stato bottega (vacanza + auto-accept), filter chips,
   realtime indicator, list grouped by day with per-row actions
   (Conferma / Rifiuta / Segna fatto / Annulla).
   Disponibilità: weekly grid, slot duration + base price, per-day
   open/close, optional lunch break. */

const { useState: useStateBot, useMemo: useMemoBot, useEffect: useEffectBot } = React;

/* ============================================================
   DEMO DATA — what the logged-in barber sees in their bottega.
   In production this is realtime from supabase.bookings filtered
   by barber_id with subscription. Each row carries enough metadata
   to render service + price + duration without joining.
   ============================================================ */
const PARI_BOTTEGA_BOOKINGS = [
  { id: "b1", time: "10:00", day: "Oggi",    dateLabel: "24 maggio", client: "Andrea Goretti", initials: "AG", service: "Skin fade",       duration: 30, price: 22, status: "pending"   },
  { id: "b2", time: "11:00", day: "Oggi",    dateLabel: "24 maggio", client: "Luca Marchi",    initials: "LM", service: "Taglio classico", duration: 30, price: 22, status: "confirmed", confirmedAgo: "2h fa" },
  { id: "b3", time: "14:30", day: "Oggi",    dateLabel: "24 maggio", client: "Giovanni B.",    initials: "GB", service: "Taglio + barba",  duration: 60, price: 38, status: "confirmed", confirmedAgo: "5h fa" },
  { id: "b4", time: "16:00", day: "Oggi",    dateLabel: "24 maggio", client: "Pietro C.",      initials: "PC", service: "Beard sculpt",    duration: 20, price: 15, status: "pending"   },
  { id: "b5", time: "09:30", day: "Domani",  dateLabel: "25 maggio", client: "Stefano V.",     initials: "SV", service: "Beard sculpt",    duration: 20, price: 15, status: "pending"   },
  { id: "b6", time: "11:00", day: "Domani",  dateLabel: "25 maggio", client: "Davide N.",      initials: "DN", service: "Taglio classico", duration: 30, price: 22, status: "pending"   },
  { id: "b7", time: "15:00", day: "Domani",  dateLabel: "25 maggio", client: "Alessio T.",     initials: "AT", service: "Skin fade",       duration: 45, price: 28, status: "confirmed", confirmedAgo: "ieri" },
  { id: "b8", time: "10:00", day: "Lun 27",  dateLabel: "27 maggio", client: "Fabio R.",       initials: "FR", service: "Taglio + barba",  duration: 60, price: 38, status: "confirmed", confirmedAgo: "1g fa" },
];

const PARI_BOTTEGA_HISTORY = [
  { id: "h1", time: "10:30", day: "Ieri",      dateLabel: "23 maggio", client: "Marco P.",     initials: "MP", service: "Skin fade",       duration: 30, price: 22, status: "done"     },
  { id: "h2", time: "14:00", day: "Ieri",      dateLabel: "23 maggio", client: "Andrea G.",    initials: "AG", service: "Taglio classico", duration: 30, price: 22, status: "done"     },
  { id: "h3", time: "11:00", day: "Mer 22",    dateLabel: "22 maggio", client: "Luca M.",      initials: "LM", service: "Beard sculpt",    duration: 20, price: 15, status: "cancelled" },
  { id: "h4", time: "16:30", day: "Mer 22",    dateLabel: "22 maggio", client: "Davide N.",    initials: "DN", service: "Taglio + barba",  duration: 60, price: 38, status: "declined" },
];

/* Weekly availability template — light defaults. The user can toggle days
   off and edit times. In production we round-trip these to
   `availability` table via useAvailabilitySettings. */
const PARI_DEFAULT_WEEK = [
  { day: "Lunedì",    short: "lun", on: true,  open: "09:00", close: "19:30", lunch: ["13:00", "14:00"] },
  { day: "Martedì",   short: "mar", on: true,  open: "09:00", close: "19:30", lunch: ["13:00", "14:00"] },
  { day: "Mercoledì", short: "mer", on: true,  open: "09:00", close: "19:30", lunch: ["13:00", "14:00"] },
  { day: "Giovedì",   short: "gio", on: true,  open: "09:00", close: "19:30", lunch: ["13:00", "14:00"] },
  { day: "Venerdì",   short: "ven", on: true,  open: "09:00", close: "20:00", lunch: ["13:00", "14:00"] },
  { day: "Sabato",    short: "sab", on: true,  open: "09:00", close: "13:00", lunch: null               },
  { day: "Domenica",  short: "dom", on: false, open: "09:00", close: "19:30", lunch: null               },
];

/* ============================================================
   STATUS COMPONENTS — small reused styles for the booking rows
   ============================================================ */
function StatusPill({ status }) {
  const map = {
    pending:   { tone: "clay-soft", label: "In attesa" },
    confirmed: { tone: "sage",      label: "Confermato" },
    done:      { tone: "neutral",   label: "Completato" },
    cancelled: { tone: "neutral",   label: "Annullato" },
    declined:  { tone: "danger",    label: "Rifiutato" },
  };
  const c = map[status] ?? map.pending;
  return <Pill tone={c.tone}>{c.label}</Pill>;
}

/* Pill helper that supports our custom tone keys.
   Falls back to design-system Pill when the tone is one we own. */
function PillSafe({ tone, children }) {
  // The bundled Pill primitive handles success/danger/clay/neutral. We add
  // 'clay-soft' as a tonal variant for "pending" status.
  if (tone === "clay-soft") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center",
        padding: "2px 8px", borderRadius: 9999,
        background: "var(--clay-soft)", color: "var(--clay-deep)",
        fontFamily: "var(--font-body)", fontSize: 10.5, fontWeight: 600,
        letterSpacing: "0", textTransform: "none",
      }}>{children}</span>
    );
  }
  return <Pill tone={tone}>{children}</Pill>;
}

/* ============================================================
   PARI · BOTTEGA SCREEN
   ============================================================ */
function PariScreenBottega({ onOpenInfo }) {
  const [tab, setTab]                       = useStateBot("prenotazioni"); // prenotazioni | disponibilita
  const [acceptingBookings, setAccepting]   = useStateBot(true);
  const [autoAccept, setAutoAccept]         = useStateBot(false);
  const [filter, setFilter]                 = useStateBot("arrivo"); // arrivo | confermati | storico
  const [tick, setTick]                     = useStateBot(0); // forces "live" indicator to feel alive

  /* Bump tick every 30s so the realtime indicator's "ultimo update X fa"
     stays vaguely truthful. Not strictly needed for the demo, but it
     makes the surface feel alive when you sit on it for a while. */
  useEffectBot(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const filteredBookings = useMemoBot(() => {
    if (filter === "arrivo")     return PARI_BOTTEGA_BOOKINGS.filter(b => b.status === "pending");
    if (filter === "confermati") return PARI_BOTTEGA_BOOKINGS.filter(b => b.status === "confirmed");
    if (filter === "storico")    return PARI_BOTTEGA_HISTORY;
    return PARI_BOTTEGA_BOOKINGS;
  }, [filter]);

  const counts = useMemoBot(() => ({
    arrivo:     PARI_BOTTEGA_BOOKINGS.filter(b => b.status === "pending").length,
    confermati: PARI_BOTTEGA_BOOKINGS.filter(b => b.status === "confirmed").length,
    storico:    PARI_BOTTEGA_HISTORY.length,
  }), []);

  /* Group bookings by `day` so each section can render its own header. */
  const grouped = useMemoBot(() => {
    const byDay = {};
    filteredBookings.forEach(b => {
      if (!byDay[b.day]) byDay[b.day] = { dateLabel: b.dateLabel, items: [] };
      byDay[b.day].items.push(b);
    });
    return Object.entries(byDay);
  }, [filteredBookings]);

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />

      {/* Topbar */}
      <div className="bb-topbar">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500 }}>Bottega</span>
          <span style={{
            fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22,
            letterSpacing: "-0.025em", color: "var(--ink)",
          }}>Marco Barba</span>
        </div>
        <div className="actions">
          <IconBtn name="refresh" size={20} color="var(--ink-80)" label="Aggiorna" />
          <IconBtn name="settings" size={20} color="var(--ink-80)" onClick={onOpenInfo} label="Info salone" />
        </div>
      </div>

      {/* Vacanza banner — only when bottega is closed for vacation */}
      {!acceptingBookings && (
        <div style={{
          margin: "0 20px 12px",
          padding: "10px 12px",
          background: "var(--rust-soft)", border: "1px solid var(--rust)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: "50%",
            background: "var(--rust)", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 11, fontWeight: 600,
          }}>!</div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--rust)", lineHeight: 1.4 }}>
            <strong style={{ fontWeight: 600, display: "block" }}>Bottega chiusa.</strong>
            Nessuno può prenotare. Riattiva quando torni.
          </div>
        </div>
      )}

      {/* Stato bottega — two toggles, side-by-side */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 8, padding: "0 20px 14px",
      }}>
        <BottegaToggleCard
          label="Bottega"
          on={acceptingBookings}
          onChange={setAccepting}
          onText="Aperta"
          offText="Chiusa"
        />
        <BottegaToggleCard
          label="Auto-accetta"
          on={autoAccept}
          onChange={setAutoAccept}
          onText="Sì"
          offText="No"
        />
      </div>

      {/* Tab segmented control */}
      <div style={{
        display: "flex", padding: "0 20px 0",
        borderBottom: "1px solid var(--ink-08)",
      }}>
        {[
          ["prenotazioni",   "Prenotazioni",   counts.arrivo],
          ["disponibilita",  "Disponibilità",  null],
        ].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              letterSpacing: "-0.005em",
            }}>
            {l}
            {n != null && n > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10.5,
                color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
                background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
                padding: "0 5px", borderRadius: 9999, fontWeight: 600,
              }}>{n}</span>
            )}
            {tab === k && (
              <div style={{
                position: "absolute", left: "20%", right: "20%", bottom: -1,
                height: 2, background: "var(--clay)", borderRadius: 9999,
              }} />
            )}
          </button>
        ))}
      </div>

      {tab === "prenotazioni" && (
        <React.Fragment>
          {/* Filter chips + live indicator */}
          <div style={{
            padding: "12px 20px 14px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ display: "flex", gap: 6, flex: 1, overflowX: "auto" }}>
              {[
                ["arrivo",     `In arrivo · ${counts.arrivo}`],
                ["confermati", `Confermati · ${counts.confermati}`],
                ["storico",    `Storico · ${counts.storico}`],
              ].map(([k, l]) => {
                const active = filter === k;
                return (
                  <button key={k} onClick={() => setFilter(k)}
                    style={{
                      padding: "6px 12px",
                      background: active ? "var(--ink)" : "var(--paper-2)",
                      color: active ? "var(--linen)" : "var(--ink-80)",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                      cursor: "pointer", borderRadius: 9999,
                      whiteSpace: "nowrap", flexShrink: 0,
                      border: active ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                    }}>{l}</button>
                );
              })}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10.5, color: "var(--sage)",
              fontWeight: 500, whiteSpace: "nowrap",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--sage)",
                boxShadow: "0 0 0 3px rgba(124,140,110,0.22)",
                animation: "pari-pulse 2s var(--ease) infinite",
              }} />
              dal vivo
            </div>
          </div>

          {/* Grouped bookings list */}
          {grouped.length === 0 ? (
            <BottegaEmpty filter={filter} />
          ) : (
            <div style={{ padding: "0 0 20px" }}>
              {grouped.map(([day, group]) => (
                <BottegaBookingGroup key={day} day={day} dateLabel={group.dateLabel} items={group.items} />
              ))}
            </div>
          )}
        </React.Fragment>
      )}

      {tab === "disponibilita" && (
        <BottegaAvailability />
      )}

      {/* keyframes for the live dot */}
      <style>{`
        @keyframes pari-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(124,140,110,0.22); }
          50%      { box-shadow: 0 0 0 6px rgba(124,140,110,0.04); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   TOGGLE CARDS — used for the two stato bottega toggles.
   ============================================================ */
function BottegaToggleCard({ label, on, onChange, onText, offText }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 12px",
      background: "var(--paper)", border: "1px solid var(--ink-08)",
      borderRadius: 10, cursor: "pointer",
      fontFamily: "inherit", textAlign: "left",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10.5, color: "var(--ink-50)",
          letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500,
        }}>{label}</div>
        <div style={{
          fontSize: 14, fontWeight: 600, marginTop: 2,
          color: on ? "var(--ink)" : "var(--ink-60)",
          letterSpacing: "-0.015em",
        }}>
          {on ? onText : offText}
        </div>
      </div>
      <ToggleSwitch on={on} />
    </button>
  );
}

function ToggleSwitch({ on }) {
  return (
    <div style={{
      width: 32, height: 18, borderRadius: 9999,
      background: on ? "var(--sage)" : "var(--ink-15)",
      position: "relative", flexShrink: 0,
      transition: "background 160ms var(--ease)",
    }}>
      <div style={{
        position: "absolute",
        top: 2, left: on ? 16 : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: "var(--paper-3)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
        transition: "left 200ms var(--ease)",
      }} />
    </div>
  );
}

/* ============================================================
   BOOKING GROUP — section per day
   ============================================================ */
function BottegaBookingGroup({ day, dateLabel, items }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        padding: "10px 20px 8px",
        display: "flex", alignItems: "baseline", gap: 8,
      }}>
        <span className="bb-eyebrow">{day}</span>
        <span style={{ fontSize: 11, color: "var(--ink-40)" }}>· {dateLabel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 20px" }}>
        {items.map(b => <BottegaBookingRow key={b.id} b={b} />)}
      </div>
    </div>
  );
}

function BottegaBookingRow({ b }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--ink-08)",
      borderRadius: 12, padding: 14,
      display: "flex", gap: 14, alignItems: "stretch",
    }}>
      {/* Left time column */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minWidth: 56,
        paddingRight: 14,
        borderRight: "1px solid var(--ink-08)",
      }}>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 22, letterSpacing: "-0.022em", color: "var(--ink)",
          lineHeight: 1,
        }}>{b.time}</span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10,
          color: "var(--ink-50)", marginTop: 4,
        }}>{b.duration} min</span>
      </div>

      {/* Right content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, minWidth: 0,
        }}>
          <Avatar initials={b.initials} size={26} />
          <span style={{
            fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--ink)",
            flex: 1, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{b.client}</span>
          <PillSafe tone={
            b.status === "pending"   ? "clay-soft" :
            b.status === "confirmed" ? "success"  :
            b.status === "done"      ? "neutral"  :
            b.status === "cancelled" ? "neutral"  :
            "danger"
          }>
            {{
              pending: "In attesa",
              confirmed: "Confermato",
              done: "Completato",
              cancelled: "Annullato",
              declined: "Rifiutato",
            }[b.status]}
          </PillSafe>
        </div>

        <div style={{ fontSize: 12, color: "var(--ink-60)", display: "flex", gap: 6, alignItems: "center" }}>
          <span>{b.service}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>€ {b.price}</span>
        </div>

        {/* Per-status actions */}
        {b.status === "pending" && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <Button kind="hairline" size="sm" style={{ flex: 1 }}>Rifiuta</Button>
            <Button kind="clay" size="sm" style={{ flex: 1 }}>Conferma</Button>
          </div>
        )}
        {b.status === "confirmed" && b.day === "Oggi" && (
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <Button kind="hairline" size="sm" style={{ flex: 1 }}>Annulla</Button>
            <Button kind="filled" size="sm" style={{ flex: 1 }}>Segna fatto</Button>
          </div>
        )}
        {b.status === "confirmed" && b.day !== "Oggi" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginTop: 2, fontSize: 11.5, color: "var(--ink-50)",
          }}>
            <Icon name="clock" size={11} color="var(--sage)" />
            <span>Confermato {b.confirmedAgo}</span>
            <button style={{
              marginLeft: "auto",
              border: "none", background: "transparent", padding: 0, cursor: "pointer",
              fontFamily: "inherit", fontSize: 11.5,
              color: "var(--ink-60)", textDecoration: "underline",
            }}>annulla</button>
          </div>
        )}
        {b.status === "done" && (
          <div style={{
            marginTop: 2, fontSize: 11.5, color: "var(--ink-50)",
          }}>Pagato · €{b.price}</div>
        )}
        {(b.status === "cancelled" || b.status === "declined") && (
          <div style={{
            marginTop: 2, fontSize: 11.5, color: "var(--ink-50)",
          }}>
            {b.status === "cancelled" ? "Cliente ha annullato" : "Hai rifiutato"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE per filter
   ============================================================ */
function BottegaEmpty({ filter }) {
  const config = filter === "arrivo" ? {
    title: "Nessuna prenotazione in arrivo.",
    body:  "Le nuove richieste appariranno qui in tempo reale.",
  } : filter === "confermati" ? {
    title: "Nessun appuntamento confermato.",
    body:  "Conferma le richieste in arrivo per vederle qui.",
  } : {
    title: "Storico vuoto.",
    body:  "Gli appuntamenti completati e annullati appariranno qui.",
  };
  return (
    <div style={{ padding: "48px 32px 32px", textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <Icon name="calendar" size={20} color="var(--ink-40)" />
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500,
        fontSize: 18, letterSpacing: "-0.022em", color: "var(--ink)",
      }}>{config.title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55, maxWidth: 280, margin: "6px auto 0" }}>
        {config.body}
      </div>
    </div>
  );
}

/* ============================================================
   DISPONIBILITÀ TAB — weekly grid + defaults card
   ============================================================ */
function BottegaAvailability() {
  const [week, setWeek] = useStateBot(PARI_DEFAULT_WEEK);
  const [slotMin, setSlotMin] = useStateBot(30);
  const [basePrice, setBasePrice] = useStateBot(22);
  const [editing, setEditing] = useStateBot(null);

  function toggleDay(i) {
    setWeek(w => w.map((d, idx) => idx === i ? { ...d, on: !d.on } : d));
  }

  return (
    <div style={{ padding: "14px 20px 24px" }}>
      {/* Defaults card */}
      <div style={{
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        borderRadius: 12, padding: "4px 14px",
      }}>
        {[
          { label: "Durata appuntamento", value: `${slotMin} min`, hint: "ogni quanto si apre uno slot" },
          { label: "Prezzo base",          value: `€ ${basePrice}`, hint: "modificabile per servizio" },
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none",
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{row.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-50)", marginTop: 2 }}>{row.hint}</div>
            </div>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 10px",
              background: "var(--paper-2)", border: "1px solid var(--ink-08)",
              borderRadius: 9999, cursor: "pointer",
              fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 12,
              color: "var(--ink)",
            }}>
              {row.value}
              <Icon name="caretDown" size={11} color="var(--ink-60)" />
            </button>
          </div>
        ))}
      </div>

      <div style={{ height: 18 }} />

      {/* Weekly grid */}
      <div className="bb-eyebrow" style={{ marginBottom: 10 }}>Settimana tipo</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {week.map((d, i) => (
          <div key={d.short} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderBottom: i < week.length - 1 ? "1px solid var(--ink-08)" : "none",
          }}>
            <button onClick={() => toggleDay(i)} style={{
              border: "none", background: "transparent", padding: 0, cursor: "pointer",
              display: "inline-flex",
            }}>
              <ToggleSwitch on={d.on} />
            </button>
            <div style={{
              fontSize: 13.5, fontWeight: 600,
              color: d.on ? "var(--ink)" : "var(--ink-40)",
              letterSpacing: "-0.015em",
              minWidth: 84,
            }}>{d.day}</div>
            {d.on ? (
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 12.5,
                  color: "var(--ink-80)",
                }}>{d.open} — {d.close}</div>
                {d.lunch && (
                  <div style={{ fontSize: 10.5, color: "var(--ink-50)" }}>
                    pausa {d.lunch[0]}–{d.lunch[1]}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ink-40)" }}>
                chiuso
              </div>
            )}
            <button onClick={() => setEditing(editing === i ? null : i)} style={{
              border: "none", background: "transparent", padding: "4px 6px", cursor: "pointer",
              color: "var(--ink-60)", display: "inline-flex",
            }}>
              <Icon name="settings" size={16} color="currentColor" />
            </button>
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />

      <Button kind="filled" size="lg" style={{ width: "100%" }}>
        Salva modifiche
      </Button>

      <div style={{
        marginTop: 10, fontSize: 11.5, color: "var(--ink-50)",
        textAlign: "center", lineHeight: 1.5,
      }}>
        I clienti vedranno gli slot disponibili in base a queste regole.
      </div>
    </div>
  );
}

/* Expose to window. */
Object.assign(window, { PariScreenBottega });
