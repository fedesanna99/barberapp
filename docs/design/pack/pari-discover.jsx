/* eslint-disable */
/* ============================================================
   PARI · Esplora (V4 — Mappa-prima)
   ------------------------------------------------------------
   Mappa-first redesign of the Esplora screen.
   Keeps the V1 "Pari" visual language 100%:
     • Same paper/ink/clay palette (no orange, no italic serif)
     • Same Geist + Geist Mono type
     • Hairline 1px ink-15 borders, soft shadows
     • Same v1 semantic colors: sage (open) / clay (busy) / rust (closed)
   Borrows the map-as-canvas + bottom-sheet snap UX from V3:
     • Full-screen abstract map
     • Floating search + filter chips
     • Price-pill pins, color-coded by status
     • Bottom sheet with 3 snaps: peek (carousel) / mid (list) / full
     • Tap pin → card mode with quick-slots + Prenota CTA
   Same component signature as v1 → drop-in replacement.
   ============================================================ */

const { useState: useStateD, useMemo: useMemoD } = React;

/* ============================================================
   DEMO DATA — extends DEMO_BARBERS with map coords + nextSlot
   ============================================================ */
const PARI_BARBERS_MAP = (typeof DEMO_BARBERS !== "undefined" ? DEMO_BARBERS : []).map((b, i) => {
  // Distribute pins in pleasing positions across the map viewport
  const positions = [
  { x: 36, y: 28 }, // Marco — Cagliari centro
  { x: 62, y: 38 }, // Fadi
  { x: 24, y: 56 }, // Nico
  { x: 70, y: 60 }, // Rita
  { x: 48, y: 70 }, // Salvo
  { x: 56, y: 24 }, // Gigi
  { x: 30, y: 42 } // Elena
  ];
  const slotOptions = [
  { day: "oggi", time: "11:30", urgent: true },
  { day: "oggi", time: "14:00", urgent: false },
  { day: "domani", time: "10:00", urgent: false },
  { day: "oggi", time: "16:30", urgent: false },
  { day: "domani", time: "09:30", urgent: false }];

  return {
    ...b,
    pos: positions[i] || { x: 50 - i * 4, y: 50 + i * 5 },
    nextSlot: slotOptions[i % slotOptions.length],
    /* status derived from openNow + a tiny variation for visual interest */
    status: !b.openNow ? "closed" : i === 1 || i === 5 ? "busy" : "open"
  };
});

const STATUS_BG = {
  open: "var(--sage-soft)",
  busy: "var(--clay-soft)",
  closed: "var(--ink-08)"
};
const STATUS_FG = {
  open: "var(--sage)",
  busy: "var(--clay-deep)",
  closed: "var(--ink-50)"
};
const STATUS_PIN = {
  open: "var(--sage)",
  busy: "var(--clay)",
  closed: "var(--ink-40)"
};
const STATUS_LABEL = {
  open: "aperto",
  busy: "occupato",
  closed: "chiuso"
};

const PARI_QUICK_FILTERS = ["Tutti", "Aperti ora", "Top rated", "Vicini", "Skin fade", "Donna", "Beard"];

/* ============================================================
   MAP CANVAS — abstract OSM-style, paper-tinted (V1 palette)
   ============================================================ */
