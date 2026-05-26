/* Pari · BookingSheet — refined.
   Multi-service selector (radio cards), date strip + slot grid,
   step "conferma" with summary, optional notes field, and the
   spec's error codes (23P01 / 23514) reachable via a small
   "Simula errore" affordance so all error toasts are demo-able. */

const { useState: useStateB, useMemo: useMemoB } = React;

/* ---- date / slot helpers --------------------------------------- */
const PARI_GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const PARI_MESI   = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function pariNext7Days() {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      label: i === 0 ? "oggi" : i === 1 ? "domani" : PARI_GIORNI[(d.getDay() + 6) % 7],
      num:   d.getDate(),
      mese:  PARI_MESI[d.getMonth()],
      date:  d,
    });
  }
  return out;
}

const PARI_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "17:00",
];
const PARI_TAKEN = new Set(["09:30", "11:30", "14:30"]);

/* ---- services. In production these come from barbers.services.
        Multiple options per barber, with duration and price. ----- */
const PARI_SERVICES_DEFAULT = [
  { id: "classico",  name: "Taglio classico", duration: 30, price: 22 },
  { id: "skin-fade", name: "Skin fade",       duration: 45, price: 28 },
  { id: "beard",     name: "Beard sculpt",    duration: 20, price: 15 },
  { id: "completo",  name: "Taglio + barba",  duration: 60, price: 38 },
];

function pariServicesFor(barber) {
  /* Use the barber's tags as a hint, but always provide 3-4 options
     so the picker has weight. Re-price slightly based on barber.price. */
  const base = barber.price ?? 22;
  return [
    { id: "classico",  name: "Taglio classico", duration: 30, price: base },
    { id: "skin-fade", name: "Skin fade",       duration: 45, price: base + 6 },
    { id: "beard",     name: "Beard sculpt",    duration: 20, price: Math.max(12, base - 7) },
    { id: "completo",  name: "Taglio + barba",  duration: 60, price: base + 16 },
  ];
}

/* ---- error catalog (matches §3.6 of the spec) ------------------ */
const PARI_ERRORS = {
  "23P01":   { title: "Slot non più disponibile.", message: "Qualcun altro ha appena prenotato. Scegli un altro orario." },
  "23514":   { title: "Non puoi prenotare con te stesso.", message: "Cambia barbiere per continuare." },
  "generic": { title: "Qualcosa è andato storto.", message: "Riprova fra un momento." },
};

/* ============================================================
   PARI · BookingSheet
   ============================================================ */
