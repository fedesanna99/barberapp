/* Pari · Esplora (Discover) — refined.
   Working search + filters, "prossimo slot" badges, price-pill map pins,
   quick-service chips, sort menu, locate-me FAB, real empty state. */

const { useState: useStateD, useMemo: useMemoD, useRef: useRefD } = React;

/* ============================================================
   DEMO DATA — extends DEMO_BARBERS from screens.jsx with
   booking-relevant fields. We keep the original shape and
   tack on `nextSlot` + `price` so BarberProfileSheet keeps
   working unchanged.
   ============================================================ */
const PARI_BARBERS = (typeof DEMO_BARBERS !== "undefined" ? DEMO_BARBERS : []).map((b, i) => ({
  ...b,
  /* Next available slot — used for the urgency line on each row.
     Keep it deterministic so the prototype renders the same way every load. */
  nextSlot: [
    { day: "Oggi",    time: "14:30" },
    { day: "Oggi",    time: "16:00" },
    { day: "Domani",  time: "09:30" },
    { day: "Oggi",    time: "11:00" },
    { day: "Oggi",    time: "17:00" },
  ][i] || { day: "Oggi", time: "18:00" },
}));

/* ============================================================
   Quick-service suggestions — tappable chips above the filter row.
   These pre-filter by tag match. The set is curated, not derived from
   the data, so the order stays opinionated.
   ============================================================ */
const PARI_QUICK_SERVICES = [
  "Aperti ora",
  "Skin fade",
  "Taper",
  "Beard sculpt",
  "Fade",
  "Line up",
  "French crop",
  "Arabic shave",
];

/* ============================================================
   Sort menu definitions. We keep this small — three options that
   cover the realistic user intent on this surface.
   ============================================================ */
const PARI_SORTS = [
  { key: "distance", label: "Più vicini" },
  { key: "rating",   label: "Top rated"  },
  { key: "price",    label: "Prezzo"     },
];

function pariSortBarbers(arr, key) {
  const copy = [...arr];
  if (key === "distance") copy.sort((a, b) => a.km - b.km);
  if (key === "rating")   copy.sort((a, b) => b.rating - a.rating);
  if (key === "price")    copy.sort((a, b) => (a.price ?? 22) - (b.price ?? 22));
  return copy;
}

