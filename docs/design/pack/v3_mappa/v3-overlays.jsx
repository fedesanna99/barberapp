/* eslint-disable */
/* ============================================================
   V3 · Overlay sheets — Agenda + Profilo
   These live INSIDE the map app shell, replacing the sheet body
   without ever leaving the map context.
   ============================================================ */

const APPTS = [
  { id:1, barberId:"m", date:"sab 31 mag", time:"10:00", service:"Taglio + barba", status:"confermato",  price:28 },
  { id:2, barberId:"e", date:"mer 4 giu",  time:"18:30", service:"Donna · taglio", status:"in attesa",   price:34 },
  { id:3, barberId:"n", date:"sab 14 giu", time:"11:00", service:"Pompadour",      status:"confermato",  price:22 },
];
const PAST_APPTS = [
  { id:4, barberId:"f", date:"sab 17 mag", service:"Taper",      price:18 },
  { id:5, barberId:"m", date:"sab 10 mag", service:"Skin fade",  price:18 },
  { id:6, barberId:"n", date:"sab  3 mag", service:"Classico",   price:18 },
  { id:7, barberId:"m", date:"sab 26 apr", service:"Skin fade",  price:18 },
];

const STATUS_BG = {
  "confermato": "rgba(47,122,77,0.13)",
  "in attesa":  "rgba(194,86,44,0.13)",
};
const STATUS_FG = {
  "confermato": "var(--pin-open)",
  "in attesa":  "var(--accent)",
};

/* ============================================================
   AGENDA SHEET — replaces the regular sheet body when in agenda mode
   ============================================================ */
