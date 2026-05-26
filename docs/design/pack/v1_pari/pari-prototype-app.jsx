/* Pari · Prototype entry — focused on the client booking golden path.
   Tweaks reduced to: theme (light/dark/auto), role (client/barber/admin),
   iPhone frame on/off. Re-uses primitives/sheets/screens.jsx unmodified. */

const { useState: useStateP, useEffect: useEffectP } = React;

/* ----- URL param overrides for the "Pages" canvas view.
        Allows iframe URLs like ?tab=feed&skipAuth=1 to boot
        directly into any screen of the prototype. ----- */
function readUrlOverrides() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    tab: p.get("tab"),
    role: p.get("role"),
    skipAuth: p.get("skipAuth") === "1",
    auth: p.get("auth"),                  // welcome | login | register | reset | reset-sent
    overlay: p.get("overlay"),
    profileBarberId: p.get("profileBarber"),
    bookingBarberId: p.get("bookingBarber"),
    framelessParam: p.get("frame"),
    hideTweaks: p.get("hideTweaks") === "1",
  };
}
const URL_OVERRIDES = readUrlOverrides();

/* ----- Default tweak values (host can rewrite this JSON block) ----- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "role": "client",
  "showFrame": true
}/*EDITMODE-END*/;

/* ----- Nav definitions per role.
        Client / Admin = 4 tabs; Barbiere = 5 tabs (extra: Bottega). ----- */
const NAV_BY_ROLE = {
  client: [
    ["feed",     "feed", "Feed"],
    ["esplora",  "map",  "Esplora"],
    ["profilo",  "user", "Profilo"],
    ["menu",     "menu", "Menu"],
  ],
  barber: [
    ["feed",     "feed",  "Feed"],
    ["esplora",  "map",   "Esplora"],
    ["bottega",  "shop",  "Bottega"],
    ["profilo",  "user",  "Profilo"],
    ["menu",     "menu",  "Menu"],
  ],
  admin: [
    ["feed",     "feed",     "Feed"],
    ["esplora",  "map",      "Esplora"],
    ["admin",    "settings", "Admin"],
    ["menu",     "menu",     "Menu"],
  ],
};

/* After login the user should land on the most-relevant tab for their role.
   Client lands on Esplora — the entry point of the prenotazione golden path. */
const DEFAULT_TAB = { client: "esplora", barber: "bottega", admin: "admin" };

/* ============================================================
   PARI APP — root component for the framed prototype.
   ============================================================ */
