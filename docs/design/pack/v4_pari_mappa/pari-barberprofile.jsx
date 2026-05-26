/* Pari · BarberProfileSheet — refined.
   Adds tab Post / Recensioni with badge counts, aggregate rating header,
   real reviews list, services + prices section, contact box (address,
   phone, social), tighter sticky footer. */

const { useState: useStateBP, useMemo: useMemoBP } = React;

/* Demo reviews per barber. Keyed by barber.id so different barbers
   show different review sets — gives the sheet variety when the user
   explores. */
const PARI_BARBER_REVIEWS = {
  "1": [
  { author: "Andrea G.", initials: "AG", rating: 5, when: "12 apr", text: "Sempre preciso, capisce dove andare al primo colpo. Bottega tranquilla." },
  { author: "Luca M.", initials: "LM", rating: 5, when: "3 apr", text: "Skin fade impeccabile. Tornerò sicuro." },
  { author: "Giovanni B.", initials: "GB", rating: 4, when: "27 mar", text: "Bravo, un filo lungo sulla nuca ma niente di grave." }],

  "2": [
  { author: "Fabio R.", initials: "FR", rating: 5, when: "8 apr", text: "Arabic shave fantastica. Una pratica che vale tutti i suoi minuti." },
  { author: "Stefano V.", initials: "SV", rating: 5, when: "1 apr", text: "Atmosfera unica, prezzo onesto." }],

  "3": [
  { author: "Marco P.", initials: "MP", rating: 4, when: "5 apr", text: "Buono, ma un po' affollato il sabato." }],

  "4": [
  { author: "Alessio T.", initials: "AT", rating: 5, when: "10 apr", text: "Taper preciso e linea netta. Top." },
  { author: "Davide N.", initials: "DN", rating: 5, when: "2 apr", text: "Sempre attento al dettaglio." }],

  "5": [
  { author: "Pietro C.", initials: "PC", rating: 5, when: "6 apr", text: "French crop perfetto." }]

};

/* Demo recent works grid — 6 placeholders per barber. */
function pariRecentWorks(barber) {
  return [0, 1, 2, 3, 4, 5].map((i) => ({
    id: `${barber.id}-w${i}`,
    label: (barber.tags || ["Skin fade"])[i % (barber.tags?.length || 1)],
    hue: i * 7
  }));
}

/* Build services for the barber — same logic as the booking sheet
   so prices match. Kept inline to avoid coupling files. */
function pariBarberServices(barber) {
  const base = barber.price ?? 22;
  return [
  { id: "classico", name: "Taglio classico", duration: 30, price: base },
  { id: "skin-fade", name: "Skin fade", duration: 45, price: base + 6 },
  { id: "beard", name: "Beard sculpt", duration: 20, price: Math.max(12, base - 7) },
  { id: "completo", name: "Taglio + barba", duration: 60, price: base + 16 }];

}

/* ============================================================
   PARI · BarberProfileSheet
   ============================================================ */