function V4MapCanvas({ children }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "var(--paper)",
      overflow: "hidden"
    }}>
      <svg viewBox="0 0 400 720" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>

        {/* Base land — slightly warmer */}
        <rect width="400" height="720" fill="var(--linen)" opacity="0.55" />

        {/* Sea + river arc (lower portion — Golfo degli Angeli) */}
        <path d="M -20 540 Q 80 580 200 540 Q 300 510 420 560 L 420 740 L -20 740 Z"
        fill="rgba(176,127,97,0.10)" />
        <path d="M -20 540 Q 80 580 200 540 Q 300 510 420 560"
        fill="none" stroke="rgba(70,65,59,0.10)" strokeWidth="1" />

        {/* Parks — soft sage */}
        <path d="M 180 110 Q 230 90 260 130 Q 270 170 230 180 Q 180 175 180 110 Z"
        fill="var(--sage-soft)" opacity="0.7" />
        <path d="M 60 280 L 130 270 L 140 320 L 70 330 Z"
        fill="var(--sage-soft)" opacity="0.6" />
        <circle cx="340" cy="430" r="38" fill="var(--sage-soft)" opacity="0.7" />

        {/* Subtle grid */}
        <defs>
          <pattern id="grid-v4" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ink-08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="720" fill="url(#grid-v4)" />

        {/* Main road — S-curve */}
        <path d="M -20 220 Q 100 180 200 240 Q 300 290 420 250"
        fill="none" stroke="var(--linen-2)" strokeWidth="14" strokeLinecap="round" />
        <path d="M -20 220 Q 100 180 200 240 Q 300 290 420 250"
        fill="none" stroke="var(--paper-3)" strokeWidth="10" strokeLinecap="round" />

        {/* Second main road */}
        <path d="M 80 -20 Q 100 200 220 380 Q 320 500 380 720"
        fill="none" stroke="var(--linen-2)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 80 -20 Q 100 200 220 380 Q 320 500 380 720"
        fill="none" stroke="var(--paper-3)" strokeWidth="7" strokeLinecap="round" />

        {/* Side streets */}
        <line x1="0" y1="120" x2="180" y2="160" stroke="var(--paper-3)" strokeWidth="4" />
        <line x1="280" y1="80" x2="400" y2="120" stroke="var(--paper-3)" strokeWidth="4" />
        <line x1="0" y1="400" x2="220" y2="420" stroke="var(--paper-3)" strokeWidth="4" />
        <line x1="260" y1="400" x2="400" y2="380" stroke="var(--paper-3)" strokeWidth="4" />
        <line x1="50" y1="500" x2="200" y2="540" stroke="var(--paper-3)" strokeWidth="4" />
        <line x1="0" y1="320" x2="60" y2="400" stroke="var(--paper-3)" strokeWidth="3.5" />
        <line x1="160" y1="50" x2="200" y2="240" stroke="var(--paper-3)" strokeWidth="3.5" />
        <line x1="300" y1="200" x2="320" y2="500" stroke="var(--paper-3)" strokeWidth="3.5" />

        {/* Block fills */}
        {[
        [40, 80, 80, 40], [140, 80, 40, 40], [240, 50, 60, 40],
        [40, 260, 80, 30], [180, 310, 90, 40],
        [40, 440, 80, 40], [260, 460, 60, 40],
        [30, 580, 140, 40], [240, 600, 140, 40]].
        map(([x, y, w, h], i) =>
        <rect key={i} x={x} y={y} width={w} height={h}
        fill="var(--paper-3)" opacity="0.7" rx="3" />
        )}

        {/* Street labels */}
        <text x="200" y="232" textAnchor="middle"
        fontFamily="Geist" fontSize="9" fill="var(--ink-40)"
        fontWeight="500">via roma</text>
        <text x="138" y="280" textAnchor="middle"
        fontFamily="Geist" fontSize="9" fill="var(--ink-40)"
        fontWeight="500" transform="rotate(85 138 280)">v. manno</text>
        <text x="340" y="430" textAnchor="middle"
        fontFamily="Geist" fontSize="8" fill="var(--sage)"
        fontWeight="500">parco</text>
        <text x="216" y="155" textAnchor="middle"
        fontFamily="Geist" fontSize="8" fill="var(--sage)"
        fontWeight="500">giardini</text>
        <text x="100" y="608" textAnchor="middle"
        fontFamily="Geist" fontSize="10" fill="var(--clay-deep)"
        fontWeight="600" letterSpacing="0.04em">GOLFO DEGLI ANGELI</text>

        {/* User location */}
        <g transform="translate(180, 380)">
          <circle r="22" fill="var(--clay)" opacity="0.18" />
          <circle r="9" fill="var(--clay)" />
          <circle r="9" fill="none" stroke="var(--paper-3)" strokeWidth="3" />
        </g>
      </svg>
      {children}
    </div>);

}

/* ============================================================
   PIN — price pill, color-coded by status
   ============================================================ */
