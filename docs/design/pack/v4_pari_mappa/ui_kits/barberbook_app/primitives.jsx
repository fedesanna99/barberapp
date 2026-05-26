/* Barberbook · primitives.jsx
   Shared low-level components + an Icon system with curated
   1.5px-stroke glyphs (Lucide-style). */

const { useState } = React;

/* ============================================================
   ICON — inline SVG glyphs. One source of truth, 24×24, 1.5 stroke.
   Add a glyph by adding a key. Pass `weight={"fill"}` for solid.
   ============================================================ */
const GLYPHS = {
  feed: <React.Fragment><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /></React.Fragment>,
  map: <React.Fragment><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" /><line x1="8" y1="3" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="21" /></React.Fragment>,
  user: <React.Fragment><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></React.Fragment>,
  chat: <React.Fragment><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" /></React.Fragment>,
  bell: <React.Fragment><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></React.Fragment>,
  heart: <React.Fragment><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></React.Fragment>,
  bookmark: <React.Fragment><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></React.Fragment>,
  search: <React.Fragment><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></React.Fragment>,
  pin: <React.Fragment><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></React.Fragment>,
  calendar: <React.Fragment><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></React.Fragment>,
  scissors: <React.Fragment><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></React.Fragment>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  settings: <React.Fragment><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></React.Fragment>,
  shop: <React.Fragment><path d="M3 9l1-5h16l1 5" /><path d="M5 9v11h14V9" /><path d="M9 21V14h6v7" /></React.Fragment>,
  clock: <React.Fragment><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></React.Fragment>,
  send: <React.Fragment><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></React.Fragment>,
  menu: <React.Fragment><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></React.Fragment>,
  caret: <polyline points="9 18 15 12 9 6" />,
  caretDown: <polyline points="6 9 12 15 18 9" />,
  close: <React.Fragment><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></React.Fragment>,
  back: <React.Fragment><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></React.Fragment>,
  share: <React.Fragment><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></React.Fragment>,
  funnel: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
  list: <React.Fragment><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3" cy="6" r="1" /><circle cx="3" cy="12" r="1" /><circle cx="3" cy="18" r="1" /></React.Fragment>,
  help: <React.Fragment><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></React.Fragment>,
  refresh: <React.Fragment><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></React.Fragment>,
  google: <path d="M21.35 11.1H12v2.95h5.35c-.25 1.4-1.65 4.1-5.35 4.1a5.85 5.85 0 1 1 0-11.7c1.85 0 3.1.8 3.8 1.45L17.7 5.7A8.85 8.85 0 0 0 12 3.5a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.05-1.05-.15-1.6z" />
};

function Icon({ name, size = 22, color = "currentColor", weight = "regular", strokeWidth = 1.85, style = {}, onClick }) {
  const filled = weight === "fill";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      onClick={onClick}>
      
      {GLYPHS[name] || null}
    </svg>);

}

/* ----- Avatar -------------------------------------------------- */
function Avatar({ initials, size = 40, ring = false, ringColor = "var(--clay)", gradient = null }) {
  const grad = gradient || `linear-gradient(135deg, #5A4D40 0%, #3A312A 100%)`;
  const inner =
  <div style={{
    width: size, height: size,
    borderRadius: "50%",
    background: grad,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: size * 0.36, lineHeight: 1, letterSpacing: "-0.02em",
    color: "var(--paper-3)",
    border: ring ? `2px solid var(--paper)` : "none",
    flexShrink: 0
  }}>
      {initials}
    </div>;

  if (!ring) return inner;
  return (
    <div style={{
      width: size + 4, height: size + 4,
      padding: 2, borderRadius: "50%",
      background: ringColor,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, boxSizing: "border-box",
    }}>{inner}</div>);

}

/* ============================================================
   BUTTON
   ============================================================ */
