/* eslint-disable */
/* ============================================================
   V3 · Mini-demo controller
   ------------------------------------------------------------
   Auto-walks through the key flow with captions.
   Mounts INSIDE the MappaApp via the `__demo` global hook.
   ============================================================ */

const DEMO_STEPS = [
  {
    caption: "Sette bottega vicino a te a Cagliari.",
    sub: "Verde · aperto. Arancio · occupato. Marrone · chiuso. Il prezzo del taglio è sul pin.",
    duration: 2800,
    action: () => {},
  },
  {
    caption: "Tap su un pin per la scheda rapida.",
    sub: "Niente cambio schermo. Tutto sopra la mappa.",
    duration: 2400,
    action: (api) => api.selectBarber("m"),
  },
  {
    caption: "Stato live, rating, distanza, prezzo da.",
    sub: "Lo strettissimo necessario per decidere.",
    duration: 2600,
    action: () => {},
  },
  {
    caption: "Slot di oggi a portata di pollice.",
    sub: "Per i clienti decisi: scegli e finito. Per gli indecisi: \"Prenota una sedia\" apre il sheet completo.",
    duration: 3000,
    action: () => {},
  },
  {
    caption: "Booking inline, stesso gesto.",
    sub: "Servizio, giorno, ora. Niente checkout in 4 pagine.",
    duration: 2400,
    action: (api) => api.openBooking("m"),
  },
  {
    caption: "Scegli un orario.",
    sub: "Mono per i numeri, ink solido per la selezione, barrato chiaro per i pieni.",
    duration: 2800,
    action: (api) => api.selectTime("11:00"),
  },
  {
    caption: "Conferma.",
    sub: "Toast in alto, sheet si chiude, mappa torna pulita.",
    duration: 2200,
    action: (api) => api.confirm(),
  },
  {
    caption: "Niente bottom-nav, niente cambio di contesto.",
    sub: "La prenotazione è successa sopra la mappa, dall'inizio alla fine.",
    duration: 3200,
    action: () => {},
  },
  {
    caption: "Prova tu.",
    sub: "",
    duration: 2400,
    action: () => {},
    end: true,
  },
];

function DemoController({ api, onStop }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const step = DEMO_STEPS[stepIdx];

  useEffect(() => {
    if (!running) return;
    // Trigger the step's action
    step.action(api);

    if (step.end) {
      const t = setTimeout(() => onStop(), step.duration);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setStepIdx(i => Math.min(i + 1, DEMO_STEPS.length - 1));
    }, step.duration);
    return () => clearTimeout(t);
  }, [stepIdx, running]);

  return (
    <>
      {/* TOP CAPTION CARD */}
      <div style={{
        position:"absolute", top:18, left:18, right:18,
        zIndex: 300,
        background:"var(--ink)",
        color:"var(--surface)",
        borderRadius:"var(--r-md)",
        padding:"14px 14px 12px",
        boxShadow:"0 16px 40px -14px rgba(0,0,0,0.4)",
        animation:"slideUp 280ms var(--ease-spring)",
      }}>
        {/* progress dots */}
        <div style={{
          display:"flex", gap:4, marginBottom:10,
        }}>
          {DEMO_STEPS.map((_, i) => (
            <span key={i} style={{
              flex:1, height:3, borderRadius:9999,
              background: i <= stepIdx ? "var(--accent)" : "rgba(252,250,245,0.15)",
              transition: "background 240ms var(--ease)",
            }}/>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{
            flexShrink:0,
            width:26, height:26, borderRadius:"50%",
            background:"var(--accent)",
            color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"var(--font-mono)", fontSize:12, fontWeight:600,
          }}>
            {String(stepIdx+1).padStart(2,"0")}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:15, fontWeight:600, lineHeight:1.25,
              letterSpacing:"-0.015em",
            }}>{step.caption}</div>
            {step.sub && (
              <div style={{
                marginTop:4,
                fontSize:12, lineHeight:1.45,
                color:"rgba(252,250,245,0.62)",
              }}>{step.sub}</div>
            )}
          </div>
          <button onClick={onStop} style={{
            flexShrink:0,
            width:28, height:28, borderRadius:"50%",
            background:"rgba(252,250,245,0.10)",
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"rgba(252,250,245,0.7)",
          }}>
            <Icon name="close" size={13}/>
          </button>
        </div>
      </div>

      {/* DIM overlay on map only, not on sheet */}
      <div style={{
        position:"absolute", inset:0, zIndex:5,
        pointerEvents:"none",
        background:"radial-gradient(60% 50% at 50% 35%, transparent 0%, rgba(0,0,0,0.18) 100%)",
      }}/>
    </>
  );
}

/* Expose the controller so v3-app.jsx can render it */
window.DemoController = DemoController;
window.DEMO_STEPS = DEMO_STEPS;