function AgendaSheet({ onClose, onRepeat, onTapBarber }) {
  return (
    <div>
      {/* sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:3,
        padding:"6px 20px 14px",
        background:"var(--surface)",
        borderBottom:"1px solid var(--line)",
      }}>
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          marginBottom:14,
        }}>
          <button onClick={onClose} style={{
            width:34, height:34, borderRadius:"50%",
            background:"var(--bg-2)", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <Icon name="back" size={16} color="var(--ink)"/>
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
              Le tue sedie
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.025em" }}>
              Agenda
            </div>
          </div>
          <div style={{ display:"flex", gap:4, padding:3, background:"var(--bg-2)", borderRadius:"var(--r-pill)" }}>
            {[["next","Prossimi"],["past","Storia"]].map(([id,l],i) => (
              <button key={id} style={{
                padding:"6px 12px", borderRadius:"var(--r-pill)",
                border:"none", cursor:"pointer",
                background: i === 0 ? "var(--surface)" : "transparent",
                boxShadow: i === 0 ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                color: i === 0 ? "var(--ink)" : "var(--ink-60)",
                fontFamily:"inherit", fontSize:12, fontWeight:500,
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display:"flex", gap:6 }}>
          {[
            ["3",  "Prossimi"],
            ["12", "Tagli totali"],
            ["€216","Spesi nel '26"],
          ].map(([v,l]) => (
            <div key={l} style={{
              flex:1, padding:"10px 12px",
              background:"var(--bg-2)", borderRadius:"var(--r-md)",
            }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:18, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.015em", lineHeight:1 }}>{v}</div>
              <div style={{ marginTop:4, fontSize:10.5, color:"var(--ink-60)", letterSpacing:"0.04em", textTransform:"uppercase", fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PROSSIMI */}
      <div style={{ padding:"18px 20px 6px" }}>
        <div style={{
          fontSize:11, color:"var(--ink-60)",
          letterSpacing:"0.06em", textTransform:"uppercase",
          fontWeight:500, marginBottom:10,
        }}>Prossimi · {APPTS.length}</div>

        {APPTS.map((a, i) => {
          const b = BARBERS.find(x => x.id === a.barberId);
          if (!b) return null;
          return (
            <div key={a.id} style={{
              display:"flex", gap:14, padding:"16px 0",
              borderBottom: i < APPTS.length - 1 ? "1px solid var(--line)" : "none",
            }}>
              {/* mono date pill */}
              <div style={{
                width:60, flexShrink:0,
                padding:"10px 0",
                background:"var(--bg-2)",
                borderRadius:"var(--r-md)",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                color:"var(--ink)",
              }}>
                <span style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--ink-60)" }}>
                  {a.date.split(" ")[0]}
                </span>
                <span style={{
                  fontFamily:"var(--font-mono)", fontSize:22, fontWeight:600,
                  lineHeight:1, color:"var(--ink)", letterSpacing:"-0.01em",
                }}>
                  {a.date.split(" ")[1]}
                </span>
                <span style={{ fontSize:10, color:"var(--ink-60)" }}>{a.date.split(" ")[2]}</span>
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:13, fontWeight:600, color:"var(--ink)" }}>
                    {a.time}
                  </span>
                  <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--ink-40)" }}/>
                  <span style={{ fontSize:12, color:"var(--ink-60)" }}>{a.service}</span>
                </div>
                <button onClick={() => onTapBarber(b.id)} style={{
                  background:"none", border:"none", padding:0, cursor:"pointer",
                  fontSize:15, fontWeight:600, color:"var(--ink)", letterSpacing:"-0.015em",
                  textAlign:"left",
                }}>
                  {b.name}
                </button>
                <div style={{ marginTop:4, fontSize:11.5, color:"var(--ink-60)" }}>
                  {b.shop} · {b.neigh}
                </div>
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{
                    padding:"3px 9px",
                    borderRadius:"var(--r-pill)",
                    background: STATUS_BG[a.status],
                    color: STATUS_FG[a.status],
                    fontSize:11, fontWeight:500, textTransform:"capitalize",
                  }}>{a.status}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:11.5, color:"var(--ink-60)" }}>
                    €{a.price}
                  </span>
                  <span style={{ flex:1 }}/>
                  <button style={{
                    padding:"5px 10px",
                    background:"transparent", border:"1px solid var(--ink-15)",
                    borderRadius:"var(--r-pill)", cursor:"pointer",
                    fontSize:11, color:"var(--ink-80)", fontWeight:500,
                  }}>Sposta</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick repeat */}
      <div style={{ padding:"22px 20px 10px" }}>
        <div style={{
          fontSize:11, color:"var(--ink-60)",
          letterSpacing:"0.06em", textTransform:"uppercase",
          fontWeight:500, marginBottom:10,
        }}>Ripeti l'ultimo · 1 tap</div>
        <button onClick={() => onRepeat(PAST_APPTS[0])} style={{
          width:"100%", textAlign:"left",
          padding:"14px 16px",
          background:"var(--bg-2)",
          border:"none", borderRadius:"var(--r-md)",
          cursor:"pointer",
          display:"flex", alignItems:"center", gap:14,
        }}>
          <div style={{
            width:42, height:42, borderRadius:"50%",
            background:"var(--accent)", color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>
            <Icon name="scissors" size={18} color="#fff" strokeWidth={2}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)" }}>
              Skin fade da Marco
            </div>
            <div style={{ marginTop:2, fontSize:11.5, color:"var(--ink-60)" }}>
              come 17 mag · 30 min · €18
            </div>
          </div>
          <Icon name="arrowRight" size={16} color="var(--ink-60)"/>
        </button>
      </div>

      {/* History (collapsed teaser) */}
      <div style={{ padding:"22px 20px 30px" }}>
        <div style={{
          fontSize:11, color:"var(--ink-60)",
          letterSpacing:"0.06em", textTransform:"uppercase",
          fontWeight:500, marginBottom:10,
        }}>Storia · {PAST_APPTS.length} tagli</div>
        {PAST_APPTS.map((p, i) => {
          const b = BARBERS.find(x => x.id === p.barberId);
          if (!b) return null;
          return (
            <div key={p.id} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"12px 0",
              borderBottom: i < PAST_APPTS.length - 1 ? "1px solid var(--line)" : "none",
              opacity:0.75,
            }}>
              <div style={{
                width:30, height:30, flexShrink:0,
                borderRadius:"50%",
                background:"var(--bg-2)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"var(--font-mono)", fontSize:11, fontWeight:600, color:"var(--ink)",
              }}>
                {b.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:"var(--ink)" }}>{b.name}</div>
                <div style={{ marginTop:2, fontSize:11, color:"var(--ink-60)" }}>{p.service} · {p.date}</div>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--ink-60)" }}>€{p.price}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE SHEET
   ============================================================ */
function ProfileSheet({ onClose }) {
  return (
    <div>
      {/* sticky header */}
      <div style={{
        position:"sticky", top:0, zIndex:3,
        padding:"6px 20px 14px",
        background:"var(--surface)",
        borderBottom:"1px solid var(--line)",
        display:"flex", alignItems:"center", gap:10,
      }}>
        <button onClick={onClose} style={{
          width:34, height:34, borderRadius:"50%",
          background:"var(--bg-2)", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <Icon name="back" size={16} color="var(--ink)"/>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
            Cliente
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.025em" }}>
            Tu
          </div>
        </div>
        <button style={{
          background:"none", border:"none", cursor:"pointer",
          fontSize:12, color:"var(--accent)", fontWeight:500,
          padding:"6px 12px",
        }}>Esci</button>
      </div>

      {/* Identity row */}
      <div style={{ padding:"20px 20px 6px", display:"flex", alignItems:"center", gap:14 }}>
        <div style={{
          width:64, height:64, borderRadius:"50%",
          background:"linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%)",
          color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-mono)", fontSize:24, fontWeight:600,
          flexShrink:0, boxShadow:"0 4px 14px -4px rgba(194,86,44,0.3)",
        }}>AP</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:20, fontWeight:700, color:"var(--ink)", letterSpacing:"-0.025em", lineHeight:1.1 }}>
            Andrea Pinna
          </div>
          <div style={{ marginTop:4, fontSize:12.5, color:"var(--ink-60)" }}>
            Castello, Cagliari · iscritto a settembre
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding:"22px 20px 6px" }}>
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(3, 1fr)",
          gap:6,
        }}>
          {[
            ["12", "Tagli", null],
            ["3", "Barbieri", null],
            ["4.9", "★", "var(--accent)"],
          ].map(([v,l,c]) => (
            <div key={l} style={{
              padding:"14px 12px",
              background:"var(--bg-2)", borderRadius:"var(--r-md)",
              textAlign:"center",
            }}>
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:22, fontWeight:600,
                color: c ?? "var(--ink)", letterSpacing:"-0.015em", lineHeight:1,
              }}>{v}</div>
              <div style={{ marginTop:6, fontSize:10.5, color:"var(--ink-60)", letterSpacing:"0.04em", textTransform:"uppercase", fontWeight:500 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite barbers */}
      <div style={{ padding:"24px 20px 6px" }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:10,
        }}>
          <span style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500 }}>
            Preferiti
          </span>
          <span style={{ fontSize:11, color:"var(--ink-40)" }}>3 barbieri</span>
        </div>
        {[BARBERS[0], BARBERS[2], BARBERS[3]].map((b, i, arr) => (
          <div key={b.id} style={{
            display:"flex", alignItems:"center", gap:12, padding:"12px 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <div style={{
              width:36, height:36, borderRadius:"50%",
              background:"var(--bg-2)", color:"var(--ink)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600,
              flexShrink:0,
            }}>
              {b.name.split(" ").map(n=>n[0]).join("")}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--ink)" }}>{b.name}</div>
              <div style={{ marginTop:2, fontSize:11, color:"var(--ink-60)" }}>
                {b.shop} · ultimo taglio 17 mag
              </div>
            </div>
            <Icon name="heart" size={16} color="var(--accent)" fill/>
          </div>
        ))}
      </div>

      {/* Preferences */}
      <div style={{ padding:"24px 20px 10px" }}>
        <div style={{ fontSize:11, color:"var(--ink-60)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:500, marginBottom:10 }}>
          Preferenze
        </div>
        {[
          ["Stile preferito", "Skin fade + barba"],
          ["Frequenza", "ogni 3 settimane"],
          ["Promemoria", "1 ora prima"],
          ["Pagamento", "Apple Pay"],
          ["Lingua", "italiano"],
        ].map(([k,v], i, arr) => (
          <div key={k} style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"14px 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <span style={{ fontSize:13, color:"var(--ink-60)" }}>{k}</span>
            <span style={{ fontSize:13, color:"var(--ink)", fontWeight:500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 30 }}/>
    </div>
  );
}