function PariApp({ role, onChangeRole, theme, onChangeTheme }) {
  const [authStage, setAuthStage] = useStateP(URL_OVERRIDES.skipAuth ? "app" : "login");
  const [tab, setTab]             = useStateP(URL_OVERRIDES.tab || DEFAULT_TAB[role]);
  const [bookingBarber, setBookingBarber] = useStateP(() => {
    if (!URL_OVERRIDES.bookingBarberId || typeof DEMO_BARBERS === "undefined") return null;
    return DEMO_BARBERS.find(b => b.id === URL_OVERRIDES.bookingBarberId) || null;
  });
  const [profileBarber, setProfileBarber] = useStateP(() => {
    if (!URL_OVERRIDES.profileBarberId || typeof DEMO_BARBERS === "undefined") return null;
    return DEMO_BARBERS.find(b => b.id === URL_OVERRIDES.profileBarberId) || null;
  });
  const [overlay, setOverlay]     = useStateP(URL_OVERRIDES.overlay || null);
  const [toast, setToast] = useStateP(null);

  /* When the role tweak changes from outside, jump to that role's home tab
     and dismiss any open sheets so the user isn't stuck in a stale context. */
  useEffectP(() => {
    setTab(DEFAULT_TAB[role]);
    setBookingBarber(null);
    setProfileBarber(null);
    setOverlay(null);
  }, [role]);

  function handleConfirm(barber, date, time) {
    setBookingBarber(null);
    setProfileBarber(null);
    setToast({
      kind: "success",
      title: "Prenotato.",
      message: `${date.label} ${date.num} ${date.mese} · ${time} · ${barber.name}`,
    });
  }

  if (authStage === "login") {
    return (
      <div className="bb-app bb-app--framed">
        <PariScreenAuth defaultView={URL_OVERRIDES.auth || "welcome"} onLogin={(loginRole) => {
          if (loginRole === "barber" && role !== "barber") onChangeRole?.("barber");
          setAuthStage("app");
        }} />
      </div>
    );
  }

  const nav = NAV_BY_ROLE[role];

  return (
    <div className="bb-app bb-app--framed">
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {tab === "feed" && <PariScreenFeed
          barbers={DEMO_BARBERS} posts={DEMO_POSTS}
          onOpenBooking={setBookingBarber}
          onOpenProfile={setProfileBarber}
          onOpenNotifications={() => setOverlay("notifications")}
          onOpenMessages={() => setOverlay("messages")}
          onNewPost={() => setOverlay("new-post")}
        />}
        {tab === "esplora" && <PariScreenDiscover
          onOpenBooking={setBookingBarber}
          onOpenProfile={setProfileBarber}
        />}
        {tab === "profilo" && <PariScreenProfile
          role={role === "admin" ? "client" : role}
          onOpenProfile={setProfileBarber}
          onOpenBooking={setBookingBarber}
          onOpenAppointments={() => setOverlay("appointments")}
          onNewPost={() => setOverlay("new-post")}
        />}
        {tab === "menu" && <PariScreenMenu
          role={role === "admin" ? "client" : role}
          theme={theme}
          onChangeTheme={onChangeTheme}
          onOpenAppointments={() => setOverlay("appointments")}
          onOpenNotifications={() => setOverlay("notifications")}
          onOpenMessages={() => setOverlay("messages")}
          onOpenSupport={() => setOverlay("support")}
          onChangeRole={() => onChangeRole(role === "barber" ? "client" : "barber")}
          onLogout={() => { setAuthStage("login"); }}
        />}
        {tab === "bottega" && <PariScreenBottega
          onOpenInfo={() => setOverlay("edit-barber-info")}
        />}
        {tab === "admin" && <PariScreenAdmin />}

        {bookingBarber && (
          <PariBookingSheet
            barber={bookingBarber}
            onClose={() => setBookingBarber(null)}
            onConfirm={handleConfirm}
          />
        )}

        {profileBarber && (
          <PariBarberProfileSheet
            barber={profileBarber}
            onClose={() => setProfileBarber(null)}
            onBook={(b) => { setProfileBarber(null); setBookingBarber(b); }}
            onMessage={() => setProfileBarber(null)}
          />
        )}

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}

        {overlay === "appointments" && (
          <PariMyAppointments onClose={() => setOverlay(null)} />
        )}
        {overlay === "notifications" && (
          <PariNotificationsOverlay onClose={() => setOverlay(null)} />
        )}
        {overlay === "messages" && (
          <PariMessagesOverlay onClose={() => setOverlay(null)} />
        )}
        {overlay === "support" && (
          <PariSupportOverlay onClose={() => setOverlay(null)} />
        )}
        {overlay === "edit-barber-info" && (
          <PariEditBarberInfoSheet
            onClose={() => setOverlay(null)}
            onSave={() => {
              setOverlay(null);
              setToast({ kind: "success", title: "Salvato.", message: "Info salone aggiornate." });
            }}
          />
        )}
        {overlay === "new-post" && (
          <PariNewUserPostSheet
            role={role === "barber" ? "barber" : "client"}
            onClose={() => setOverlay(null)}
            onSubmit={() => {
              setOverlay(null);
              setToast({ kind: "success", title: "Pubblicato.", message: "Il post è visibile nel feed." });
            }}
          />
        )}
      </div>

      <nav className="bb-bottom-nav">
        <div className="bb-bottom-nav__row">
          {nav.map(([id, icon, label]) => (
            <button key={id}
              className={`bb-bottom-nav__btn ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon name={icon} size={22} color="currentColor" />
              <span className="lbl">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ============================================================
   THEME RESOLVER — light / dark / auto.
   In auto we listen to prefers-color-scheme so the UI flips
   live if the OS changes appearance.
   ============================================================ */
function useResolvedTheme(theme) {
  const [resolved, setResolved] = useStateP(() => {
    if (theme === "auto") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  });

  useEffectP(() => {
    if (theme !== "auto") { setResolved(theme); return; }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setResolved(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return resolved;
}

/* ============================================================
   ROOT PROTOTYPE — tweaks panel + frame + app.
   ============================================================ */
function Prototype() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // URL overrides win over defaults
  const roleEff = URL_OVERRIDES.role || t.role;
  const showFrameEff = URL_OVERRIDES.framelessParam === "0" ? false : t.showFrame;
  const resolved = useResolvedTheme(t.theme);
  const isDark = resolved === "dark";

  useEffectP(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  return (
    <React.Fragment>
      <style>{`
        .bb-app--framed {
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding-top: 46px;
          padding-bottom: 24px;
          background: var(--paper-3);
        }
        body {
          background: ${t.showFrame ? (isDark ? "#0C0A08" : "#FAF6EE") : "var(--paper-3)"};
          transition: background var(--d-med) var(--ease);
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, overflow: "hidden",
      }}>
        {showFrameEff ? (
          <IOSDevice width={402} height={870} dark={isDark}>
            <div style={{ height: "100%", width: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <PariApp role={roleEff}
                onChangeRole={(r) => setTweak("role", r)}
                theme={t.theme}
                onChangeTheme={(v) => setTweak("theme", v)} />
            </div>
          </IOSDevice>
        ) : (
          <div style={{
            width: "100%", maxWidth: 430, height: "100%",
            display: "flex", flexDirection: "column",
            boxShadow: URL_OVERRIDES.framelessParam === "0" ? "none" : "0 0 0 1px var(--ink-08), 0 24px 60px -24px rgba(46,42,37,0.14)",
            borderRadius: URL_OVERRIDES.framelessParam === "0" ? 0 : 18,
            overflow: "hidden",
            background: "var(--paper-3)",
          }}>
            <PariApp role={roleEff}
              onChangeRole={(r) => setTweak("role", r)}
              theme={t.theme}
              onChangeTheme={(v) => setTweak("theme", v)} />
          </div>
        )}
      </div>

      {!URL_OVERRIDES.hideTweaks && (
        <TweaksPanel title="Tweaks">
          <TweakSection label="Tema">
            <TweakRadio
              label="Schema colore"
              value={t.theme}
              onChange={(v) => setTweak("theme", v)}
              options={[
                { value: "light", label: "Chiaro" },
                { value: "dark",  label: "Scuro"  },
                { value: "auto",  label: "Auto"   },
              ]}
            />
          </TweakSection>

          <TweakSection label="Ruolo utente">
            <TweakRadio
              label="Visualizza come"
              value={t.role}
              onChange={(v) => setTweak("role", v)}
              options={[
                { value: "client", label: "Cliente"  },
                { value: "barber", label: "Barbiere" },
                { value: "admin",  label: "Admin"    },
              ]}
            />
          </TweakSection>

          <TweakSection label="Display">
            <TweakToggle
              label="iPhone frame"
              value={t.showFrame}
              onChange={(v) => setTweak("showFrame", v)}
            />
          </TweakSection>
        </TweaksPanel>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Prototype />);
