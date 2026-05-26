/* Pari · I miei appuntamenti (cliente).
   Fullscreen sheet opened from Profile's "Prossimo appuntamento" card,
   from Menu, or from the booking-confirmed toast.

   Two tabs: Prossimi / Cronologia.
   Actions:
     - Prossimi → Annulla (with ConfirmSheet)
     - Cronologia done → Recensisci (with ReviewSheet) or 'Già recensito'

   Spec §3.7 + §4.10. */

const { useState: useStateApt, useMemo: useMemoApt } = React;

/* ============================================================
   DEMO DATA — client-side bookings. In production these come from
   useBooking + supabase realtime filtered by client_id.
   ============================================================ */
const PARI_APT_UPCOMING = [
  {
    id: "u1",
    when: { day: "sab", num: "24", mese: "mag", time: "10:00" },
    barber: "Marco Barba",
    initials: "MB",
    service: "Skin fade",
    duration: 30,
    price: 22,
    status: "confirmed",
  },
  {
    id: "u2",
    when: { day: "lun", num: "2", mese: "giu", time: "11:30" },
    barber: "Fadi Nour",
    initials: "FN",
    service: "Beard sculpt",
    duration: 20,
    price: 15,
    status: "pending",
  },
];

const PARI_APT_PAST_BASE = [
  {
    id: "p1",
    when: { day: "ven", num: "12", mese: "apr", time: "10:30" },
    barber: "Marco Barba",
    initials: "MB",
    service: "Skin fade",
    duration: 30,
    price: 22,
    status: "done",
    review: { rating: 5, comment: "Sempre preciso, capisce dove andare al primo colpo." },
  },
  {
    id: "p2",
    when: { day: "sab", num: "23", mese: "mar", time: "16:00" },
    barber: "Tariq Khalid",
    initials: "TK",
    service: "Taper · Beard",
    duration: 45,
    price: 28,
    status: "done",
    review: null,
  },
  {
    id: "p3",
    when: { day: "dom", num: "18", mese: "feb", time: "11:00" },
    barber: "Marco Barba",
    initials: "MB",
    service: "Skin fade",
    duration: 30,
    price: 22,
    status: "done",
    review: { rating: 5, comment: "" },
  },
  {
    id: "p4",
    when: { day: "ven", num: "5", mese: "feb", time: "14:30" },
    barber: "Fadi Nour",
    initials: "FN",
    service: "Arabic shave",
    duration: 30,
    price: 30,
    status: "cancelled",
    review: null,
  },
  {
    id: "p5",
    when: { day: "mer", num: "24", mese: "gen", time: "15:00" },
    barber: "Luca Barbieri",
    initials: "LB",
    service: "French crop",
    duration: 30,
    price: 20,
    status: "declined",
    review: null,
  },
];

/* ============================================================
   PARI · My Appointments (fullscreen overlay)
   ============================================================ */
