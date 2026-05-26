/* Pari · Misc sheets — EditBarberInfo + NewUserPost.
   Both are bottom sheets with form fields, accessible from
     - EditBarberInfo: Bottega topbar gear, Menu "Modifica info salone"
     - NewUserPost:    Feed "Aggiungi" story tile, Profile "Aggiungi" grid tile
   Spec §3.4 / §3.2. */

const { useState: useStateMs } = React;

/* ============================================================
   EDIT BARBER INFO — shop_name, address, phone, social, slot, price
   ============================================================ */
function PariEditBarberInfoSheet({ onClose, onSave }) {
  const [shopName, setShopName]   = useStateMs("Barberia Marco");
  const [address, setAddress]     = useStateMs("via Roma 21, Cagliari");
  const [phone, setPhone]         = useStateMs("+39 070 123 4567");
  const [instagram, setInstagram] = useStateMs("@marcobarba.cagliari");
  const [tiktok, setTiktok]       = useStateMs("");
  const [website, setWebsite]     = useStateMs("");
  const [slotMin, setSlotMin]     = useStateMs(30);
  const [price, setPrice]         = useStateMs(22);

  const canSave = shopName.trim() && address.trim();

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "94%" }}>
        <div className="bb-sheet__handle" />

        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>Modifica info salone</div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 22, letterSpacing: "-0.025em", margin: "8px 20px 14px",
        }}>La tua bottega</h2>

        <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <ParField label="Nome salone" required>
            <input value={shopName} onChange={e => setShopName(e.target.value)}
              style={pariAuthInputStyle()} />
          </ParField>

          <ParField label="Indirizzo" required>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Via, numero, città" style={pariAuthInputStyle()} />
          </ParField>

          <ParField label="Telefono">
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+39 …" style={{ ...pariAuthInputStyle(), fontFamily: "var(--font-mono)" }} />
          </ParField>
        </div>

        <div className="bb-eyebrow" style={{ padding: "0 20px 8px" }}>Social</div>
        <div style={{ padding: "0 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <ParFieldInline icon="share" label="Instagram">
            <input value={instagram} onChange={e => setInstagram(e.target.value)}
              placeholder="@username"
              style={{ ...pariAuthInputStyle(), background: "transparent", border: "none", padding: "0", fontSize: 13 }} />
          </ParFieldInline>
          <ParFieldInline icon="share" label="TikTok">
            <input value={tiktok} onChange={e => setTiktok(e.target.value)}
              placeholder="@username"
              style={{ ...pariAuthInputStyle(), background: "transparent", border: "none", padding: "0", fontSize: 13 }} />
          </ParFieldInline>
          <ParFieldInline icon="share" label="Sito web">
            <input value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://…"
              style={{ ...pariAuthInputStyle(), background: "transparent", border: "none", padding: "0", fontSize: 13, fontFamily: "var(--font-mono)" }} />
          </ParFieldInline>
        </div>

        <div className="bb-eyebrow" style={{ padding: "0 20px 8px" }}>Default appuntamento</div>
        <div style={{ padding: "0 20px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ParField label="Slot · minuti">
            <select value={slotMin} onChange={e => setSlotMin(Number(e.target.value))}
              style={{ ...pariAuthInputStyle(), fontFamily: "var(--font-mono)" }}>
              {[15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} min</option>)}
            </select>
          </ParField>
          <ParField label="Prezzo base · €">
            <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
              style={{ ...pariAuthInputStyle(), fontFamily: "var(--font-mono)" }} />
          </ParField>
        </div>

        <div style={{
          margin: "0 20px 14px", padding: "10px 12px",
          background: "var(--paper-2)", border: "1px solid var(--ink-08)",
          borderRadius: 10,
          fontSize: 11.5, color: "var(--ink-60)", lineHeight: 1.5,
        }}>
          Queste info appaiono sul tuo profilo pubblico. Aggiornale ogni volta che cambia
          qualcosa — gli orari si gestiscono dalla tab Disponibilità.
        </div>

        <div style={{ padding: "8px 20px 18px", display: "flex", gap: 10 }}>
          <Button kind="hairline" size="lg" onClick={onClose} style={{ flex: 1 }}>Annulla</Button>
          <Button kind="filled" size="lg" disabled={!canSave}
            onClick={() => onSave?.({ shopName, address, phone, instagram, tiktok, website, slotMin, price })}
            style={{ flex: 1 }}>
            Salva
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NEW USER POST — client adds a photo of their own cut
   Barber version uses the same UX with role='barber' affordances.
   ============================================================ */
function PariNewUserPostSheet({ role = "client", onClose, onSubmit }) {
  const [caption, setCaption] = useStateMs("");
  const [label, setLabel]     = useStateMs(null);
  const [tagBarber, setTagBarber] = useStateMs(null);
  const [hasImage, setHasImage] = useStateMs(false);

  const LABELS = ["Skin fade", "Taper", "Beard sculpt", "Fade", "Line up", "French crop", "Arabic shave", "Buzz cut"];
  const BARBERS_LIST = (typeof DEMO_BARBERS !== "undefined" ? DEMO_BARBERS : []).slice(0, 5);

  const canPublish = hasImage && caption.trim().length > 0;
  const title = role === "barber" ? "Nuovo post bottega" : "Aggiungi un tuo taglio";

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "94%" }}>
        <div className="bb-sheet__handle" />

        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>{title}</div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 22, letterSpacing: "-0.025em", margin: "8px 20px 14px",
        }}>{role === "barber" ? "Mostra il tuo lavoro." : "Mostra il tuo taglio."}</h2>

        {/* Image picker */}
        <div style={{ padding: "0 20px 16px" }}>
          <button onClick={() => setHasImage(h => !h)} style={{
            width: "100%", aspectRatio: "4 / 5",
            border: hasImage ? "1px solid var(--ink-08)" : "1.5px dashed var(--ink-25)",
            borderRadius: 14,
            background: hasImage
              ? "linear-gradient(135deg, #5A4D40 0%, #2E2820 100%)"
              : "var(--paper-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            fontFamily: "inherit",
            position: "relative",
            overflow: "hidden",
          }}>
            {hasImage ? (
              <React.Fragment>
                <span style={{
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: 36, color: "rgba(237,233,225,0.18)", letterSpacing: "-0.022em",
                }}>01</span>
                <button onClick={(e) => { e.stopPropagation(); setHasImage(false); }} style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="close" size={14} color="white" />
                </button>
              </React.Fragment>
            ) : (
              <div style={{ textAlign: "center", color: "var(--ink-60)" }}>
                <Icon name="scissors" size={28} color="var(--ink-40)" />
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>Tocca per scegliere una foto</div>
                <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 4 }}>JPG, PNG · max 5 MB</div>
              </div>
            )}
          </button>
        </div>

        {/* Caption */}
        <div style={{ padding: "0 20px 14px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 11.5, color: "var(--ink-60)",
            }}>
              <span style={{ fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Caption
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{caption.length}/200</span>
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 200))}
              rows={3}
              placeholder={role === "barber"
                ? "Mid skin fade, hard part, beard sculpt."
                : "Com'è andata? Cosa ti è piaciuto del taglio?"}
              style={{
                padding: "12px 14px",
                border: "1px solid var(--ink-15)", background: "var(--paper-2)",
                borderRadius: 10, fontFamily: "inherit", fontSize: 13.5,
                resize: "none", outline: "none", color: "var(--ink)",
                minHeight: 72, lineHeight: 1.5,
              }} />
          </label>
        </div>

        {/* Style label */}
        <div style={{ padding: "0 20px 14px" }}>
          <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Stile</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {LABELS.map(l => {
              const active = label === l;
              return (
                <button key={l} onClick={() => setLabel(active ? null : l)} style={{
                  padding: "5px 12px",
                  background: active ? "var(--ink)" : "var(--paper-2)",
                  color: active ? "var(--linen)" : "var(--ink-80)",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 500,
                  cursor: "pointer", borderRadius: 9999,
                  border: active ? "1px solid var(--ink)" : "1px solid var(--ink-08)",
                }}>{l}</button>
              );
            })}
          </div>
        </div>

        {/* Tag barber (only for client) */}
        {role === "client" && (
          <div style={{ padding: "0 20px 18px" }}>
            <div className="bb-eyebrow" style={{ marginBottom: 8 }}>Tagga il barbiere · opzionale</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {BARBERS_LIST.map(b => {
                const active = tagBarber === b.id;
                return (
                  <button key={b.id} onClick={() => setTagBarber(active ? null : b.id)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 12px 5px 5px",
                    background: active ? "var(--clay-soft)" : "var(--paper-2)",
                    border: active ? "1px solid var(--clay)" : "1px solid var(--ink-08)",
                    borderRadius: 9999, cursor: "pointer",
                    fontFamily: "inherit", color: active ? "var(--clay-deep)" : "var(--ink)",
                    flexShrink: 0,
                  }}>
                    <Avatar initials={b.initials} size={26} />
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{b.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ padding: "8px 20px 18px" }}>
          <Button kind="clay" size="lg" disabled={!canPublish}
            onClick={() => onSubmit?.({ caption, label, tagBarber })}
            style={{ width: "100%" }}>
            Pubblica
          </Button>
          {!canPublish && (
            <div style={{
              marginTop: 8, fontSize: 11.5, color: "var(--ink-50)", textAlign: "center",
            }}>
              {!hasImage ? "Scegli prima una foto." : "Scrivi qualcosa nella caption."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- field helpers ---- */
function ParField({ label, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--ink-60)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "var(--clay)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}

function ParFieldInline({ icon, label, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      border: "1px solid var(--ink-15)",
      background: "var(--paper-2)",
      borderRadius: 10,
    }}>
      <Icon name={icon} size={14} color="var(--ink-60)" />
      <div style={{
        fontSize: 11.5, color: "var(--ink-60)", fontWeight: 500,
        minWidth: 64,
      }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { PariEditBarberInfoSheet, PariNewUserPostSheet });
