/* eslint-disable */
/* ============================================================
   Barberbook · MAPPA (V3) — map-first experimental prototype
   ============================================================ */
const { useState, useEffect, useRef, useMemo } = React;

/* === ICONS === */
const G = {
  search:   <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  pin:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  scissors: <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></>,
  star:     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  clock:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  close:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  back:     <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  caret:    <polyline points="9 18 15 12 9 6"/>,
  caretDown:<polyline points="6 9 12 15 18 9"/>,
  caretUp:  <polyline points="18 15 12 9 6 15"/>,
  locate:   <><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></>,
  layers:   <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  heart:    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  filter:   <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  user:     <><circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/></>,
  share:    <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  phone:    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
  check:    <polyline points="20 6 9 17 4 12"/>,
};
function Icon({ name, size=20, color="currentColor", strokeWidth=1.85, fill=false, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill={fill ? color : "none"}
         stroke={fill ? "none" : color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ display:"inline-block", flexShrink:0, ...style }}>
      {G[name]}
    </svg>
  );
}

/* === Logo === */
function Mark({ size=18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="6"  y="4" width="4" height="24" rx="2" fill="var(--ink)"/>
      <rect x="14" y="4" width="4" height="24" rx="2" fill="var(--accent)"/>
      <rect x="22" y="4" width="4" height="24" rx="2" fill="var(--ink)"/>
    </svg>
  );
}

/* === DATA === */
const BARBERS = [
  // x,y are SVG percentage coords (0–100) for pin placement
  { id:"m", name:"Marco Barba",  shop:"Bottega di Marco", neigh:"Castello",   x:38, y:34, status:"open",   rating:4.9, reviews:124, dist:0.8, wait:"prossimo: 11:30", price:18, tags:["Skin fade","Beard"] },
  { id:"f", name:"Fadi Khoury",  shop:"Khoury Cuts",      neigh:"Marina",     x:62, y:28, status:"busy",   rating:4.8, reviews:201, dist:1.4, wait:"prossimo: 14:00", price:22, tags:["Taper","Curly"] },
  { id:"n", name:"Nico Pinna",   shop:"Pinna 1962",       neigh:"Stampace",   x:24, y:58, status:"open",   rating:4.7, reviews:312, dist:2.1, wait:"prossimo: 12:00", price:16, tags:["Pompadour","Classico"] },
  { id:"r", name:"Rita Loi",     shop:"Loi Atelier",      neigh:"Villanova",  x:70, y:60, status:"open",   rating:5.0, reviews:88,  dist:1.0, wait:"prossimo: 13:30", price:34, tags:["Donna","Pixie"] },
  { id:"s", name:"Salvo Murru",  shop:"Murru",            neigh:"San Benedetto", x:46, y:72, status:"closed", rating:4.6, reviews:140, dist:2.8, wait:"apre alle 14:00", price:14, tags:["Buzz","Express"] },
  { id:"g", name:"Gigi Mura",    shop:"Mura · Capelli",   neigh:"Marina",     x:54, y:48, status:"busy",   rating:4.5, reviews:67,  dist:1.6, wait:"prossimo: 15:30", price:20, tags:["Boy","Beard"] },
  { id:"e", name:"Elena Sotgiu", shop:"E. Sotgiu",        neigh:"Castello",   x:30, y:42, status:"open",   rating:4.9, reviews:42,  dist:0.6, wait:"prossimo: 11:15", price:28, tags:["Donna","Color"] },
];

const SERVICES = [
  { id:"taglio", name:"Taglio",       dur:30, price:18 },
  { id:"barba",  name:"Barba",        dur:25, price:14 },
  { id:"combo",  name:"Taglio+Barba", dur:50, price:28 },
  { id:"rasoio", name:"Rasoio",       dur:40, price:22 },
];

const TIME_SLOTS = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00",
                    "14:00","14:30","15:00","15:30","16:00","16:30","17:00",
                    "17:30","18:00","18:30","19:00","19:30","20:00"];
const TAKEN = new Set(["10:30","12:00","15:00","18:00","19:30"]);

const STATUS_COLOR = {
  open:   "var(--pin-open)",
  busy:   "var(--pin-busy)",
  closed: "var(--pin-closed)",
};
const STATUS_LABEL = {
  open:   "aperto",
  busy:   "occupato",
  closed: "chiuso",
};

function dateChips() {
  const today = new Date();
  const out = [];
  const DAYS = ["dom","lun","mar","mer","gio","ven","sab"];
  const MON = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      id: d.toISOString().slice(0,10),
      day: i === 0 ? "oggi" : i === 1 ? "domani" : DAYS[d.getDay()],
      num: d.getDate(),
      month: MON[d.getMonth()],
    });
  }
  return out;
}

/* ============================================================
   MAP CANVAS — SVG that fakes a real OSM-style city map
   ============================================================ */