function PariMyAppointments({ onClose }) {
  const [tab, setTab] = useStateApt("prossimi");
  const [upcoming, setUpcoming] = useStateApt(PARI_APT_UPCOMING);
  const [past, setPast]         = useStateApt(PARI_APT_PAST_BASE);

  const [confirmCancel, setConfirmCancel] = useStateApt(null); // booking to cancel
  const [reviewing, setReviewing]         = useStateApt(null); // booking being reviewed

  function handleCancel(reason) {
    /* Optimistic UI — remove from upcoming, push as cancelled into past. */
    const b = confirmCancel;
    setConfirmCancel(null);
    if (!b) return;
    setUpcoming(u => u.filter(x => x.id !== b.id));
    setPast(p => [{ ...b, status: "cancelled", review: null, cancelReason: reason }, ...p]);
  }

  function handleReview({ rating, comment }) {
    const b = reviewing;
    setReviewing(null);
    if (!b) return;
    setPast(p => p.map(x => x.id === b.id ? { ...x, review: { rating, comment } } : x));
  }

  function handleDeleteReview() {
    const b = reviewing;
    setReviewing(null);
    if (!b) return;
    setPast(p => p.map(x => x.id === b.id ? { ...x, review: null } : x));
  }

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "var(--paper-3)",
      display: "flex", flexDirection: "column",
      animation: "pari-slide-up 240ms var(--ease)",
    }}>
      {/* Topbar */}
      <div className="bb-safe-top" />
      <div className="bb-topbar">
        <IconBtn name="back" size={22} color="var(--ink)" onClick={onClose} label="Indietro" />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 18, letterSpacing: "-0.022em",
        }}>Appuntamenti</div>
        <div style={{ width: 22 }} />
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", padding: "0 20px 0",
        borderBottom: "1px solid var(--ink-08)",
      }}>
        {[
          ["prossimi",   "Prossimi",    upcoming.length],
          ["cronologia", "Cronologia",  past.length],
        ].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 13, fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              letterSpacing: "-0.005em",
            }}>
            {l}
            {n > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10.5,
                color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
                background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
                padding: "0 5px", borderRadius: 9999, fontWeight: 600,
              }}>{n}</span>
            )}
            {tab === k && (
              <div style={{
                position: "absolute", left: "20%", right: "20%", bottom: -1,
                height: 2, background: "var(--clay)", borderRadius: 9999,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "prossimi" && (
          upcoming.length === 0
            ? <ParAptEmpty kind="prossimi" />
            : (
              <div style={{ padding: "14px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {upcoming.map(b => (
                  <PariAptCardUpcoming key={b.id} b={b} onCancel={() => setConfirmCancel(b)} />
                ))}
              </div>
            )
        )}
        {tab === "cronologia" && (
          past.length === 0
            ? <ParAptEmpty kind="cronologia" />
            : (
              <div style={{ padding: "14px 20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {past.map(b => (
                  <PariAptCardPast key={b.id} b={b} onReview={() => setReviewing(b)} />
                ))}
              </div>
            )
        )}
      </div>

      {confirmCancel && (
        <PariConfirmSheet
          title="Annullare l'appuntamento?"
          body={`${confirmCancel.barber} · ${confirmCancel.when.day} ${confirmCancel.when.num} ${confirmCancel.when.mese} · ${confirmCancel.when.time}`}
          subBody="Cancellazione gratuita fino a 2 ore prima."
          reasonOptions={[
            "Impegno imprevisto",
            "Non mi va più questo orario",
            "Cambio barbiere",
            "Altro motivo",
          ]}
          confirmLabel="Annulla appuntamento"
          confirmTone="danger"
          onClose={() => setConfirmCancel(null)}
          onConfirm={handleCancel}
        />
      )}

      {reviewing && (
        <PariReviewSheet
          booking={reviewing}
          existing={reviewing.review}
          onClose={() => setReviewing(null)}
          onSubmit={handleReview}
          onDelete={handleDeleteReview}
        />
      )}

      <style>{`
        @keyframes pari-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   CARDS — upcoming + past
   ============================================================ */
function PariAptCardUpcoming({ b, onCancel }) {
  return (
    <div style={{
      background: "var(--paper)", border: "1px solid var(--ink-08)",
      borderRadius: 12, padding: 14,
      display: "flex", gap: 14, alignItems: "stretch",
    }}>
      <PariDateTile when={b.when} tone={b.status === "confirmed" ? "clay" : "ink"} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar initials={b.initials} size={26} />
          <span style={{
            fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em",
            flex: 1, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{b.barber}</span>
          {b.status === "confirmed"
            ? <Pill tone="success">Confermato</Pill>
            : <PillSafe tone="clay-soft">In attesa</PillSafe>}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-60)", display: "flex", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>{b.when.time}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span>{b.service}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{b.duration} min</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink)" }}>€ {b.price}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <Button kind="hairline" size="sm" style={{ flex: 1 }} onClick={onCancel}>Annulla</Button>
          <Button kind="hairline" size="sm" style={{ flex: 1 }}>Dettagli</Button>
        </div>
      </div>
    </div>
  );
}

function PariAptCardPast({ b, onReview }) {
  const isDone     = b.status === "done";
  const isCancel   = b.status === "cancelled";
  const isDeclined = b.status === "declined";

  return (
    <div style={{
      background: isDone ? "var(--paper)" : "var(--paper-2)",
      border: "1px solid var(--ink-08)",
      borderRadius: 12, padding: 14,
      display: "flex", gap: 14, alignItems: "stretch",
      opacity: isDone ? 1 : 0.78,
    }}>
      <PariDateTile when={b.when} tone="muted" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar initials={b.initials} size={26} />
          <span style={{
            fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em",
            color: isDone ? "var(--ink)" : "var(--ink-60)",
            flex: 1, minWidth: 0,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{b.barber}</span>
          {isDone     && <Pill tone="neutral">Completato</Pill>}
          {isCancel   && <Pill tone="neutral">Annullato</Pill>}
          {isDeclined && <Pill tone="danger">Rifiutato</Pill>}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-60)", display: "flex", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>{b.when.time}</span>
          <span style={{ color: "var(--ink-25)" }}>·</span>
          <span>{b.service}</span>
        </div>

        {/* Review affordance only for done */}
        {isDone && !b.review && (
          <div style={{ marginTop: 6 }}>
            <Button kind="hairline" size="sm" onClick={onReview} style={{ width: "100%" }}>
              Recensisci
            </Button>
          </div>
        )}
        {isDone && b.review && (
          <button onClick={onReview} style={{
            marginTop: 6,
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px",
            background: "var(--paper-2)", border: "1px solid var(--ink-08)",
            borderRadius: 9, cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}>
            <div style={{ display: "inline-flex", gap: 2 }}>
              {[1,2,3,4,5].map(n => (
                <Icon key={n} name="star" size={11}
                  color={n <= b.review.rating ? "var(--clay)" : "var(--ink-15)"}
                  weight={n <= b.review.rating ? "fill" : "regular"}
                />
              ))}
            </div>
            <span style={{
              fontSize: 11.5, color: "var(--ink-60)",
              flex: 1, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {b.review.comment || "Recensione pubblicata"}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-40)" }}>modifica</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   DATE TILE — shared between cards. Tone variants:
     'clay'  → upcoming confirmed
     'ink'   → upcoming pending
     'muted' → past
   ============================================================ */
function PariDateTile({ when, tone = "clay" }) {
  const palette = tone === "clay" ? {
    bg: "var(--clay-soft)", border: "var(--clay-tint)", fg: "var(--clay-deep)",
  } : tone === "ink" ? {
    bg: "var(--paper-2)", border: "var(--ink-08)", fg: "var(--ink)",
  } : {
    bg: "var(--paper-2)", border: "var(--ink-08)", fg: "var(--ink-60)",
  };
  return (
    <div style={{
      minWidth: 56, padding: "8px 4px",
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 10,
      textAlign: "center",
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 500, color: palette.fg,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>{when.day}</div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 600,
        fontSize: 22, lineHeight: 1.05, color: palette.fg,
        letterSpacing: "-0.025em", marginTop: 1,
      }}>{when.num}</div>
      <div style={{ fontSize: 9.5, fontWeight: 500, color: palette.fg }}>{when.mese}</div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE — per tab
   ============================================================ */
function ParAptEmpty({ kind }) {
  const c = kind === "prossimi" ? {
    icon: "calendar",
    title: "Nessun appuntamento in arrivo.",
    body:  "Quando prenoti, vedrai le tue date qui.",
  } : {
    icon: "scissors",
    title: "Cronologia vuota.",
    body:  "I tagli passati e gli appuntamenti chiusi appariranno qui.",
  };
  return (
    <div style={{ padding: "56px 32px 32px", textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <Icon name={c.icon} size={20} color="var(--ink-40)" />
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500,
        fontSize: 18, letterSpacing: "-0.022em", color: "var(--ink)",
      }}>{c.title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55, maxWidth: 280, margin: "6px auto 0" }}>
        {c.body}
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM SHEET — generic Sì/No with optional reason dropdown
   Spec §5: reusable across "annulla" + "segnala" + "esci".
   ============================================================ */
function PariConfirmSheet({
  title, body, subBody,
  reasonOptions = null,   // null = no dropdown
  confirmLabel = "Conferma",
  confirmTone  = "filled", // 'filled' | 'danger' | 'clay'
  cancelLabel  = "Annulla",
  onClose, onConfirm,
}) {
  const [reason, setReason] = useStateApt(reasonOptions?.[0] ?? null);
  const [open, setOpen] = useStateApt(false);

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "60%" }}>
        <div className="bb-sheet__handle" />

        <div style={{ padding: "0 20px 4px", display: "flex", justifyContent: "flex-end" }}>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)", fontWeight: 600,
          fontSize: 22, letterSpacing: "-0.025em", margin: "0 20px 8px",
        }}>{title}</h2>

        {body && (
          <p style={{
            margin: "0 20px 6px", fontSize: 13.5, color: "var(--ink-80)",
            fontFamily: "var(--font-mono)", letterSpacing: 0,
          }}>{body}</p>
        )}
        {subBody && (
          <p style={{
            margin: "0 20px 16px", fontSize: 12.5, color: "var(--ink-60)", lineHeight: 1.5,
          }}>{subBody}</p>
        )}

        {/* Optional reason dropdown */}
        {reasonOptions && (
          <div style={{ padding: "0 20px 16px", position: "relative" }}>
            <button onClick={() => setOpen(o => !o)} style={{
              width: "100%", padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 10,
              border: "1px solid var(--ink-15)",
              background: "var(--paper-2)", borderRadius: 10,
              fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
              cursor: "pointer",
            }}>
              <span style={{ flex: 1, textAlign: "left" }}>{reason}</span>
              <Icon name="caretDown" size={14} color="var(--ink-60)" />
            </button>
            {open && (
              <div style={{
                position: "absolute", top: "100%", left: 20, right: 20, marginTop: 4,
                background: "var(--paper-3)", border: "1px solid var(--ink-08)",
                borderRadius: 10, boxShadow: "var(--shadow-lift)",
                padding: 4, zIndex: 10,
              }}>
                {reasonOptions.map(r => (
                  <button key={r}
                    onClick={() => { setReason(r); setOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "9px 10px",
                      border: "none", background: "transparent", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
                      borderRadius: 6, textAlign: "left",
                    }}>
                    {r}
                    {reason === r && <Icon name="caret" size={12} color="var(--clay)" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, padding: "8px 20px 18px" }}>
          <Button kind="hairline" size="lg" onClick={onClose} style={{ flex: 1 }}>{cancelLabel}</Button>
          <Button kind={confirmTone} size="lg"
            onClick={() => onConfirm(reason)}
            style={{ flex: 1 }}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REVIEW SHEET — rating 1-5 + comment 0-500. Upsert + delete.
   ============================================================ */
function PariReviewSheet({ booking, existing, onClose, onSubmit, onDelete }) {
  const [rating, setRating]   = useStateApt(existing?.rating ?? 0);
  const [comment, setComment] = useStateApt(existing?.comment ?? "");

  const isEdit = !!existing;

  return (
    <div className="bb-scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bb-sheet" style={{ maxHeight: "70%" }}>
        <div className="bb-sheet__handle" />

        <div style={{
          padding: "0 20px 4px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 500 }}>
            {isEdit ? "Modifica recensione" : "Nuova recensione"}
          </div>
          <IconBtn name="close" size={20} color="var(--ink-60)" onClick={onClose} label="Chiudi" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 20px 18px" }}>
          <Avatar initials={booking.initials} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: 18, letterSpacing: "-0.022em", margin: 0,
            }}>{booking.barber}</div>
            <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>
              {booking.when.day} {booking.when.num} {booking.when.mese} · {booking.service}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div style={{
          padding: "0 20px 6px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)}
              style={{
                border: "none", background: "transparent", padding: 4, cursor: "pointer",
                display: "inline-flex",
              }}>
              <Icon name="star" size={32}
                color={n <= rating ? "var(--clay)" : "var(--ink-15)"}
                weight={n <= rating ? "fill" : "regular"}
              />
            </button>
          ))}
        </div>
        <div style={{
          textAlign: "center", fontSize: 11.5, color: "var(--ink-50)",
          paddingBottom: 18,
        }}>
          {rating === 0
            ? "Tocca per valutare"
            : ["Non bene", "Così così", "Buono", "Molto bene", "Eccezionale"][rating - 1]}
        </div>

        {/* Comment */}
        <div style={{ padding: "0 20px 14px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 11.5, color: "var(--ink-60)",
            }}>
              <span style={{ fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Commento · opzionale
              </span>
              <span style={{ fontFamily: "var(--font-mono)" }}>{comment.length}/500</span>
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Com'è andata? Cosa ti è piaciuto?"
              style={{
                padding: "12px 14px",
                border: "1px solid var(--ink-15)",
                background: "var(--paper-2)",
                borderRadius: 10,
                fontFamily: "inherit", fontSize: 13.5, color: "var(--ink)",
                resize: "none", outline: "none",
                minHeight: 72,
                lineHeight: 1.5,
              }}
            />
          </label>
        </div>

        {/* Actions */}
        <div style={{ padding: "8px 20px 18px", display: "flex", gap: 10 }}>
          {isEdit && (
            <Button kind="danger" size="md" onClick={onDelete}>Elimina</Button>
          )}
          <div style={{ flex: 1 }} />
          <Button kind="hairline" size="md" onClick={onClose}>Annulla</Button>
          <Button kind="clay" size="md"
            disabled={rating === 0}
            onClick={() => onSubmit({ rating, comment })}>
            {isEdit ? "Aggiorna" : "Pubblica"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* Expose to window so pari-prototype-app.jsx + pari-profile.jsx can pick up. */
Object.assign(window, { PariMyAppointments, PariConfirmSheet, PariReviewSheet });
