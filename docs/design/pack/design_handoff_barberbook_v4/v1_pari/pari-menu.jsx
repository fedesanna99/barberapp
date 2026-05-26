/* Pari · Menu (cliente · barbiere · admin).
   Hub that links to MyAppointments, DMs, Notifiche, Salvati, Posizione,
   Invita, Aiuto, plus inline theme switcher + logout with confirm. */

const { useState: useStateMnu } = React;

function PariScreenMenu({
  role,
  theme, onChangeTheme,
  onOpenAppointments, onOpenNotifications, onOpenMessages, onOpenSupport,
  onChangeRole, onLogout,
  appointmentsBadge = 2,
  notificationsBadge = 3,
  messagesBadge = 2,
}) {
  const [confirmLogout, setConfirmLogout] = useStateMnu(false);

  const isBarber = role === "barber";

  return (
    <div className="bb-screen">
      <div className="bb-safe-top" />

      {/* Topbar */}
      <div className="bb-topbar">
        <div className="wordmark" style={{ fontSize: 19 }}>Menu</div>
        <div className="actions">
          <IconBtn name="settings" size={20} color="var(--ink-80)" label="Impostazioni" />
        </div>
      </div>

      {/* User card */}
      <div style={{
        margin: "0 20px 18px", padding: 14,
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        borderRadius: 14,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <Avatar
          initials={isBarber ? "MB" : "AG"}
          size={52}
          ring
          ringColor={isBarber ? "var(--clay)" : "var(--sage)"}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Pill tone={isBarber ? "clay" : "neutral"}>
              {isBarber ? "Barbiere" : "Cliente"}
            </Pill>
          </div>
          <div style={{
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: 17, letterSpacing: "-0.018em", color: "var(--ink)",
          }}>
            {isBarber ? "Marco Barba" : "Andrea Goretti"}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
            {isBarber ? "via Roma 21 · Cagliari" : "Cagliari"}
          </div>
        </div>
        <Button kind="hairline" size="sm">Modifica</Button>
      </div>

      {/* Attività section */}
      <PariMenuSection title="Attività">
        <PariMenuRow
          icon="calendar" label="Appuntamenti"
          hint={appointmentsBadge > 0 ? `${appointmentsBadge} prossimi` : null}
          onClick={onOpenAppointments}
        />
        <PariMenuRow
          icon="send" label="Messaggi"
          hint={messagesBadge > 0 ? `${messagesBadge} da leggere` : null}
          badge={messagesBadge}
          onClick={onOpenMessages}
        />
        <PariMenuRow
          icon="bell" label="Notifiche"
          hint={notificationsBadge > 0 ? `${notificationsBadge} nuove` : null}
          badge={notificationsBadge}
          onClick={onOpenNotifications}
        />
        <PariMenuRow icon="bookmark" label="Salvati" hint="14 post" />
      </PariMenuSection>

      {/* Preferenze section */}
      <PariMenuSection title="Preferenze">
        <PariMenuRow icon="pin" label="Posizione" hint="Cagliari" />
        <PariThemeRow theme={theme} onChange={onChangeTheme} />
      </PariMenuSection>

      {/* Altro section */}
      <PariMenuSection title="Altro">
        <PariMenuRow icon="share" label="Invita un amico" />
        <PariMenuRow icon="help" label="Aiuto e supporto" onClick={onOpenSupport} />
        <PariMenuRow icon="refresh"
          label={isBarber ? "Entra come cliente" : "Entra come barbiere"}
          onClick={onChangeRole}
          hint="demo" />
      </PariMenuSection>

      {/* Logout */}
      <div style={{ padding: "8px 20px 4px" }}>
        <Button kind="danger" onClick={() => setConfirmLogout(true)} style={{ width: "100%" }}>
          Esci
        </Button>
      </div>

      {/* App version */}
      <div style={{
        textAlign: "center", padding: "20px 20px 24px",
        fontSize: 11, color: "var(--ink-40)",
        fontFamily: "var(--font-mono)",
      }}>
        Pari · v1.0 · Cagliari
      </div>

      {/* Logout confirm sheet */}
      {confirmLogout && (
        <PariConfirmSheet
          title="Vuoi uscire?"
          body="Dovrai accedere di nuovo la prossima volta."
          confirmLabel="Esci"
          confirmTone="danger"
          onClose={() => setConfirmLogout(false)}
          onConfirm={() => { setConfirmLogout(false); onLogout?.(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Section wrapper — eyebrow + rounded card containing rows.
   ============================================================ */
function PariMenuSection({ title, children }) {
  return (
    <div style={{ padding: "0 20px 14px" }}>
      <div className="bb-eyebrow" style={{ marginBottom: 8 }}>{title}</div>
      <div style={{
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        borderRadius: 12, overflow: "hidden",
      }}>{children}</div>
    </div>
  );
}

/* ============================================================
   Row — icon + label + (badge) + (hint) + chevron
   ============================================================ */
function PariMenuRow({ icon, label, hint, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: "100%",
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      border: "none",
      borderBottom: "1px solid var(--ink-08)",
      background: "transparent", cursor: "pointer",
      fontFamily: "inherit", textAlign: "left",
      transition: "background 120ms var(--ease)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: "var(--paper-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon name={icon} size={16} color="var(--ink-80)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: "var(--ink)", letterSpacing: "-0.005em" }}>{label}</div>
      </div>
      {badge != null && badge > 0 && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10.5,
          background: "var(--clay)", color: "white",
          padding: "1px 7px", borderRadius: 9999, fontWeight: 600,
        }}>{badge}</span>
      )}
      {hint && (
        <span style={{ fontSize: 11.5, color: "var(--ink-50)" }}>{hint}</span>
      )}
      <Icon name="caret" size={14} color="var(--ink-25)" />
    </button>
  );
}

/* ============================================================
   Theme row — segmented control inline in the menu.
   Wired through to the prototype-level theme state so it stays
   in sync with the Tweaks panel.
   ============================================================ */
function PariThemeRow({ theme, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderBottom: "1px solid var(--ink-08)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: "var(--paper-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon name="settings" size={16} color="var(--ink-80)" />
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink)" }}>Tema</div>
      <div style={{
        display: "flex", background: "var(--paper-2)", borderRadius: 9,
        padding: 3, border: "1px solid var(--ink-08)",
      }}>
        {[
          ["light", "Chiaro"],
          ["dark",  "Scuro"],
          ["auto",  "Auto"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => onChange?.(k)}
            style={{
              padding: "5px 10px",
              background: theme === k ? "var(--paper)" : "transparent",
              color: theme === k ? "var(--ink)" : "var(--ink-60)",
              border: "none", borderRadius: 6,
              fontFamily: "inherit", fontSize: 11.5, fontWeight: 500,
              cursor: "pointer",
              boxShadow: theme === k ? "0 1px 2px rgba(70,65,59,0.06)" : "none",
              transition: "all 120ms var(--ease)",
            }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PariScreenMenu });