function MapCanvas({ children }) {
  return (
    <div className="mappa-canvas">
      <svg viewBox="0 0 400 720" preserveAspectRatio="xMidYMid slice">
        {/* Base land */}
        <rect width="400" height="720" fill="var(--map-land)"/>

        {/* Water (sea at bottom-left, river arc) */}
        <path d="M -20 540 Q 80 580 200 540 Q 300 510 420 560 L 420 740 L -20 740 Z" fill="var(--map-water)"/>
        <path d="M -20 540 Q 80 580 200 540 Q 300 510 420 560"
              fill="none" stroke="#8FA7B4" strokeWidth="1" opacity="0.5"/>

        {/* Parks */}
        <path d="M 180 110 Q 230 90 260 130 Q 270 170 230 180 Q 180 175 180 110 Z" fill="var(--map-park)"/>
        <path d="M 60 280 L 130 270 L 140 320 L 70 330 Z" fill="var(--map-park)"/>
        <circle cx="340" cy="430" r="38" fill="var(--map-park)"/>

        {/* Subtle grid */}
        <defs>
          <pattern id="grid-v3" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--map-grid)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="400" height="720" fill="url(#grid-v3)"/>

        {/* Streets — big arcs and grids */}
        {/* Main road (S-curve through city) */}
        <path d="M -20 220 Q 100 180 200 240 Q 300 290 420 250"
              fill="none" stroke="var(--map-road-edge)" strokeWidth="14" strokeLinecap="round"/>
        <path d="M -20 220 Q 100 180 200 240 Q 300 290 420 250"
              fill="none" stroke="var(--map-road)" strokeWidth="10" strokeLinecap="round"/>

        {/* Second main road */}
        <path d="M 80 -20 Q 100 200 220 380 Q 320 500 380 720"
              fill="none" stroke="var(--map-road-edge)" strokeWidth="10" strokeLinecap="round"/>
        <path d="M 80 -20 Q 100 200 220 380 Q 320 500 380 720"
              fill="none" stroke="var(--map-road)" strokeWidth="7" strokeLinecap="round"/>

        {/* Side streets */}
        <line x1="0" y1="120" x2="180" y2="160" stroke="var(--map-road)" strokeWidth="4"/>
        <line x1="280" y1="80" x2="400" y2="120" stroke="var(--map-road)" strokeWidth="4"/>
        <line x1="0" y1="400" x2="220" y2="420" stroke="var(--map-road)" strokeWidth="4"/>
        <line x1="260" y1="400" x2="400" y2="380" stroke="var(--map-road)" strokeWidth="4"/>
        <line x1="50" y1="500" x2="200" y2="540" stroke="var(--map-road)" strokeWidth="4"/>
        <line x1="0" y1="320" x2="60" y2="400" stroke="var(--map-road)" strokeWidth="3.5"/>
        <line x1="160" y1="50" x2="200" y2="240" stroke="var(--map-road)" strokeWidth="3.5"/>
        <line x1="300" y1="200" x2="320" y2="500" stroke="var(--map-road)" strokeWidth="3.5"/>

        {/* Block fills (very faint) */}
        {[
          [40,80,80,40], [140,80,40,40], [240,50,60,40],
          [40,260,80,30], [180,310,90,40],
          [40,440,80,40], [260,460,60,40],
          [30,580,140,40], [240,600,140,40],
        ].map(([x,y,w,h],i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(255,255,255,0.25)" rx="3"/>
        ))}

        {/* Labels — street names */}
        <text x="200" y="232" textAnchor="middle" fontFamily="Geist" fontSize="9" fill="rgba(31,27,22,0.40)" fontWeight="500">via roma</text>
        <text x="138" y="280" textAnchor="middle" fontFamily="Geist" fontSize="9" fill="rgba(31,27,22,0.40)" fontWeight="500" transform="rotate(85 138 280)">v. manno</text>
        <text x="340" y="430" textAnchor="middle" fontFamily="Geist" fontSize="8" fill="rgba(31,27,22,0.45)" fontWeight="500">parco</text>
        <text x="216" y="155" textAnchor="middle" fontFamily="Geist" fontSize="8" fill="rgba(31,27,22,0.45)" fontWeight="500">giardini</text>
        <text x="100" y="608" textAnchor="middle" fontFamily="Geist" fontSize="10" fill="rgba(143,167,180,0.85)" fontWeight="600" letterSpacing="0.04em">GOLFO DEGLI ANGELI</text>

        {/* User location */}
        <g transform="translate(180, 380)">
          <circle r="22" fill="rgba(194,86,44,0.18)"/>
          <circle r="9" fill="var(--accent)"/>
          <circle r="9" fill="none" stroke="white" strokeWidth="3"/>
        </g>
      </svg>
      {children}
    </div>
  );
}

/* ============================================================
   PIN
   ============================================================ */
function Pin({ b, selected, onClick }) {
  return (
    <button
      className={"mappa-pin" + (selected ? " selected" : "")}
      style={{ left: `${b.x}%`, top: `${b.y}%` }}
      onClick={onClick}
    >
      <div className="mappa-pin__body"
           style={{ background: selected ? "var(--pin-selected)" : STATUS_COLOR[b.status] }}>
        {selected
          ? <Icon name="scissors" size={18} color="white" strokeWidth={2}/>
          : <span style={{
              fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600,
              color:"white", letterSpacing:0,
            }}>€{b.price}</span>
        }
      </div>
    </button>
  );
}

/* ============================================================
   CLUSTER PIN (for visual interest in dense areas)
   ============================================================ */
function Cluster({ count, x, y }) {
  return (
    <div className="mappa-pin cluster" style={{ left:`${x}%`, top:`${y}%` }}>
      <div className="mappa-pin__body">
        <span style={{ color:"white", fontWeight:600, fontSize:14 }}>{count}</span>
      </div>
    </div>
  );
}