function PariBookingSheet({ barber, onClose, onConfirm }) {
  const dates = useMemoB(() => pariNext7Days(), []);
  const services = useMemoB(() => pariServicesFor(barber), [barber]);

  const [selDate, setSelDate]       = useStateB(0);
  const [selTime, setSelTime]       = useStateB(null);
  const [selService, setSelService] = useStateB(services[0].id);
  const [step, setStep]             = useStateB("datetime");
  const [notes, setNotes]           = useStateB("");
  const [error, setError]           = useStateB(null);   // null | "23P01" | "23514" | "generic"
  const [submitting, setSubmitting] = useStateB(false);

  const date    = dates[selDate];
  const service = services.find(s => s.id === selService) ?? services[0];

  function fakeConfirm(simulateError = null) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    /* In production this is a Supabase insert that can fail with 23P01
       / 23514 — see spec §3.6. We simulate the round-trip with a small
       delay so the UI affordances feel real. */
    setTimeout(() => {
      setSubmitting(false);
      if (simulateError) { setError(simulateError); return; }
      onConfirm(barber, date, selTime, service);
    }, simulateError ? 280 : 420);
  }

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "94%" }}>
        <div className="bb-sheet__handle" />

        {step === "datetime" ? (
          <React.Fragment>
            {/* Header */}
            <div style={{
              padding: "0 20px 4px",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Prenota un appuntamento</div>
                <h2 style={{
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: 24, letterSpacing: "-0.025em", margin: "4px 0 0",
                }}>con {barber.name}</h2>
                <div style={{
                  fontSize: 13, color: "var(--ink-60)", marginTop: 6,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Icon name="pin" size={14} color="var(--clay)" />
                  {barber.city}
                  <span style={{ color: "var(--ink-25)" }}>·</span>
                  <Icon name="star" size={12} color="var(--clay)" weight="fill" />
                  <span style={{ fontWeight: 600 }}>{barber.rating?.toFixed?.(1).replace(".", ",") ?? "—"}</span>
                </div>
              </div>
              <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
            </div>

            {/* Service selector */}
            <div style={{
              padding: "16px 20px 8px",
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
            }}>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 16, letterSpacing: "-0.018em",
              }}>Scegli il servizio</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>
                {services.length} disponibili
              </span>
            </div>
            <div style={{ padding: "0 20px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
              {services.map(s => {
                const active = selService === s.id;
                return (
                  <button key={s.id} onClick={() => setSelService(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: active ? "var(--clay-soft)" : "var(--paper-2)",
                      border: active ? "1px solid var(--clay)" : "1px solid var(--ink-08)",
                      borderRadius: 12, cursor: "pointer",
                      fontFamily: "inherit", textAlign: "left",
                      transition: "all 120ms var(--ease)",
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: active ? "5px solid var(--clay)" : "1.5px solid var(--ink-25)",
                      background: "var(--paper-3)",
                      flexShrink: 0, boxSizing: "border-box",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: active ? "var(--clay-deep)" : "var(--ink)",
                        letterSpacing: "-0.015em",
                      }}>{s.name}</div>
                      <div style={{
                        fontSize: 12, marginTop: 2,
                        color: active ? "var(--clay-deep)" : "var(--ink-60)",
                        opacity: active ? 0.7 : 1,
                      }}>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{s.duration} min</span>
                      </div>
                    </div>
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600, fontSize: 15,
                      color: active ? "var(--clay-deep)" : "var(--ink)",
                    }}>€ {s.price}</div>
                  </button>
                );
              })}
            </div>

            {/* Date strip */}
            <div style={{
              padding: "0 20px 10px",
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
            }}>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 16, letterSpacing: "-0.018em",
              }}>Scegli la data</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>prossimi 7 giorni</span>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0 20px 22px", overflowX: "auto" }}>
              {dates.map((d, i) => {
                const sel = selDate === i;
                return (
                  <button key={i} onClick={() => { setSelDate(i); setSelTime(null); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      padding: "10px 14px", minWidth: 56, cursor: "pointer",
                      background: sel ? "var(--ink)" : "var(--paper-2)",
                      color: sel ? "var(--linen)" : "var(--ink)",
                      border: sel ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                      borderRadius: 10, flexShrink: 0,
                      fontFamily: "inherit",
                      transition: "background 120ms var(--ease)",
                    }}>
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.7 }}>{d.label}</span>
                    <span style={{
                      fontFamily: "var(--font-display)", fontWeight: 600,
                      fontSize: 22, lineHeight: 1.15, marginTop: 2, letterSpacing: "-0.022em",
                    }}>{d.num}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.6, marginTop: 1 }}>{d.mese}</span>
                  </button>
                );
              })}
            </div>

            {/* Slot grid */}
            <div style={{
              padding: "0 20px 10px",
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
            }}>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 16, letterSpacing: "-0.018em",
              }}>Orario</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>
                {PARI_SLOTS.length - PARI_TAKEN.size} liberi su {PARI_SLOTS.length}
              </span>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8, padding: "0 20px 22px",
            }}>
              {PARI_SLOTS.map(t => {
                const taken = PARI_TAKEN.has(t);
                const sel = selTime === t;
                return (
                  <button key={t} disabled={taken}
                    onClick={() => !taken && setSelTime(t)}
                    style={{
                      padding: "12px 0", textAlign: "center",
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500,
                      border: sel ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                      background: sel ? "var(--ink)" : "var(--paper-2)",
                      color: sel ? "var(--linen)" : taken ? "var(--ink-40)" : "var(--ink)",
                      textDecoration: taken ? "line-through" : "none",
                      borderRadius: 10, cursor: taken ? "not-allowed" : "pointer",
                      transition: "background 120ms var(--ease)",
                    }}>{t}</button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: "0 20px 18px" }}>
              <Button kind="filled" size="lg"
                disabled={selTime === null}
                onClick={() => selTime && setStep("confirm")}
                style={{ width: "100%" }}>
                {selTime ? `Continua — ${selTime}` : "Scegli un orario"}
              </Button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {/* Confirm step */}
            <div style={{
              padding: "0 20px 4px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <IconBtn name="back" size={20} color="var(--ink-60)"
                onClick={() => { setStep("datetime"); setError(null); }}
                label="Indietro" />
              <div style={{ flex: 1, fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>
                Conferma
              </div>
              <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
            </div>

            <h2 style={{
              fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: 26, letterSpacing: "-0.025em", margin: "10px 20px 4px",
            }}>Tutto a posto?</h2>
            <p style={{ margin: "0 20px 18px", fontSize: 13, color: "var(--ink-60)" }}>
              Riepilogo del tuo appuntamento. Tocca conferma per fissarlo.
            </p>

            {/* Inline error banner */}
            {error && (
              <div style={{
                margin: "0 20px 14px", padding: "12px 14px",
                background: "var(--rust-soft)", border: "1px solid var(--rust)",
                borderRadius: 10,
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "var(--rust)", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 11, fontWeight: 600,
                }}>!</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--rust)",
                    letterSpacing: "-0.005em",
                  }}>{PARI_ERRORS[error].title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--rust)", marginTop: 2, opacity: 0.9 }}>
                    {PARI_ERRORS[error].message}
                  </div>
                </div>
              </div>
            )}

            {/* Summary card */}
            <div style={{
              margin: "0 20px 14px",
              background: "var(--paper)", border: "1px solid var(--ink-08)",
              borderRadius: 12, padding: "6px 16px",
            }}>
              {[
                ["Barbiere",  barber.name,                                          "name"],
                ["Servizio",  service.name,                                          "text"],
                ["Data",      `${date.label} ${date.num} ${date.mese}`,              "text"],
                ["Ora",       selTime ?? "",                                          "mono"],
                ["Durata",    `${service.duration} min`,                              "mono"],
                ["Prezzo",    `€ ${service.price}`,                                   "mono-strong"],
              ].map(([k, v, kind], i, arr) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "12px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none",
                }}>
                  <span style={{ fontSize: 12.5, color: "var(--ink-60)", fontWeight: 500 }}>{k}</span>
                  <span style={{
                    fontFamily: kind === "name" ? "var(--font-display)"
                              : kind.startsWith("mono") ? "var(--font-mono)"
                              : "var(--font-body)",
                    fontWeight: kind === "mono-strong" || kind === "name" ? 600 : 600,
                    fontSize: kind === "name" ? 16 : 13.5,
                    color: "var(--ink)",
                    letterSpacing: kind === "name" ? "-0.022em" : 0,
                  }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Notes textarea */}
            <div style={{ padding: "0 20px 14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  Note al barbiere · opzionale
                </span>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Es. una sfumatura più leggera ai lati, niente prodotto."
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--ink-15)",
                    background: "var(--paper-2)",
                    borderRadius: 10,
                    fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
                    resize: "none", outline: "none",
                    minHeight: 56,
                  }}
                />
              </label>
            </div>

            {/* Cancellation note */}
            <div style={{ padding: "0 20px 14px", fontSize: 12, color: "var(--ink-60)", lineHeight: 1.55 }}>
              Cancellazione gratuita fino a 2 ore prima dell'appuntamento. Riceverai un promemoria la sera prima.
            </div>

            {/* Confirm CTA */}
            <div style={{ padding: "0 20px 8px" }}>
              <Button kind="clay" size="lg"
                disabled={submitting}
                onClick={() => fakeConfirm(null)}
                style={{ width: "100%" }}>
                {submitting ? "Sto prenotando…" : "Conferma appuntamento"}
              </Button>
            </div>

            {/* Demo affordance: simulate the spec's error codes so designers
                + reviewers can see the error toasts without breaking RLS. */}
            <div style={{
              padding: "6px 20px 18px",
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10.5, color: "var(--ink-40)",
            }}>
              <span>Demo errori:</span>
              <button onClick={() => fakeConfirm("23P01")} style={demoLinkStyle()}>conflitto slot</button>
              <span style={{ opacity: 0.4 }}>·</span>
              <button onClick={() => fakeConfirm("23514")} style={demoLinkStyle()}>self-booking</button>
              <span style={{ opacity: 0.4 }}>·</span>
              <button onClick={() => fakeConfirm("generic")} style={demoLinkStyle()}>generico</button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function demoLinkStyle() {
  return {
    border: "none", background: "transparent", padding: 0, cursor: "pointer",
    fontFamily: "inherit", fontSize: 10.5,
    color: "var(--ink-60)", textDecoration: "underline",
  };
}

/* Expose to window so pari-prototype-app.jsx can pick it up. */
Object.assign(window, { PariBookingSheet });
