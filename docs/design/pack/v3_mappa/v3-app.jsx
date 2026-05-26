/* eslint-disable */
/* ============================================================
   Barberbook · MAPPA (V3) — sheet, list, booking, shell
   ============================================================ */

/* ============================================================
   PEEK SHEET — small horizontal carousel "vicino a te"
   ============================================================ */
function PeekSheet({ barbers, onSelect }) {
  return (
    <div style={{ padding:"4px 0 18px" }}>
      <div style={{
        padding:"4px 20px 12px",
        display:"flex", alignItems:"baseline", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.04em", textTransform:"uppercase", fontWeight:500 }}>
            Vicino a te · {barbers.length} bottega
          </div>
          <div style={{ marginTop:3, fontSize:18, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.02em" }}>
            Castello, Cagliari
          </div>
        </div>
        <button style={{
          background:"none", border:"none", padding:0, cursor:"pointer",
          fontSize:12, color:"var(--accent)", fontWeight:500,
        }}>Vedi lista <Icon name="caret" size={12} color="var(--accent)" style={{ verticalAlign:"-2px" }}/></button>
      </div>
      <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"0 20px" }}>
        {barbers.slice(0,6).map(b => (
          <button key={b.id} onClick={() => onSelect(b.id)} style={{
            flex:"0 0 200px",
            background:"var(--surface)",
            border:"1px solid var(--line)",
            borderRadius:"var(--r-md)",
            padding:"12px 14px",
            display:"flex", flexDirection:"column", gap:6,
            cursor:"pointer", textAlign:"left",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Dot color={STATUS_COLOR[b.status]}/>
              <span style={{ fontSize:11, color:"var(--ink-60)", textTransform:"capitalize" }}>
                {STATUS_LABEL[b.status]} · {b.wait}
              </span>
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.015em" }}>
              {b.name}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:11.5, color:"var(--ink-60)" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                <Icon name="star" size={11} color="var(--accent)" fill/>
                <span className="mappa-stat-num" style={{ color:"var(--ink)" }}>{b.rating}</span>
              </span>
              <span>·</span>
              <span className="mappa-stat-num">{b.dist}km</span>
              <span>·</span>
              <span className="mappa-stat-num">€{b.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Dot({ color }) {
  return <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>;
}

/* ============================================================
   LIST SHEET — full list of nearby
   ============================================================ */
function ListSheet({ barbers, onSelect, snap, onSnapToggle }) {
  const [sort, setSort] = useState("nearby");
  const sorted = useMemo(() => {
    const arr = [...barbers];
    if (sort === "nearby") arr.sort((a,b) => a.dist - b.dist);
    if (sort === "rating") arr.sort((a,b) => b.rating - a.rating);
    if (sort === "price")  arr.sort((a,b) => a.price - b.price);
    return arr;
  }, [barbers, sort]);

  return (
    <div>
      <div style={{
        padding:"8px 20px 14px",
        position:"sticky", top:0, background:"var(--surface)",
        zIndex:2, borderBottom:"1px solid var(--line)",
      }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.04em", textTransform:"uppercase", fontWeight:500 }}>
              {barbers.length} bottega · entro 5 km
            </div>
            <div style={{ marginTop:3, fontSize:22, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.025em" }}>
              Cagliari
            </div>
          </div>
          <button onClick={onSnapToggle} style={{
            width:34, height:34, borderRadius:"50%",
            background:"var(--bg-2)", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name={snap === "full" ? "caretDown" : "caretUp"} size={16} color="var(--ink)"/>
          </button>
        </div>
        {/* sort tabs */}
        <div style={{ display:"flex", gap:4, padding:3, background:"var(--bg-2)", borderRadius:"var(--r-pill)", width:"fit-content" }}>
          {[["nearby","Vicino"],["rating","Top"],["price","Prezzo"]].map(([id,l]) => (
            <button key={id} onClick={() => setSort(id)} style={{
              padding:"6px 14px", borderRadius:"var(--r-pill)",
              border:"none", cursor:"pointer",
              background: sort === id ? "var(--surface)" : "transparent",
              boxShadow: sort === id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              color: sort === id ? "var(--ink)" : "var(--ink-60)",
              fontFamily:"inherit", fontSize:12, fontWeight:500,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        {sorted.map((b, i) => (
          <button key={b.id} onClick={() => onSelect(b.id)} style={{
            width:"100%",
            display:"flex", gap:14, padding:"16px 20px",
            background:"transparent", border:"none",
            borderBottom: i < sorted.length - 1 ? "1px solid var(--line)" : "none",
            cursor:"pointer", textAlign:"left",
            alignItems:"center",
          }}>
            {/* Index number */}
            <div style={{
              width:36, height:36, flexShrink:0,
              borderRadius:"50%",
              background:"var(--bg-2)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-mono)", fontSize:13, fontWeight:600,
              color:"var(--ink)",
            }}>{i+1}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <Dot color={STATUS_COLOR[b.status]}/>
                <span style={{ fontSize:11, color:"var(--ink-60)" }}>{STATUS_LABEL[b.status]} · {b.wait}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.015em" }}>
                {b.name}<span style={{ color:"var(--ink-40)", fontWeight:500 }}> · {b.shop}</span>
              </div>
              <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:8, fontSize:11.5, color:"var(--ink-60)" }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                  <Icon name="star" size={11} color="var(--accent)" fill/>
                  <span className="mappa-stat-num" style={{ color:"var(--ink)" }}>{b.rating}</span>
                  <span className="mappa-stat-num">({b.reviews})</span>
                </span>
                <span>·</span>
                <span className="mappa-stat-num">{b.dist}km</span>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div className="mappa-stat-num" style={{ fontSize:18, fontWeight:600, color:"var(--ink)" }}>
                €{b.price}
              </div>
              <div style={{ fontSize:10, color:"var(--ink-40)", marginTop:2 }}>taglio</div>
            </div>
            <Icon name="caret" size={14} color="var(--ink-40)"/>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   CARD SHEET — selected barber preview, Prenota CTA
   ============================================================ */
function CardSheet({ barber, onClose, onBook }) {
  if (!barber) return null;
  return (
    <div style={{ padding:"8px 0 0", animation:"fadeIn 220ms var(--ease)" }}>
      {/* close row */}
      <div style={{ padding:"4px 18px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Dot color={STATUS_COLOR[barber.status]}/>
          <span style={{ fontSize:11, color:"var(--ink-60)", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500 }}>
            {STATUS_LABEL[barber.status]} · {barber.wait}
          </span>
        </div>
        <button onClick={onClose} style={{
          width:30, height:30, borderRadius:"50%",
          background:"var(--bg-2)", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name="close" size={14} color="var(--ink)"/>
        </button>
      </div>

      <div style={{ padding:"0 20px 18px" }}>
        <div style={{
          fontSize:28, fontWeight:700, color:"var(--ink)",
          letterSpacing:"-0.028em", lineHeight:1.05,
        }}>
          {barber.name}
        </div>
        <div style={{ marginTop:6, fontSize:13, color:"var(--ink-60)" }}>
          {barber.shop} · {barber.neigh}
        </div>

        {/* Stat row */}
        <div style={{
          marginTop:18, display:"flex", gap:24,
          padding:"14px 0",
          borderTop:"1px solid var(--line)",
          borderBottom:"1px solid var(--line)",
        }}>
          <StatV3 label="Rating" value={
            <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
              <Icon name="star" size={14} color="var(--accent)" fill/>
              {barber.rating}
            </span>
          }/>
          <StatV3 label="Recensioni" value={barber.reviews}/>
          <StatV3 label="Distanza" value={<>{barber.dist}<span style={{ fontSize:11, color:"var(--ink-40)", marginLeft:2 }}>km</span></>}/>
          <StatV3 label="Da" value={<>€{barber.price}</>}/>
        </div>

        {/* Tags */}
        <div style={{ marginTop:16, display:"flex", flexWrap:"wrap", gap:6 }}>
          {barber.tags.map(t => (
            <span key={t} style={{
              padding:"5px 11px",
              background:"var(--bg-2)", borderRadius:"var(--r-pill)",
              fontSize:11.5, color:"var(--ink-80)",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Quick slots preview */}
      <div style={{ padding:"0 20px 18px" }}>
        <div style={{
          fontSize:11, color:"var(--ink-60)", textTransform:"uppercase",
          letterSpacing:"0.06em", fontWeight:500, marginBottom:10,
        }}>Slot di oggi</div>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {TIME_SLOTS.slice(0,6).map(t => {
            const taken = TAKEN.has(t);
            return (
              <button key={t} onClick={() => !taken && onBook(barber)}
                      disabled={taken}
                      style={{
                        flexShrink:0,
                        padding:"9px 14px",
                        background: taken ? "var(--bg-2)" : "var(--surface)",
                        border:`1px solid ${taken ? "var(--line)" : "var(--ink-25)"}`,
                        borderRadius:"var(--r-sm)",
                        fontFamily:"var(--font-mono)", fontSize:13,
                        color: taken ? "var(--ink-25)" : "var(--ink)",
                        cursor: taken ? "not-allowed" : "pointer",
                        textDecoration: taken ? "line-through" : "none",
                      }}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding:"0 20px 22px", display:"flex", gap:8 }}>
        <button className="mappa-btn ghost" style={{ flex:"0 0 auto", padding:"14px" }}>
          <Icon name="heart" size={18}/>
        </button>
        <button className="mappa-btn ghost" style={{ flex:"0 0 auto", padding:"14px" }}>
          <Icon name="phone" size={18}/>
        </button>
        <button onClick={() => onBook(barber)} className="mappa-btn accent tall" style={{ flex:1 }}>
          Prenota una sedia
          <Icon name="arrowRight" size={16} color="white"/>
        </button>
      </div>
    </div>
  );
}

function StatV3({ label, value }) {
  return (
    <div>
      <div style={{
        fontSize:10, color:"var(--ink-40)",
        letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500,
      }}>{label}</div>
      <div style={{
        marginTop:4, fontFamily:"var(--font-mono)",
        fontSize:18, fontWeight:600,
        color:"var(--ink)", letterSpacing:"-0.01em",
        lineHeight:1,
      }}>{value}</div>
    </div>
  );
}

/* ============================================================
   BOOKING SHEET (overlay)
   ============================================================ */
function BookingSheet({ barber, onClose, onConfirm }) {
  const dates = useMemo(() => dateChips(), []);
  const [dateIdx, setDateIdx] = useState(0);
  const [time, setTime] = useState(null);
  const [serviceId, setServiceId] = useState("combo");
  const service = SERVICES.find(s => s.id === serviceId);

  // Demo hooks
  useEffect(() => {
    const onSel = (e) => setTime(e.detail);
    const onConf = () => {
      const t = window.__demoSelectedTime || time;
      if (t) onConfirm({ barber, date: dates[dateIdx], time: t, service });
    };
    window.addEventListener("__demoSelectTime", onSel);
    window.addEventListener("__demoConfirm", onConf);
    return () => {
      window.removeEventListener("__demoSelectTime", onSel);
      window.removeEventListener("__demoConfirm", onConf);
    };
  }, [time, dateIdx, serviceId, barber]);

  return (
    <div style={{
      position:"absolute", inset:0, zIndex:100,
      background:"rgba(31,27,22,0.45)",
      animation:"fadeIn 220ms var(--ease)",
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:"var(--surface)",
        borderRadius:"24px 24px 0 0",
        boxShadow:"var(--shadow-sheet)",
        maxHeight:"94%", overflowY:"auto",
        animation:"slideUp 320ms var(--ease)",
      }}>
        {/* grab */}
        <div style={{ padding:"10px 0 6px", display:"flex", justifyContent:"center" }}>
          <span style={{ width:44, height:5, borderRadius:9999, background:"var(--ink-25)" }}/>
        </div>

        {/* header */}
        <div style={{ padding:"10px 20px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--line)" }}>
          <button onClick={onClose} style={{
            width:34, height:34, borderRadius:"50%",
            background:"var(--bg-2)", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="back" size={16} color="var(--ink)"/>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
              Prenota da
            </div>
            <div style={{ marginTop:2, fontSize:18, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.02em" }}>
              {barber.name}
            </div>
          </div>
        </div>

        {/* Service compact picker */}
        <SectionV3 title="Servizio">
          <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
            {SERVICES.map(s => {
              const sel = serviceId === s.id;
              return (
                <button key={s.id} onClick={() => setServiceId(s.id)} style={{
                  flexShrink:0,
                  padding:"10px 14px",
                  background: sel ? "var(--ink)" : "var(--bg-2)",
                  color: sel ? "var(--surface)" : "var(--ink)",
                  border:"none", borderRadius:"var(--r-sm)",
                  cursor:"pointer", textAlign:"left",
                }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.name}</div>
                  <div style={{ marginTop:3, fontFamily:"var(--font-mono)", fontSize:10.5, opacity:0.7 }}>
                    {s.dur}min · €{s.price}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionV3>

        {/* Date strip */}
        <SectionV3 title="Quando">
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            {dates.map((d,i) => {
              const sel = i === dateIdx;
              return (
                <button key={d.id} onClick={() => setDateIdx(i)} style={{
                  flex:"0 0 56px",
                  padding:"10px 0",
                  background: sel ? "var(--ink)" : "var(--bg-2)",
                  color: sel ? "var(--surface)" : "var(--ink)",
                  border:"none", borderRadius:"var(--r-md)",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  cursor:"pointer",
                }}>
                  <span style={{ fontSize:10, opacity:0.7, textTransform:"uppercase", letterSpacing:"0.06em" }}>{d.day}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:18, fontWeight:600, lineHeight:1 }}>{d.num}</span>
                  <span style={{ fontSize:10, opacity:0.7 }}>{d.month}</span>
                </button>
              );
            })}
          </div>
        </SectionV3>

        {/* Time grid */}
        <SectionV3 title="Orario" subtitle={`durata ${service.dur} min`}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6 }}>
            {TIME_SLOTS.map(t => {
              const taken = TAKEN.has(t);
              const sel = time === t;
              return (
                <button key={t}
                        disabled={taken}
                        onClick={() => setTime(t)}
                        className={`mappa-slot ${sel ? "selected" : ""} ${taken ? "taken" : ""}`}>
                  {t}
                </button>
              );
            })}
          </div>
        </SectionV3>

        {/* Summary + CTA — sticky */}
        <div style={{
          position:"sticky", bottom:0,
          padding:"18px 20px 24px",
          background:"linear-gradient(180deg, transparent, var(--surface) 30%)",
          borderTop:"1px solid var(--line)",
        }}>
          <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10.5, color:"var(--ink-40)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
                Totale · {service.dur} min
              </div>
              <div style={{ marginTop:4, fontFamily:"var(--font-mono)", fontSize:28, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.02em" }}>
                €{service.price},00
              </div>
            </div>
            <div style={{ textAlign:"right", fontSize:11.5, color:"var(--ink-60)" }}>
              {dates[dateIdx].day} {dates[dateIdx].num} {dates[dateIdx].month}<br/>
              <span style={{ fontFamily:"var(--font-mono)", fontWeight:600, color: time ? "var(--accent)" : "var(--ink-40)" }}>
                {time ?? "scegli orario"}
              </span>
            </div>
          </div>
          <button
            onClick={() => time && onConfirm({ barber, date:dates[dateIdx], time, service })}
            disabled={!time}
            className="mappa-btn accent block tall"
            style={{ opacity: time ? 1 : 0.4, cursor: time ? "pointer" : "not-allowed" }}>
            {time ? <>Conferma alle {time}</> : "Scegli un orario"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionV3({ title, subtitle, children }) {
  return (
    <div style={{ padding:"20px 20px 4px" }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>{title}</span>
        {subtitle && <span style={{ fontSize:11, color:"var(--ink-40)" }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   TOAST
   ============================================================ */
function ToastV3({ title, message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position:"absolute", top:18, left:18, right:18, zIndex:200,
      padding:"14px 16px",
      background:"var(--ink)", color:"var(--surface)",
      borderRadius:"var(--r-md)",
      display:"flex", gap:12, alignItems:"flex-start",
      boxShadow:"0 18px 40px -14px rgba(0,0,0,0.4)",
      animation:"slideUp 280ms var(--ease-spring)",
    }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--accent)",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon name="check" size={18} color="white" strokeWidth={2.5}/>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:600, letterSpacing:"-0.015em" }}>{title}</div>
        {message && <div style={{ marginTop:3, fontSize:12.5, opacity:0.72 }}>{message}</div>}
      </div>
      <button onClick={onClose} style={{
        background:"none", border:"none", padding:0, cursor:"pointer",
        color:"rgba(255,255,255,0.6)",
      }}>
        <Icon name="close" size={14}/>
      </button>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
function MappaApp() {
  // sheet mode: "browse" | "card" | "agenda" | "profile"
  const [mode, setMode] = useState("browse");
  // sheet snap when browsing: "peek" | "mid" | "full"
  const [snap, setSnap] = useState("peek");
  const [selectedId, setSelectedId] = useState(null);
  const [bookingBarber, setBookingBarber] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [demoOn, setDemoOn] = useState(false);

  const filteredBarbers = useMemo(() => {
    if (activeFilter === "open") return BARBERS.filter(b => b.status === "open");
    if (activeFilter === "near") return BARBERS.filter(b => b.dist <= 1.5);
    if (activeFilter === "top")  return BARBERS.filter(b => b.rating >= 4.8);
    return BARBERS;
  }, [activeFilter]);

  // Determine sheet height
  const selected = BARBERS.find(b => b.id === selectedId);
  let sheetHeight;
  if (mode === "agenda" || mode === "profile") sheetHeight = "94%";
  else if (mode === "card") sheetHeight = "auto";
  else if (snap === "peek") sheetHeight = 188;
  else if (snap === "mid")  sheetHeight = "60%";
  else                       sheetHeight = "94%";

  // Demo API
  const demoApi = {
    selectBarber: (id) => { setMode("card"); setSelectedId(id); },
    openBooking: (id) => {
      const b = BARBERS.find(x => x.id === id);
      if (b) setBookingBarber(b);
    },
    selectTime: (t) => {
      // bubble down via a custom event
      window.__demoSelectedTime = t;
      window.dispatchEvent(new CustomEvent("__demoSelectTime", { detail: t }));
    },
    confirm: () => {
      window.dispatchEvent(new CustomEvent("__demoConfirm"));
    },
  };

  return (
    <div className="mappa-app">
      <div className="mappa-screen">
        {/* MAP */}
        <MapCanvas>
          {filteredBarbers.map(b => (
            <Pin key={b.id} b={b}
                 selected={b.id === selectedId}
                 onClick={() => { setMode("card"); setSelectedId(b.id); setSnap("peek"); }}/>
          ))}
        </MapCanvas>

        {/* SEARCH */}
        <div className="mappa-search">
          <Icon name="search" size={17} color="var(--ink-60)"/>
          <input placeholder="Cerca barbiere, via, stile…"/>
          <Mark size={16}/>
        </div>

        {/* AGENDA PILL — top-left, sticky upcoming */}
        <button onClick={() => { setMode("agenda"); setSelectedId(null); }} style={{
          position:"absolute", top:74, left:18, zIndex:40,
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"7px 12px 7px 8px",
          background:"var(--ink)", color:"var(--surface)",
          border:"none",
          borderRadius:"var(--r-pill)",
          boxShadow:"var(--shadow-float)",
          fontSize:12, fontWeight:500,
          cursor:"pointer",
          fontFamily:"inherit",
        }}>
          <span style={{
            width:24, height:24, borderRadius:"50%",
            background:"var(--accent)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="clock" size={13} color="white" strokeWidth={2}/>
          </span>
          <span>sab · <span style={{ fontFamily:"var(--font-mono)", fontWeight:600 }}>10:00</span> Marco</span>
          <Icon name="caret" size={12} color="rgba(255,255,255,0.6)"/>
        </button>

        {/* PROFILE BUTTON — top-left of map, below agenda pill */}
        <button onClick={() => { setMode("profile"); setSelectedId(null); }} style={{
          position:"absolute", top:118, left:18, zIndex:40,
          width:38, height:38, borderRadius:"50%",
          background:"var(--surface)",
          border:"none", cursor:"pointer",
          boxShadow:"var(--shadow-float)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600, color:"var(--ink)",
        }}>AP</button>

        {/* DEMO BUTTON — bottom-left, above sheet, only visible in browse mode */}
        {mode === "browse" && !demoOn && (
          <button onClick={() => setDemoOn(true)} style={{
            position:"absolute", left:18, bottom: (typeof sheetHeight === "number" ? sheetHeight + 18 : 220),
            zIndex:40,
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"9px 14px 9px 11px",
            background:"var(--ink)", color:"var(--surface)",
            border:"none", borderRadius:"var(--r-pill)",
            boxShadow:"var(--shadow-float)",
            fontSize:12, fontWeight:600,
            cursor:"pointer",
            fontFamily:"inherit",
            letterSpacing:"-0.01em",
          }}>
            <span style={{
              width:18, height:18, borderRadius:"50%",
              background:"var(--accent)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><polygon points="1.5 0.5, 7 4, 1.5 7.5"/></svg>
            </span>
            Guarda demo
          </button>
        )}

        {/* FILTER CHIPS — right side, vertical */}
        <div style={{
          position:"absolute", top:74, right:18, zIndex:40,
          display:"flex", flexDirection:"column", gap:6,
        }}>
          {[
            ["all", "Tutti"],
            ["open", "Aperti"],
            ["near", "Vicini"],
            ["top", "Top"],
          ].map(([id,l]) => (
            <button key={id} onClick={() => setActiveFilter(id)} className={`mappa-chip ${activeFilter === id ? "active" : ""}`}>
              {l}
            </button>
          ))}
        </div>

        {/* FABs — bottom-right above sheet, only in browse mode */}
        {mode === "browse" && (
          <>
            <button className="mappa-fab" style={{ right:18, bottom: typeof sheetHeight === "number" ? sheetHeight + 18 : 200 }}>
              <Icon name="locate" size={20}/>
            </button>
            <button className="mappa-fab" style={{ right:18, bottom: typeof sheetHeight === "number" ? sheetHeight + 76 : 258 }}>
              <Icon name="layers" size={18}/>
            </button>
          </>
        )}

        {/* SHEET */}
        <div className="mappa-sheet" style={{
          height: sheetHeight,
          maxHeight: "94%",
        }}>
          <div className="mappa-sheet__grab"
               onClick={() => {
                 if (mode !== "browse") return;
                 setSnap(snap === "peek" ? "mid" : snap === "mid" ? "full" : "peek");
               }}/>
          <div className="mappa-sheet__body">
            {mode === "agenda" ? (
              <AgendaSheet
                onClose={() => setMode("browse")}
                onTapBarber={(id) => { setMode("card"); setSelectedId(id); }}
                onRepeat={() => {
                  setMode("browse");
                  setBookingBarber(BARBERS.find(b => b.id === "m"));
                }}
              />
            ) : mode === "profile" ? (
              <ProfileSheet onClose={() => setMode("browse")} />
            ) : mode === "card" ? (
              <CardSheet
                barber={selected}
                onClose={() => { setMode("browse"); setSelectedId(null); }}
                onBook={(b) => setBookingBarber(b)}
              />
            ) : snap === "peek" ? (
              <PeekSheet barbers={filteredBarbers} onSelect={(id) => { setMode("card"); setSelectedId(id); }} />
            ) : (
              <ListSheet
                barbers={filteredBarbers}
                onSelect={(id) => { setMode("card"); setSelectedId(id); }}
                snap={snap}
                onSnapToggle={() => setSnap(snap === "full" ? "mid" : "full")}
              />
            )}
          </div>
        </div>

        {/* BOOKING OVERLAY */}
        {bookingBarber && (
          <BookingSheet
            barber={bookingBarber}
            onClose={() => setBookingBarber(null)}
            onConfirm={({ date, time, service }) => {
              setBookingBarber(null);
              setSelectedId(null);
              setMode("browse");
              setToast({
                title: "Prenotato.",
                message: `${date.day} ${date.num} ${date.month} · ${time} · ${service.name}`,
              });
            }}
          />
        )}

        {toast && <ToastV3 {...toast} onClose={() => setToast(null)}/>}

        {/* DEMO CONTROLLER */}
        {demoOn && (
          <DemoController
            api={demoApi}
            onStop={() => {
              setDemoOn(false);
              setMode("browse");
              setSelectedId(null);
              setBookingBarber(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MappaApp/>);
