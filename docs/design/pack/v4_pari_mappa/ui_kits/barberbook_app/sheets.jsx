/* Barberbook · sheets.jsx — Booking + BarberProfile bottom sheets. */

const { useState: useStateS, useMemo: useMemoS } = React;

const sheetGiorni = ["lun","mar","mer","gio","ven","sab","dom"];
const sheetMesi   = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];

function next7Days() {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      label: i === 0 ? "oggi" : sheetGiorni[(d.getDay() + 6) % 7],
      num:   d.getDate(),
      mese:  sheetMesi[d.getMonth()],
      date:  d,
    });
  }
  return out;
}

const SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","17:00"];
const TAKEN = new Set(["09:30","11:30","14:30"]);

function BookingSheet({ barber, onClose, onConfirm }) {
  const dates = useMemoS(() => next7Days(), []);
  const [selDate, setSelDate] = useStateS(0);
  const [selTime, setSelTime] = useStateS(null);
  const [step, setStep] = useStateS("datetime");

  const date  = dates[selDate];
  const price = barber.price ?? 22;
  const service = barber.tags?.[0] ?? "Taglio classico";

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet">
        <div className="bb-sheet__handle" />

        {step === "datetime" ? (
          <React.Fragment>
            <div style={{ padding: "0 20px 4px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Prenota un appuntamento</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.025em", margin: "4px 0 0" }}>
                  con {barber.name}
                </h2>
                <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, display:"flex", alignItems:"center", gap:6 }}>
                  <Icon name="pin" size={14} color="var(--clay)"/>
                  {barber.city}
                  <span style={{ color:"var(--ink-25)"}}>·</span>
                  <Icon name="star" size={12} color="var(--clay)" weight="fill"/>
                  <span style={{ fontWeight: 600 }}>{barber.rating?.toFixed?.(1).replace(".",",") ?? "—"}</span>
                </div>
              </div>
              <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
            </div>

            <div style={{
              margin: "16px 20px 22px", padding: "14px 16px",
              background: "var(--paper)", border: "1px solid var(--ink-08)", borderRadius: 12,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--clay-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="scissors" size={20} color="var(--clay-deep)"/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em" }}>{service}</div>
                <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>30 min · € {price}</div>
              </div>
              <IconBtn name="caret" size={18} color="var(--ink-40)"/>
            </div>

            <div style={{ padding: "0 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.018em" }}>Scegli la data</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>prossimi 7 giorni</span>
            </div>
            <div style={{ display: "flex", gap: 6, padding: "0 20px 22px", overflowX: "auto" }}>
              {dates.map((d, i) => {
                const sel = selDate === i;
                return (
                  <div key={i} onClick={() => { setSelDate(i); setSelTime(null); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      padding: "10px 14px", minWidth: 56, cursor: "pointer",
                      background: sel ? "var(--ink)" : "var(--paper-2)",
                      color: sel ? "var(--linen)" : "var(--ink)",
                      border: sel ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                      borderRadius: 10, flexShrink: 0,
                      transition: "background 120ms var(--ease)",
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.7 }}>{d.label}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: 1.15, marginTop: 2, letterSpacing: "-0.022em" }}>{d.num}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.6, marginTop: 1 }}>{d.mese}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "0 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.018em" }}>Slot disponibili</span>
              <span style={{ fontSize: 11.5, color: "var(--ink-40)" }}>
                {SLOTS.length - TAKEN.size} liberi su {SLOTS.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "0 20px 22px" }}>
              {SLOTS.map(t => {
                const taken = TAKEN.has(t);
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
                    }}
                  >{t}</button>
                );
              })}
            </div>

            <div style={{ padding: "0 20px 18px" }}>
              <Button kind="filled" size="lg" disabled={selTime === null}
                onClick={() => selTime && setStep("confirm")}
                style={{ width: "100%" }}>
                {selTime ? `Continua — ${selTime}` : "Scegli un orario"}
              </Button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div style={{ padding: "0 20px 4px", display: "flex", alignItems: "center", gap: 8 }}>
              <IconBtn name="back" size={20} color="var(--ink-60)" onClick={() => setStep("datetime")} label="Indietro" />
              <div style={{ flex: 1, fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Conferma</div>
              <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 26, letterSpacing: "-0.025em", margin: "10px 20px 4px" }}>
              Tutto a posto?
            </h2>
            <p style={{ margin: "0 20px 18px", fontSize: 13, color: "var(--ink-60)" }}>
              Riepilogo del tuo appuntamento. Tocca conferma per fissarlo.
            </p>

            <div style={{ margin: "0 20px 14px", background: "var(--paper)", border: "1px solid var(--ink-08)", borderRadius: 12, padding: "6px 16px" }}>
              {[
                ["Barbiere", barber.name],
                ["Servizio", service],
                ["Data",     `${date.label} ${date.num} ${date.mese}`],
                ["Ora",      selTime ?? ""],
                ["Durata",   "30 min"],
                ["Prezzo",   `€ ${price}`],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "12px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none",
                }}>
                  <span style={{ fontSize: 12.5, color: "var(--ink-60)", fontWeight: 500 }}>{k}</span>
                  <span style={{
                    fontFamily: k === "Barbiere" ? "var(--font-display)" : (["Ora","Prezzo","Durata"].includes(k) ? "var(--font-mono)" : "var(--font-body)"),
                    fontWeight: 600, fontSize: k === "Barbiere" ? 16 : 13.5,
                    color: "var(--ink)",
                    letterSpacing: k === "Barbiere" ? "-0.022em" : 0
                  }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: "0 20px 14px", fontSize: 12, color: "var(--ink-60)", lineHeight: 1.55 }}>
              Cancellazione gratuita fino a 2 ore prima dell'appuntamento. Riceverai un promemoria la sera prima.
            </div>

            <div style={{ padding: "0 20px 18px" }}>
              <Button kind="clay" size="lg" onClick={() => onConfirm(barber, date, selTime)} style={{ width: "100%" }}>
                Conferma appuntamento
              </Button>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function BarberProfileSheet({ barber, onClose, onBook, onMessage }) {
  const [following, setFollowing] = useStateS(false);

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "94%" }}>
        <div className="bb-sheet__handle" />

        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Profilo barbiere</div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px 18px" }}>
          <Avatar initials={barber.initials} size={72} ring ringColor="var(--sage)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {barber.openNow !== false ? <Pill tone="success">Aperto</Pill> : <Pill tone="danger">In pausa</Pill>}
              {barber.rating >= 4.9 && <Pill tone="clay">Top</Pill>}
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.025em", margin: 0 }}>{barber.name}</h1>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-60)", display:"flex", gap:6, alignItems:"center" }}>
              <Icon name="pin" size={13} color="var(--clay)"/>
              {barber.city}
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span>{(barber.km ?? 0.4).toFixed(1).replace(".",",")} km</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-around", margin: "0 20px 18px", padding: "16px 0", borderTop: "1px solid var(--ink-08)", borderBottom: "1px solid var(--ink-08)" }}>
          <Stat value={(barber.rating ?? 4.9).toFixed(1).replace(".",",")} label="Valutazione" />
          <Stat value="1.240" label="Follower" />
          <Stat value="312" label="Tagli" />
        </div>

        <div style={{ padding: "0 20px 14px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.018em", marginBottom: 10 }}>Specialità</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(barber.tags || ["Skin fade", "Beard sculpt", "Line up"]).map(t => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </div>

        <div style={{ padding: "8px 20px 14px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.018em", marginBottom: 10 }}>Bottega</div>
          <p style={{ fontSize: 13.5, color: "var(--ink-80)", lineHeight: 1.6, margin: 0 }}>
            Bottega in via Roma da quindici anni. Lavoro a mano libera, cerco la linea giusta per il viso di chi si siede — niente preset. Prenota direttamente qui.
          </p>
        </div>

        <div style={{ padding: "8px 20px 16px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.018em", marginBottom: 10 }}>Lavori recenti</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{
                aspectRatio: "1 / 1",
                background: `linear-gradient(${135 + i * 8}deg, #5A4D40 0%, #2E2820 100%)`,
                borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "rgba(237,233,225,0.10)" }}>{(i+1).toString().padStart(2,"0")}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 20px 16px", display: "flex", gap: 10, position: "sticky", bottom: 0, background: "var(--paper-3)", borderTop: "1px solid var(--ink-08)" }}>
          <Button kind={following ? "sage" : "sageHair"} onClick={() => setFollowing(f => !f)} style={{ flex: 1 }}>
            {following ? "Seguendo" : "Segui"}
          </Button>
          <IconBtn name="chat" size={20} color="var(--ink)" onClick={() => onMessage?.(barber)} label="Messaggia" />
          <Button kind="filled" onClick={() => onBook(barber)} style={{ flex: 2 }}>
            Prenota — € {barber.price ?? 22}
          </Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BookingSheet, BarberProfileSheet });