function pariFilterBarbers(arr, query, quick) {
  let out = arr;
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    out = out.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      (b.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  if (quick) {
    if (quick === "Aperti ora") out = out.filter(b => b.openNow);
    else out = out.filter(b => (b.tags || []).some(t => t.toLowerCase().includes(quick.toLowerCase())));
  }
  return out;
}

/* ============================================================
   PARI · Esplora (Discover)
   ============================================================ */
function PariScreenDiscover({ onOpenBooking, onOpenProfile }) {
  const [view, setView]     = useStateD("list");       // list | map
  const [query, setQuery]   = useStateD("");
  const [quick, setQuick]   = useStateD(null);          // active quick-service chip
  const [sort, setSort]     = useStateD("distance");
  const [sortOpen, setSortOpen] = useStateD(false);

  const filtered = useMemoD(() => pariFilterBarbers(PARI_BARBERS, query, quick), [query, quick]);
  const sorted   = useMemoD(() => pariSortBarbers(filtered, sort), [filtered, sort]);

  const sortLabel = PARI_SORTS.find(s => s.key === sort)?.label ?? "";

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />

      {/* Top bar — city selector + bell */}
      <div className="bb-topbar">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500 }}>Cerca a</span>
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            border: "none", background: "transparent", padding: 0, cursor: "pointer",
          }}>
            <Icon name="pin" size={16} color="var(--clay)" />
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: 22, letterSpacing: "-0.025em", color: "var(--ink)",
            }}>Cagliari</span>
            <Icon name="caretDown" size={14} color="var(--ink-60)" />
          </button>
        </div>
        <div className="actions">
          <IconBtn name="bell" size={22} color="var(--ink-80)" label="Notifiche" />
        </div>
      </div>

      {/* Search field — wired to live filter */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
          border: "1px solid var(--ink-15)", borderRadius: 12, background: "var(--paper-2)",
        }}>
          <Icon name="search" size={18} color="var(--ink-60)" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca un barbiere, un servizio…"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 14, fontFamily: "inherit", color: "var(--ink)",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              border: "none", background: "transparent", padding: 0,
              cursor: "pointer", display: "flex",
            }}>
              <Icon name="close" size={16} color="var(--ink-40)" />
            </button>
          )}
        </div>
      </div>

      {/* Quick-service chips — pre-filter by tag */}
      <div style={{
        display: "flex", gap: 6, padding: "0 20px 16px",
        overflowX: "auto", scrollSnapType: "x proximity",
      }}>
        {PARI_QUICK_SERVICES.map(s => {
          const active = quick === s;
          return (
            <button key={s} onClick={() => setQuick(active ? null : s)}
              style={{
                padding: "6px 12px",
                background: active ? "var(--ink)" : "var(--paper)",
                color: active ? "var(--linen)" : "var(--ink-80)",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                cursor: "pointer", borderRadius: 9999,
                whiteSpace: "nowrap", flexShrink: 0,
                border: active ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                scrollSnapAlign: "start",
                transition: "all 120ms var(--ease)",
              }}>{s}</button>
          );
        })}
      </div>

      {/* Results-count + sort + view toggle */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 20px 14px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--ink-80)" }}>
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{sorted.length}</strong>
            {sorted.length === 1 ? " barbiere" : " barbieri"}
            {quick ? <span style={{ color: "var(--ink-60)" }}> · {quick.toLowerCase()}</span> : null}
          </div>
          <div style={{ position: "relative", marginTop: 2 }}>
            <button onClick={() => setSortOpen(v => !v)} style={{
              border: "none", background: "transparent", padding: 0, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: "inherit", fontSize: 11.5, color: "var(--ink-60)",
            }}>
              ordinati per <span style={{ color: "var(--ink)", fontWeight: 500 }}>{sortLabel.toLowerCase()}</span>
              <Icon name="caretDown" size={11} color="var(--ink-40)" />
            </button>
            {sortOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4,
                background: "var(--paper-3)", border: "1px solid var(--ink-08)",
                borderRadius: 10, boxShadow: "var(--shadow-lift)",
                padding: 4, zIndex: 10, minWidth: 140,
              }}>
                {PARI_SORTS.map(s => (
                  <button key={s.key}
                    onClick={() => { setSort(s.key); setSortOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "8px 10px",
                      border: "none", background: "transparent", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
                      borderRadius: 6, textAlign: "left",
                    }}>
                    {s.label}
                    {sort === s.key && <Icon name="caret" size={12} color="var(--clay)" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          display: "flex", background: "var(--paper-2)", borderRadius: 9,
          padding: 3, border: "1px solid var(--ink-08)",
        }}>
          {[["list", "list"], ["map", "map"]].map(([k, ic]) => (
            <button key={k} onClick={() => setView(k)}
              style={{
                padding: "6px 10px",
                background: view === k ? "var(--paper)" : "transparent",
                color: view === k ? "var(--ink)" : "var(--ink-60)",
                border: "none", borderRadius: 6,
                cursor: "pointer",
                display: "flex", alignItems: "center",
                boxShadow: view === k ? "0 1px 2px rgba(70,65,59,0.06)" : "none",
                transition: "all 120ms var(--ease)",
              }}>
              <Icon name={ic} size={16}/>
            </button>
          ))}
        </div>
      </div>

      {/* The list / map themselves */}
      {view === "map"
        ? <PariDiscoverMap barbers={sorted.length ? sorted : PARI_BARBERS} onOpenBooking={onOpenBooking} onOpenProfile={onOpenProfile} />
        : <PariDiscoverList barbers={sorted} onOpenBooking={onOpenBooking} onOpenProfile={onOpenProfile} clearFilters={() => { setQuery(""); setQuick(null); }} />
      }
    </div>
  );
}

/* ============================================================
   LIST VIEW
   ============================================================ */