function Button({ kind = "hairline", children, onClick, size = "md", style = {}, disabled = false, leftIcon, rightIcon }) {
  const base = {
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    letterSpacing: "-0.005em",
    border: "1px solid var(--ink-25)",
    background: "var(--paper)",
    color: "var(--ink)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "transform 180ms var(--ease), background 120ms var(--ease), opacity 120ms var(--ease)",
    borderRadius: 10,
    opacity: disabled ? 0.4 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  };
  const sizes = {
    sm: { padding: "7px 13px", fontSize: 12.5, borderRadius: 8 },
    md: { padding: "11px 18px", fontSize: 14 },
    lg: { padding: "14px 20px", fontSize: 15 }
  };
  const kinds = {
    hairline: {},
    filled: { background: "var(--clay)", color: "var(--paper-3)", borderColor: "var(--clay)" },
    ink: { background: "var(--ink)", color: "var(--paper-3)", borderColor: "var(--ink)" },
    clay: { background: "var(--clay)", color: "var(--paper-3)", borderColor: "var(--clay)" },
    sage: { background: "var(--sage)", color: "var(--paper-3)", borderColor: "var(--sage)" },
    sageHair: { background: "transparent", color: "var(--sage)", borderColor: "var(--sage)" },
    danger: { borderColor: "var(--rust)", color: "var(--rust)", background: "transparent" },
    ghost: { borderColor: "transparent", color: "var(--ink-60)", background: "transparent" },
    soft: { background: "var(--clay-soft)", color: "var(--clay-deep)", borderColor: "transparent" }
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...kinds[kind], ...style }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
      
      {leftIcon && <Icon name={leftIcon} size={size === "sm" ? 14 : 16} />}
      {children}
      {rightIcon && <Icon name={rightIcon} size={size === "sm" ? 14 : 16} />}
    </button>);

}

/* ============================================================
   ICON BUTTON
   ============================================================ */
function IconBtn({ name, size = 22, color = "var(--ink)", onClick, label, badge = null, weight = "regular" }) {
  return (
    <button onClick={onClick} aria-label={label}
    style={{
      background: "none", border: "none", padding: 4, cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color, fontFamily: "inherit", position: "relative"
    }}>
      <Icon name={name} size={size} color={color} weight={weight} />
      {badge != null &&
      <span style={{
        position: "absolute", top: -2, right: -2,
        minWidth: 16, height: 16, padding: "0 4px",
        borderRadius: 9999, background: "var(--clay)",
        color: "var(--paper-2)", fontSize: 9.5, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1.5px solid var(--paper)"
      }}>{badge}</span>
      }
    </button>);

}

/* ============================================================
   PILL
   ============================================================ */
function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "var(--ink-08)", fg: "var(--ink-60)" },
    success: { bg: "var(--sage-soft)", fg: "#5D6F50" },
    danger: { bg: "var(--rust-soft)", fg: "#8A4530" },
    clay: { bg: "var(--clay-soft)", fg: "var(--clay-deep)" },
    ink: { bg: "var(--ink)", fg: "var(--linen)" }
  };
  const t = tones[tone];
  return (
    <span style={{
      padding: "3px 9px",
      borderRadius: 9999,
      background: t.bg,
      color: t.fg,
      fontFamily: "var(--font-body)",
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.55,
      display: "inline-block",
      letterSpacing: "-0.005em"
    }}>{children}</span>);

}

/* ============================================================
   MISC
   ============================================================ */
function Hairline({ inset = 0 }) {
  return <div style={{ height: 1, background: "var(--ink-08)", marginLeft: inset, marginRight: inset }} />;
}

function ClayRule({ width = 32 }) {
  return <div style={{ height: 2, width, background: "var(--clay)", borderRadius: 9999 }} />;
}

function Stat({ value, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: 1, color: "var(--ink)", letterSpacing: "-0.022em" }}>{value}</span>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--ink-60)" }}>{label}</span>
    </div>);

}

function SectionHeader({ children, action = null }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "20px 20px 10px" }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, letterSpacing: "-0.018em", color: "var(--ink)" }}>{children}</span>
      {action}
    </div>);

}

function Toast({ kind = "success", title, message, onClose }) {
  React.useEffect(() => {
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [onClose]);
  const gutterColor = {
    success: "var(--sage)",
    danger: "var(--rust)",
    info: "var(--clay)"
  }[kind] || "var(--clay)";
  return (
    <div className="bb-toast" onClick={onClose}>
      <div className="bb-toast__gutter" style={{ background: gutterColor }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ttl">{title}</div>
        {message && <div className="msg">{message}</div>}
      </div>
    </div>);

}

/* Photo placeholder block — warm gradient, optional label */
function PhotoBlock({ aspect = "4/5", initials = "", label = null, style = {} }) {
  return (
    <div style={{
      width: "100%", aspectRatio: aspect,
      background: "linear-gradient(135deg, #5A4D40 0%, #2E2820 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      ...style, color: "white"
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 56, color: "rgba(237,233,225,0.10)", letterSpacing: "-0.04em" }}>{initials}</span>
      {label &&
      <div style={{
        position: "absolute", left: 12, bottom: 12,
        padding: "4px 10px", background: "rgba(46,40,32,0.55)", backdropFilter: "blur(8px)",
        color: "var(--linen)", fontSize: 11, fontWeight: 500, borderRadius: 9999
      }}>{label}</div>
      }
    </div>);

}

Object.assign(window, {
  Icon, GLYPHS,
  Avatar, Button, IconBtn, Pill, Hairline, ClayRule, Stat, SectionHeader, Toast, PhotoBlock
});