function PariBarberProfileSheet({ barber, onClose, onBook, onMessage }) {
  const [following, setFollowing] = useStateBP(false);
  const [tab, setTab] = useStateBP("post"); // post | recensioni

  const reviews = PARI_BARBER_REVIEWS[barber.id] || [];
  const works = useMemoBP(() => pariRecentWorks(barber), [barber]);
  const services = useMemoBP(() => pariBarberServices(barber), [barber]);

  const aggregateRating = barber.rating ?? 4.9;
  const reviewCount = reviews.length || Math.round((barber.followers ?? 100) / 12);

  return (
    <div className="bb-scrim" onClick={(e) => {if (e.target === e.currentTarget) onClose();}}>
      <div className="bb-sheet" style={{ maxHeight: "94%" }}>
        <div className="bb-sheet__handle" />

        {/* Header */}
        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Profilo barbiere</div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        {/* Hero */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 20px 18px" }}>
          <Avatar initials={barber.initials} size={72} ring ringColor="var(--sage)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {barber.openNow !== false ?
              <Pill tone="success">Aperto</Pill> :
              <Pill tone="danger">In pausa</Pill>}
              {barber.rating >= 4.9 && <Pill tone="clay">Top</Pill>}
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: 24, letterSpacing: "-0.025em", margin: 0
            }}>{barber.name}</h1>
            <div style={{
              marginTop: 6, fontSize: 12.5, color: "var(--ink-60)",
              display: "flex", gap: 6, alignItems: "center"
            }}>
              <Icon name="pin" size={13} color="var(--clay)" />
              {barber.city}
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {(barber.km ?? 0.4).toFixed(1).replace(".", ",")} km
              </span>
            </div>
          </div>
        </div>

        {/* Aggregated stats — three identical columns */}
        <div style={{
          display: "flex", alignItems: "stretch",
          margin: "0 20px 18px", padding: "14px 0",
          borderTop: "1px solid var(--ink-08)",
          borderBottom: "1px solid var(--ink-08)"
        }}>
          {[
          {
            value: aggregateRating.toFixed(1).replace(".", ","),
            label: `${reviewCount} recensioni`,
            icon: "star"
          },
          {
            value: (barber.followers ?? 1240).toLocaleString("it-IT"),
            label: "Follower"
          },
          {
            value: "312",
            label: "Tagli"
          }].
          map((s, i, arr) =>
          <React.Fragment key={s.label}>
              <div style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4
            }}>
                <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 20, lineHeight: 1.1, letterSpacing: "-0.022em",
                color: "var(--ink)"
              }}>
                  {s.icon && <Icon name={s.icon} size={13} color="var(--clay)" weight="fill" />}
                  {s.value}
                </div>
                <div style={{
                fontSize: 10.5, color: "var(--ink-60)",
                textAlign: "center", letterSpacing: "-0.005em"
              }}>{s.label}</div>
              </div>
              {i < arr.length - 1 &&
            <div style={{ width: 1, background: "var(--ink-08)", margin: "4px 0" }} />
            }
            </React.Fragment>
          )}
        </div>

        {/* Contact box — address, hours, days, message */}
        <div style={{
          margin: "0 20px 18px",
          background: "var(--paper)",
          border: "1px solid var(--ink-08)",
          borderRadius: 12,
          padding: "4px 14px"
        }}>
          {[
          ["pin", "via Roma 21, Cagliari", null],
          ["clock", "Apre alle 09:00 · chiude alle 19:30", null],
          ["calendar", "Lun-Sab · Domenica chiuso", null],
          ["chat", `Scrivi a ${barber.name.split(" ")[0]}`, () => onMessage?.(barber)]].
          map(([ic, text, action], i, arr) =>
          <button key={i}
            disabled={!action}
            onClick={action ?? undefined}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0",
              borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none",
              fontSize: 13, color: action ? "var(--clay-deep)" : "var(--ink-80)",
              fontWeight: action ? 500 : 400,
              background: "transparent", border: "none",
              cursor: action ? "pointer" : "default",
              fontFamily: "inherit", textAlign: "left", width: "100%"
            }}>
              <Icon name={ic} size={14} color={action ? "var(--clay)" : "var(--ink-40)"} />
              <span style={{ flex: 1 }}>{text}</span>
              {action && <Icon name="caret" size={14} color="var(--clay)" />}
            </button>
          )}
        </div>

        {/* Bottega bio */}
        <div style={{ padding: "0 20px 18px" }}>
          <div className="bb-eyebrow" style={{ marginBottom: 10 }}>Bottega</div>
          <p style={{
            fontSize: 13.5, color: "var(--ink-80)", lineHeight: 1.6, margin: 0
          }}>
            Bottega in via Roma da quindici anni. Lavoro a mano libera, cerco la linea
            giusta per il viso di chi si siede — niente preset. Prenota direttamente qui.
          </p>
        </div>

        {/* Servizi e prezzi */}
        <div style={{ padding: "0 20px 18px" }}>
          <div style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            marginBottom: 10
          }}>
            <div className="bb-eyebrow">Servizi e prezzi</div>
            <span style={{ fontSize: 11, color: "var(--ink-50)" }}>{services.length} disponibili</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {services.map((s, i, arr) =>
            <div key={s.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, padding: "10px 0",
              borderBottom: i < arr.length - 1 ? "1px solid var(--ink-08)" : "none"
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                    {s.duration} min
                  </div>
                </div>
                <div style={{
                fontFamily: "var(--font-mono)", fontWeight: 600,
                fontSize: 14, color: "var(--ink)"
              }}>€ {s.price}</div>
              </div>
            )}
          </div>
        </div>

        {/* Specialità */}
        <div style={{ padding: "0 20px 14px" }}>
          <div className="bb-eyebrow" style={{ marginBottom: 10 }}>Specialità</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(barber.tags || ["Skin fade", "Beard sculpt", "Line up"]).map((t) =>
            <Pill key={t}>{t}</Pill>
            )}
          </div>
        </div>

        {/* Tabs — Post / Recensioni */}
        <div style={{
          display: "flex", padding: "10px 20px 0",
          borderBottom: "1px solid var(--ink-08)", marginTop: 6
        }}>
          {[
          ["post", "Post", works.length],
          ["recensioni", "Recensioni", reviewCount]].
          map(([k, l, n]) =>
          <button key={k} onClick={() => setTab(k)}
          style={{
            flex: 1, padding: "10px 0 12px",
            border: "none", background: "transparent",
            color: tab === k ? "var(--ink)" : "var(--ink-60)",
            fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 600 : 500,
            cursor: "pointer", position: "relative",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
            letterSpacing: "-0.005em"
          }}>
              {l}
              <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10.5,
              color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
              background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
              padding: "0 5px", borderRadius: 9999, fontWeight: 600
            }}>{n}</span>
              {tab === k &&
            <div style={{
              position: "absolute", left: "20%", right: "20%", bottom: -1,
              height: 2, background: "var(--clay)", borderRadius: 9999
            }} />
            }
            </button>
          )}
        </div>

        {/* Tab content */}
        {tab === "post" &&
        <div style={{ padding: "10px 20px 16px" }}>
            <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: 4
          }}>
              {works.map((w) =>
            <div key={w.id} style={{
              position: "relative",
              aspectRatio: "1 / 1",
              background: `linear-gradient(${135 + w.hue}deg, hsl(${24 + w.hue}, 22%, 38%) 0%, hsl(${20 + w.hue}, 26%, 22%) 100%)`,
              borderRadius: 6, overflow: "hidden", cursor: "pointer",
              display: "flex", flexDirection: "column", justifyContent: "flex-end"
            }}>
                  <div style={{
                padding: "5px 7px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.45))"
              }}>
                    <span style={{
                  fontFamily: "var(--font-body)", fontSize: 9.5, fontWeight: 500,
                  color: "rgba(255,255,255,0.92)"
                }}>{w.label}</span>
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {tab === "recensioni" &&
        <div style={{ padding: "12px 20px 16px" }}>
            {/* Aggregate header */}
            <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "12px 14px",
            background: "var(--paper)", border: "1px solid var(--ink-08)",
            borderRadius: 12, marginBottom: 14
          }}>
              <div style={{ textAlign: "center", minWidth: 64 }}>
                <div style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 36, lineHeight: 1, letterSpacing: "-0.025em",
                color: "var(--ink)"
              }}>{aggregateRating.toFixed(1).replace(".", ",")}</div>
                <div style={{
                display: "inline-flex", gap: 1, marginTop: 4
              }}>
                  {[1, 2, 3, 4, 5].map((n) =>
                <Icon key={n} name="star" size={10}
                color={n <= Math.round(aggregateRating) ? "var(--clay)" : "var(--ink-15)"}
                weight={n <= Math.round(aggregateRating) ? "fill" : "regular"} />

                )}
                </div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--ink-08)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                fontSize: 13, fontWeight: 600, color: "var(--ink)",
                letterSpacing: "-0.015em"
              }}>
                  {reviewCount} recensioni
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 3, lineHeight: 1.4 }}>
                  basate sugli ultimi 12 mesi.
                </div>
              </div>
              <button style={{
              border: "1px solid var(--ink-15)", background: "var(--paper-2)",
              borderRadius: 9999, padding: "6px 12px",
              fontSize: 11.5, fontWeight: 500, color: "var(--ink)",
              cursor: "pointer", fontFamily: "inherit"
            }}>Scrivi</button>
            </div>

            {/* Reviews list */}
            {reviews.length === 0 ?
          <div style={{
            textAlign: "center", padding: "30px 20px",
            fontSize: 13, color: "var(--ink-60)"
          }}>
                Nessuna recensione ancora. Sii il primo a scriverne una.
              </div> :

          reviews.map((r, i) =>
          <div key={i} style={{
            padding: "14px 0",
            borderBottom: i < reviews.length - 1 ? "1px solid var(--ink-08)" : "none"
          }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar initials={r.initials} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em" }}>{r.author}</div>
                      <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "inline-flex", gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((n) =>
                    <Icon key={n} name="star" size={10}
                    color={n <= r.rating ? "var(--clay)" : "var(--ink-15)"}
                    weight={n <= r.rating ? "fill" : "regular"} />

                    )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--ink-50)" }}>· {r.when}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{
              marginTop: 8, fontSize: 13, color: "var(--ink-80)", lineHeight: 1.55
            }}>{r.text}</div>
                </div>
          )
          }
          </div>
        }

        {/* Sticky footer */}
        <div style={{
          padding: "12px 20px 16px",
          display: "flex", gap: 10,
          position: "sticky", bottom: 0,
          background: "var(--paper-3)",
          borderTop: "1px solid var(--ink-08)"
        }}>
          <Button kind={following ? "sage" : "sageHair"}
          onClick={() => setFollowing((f) => !f)}
          style={{ flex: 1 }}>
            {following ? "Seguendo" : "Segui"}
          </Button>
          <Button kind="filled" onClick={() => onBook(barber)} style={{ flex: 2 }}>
            Prenota — € {barber.price ?? 22}
          </Button>
        </div>
      </div>
    </div>);

}

/* Expose to window so pari-prototype-app.jsx can pick it up. */
Object.assign(window, { PariBarberProfileSheet });