function PariDiscoverList({ barbers, onOpenBooking, onOpenProfile, clearFilters }) {
  if (barbers.length === 0) {
    return (
      <div style={{ padding: "48px 28px 32px", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--paper)", border: "1px solid var(--ink-08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
        }}>
          <Icon name="search" size={22} color="var(--ink-40)"/>
        </div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 500,
          fontSize: 19, letterSpacing: "-0.022em", color: "var(--ink)",
        }}>
          Nessun barbiere con questo filtro.
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.5 }}>
          Prova a togliere qualche restrizione o cerca in un'altra zona.
        </div>
        <button onClick={clearFilters} style={{
          marginTop: 16,
          padding: "8px 16px",
          background: "var(--paper-2)", border: "1px solid var(--ink-15)",
          borderRadius: 9999, cursor: "pointer",
          fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--ink)",
        }}>Pulisci filtri</button>
      </div>
    );
  }
  return (
    <div style={{ paddingBottom: 16 }}>
      {barbers.map((b, i) => (
        <PariBarberRow key={b.id} b={b}
          onOpenProfile={onOpenProfile}
          onOpenBooking={onOpenBooking}
          first={i === 0}
        />
      ))}
    </div>
  );
}

function PariBarberRow({ b, onOpenProfile, onOpenBooking }) {
  return (
    <div onClick={() => onOpenProfile(b)} style={{
      display: "flex", alignItems: "stretch", gap: 14,
      padding: "16px 20px",
      borderTop: "1px solid var(--ink-08)",
      cursor: "pointer",
      transition: "background 120ms var(--ease)",
    }}>
      <Avatar initials={b.initials} size={56} ring={b.rating >= 4.9} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{
            fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.015em",
            color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{b.name}</span>
          {b.rating >= 4.9 && <Pill tone="clay">Top</Pill>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-60)" }}>
          <Icon name="pin" size={12} color="var(--ink-40)" />
          <span>{b.city}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{b.km.toFixed(1).replace(".", ",")} km</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
          <Icon name="star" size={12} color="var(--clay)" weight="fill" />
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{b.rating.toFixed(1).replace(".", ",")}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {(b.tags || []).slice(0, 2).join(" · ")}
          </span>
        </div>

        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 8px", borderRadius: 9999,
            background: b.openNow ? "var(--sage-soft)" : "var(--ink-08)",
            color: b.openNow ? "var(--sage)" : "var(--ink-60)",
            fontSize: 11, fontWeight: 600, letterSpacing: "-0.005em",
          }}>
            <Icon name="clock" size={11} color="currentColor" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
              {b.nextSlot.day} {b.nextSlot.time}
            </span>
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-50)" }}>
            da <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>€ {b.price ?? 22}</span>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <Button kind="hairline" size="sm"
          onClick={e => { e.stopPropagation(); onOpenBooking(b); }}
        >Prenota</Button>
      </div>
    </div>
  );
}

/* ============================================================
   MAP VIEW — fake map + price-pill pins + preview card + locate-me
   ============================================================ */