function V4Pin({ b, selected, onClick }) {
  const bg = selected ? "var(--ink)" : "var(--paper-3)";
  const fg = selected ? "var(--paper-3)" : "var(--ink)";
  const dotColor = STATUS_PIN[b.status];
  const w = selected ? 56 : 48;
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${b.pos.x}%`,
        top: `${b.pos.y}%`,
        transform: "translate(-50%, -100%)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        zIndex: selected ? 30 : 20,
        transition: "transform 220ms var(--ease-spring)"
      }}>
      <div style={{
        background: bg,
        color: fg,
        padding: "5px 11px 5px 8px",
        borderRadius: 9999,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow: selected ?
        "0 4px 14px -3px rgba(43,39,35,0.30), 0 0 0 2px var(--paper-3), 0 0 0 4px rgba(43,39,35,0.10)" :
        "0 2px 6px -2px rgba(43,39,35,0.18), 0 0 0 1.5px var(--paper-3)",
        fontFamily: "var(--font-mono)",
        fontSize: selected ? 13 : 12,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        transition: "all 220ms var(--ease-spring)"
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: dotColor, flexShrink: 0
        }} />
        <span>€{b.price ?? 22}</span>
      </div>
      {/* pin tail */}
      <div style={{
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: `7px solid ${selected ? "var(--ink)" : "var(--paper-3)"}`,
        margin: "0 auto",
        marginTop: -1,
        filter: "drop-shadow(0 1px 1px rgba(43,39,35,0.15))"
      }} />
    </button>);

}

/* ============================================================
   STATUS DOT
   ============================================================ */
function StatusDot({ status }) {
  return <span style={{
    width: 8, height: 8, borderRadius: "50%",
    background: STATUS_PIN[status],
    flexShrink: 0
  }} />;
}

/* ============================================================
   PEEK SHEET — small horizontal carousel "vicino a te"
   ============================================================ */
function V4PeekSheet({ barbers, onSelect, onExpand }) {
  return (
    <div style={{ padding: "4px 0 18px" }}>
      <div style={{
        padding: "4px 20px 12px",
        display: "flex", alignItems: "baseline", justifyContent: "space-between"
      }}>
        <div>
          <div className="bb-eyebrow">Vicino a te · {barbers.length} bottega</div>
          <div style={{
            marginTop: 4, fontFamily: "var(--font-display)",
            fontSize: 20, fontWeight: 600,
            color: "var(--ink)", letterSpacing: "-0.022em",
            lineHeight: 1.1
          }}>
            Castello, Cagliari
          </div>
        </div>
        <button onClick={onExpand} style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: 12, color: "var(--clay)", fontWeight: 500,
          fontFamily: "var(--font-body)", letterSpacing: "-0.005em"
        }}>Vedi lista →</button>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 20px" }}>
        {barbers.slice(0, 6).map((b) =>
        <button key={b.id} onClick={() => onSelect(b.id)} style={{
          flex: "0 0 200px",
          background: "var(--paper-2)",
          border: "1px solid var(--ink-15)",
          borderRadius: 12,
          padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 6,
          cursor: "pointer", textAlign: "left",
          fontFamily: "var(--font-body)"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={b.status} />
              <span style={{
              fontSize: 11, color: "var(--ink-60)",
              textTransform: "capitalize"
            }}>
                {STATUS_LABEL[b.status]} · {b.nextSlot.day} {b.nextSlot.time}
              </span>
            </div>
            <div style={{
            fontSize: 15, fontWeight: 600, color: "var(--ink)",
            letterSpacing: "-0.015em"
          }}>
              {b.name}
            </div>
            <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11.5, color: "var(--ink-60)"
          }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Icon name="star" size={11} color="var(--clay)" weight="fill" />
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>
                  {b.rating.toFixed(1).replace(".", ",")}
                </span>
              </span>
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{b.km.toFixed(1).replace(".", ",")}km</span>
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>€{b.price ?? 22}</span>
            </div>
          </button>
        )}
      </div>
    </div>);

}

/* ============================================================
   LIST SHEET — full list when sheet is mid/full
   ============================================================ */
function V4ListSheet({ barbers, onSelect, snap, onSnapToggle }) {
  const [sort, setSort] = useStateD("nearby");
  const sorted = useMemoD(() => {
    const arr = [...barbers];
    if (sort === "nearby") arr.sort((a, b) => a.km - b.km);
    if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    if (sort === "price") arr.sort((a, b) => (a.price ?? 22) - (b.price ?? 22));
    return arr;
  }, [barbers, sort]);

  return (
    <div>
      {/* sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 3,
        padding: "8px 20px 14px",
        background: "var(--paper-3)",
        borderBottom: "1px solid var(--ink-15)"
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="bb-eyebrow">{barbers.length} bottega · entro 5 km</div>
            <div style={{
              marginTop: 4, fontFamily: "var(--font-display)",
              fontSize: 24, fontWeight: 600,
              color: "var(--ink)", letterSpacing: "-0.025em",
              lineHeight: 1
            }}>
              Cagliari
            </div>
          </div>
          <button onClick={onSnapToggle} style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "var(--linen)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink)"
          }}>
            <Icon name={snap === "full" ? "chevron-down" : "chevron-up"} size={16} />
          </button>
        </div>
        {/* sort tabs */}
        <div style={{
          display: "flex", gap: 4, padding: 3,
          background: "var(--linen)",
          borderRadius: 9999, width: "fit-content"
        }}>
          {[["nearby", "Vicino"], ["rating", "Top"], ["price", "Prezzo"]].map(([id, l]) =>
          <button key={id} onClick={() => setSort(id)} style={{
            padding: "6px 14px", borderRadius: 9999,
            border: "none", cursor: "pointer",
            background: sort === id ? "var(--paper-3)" : "transparent",
            boxShadow: sort === id ? "0 1px 2px rgba(43,39,35,0.08)" : "none",
            color: sort === id ? "var(--ink)" : "var(--ink-60)",
            fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500,
            letterSpacing: "-0.005em"
          }}>{l}</button>
          )}
        </div>
      </div>

      {/* list */}
      <div>
        {sorted.map((b, i) =>
        <button key={b.id} onClick={() => onSelect(b.id)} style={{
          width: "100%", textAlign: "left",
          display: "flex", gap: 14, padding: "16px 20px",
          background: "transparent", border: "none",
          borderBottom: i < sorted.length - 1 ? "1px solid var(--ink-08)" : "none",
          cursor: "pointer", alignItems: "center",
          fontFamily: "var(--font-body)"
        }}>
            {/* Index */}
            <div style={{
            width: 32, height: 32, flexShrink: 0,
            borderRadius: "50%",
            background: "var(--linen)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
            color: "var(--ink)"
          }}>{i + 1}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <StatusDot status={b.status} />
                <span style={{ fontSize: 11, color: "var(--ink-60)" }}>
                  {STATUS_LABEL[b.status]} · {b.nextSlot.day} {b.nextSlot.time}
                </span>
              </div>
              <div style={{
              fontSize: 15, fontWeight: 600, color: "var(--ink)",
              letterSpacing: "-0.015em"
            }}>
                {b.name}
                <span style={{ color: "var(--ink-40)", fontWeight: 500 }}> · {b.city}</span>
              </div>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ink-60)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Icon name="star" size={11} color="var(--clay)" weight="fill" />
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)", fontWeight: 600 }}>
                    {b.rating.toFixed(1).replace(".", ",")}
                  </span>
                </span>
                <span style={{ color: "var(--ink-25)" }}>·</span>
                <span style={{ fontFamily: "var(--font-mono)" }}>{b.km.toFixed(1).replace(".", ",")}km</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
                €{b.price ?? 22}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-40)", marginTop: 2 }}>taglio</div>
            </div>
            <Icon name="chevron-right" size={14} color="var(--ink-40)" />
          </button>
        )}
      </div>
    </div>);

}

/* ============================================================
   CARD SHEET — selected barber, with quick slots + Prenota CTA
   ============================================================ */
const QUICK_SLOTS = ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"];
const TAKEN_QUICK = new Set(["10:30", "14:00"]);

function V4CardSheet({ barber, onClose, onOpenBooking, onOpenProfile }) {
  if (!barber) return null;
  return (
    <div style={{ padding: "8px 0 0", animation: "v4FadeIn 220ms var(--ease)" }}>
      {/* status + close */}
      <div style={{ padding: "4px 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusDot status={barber.status} />
          <span className="bb-eyebrow">
            {STATUS_LABEL[barber.status]} · {barber.nextSlot.day} {barber.nextSlot.time}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--linen)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)"
        }}>
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* identity */}
      <div style={{ padding: "0 20px 18px", display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}
      onClick={() => onOpenProfile(barber)}>
        <Avatar initials={barber.initials} size={56} ring={barber.rating >= 4.9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22, fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.025em",
            lineHeight: 1.1
          }}>
            {barber.name}
          </div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--ink-60)" }}>
            {barber.city}
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{
        margin: "0 20px",
        display: "flex", gap: 20,
        padding: "14px 0",
        borderTop: "1px solid var(--ink-08)",
        borderBottom: "1px solid var(--ink-08)"
      }}>
        <V4Stat label="Rating" value={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="star" size={13} color="var(--clay)" weight="fill" />
            {barber.rating.toFixed(1).replace(".", ",")}
          </span>
        } />
        <V4Stat label="Distanza" value={
        <>
            {barber.km.toFixed(1).replace(".", ",")}
            <span style={{ fontSize: 11, color: "var(--ink-40)", marginLeft: 2 }}>km</span>
          </>
        } />
        <V4Stat label="Da" value={<>€{barber.price ?? 22}</>} />
        <V4Stat label="Follower" value={(barber.followers ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} />
      </div>

      {/* Tags */}
      <div style={{ padding: "16px 20px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(barber.tags || []).map((t) =>
        <span key={t} style={{
          padding: "4px 10px",
          background: "var(--linen)",
          borderRadius: 9999,
          fontSize: 11.5, color: "var(--ink-80)"
        }}>{t}</span>
        )}
      </div>

      {/* Quick slots */}
      <div style={{ padding: "20px 20px 0" }}>
        <div className="bb-eyebrow" style={{ marginBottom: 10 }}>
          Slot di oggi
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {QUICK_SLOTS.map((t) => {
            const taken = TAKEN_QUICK.has(t);
            return (
              <button key={t}
              onClick={() => !taken && onOpenBooking(barber)}
              disabled={taken}
              style={{
                flexShrink: 0,
                padding: "9px 14px",
                background: taken ? "var(--ink-04)" : "var(--paper-2)",
                border: `1px solid ${taken ? "var(--ink-08)" : "var(--ink-15)"}`,
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 13, fontWeight: 500,
                color: taken ? "var(--ink-25)" : "var(--ink)",
                cursor: taken ? "not-allowed" : "pointer",
                textDecoration: taken ? "line-through" : "none"
              }}>
                {t}
              </button>);

          })}
        </div>
      </div>

      {/* CTA row */}
      <div style={{ padding: "20px 20px 22px", display: "flex", gap: 8 }}>
        <button style={{
          flex: "0 0 auto",
          width: 46, height: 46, borderRadius: 12,
          background: "var(--paper-2)",
          border: "1px solid var(--ink-15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)"
        }}>
          <Icon name="heart" size={18} />
        </button>
        <button onClick={() => onOpenProfile(barber)} style={{
          flex: "0 0 auto",
          padding: "0 16px", height: 46, borderRadius: 12,
          background: "var(--paper-2)",
          border: "1px solid var(--ink-15)",
          cursor: "pointer",
          fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 500,
          color: "var(--ink)",
          letterSpacing: "-0.005em"
        }}>
          Vedi profilo
        </button>
        <button onClick={() => onOpenBooking(barber)} style={{
          flex: 1,
          padding: "0 18px", height: 46, borderRadius: 12,
          background: "var(--ink)",
          color: "var(--paper-3)",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
          letterSpacing: "-0.01em",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          Prenota una sedia
          <Icon name="arrow-right" size={16} color="var(--paper-3)" />
        </button>
      </div>
    </div>);

}

function V4Stat({ label, value }) {
  return (
    <div>
      <div className="bb-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{
        marginTop: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 17, fontWeight: 600,
        color: "var(--ink)", letterSpacing: "-0.01em",
        lineHeight: 1
      }}>{value}</div>
    </div>);

}

/* ============================================================
   ESPLORA — main exported component (same signature as V1)
   ============================================================ */
function PariScreenDiscover({ onOpenBooking, onOpenProfile }) {
  // mode: "browse" | "card"
  const [mode, setMode] = useStateD("browse");
  // browse-mode snap: "peek" | "mid" | "full"
  const [snap, setSnap] = useStateD("peek");
  const [selectedId, setSelectedId] = useStateD(null);
  const [activeFilter, setActiveFilter] = useStateD("Tutti");
  const [query, setQuery] = useStateD("");

  const filtered = useMemoD(() => {
    let arr = PARI_BARBERS_MAP;
    if (activeFilter === "Aperti ora") arr = arr.filter((b) => b.status === "open");else
    if (activeFilter === "Top rated") arr = arr.filter((b) => b.rating >= 4.8);else
    if (activeFilter === "Vicini") arr = arr.filter((b) => b.km <= 1.5);else
    if (activeFilter !== "Tutti") {
      arr = arr.filter((b) => (b.tags || []).some((t) => t.toLowerCase().includes(activeFilter.toLowerCase())));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter((b) => b.name.toLowerCase().includes(q) || (b.city || "").toLowerCase().includes(q));
    }
    return arr;
  }, [activeFilter, query]);

  const selected = filtered.find((b) => b.id === selectedId) || PARI_BARBERS_MAP.find((b) => b.id === selectedId);

  // sheet height
  let sheetHeight;
  if (mode === "card") sheetHeight = "auto";else
  if (snap === "peek") sheetHeight = 188;else
  if (snap === "mid") sheetHeight = "60%";else
  sheetHeight = "94%";

  return (
    <div className="bb-screen" style={{
      position: "relative",
      overflow: "hidden",
      display: "flex", flexDirection: "column"
    }}>
      {/* MAP */}
      <V4MapCanvas>
        {filtered.map((b) =>
        <V4Pin key={b.id} b={b}
        selected={b.id === selectedId}
        onClick={() => {setMode("card");setSelectedId(b.id);setSnap("peek");}} />
        )}
      </V4MapCanvas>

      {/* SEARCH BAR — floating top */}
      <div style={{
        position: "absolute", top: 18, left: 18, right: 18, zIndex: 40,
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px",
        background: "var(--paper-3)",
        border: "1px solid var(--ink-15)",
        borderRadius: 9999,
        boxShadow: "0 2px 10px -3px rgba(43,39,35,0.10), 0 0 0 1px rgba(43,39,35,0.04)"
      }}>
        <Icon name="search" size={16} color="var(--ink-50)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca barbiere, via, stile…"
          style={{
            flex: 1, border: "none", background: "none", outline: "none",
            fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)",
            letterSpacing: "-0.005em"
          }} />
        
        {query &&
        <button onClick={() => setQuery("")} style={{
          background: "var(--linen)", border: "none", padding: 0,
          width: 20, height: 20, borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-60)"
        }}>
            <Icon name="x" size={11} />
          </button>
        }
      </div>

      {/* AGENDA PILL — sticky upcoming, ink chip */}
      <div style={{
        position: "absolute", top: 78, left: 18, zIndex: 35,
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 12px 7px 7px",
        background: "var(--ink)", color: "var(--paper-3)",
        borderRadius: 9999,
        boxShadow: "0 4px 14px -4px rgba(43,39,35,0.30)",
        fontSize: 12, fontWeight: 500,
        fontFamily: "var(--font-body)",
        letterSpacing: "-0.005em"
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--clay)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <Icon name="clock" size={12} color="var(--paper-3)" />
        </span>
        <span>sab · <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>10:00</span> Marco</span>
        <Icon name="chevron-right" size={11} color="rgba(252,250,245,0.5)" />
      </div>

      {/* FILTER CHIPS — top-right, scrollable */}
      <div style={{
        position: "absolute", top: 78, right: 18, left: 200,
        zIndex: 35,
        display: "flex", gap: 6,
        overflowX: "auto",
        justifyContent: "flex-end"
      }}>
        {PARI_QUICK_FILTERS.slice(0, 4).map((f) => {
          const active = activeFilter === f;
          return (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              flexShrink: 0,
              padding: "6px 11px",
              background: active ? "var(--ink)" : "var(--paper-3)",
              color: active ? "var(--paper-3)" : "var(--ink)",
              border: active ? "none" : "1px solid var(--ink-15)",
              borderRadius: 9999,
              fontFamily: "var(--font-body)",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: active ?
              "0 2px 6px -2px rgba(43,39,35,0.25)" :
              "0 2px 6px -3px rgba(43,39,35,0.10)",
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap"
            }}>{f}</button>);

        })}
      </div>

      {/* LOCATE FAB — bottom-right above sheet */}
      {mode === "browse" &&
      <>
          <button style={{
          position: "absolute", right: 18,
          bottom: typeof sheetHeight === "number" ? sheetHeight + 18 : "auto",
          top: typeof sheetHeight !== "number" ? 160 : "auto",
          width: 44, height: 44, borderRadius: "50%",
          background: "var(--paper-3)",
          border: "1px solid var(--ink-15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)",
          boxShadow: "0 2px 10px -3px rgba(43,39,35,0.10), 0 0 0 1px rgba(43,39,35,0.04)",
          zIndex: 35
        }}>
            <Icon name="locate" size={18} />
          </button>
          <button style={{
          position: "absolute", right: 18,
          bottom: typeof sheetHeight === "number" ? sheetHeight + 72 : "auto",
          top: typeof sheetHeight !== "number" ? 214 : "auto",
          width: 44, height: 44, borderRadius: "50%",
          background: "var(--paper-3)",
          border: "1px solid var(--ink-15)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink)",
          boxShadow: "0 2px 10px -3px rgba(43,39,35,0.10), 0 0 0 1px rgba(43,39,35,0.04)",
          zIndex: 35
        }}>
            <Icon name="layers" size={18} />
          </button>
        </>
      }

      {/* BOTTOM SHEET */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: "var(--paper-3)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -10px 30px -12px rgba(43,39,35,0.14), 0 0 0 1px var(--ink-08)",
        height: sheetHeight,
        maxHeight: "94%",
        zIndex: 50,
        display: "flex", flexDirection: "column",
        transition: "height 320ms var(--ease)"
      }}>
        {/* handle */}
        <div
          onClick={() => {
            if (mode !== "browse") return;
            setSnap(snap === "peek" ? "mid" : snap === "mid" ? "full" : "peek");
          }}
          style={{
            width: "100%", padding: "10px 0 6px",
            display: "flex", justifyContent: "center",
            flexShrink: 0, cursor: "grab"
          }}>
          <span style={{
            width: 40, height: 4,
            borderRadius: 9999,
            background: "var(--ink-25)"
          }} />
        </div>

        {/* body */}
        <div style={{
          flex: 1, overflowY: "auto",
          overscrollBehavior: "contain"
        }}>
          {mode === "card" ?
          <V4CardSheet
            barber={selected}
            onClose={() => {setMode("browse");setSelectedId(null);}}
            onOpenBooking={(b) => onOpenBooking(b)}
            onOpenProfile={(b) => onOpenProfile(b)} /> :

          snap === "peek" ?
          <V4PeekSheet
            barbers={filtered}
            onSelect={(id) => {setMode("card");setSelectedId(id);}}
            onExpand={() => setSnap("mid")} /> :


          <V4ListSheet
            barbers={filtered}
            onSelect={(id) => {setMode("card");setSelectedId(id);}}
            snap={snap}
            onSnapToggle={() => setSnap(snap === "full" ? "mid" : "full")} />

          }
        </div>
      </div>

      {/* Local animations */}
      <style>{`
        @keyframes v4FadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>);

}