function PariDiscoverMap({ barbers, onOpenBooking, onOpenProfile }) {
  const [sel, setSel] = useStateD(0);
  const selected = barbers[sel] ?? barbers[0];

  /* Stable, opinionated pin positions on the fake map. Five spots —
     pick whichever pin count matches the filtered list. */
  const PIN_POSITIONS = [
    { l: "22%", t: "30%" },
    { l: "64%", t: "34%" },
    { l: "44%", t: "58%" },
    { l: "75%", t: "62%" },
    { l: "30%", t: "76%" },
  ];

  return (
    <div style={{
      position: "relative", margin: "0 20px 20px",
      borderRadius: 16, overflow: "hidden",
      border: "1px solid var(--ink-08)",
      height: 480, background: "var(--paper-2)",
    }}>
      {/* faux map — streets pattern + curved roads + clay tint as water */}
      <svg viewBox="0 0 400 480" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="pari-streets" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <line x1="0" y1="24" x2="48" y2="24" stroke="rgba(70,65,59,0.05)" strokeWidth="1" />
            <line x1="24" y1="0" x2="24" y2="48" stroke="rgba(70,65,59,0.03)" strokeWidth="0.5" />
          </pattern>
          <pattern id="pari-park" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="8" x2="16" y2="8" stroke="rgba(124,140,110,0.18)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="400" height="480" fill="url(#pari-streets)" />
        {/* a park blob, top-left */}
        <ellipse cx="80" cy="100" rx="60" ry="40" fill="url(#pari-park)" opacity="0.7" />
        {/* curved arteries */}
        <path d="M0 140 Q200 220 400 120" fill="none" stroke="rgba(70,65,59,0.10)" strokeWidth="2" />
        <path d="M0 320 Q200 260 400 360" fill="none" stroke="rgba(70,65,59,0.08)" strokeWidth="2" />
        <path d="M120 0 L150 480" stroke="rgba(70,65,59,0.06)" strokeWidth="1.5" />
        <path d="M280 0 L300 480" stroke="rgba(70,65,59,0.05)" strokeWidth="1.5" />
        {/* water hint, bottom */}
        <path d="M0 410 L400 450 L400 480 L0 480 Z" fill="rgba(176,127,97,0.06)" />
      </svg>

      {/* user location dot — sage, halo'd */}
      <div style={{
        position: "absolute", left: "48%", top: "44%",
        width: 14, height: 14, borderRadius: "50%",
        background: "var(--sage)",
        boxShadow: "0 0 0 4px rgba(124,140,110,0.22)",
        transform: "translate(-50%, -50%)",
      }} />

      {/* Price-pill pins */}
      {PIN_POSITIONS.slice(0, barbers.length).map((p, i) => {
        const b = barbers[i];
        const isSelected = sel === i;
        return (
          <button key={b.id} onClick={() => setSel(i)}
            style={{
              position: "absolute", left: p.l, top: p.t,
              transform: `translate(-50%, -100%) ${isSelected ? "scale(1.08)" : "scale(1)"}`,
              cursor: "pointer", border: "none", background: "transparent",
              padding: 0,
              transition: "transform 200ms var(--ease)",
              zIndex: isSelected ? 3 : 2,
            }}>
            <div style={{
              padding: "5px 10px 5px 6px",
              borderRadius: 9999,
              background: isSelected ? "var(--ink)" : "var(--paper-3)",
              color: isSelected ? "var(--paper-3)" : "var(--ink)",
              boxShadow: isSelected
                ? "0 8px 18px rgba(70,65,59,0.28)"
                : "0 4px 10px rgba(70,65,59,0.16), 0 0 0 1px var(--ink-08)",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 600,
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: isSelected ? "var(--clay)" : "var(--clay-soft)",
                color: isSelected ? "white" : "var(--clay-deep)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 10,
              }}>{b.initials[0]}</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>€ {b.price ?? 22}</span>
            </div>
            {/* pip below the pill */}
            <div style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `7px solid ${isSelected ? "var(--ink)" : "var(--paper-3)"}`,
              margin: "-1px auto 0",
              filter: isSelected ? "none" : "drop-shadow(0 1px 0 rgba(70,65,59,0.08))",
            }} />
          </button>
        );
      })}

      {/* Locate-me FAB */}
      <button style={{
        position: "absolute", right: 12, top: 12,
        width: 38, height: 38, borderRadius: "50%",
        background: "var(--paper-3)", border: "1px solid var(--ink-08)",
        boxShadow: "var(--shadow-lift)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="pin" size={18} color="var(--sage)" weight="fill" />
      </button>

      {/* Preview card — full-width, anchored bottom */}
      {selected && (
        <div onClick={() => onOpenProfile(selected)} style={{
          position: "absolute", left: 12, right: 12, bottom: 12,
          padding: 12, background: "var(--paper-3)",
          borderRadius: 14,
          boxShadow: "0 8px 24px rgba(70,65,59,0.18), 0 0 0 1px var(--ink-08)",
          display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer",
        }}>
          <Avatar initials={selected.initials} size={48} ring={selected.rating >= 4.9} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{selected.name}</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: "var(--ink-60)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="star" size={11} color="var(--clay)" weight="fill" />
              <span style={{ color: "var(--ink)", fontWeight: 600 }}>{selected.rating.toFixed(1).replace(".", ",")}</span>
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{selected.km.toFixed(1).replace(".", ",")} km</span>
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontFamily: "var(--font-mono)", fontSize: 10.5,
                color: selected.openNow ? "var(--sage)" : "var(--ink-60)",
                fontWeight: 600,
              }}>
                <Icon name="clock" size={10} color="currentColor" />
                {selected.nextSlot.day} {selected.nextSlot.time}
              </span>
            </div>
          </div>
          <Button kind="filled" size="sm" onClick={e => { e.stopPropagation(); onOpenBooking(selected); }}>
            Prenota
          </Button>
        </div>
      )}
    </div>
  );
}

/* Expose to window so pari-prototype-app.jsx can pick it up. */
Object.assign(window, { PariScreenDiscover, PARI_BARBERS });
