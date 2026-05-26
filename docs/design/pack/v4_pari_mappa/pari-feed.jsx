/* Pari · Feed — refined.
   Filter tabs (Tutti / Mi piace / Salvati) with badge counts,
   "Aggiungi" story tile, photo style-label overlay, action row
   with inline counts, 3-dot menu, sturdy empty states. */

const { useState: useStateF, useMemo: useMemoF } = React;

/* Demo: a couple of stories should carry a "new content" dot so the
   strip feels alive. Stable per id. */
const PARI_FEED_NEW = new Set(["1", "4"]);

/* ============================================================
   FEED
   ============================================================ */
function PariScreenFeed({
  barbers, posts,
  onOpenBooking, onOpenProfile,
  onOpenMessages, onOpenNotifications,
  onNewPost,
  notifCount = 3, dmCount = 2,
}) {
  const byId = useMemoF(() => Object.fromEntries(barbers.map(b => [b.id, b])), [barbers]);

  /* Per-post local state — likes + saves are sets of post ids. */
  const [likes, setLikes] = useStateF(() => new Set(["p3"]));
  const [saves, setSaves] = useStateF(() => new Set());
  const [tab, setTab] = useStateF("tutti"); // tutti | piace | salvati
  const [menuOpenFor, setMenuOpenFor] = useStateF(null);

  function toggle(set, setSet, id) {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filteredPosts = useMemoF(() => {
    if (tab === "piace")   return posts.filter(p => likes.has(p.id));
    if (tab === "salvati") return posts.filter(p => saves.has(p.id));
    return posts;
  }, [tab, posts, likes, saves]);

  return (
    <div className="bb-screen" onClick={() => menuOpenFor && setMenuOpenFor(null)}>
      <div className="bb-safe-top" />

      {/* Topbar — wordmark + bell + DM */}
      <div className="bb-topbar">
        <div className="wordmark">
          <PoleMark size={32} />
          Pari
        </div>
        <div className="actions">
          <IconBtn name="bell" size={22} color="var(--ink-80)"
            onClick={onOpenNotifications}
            badge={notifCount > 0 ? notifCount : null} label="Notifiche" />
          <IconBtn name="send" size={22} color="var(--ink-80)"
            onClick={onOpenMessages}
            badge={dmCount > 0 ? dmCount : null} label="Messaggi" />
        </div>
      </div>

      {/* Filter tabs — Tutti / Mi piace / Salvati */}
      <div style={{
        display: "flex", padding: "0 20px 4px",
        borderBottom: "1px solid var(--ink-08)",
      }}>
        {[
          ["tutti",   "Tutti",     null],
          ["piace",   "Mi piace",  likes.size],
          ["salvati", "Salvati",   saves.size],
        ].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "10px 0 12px",
              border: "none", background: "transparent",
              color: tab === k ? "var(--ink)" : "var(--ink-60)",
              fontFamily: "inherit", fontSize: 13.5,
              fontWeight: tab === k ? 600 : 500,
              cursor: "pointer", position: "relative",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              letterSpacing: "-0.005em",
            }}>
            {l}
            {n != null && n > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 10.5,
                color: tab === k ? "var(--clay-deep)" : "var(--ink-50)",
                background: tab === k ? "var(--clay-soft)" : "var(--ink-08)",
                padding: "0 6px", borderRadius: 9999,
                fontWeight: 600,
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

      {/* Stories strip — Aggiungi first, then barbers */}
      {tab === "tutti" && (
        <div style={{
          display: "flex", gap: 14,
          padding: "16px 20px 18px",
          overflowX: "auto",
        }}>
          {/* Aggiungi tile */}
          <button onClick={onNewPost} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, cursor: "pointer", minWidth: 58,
            border: "none", background: "transparent", padding: 0,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              background: "var(--paper-2)",
              border: "1.5px dashed var(--ink-25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="scissors" size={22} color="var(--ink-60)" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-60)" }}>
              Aggiungi
            </span>
          </button>

          {barbers.map((b, i) => {
            const isNew = PARI_FEED_NEW.has(b.id);
            const ringColor = i < 3 ? (i % 2 === 0 ? "var(--clay)" : "var(--sage)") : "transparent";
            return (
              <button key={b.id}
                onClick={() => onOpenProfile(b)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 6, cursor: "pointer", minWidth: 58,
                  border: "none", background: "transparent", padding: 0,
                  position: "relative",
                }}>
                <Avatar initials={b.initials} size={54} ring={i < 3} ringColor={ringColor} />
                {isNew && (
                  <div style={{
                    position: "absolute", top: 2, right: 4,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "var(--clay)",
                    border: "2px solid var(--paper-3)",
                  }} />
                )}
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
                  color: "var(--ink-60)", maxWidth: 58,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {b.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state for Piace/Salvati when nothing matches */}
      {filteredPosts.length === 0 ? (
        <PariFeedEmpty tab={tab} onAction={() => setTab("tutti")} />
      ) : (
        filteredPosts.map((p, idx) => {
          const b = byId[p.barberId];
          const liked = likes.has(p.id);
          const saved = saves.has(p.id);
          return (
            <PariFeedPost
              key={p.id} p={p} b={b}
              liked={liked} saved={saved}
              onToggleLike={() => toggle(likes, setLikes, p.id)}
              onToggleSave={() => toggle(saves, setSaves, p.id)}
              onOpenProfile={onOpenProfile}
              onOpenBooking={onOpenBooking}
              showHairline={idx < filteredPosts.length - 1}
              menuOpen={menuOpenFor === p.id}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setMenuOpenFor(menuOpenFor === p.id ? null : p.id);
              }}
            />
          );
        })
      )}

      {filteredPosts.length > 0 && (
        <div style={{
          textAlign: "center", padding: "32px 20px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <ClayRule width={32} />
          <div style={{ fontSize: 12.5, color: "var(--ink-40)" }}>Sei in pari.</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FEED POST CARD
   ============================================================ */
function PariFeedPost({
  p, b,
  liked, saved,
  onToggleLike, onToggleSave,
  onOpenProfile, onOpenBooking,
  showHairline, menuOpen, onToggleMenu,
}) {
  return (
    <article style={{ paddingBottom: 4, position: "relative" }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 20px 12px",
      }}>
        <button onClick={() => onOpenProfile(b)} style={{
          display: "flex", alignItems: "center", gap: 12,
          flex: 1, minWidth: 0,
          border: "none", background: "transparent", padding: 0,
          cursor: "pointer", textAlign: "left",
        }}>
          <Avatar initials={b.initials} size={42} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{
                fontSize: 14.5, fontWeight: 600, color: "var(--ink)",
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{b.name}</span>
              {p.top && <Pill tone="clay">Top</Pill>}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="pin" size={10} color="var(--ink-40)" />
              <span>{b.city}</span>
              <span style={{ color: "var(--ink-25)" }}>·</span>
              <span>{p.timeAgo}</span>
            </div>
          </div>
        </button>
        <Button kind="hairline" size="sm" onClick={() => onOpenBooking(b)}>Prenota</Button>
        <IconBtn name="menu" size={20} color="var(--ink-60)" onClick={onToggleMenu} label="Altro" />
      </div>

      {/* 3-dot menu */}
      {menuOpen && (
        <div style={{
          position: "absolute", top: 50, right: 16,
          background: "var(--paper-3)",
          border: "1px solid var(--ink-08)",
          borderRadius: 10, boxShadow: "var(--shadow-lift)",
          padding: 4, zIndex: 20, minWidth: 160,
        }}>
          {[
            ["Salva", "bookmark"],
            ["Condividi", "share"],
            ["Segnala", "help"],
          ].map(([l, ic]) => (
            <button key={l} onClick={(e) => { e.stopPropagation(); onToggleMenu(e); }} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "9px 10px",
              border: "none", background: "transparent", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, color: "var(--ink)",
              borderRadius: 6, textAlign: "left",
            }}>
              <Icon name={ic} size={15} color="var(--ink-60)" />
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Photo with style-label overlay (bottom-left, backdrop blur) */}
      <div style={{ position: "relative" }}>
        <PhotoBlock initials={b.initials} label={null} />
        {p.label && (
          <div style={{
            position: "absolute", left: 16, bottom: 14,
            padding: "5px 10px",
            background: "rgba(46,40,32,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "var(--paper-3)",
            fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "-0.005em",
            borderRadius: 9999,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <Icon name="scissors" size={11} color="currentColor" />
            {p.label}
          </div>
        )}
      </div>

      {/* Action row with inline counts */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 14px 6px" }}>
        <PariActionWithCount
          name="heart"
          active={liked}
          activeColor="var(--rust)"
          count={p.likes + (liked ? 1 : 0)}
          onClick={onToggleLike}
        />
        <PariActionWithCount
          name="chat"
          count={p.comments}
        />
        <IconBtn name="send" size={22} color="var(--ink)" />
        <div style={{ flex: 1 }} />
        <IconBtn
          name="bookmark"
          size={22}
          color={saved ? "var(--clay)" : "var(--ink)"}
          weight={saved ? "fill" : "regular"}
          onClick={onToggleSave}
        />
      </div>

      {/* Caption */}
      <div style={{
        padding: "4px 20px 4px",
        fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        <span style={{ fontWeight: 600, marginRight: 5 }}>
          {b.name.split(" ")[0].toLowerCase()}
        </span>
        {p.caption}
      </div>

      <div style={{
        padding: "4px 20px 16px",
        fontSize: 12, color: "var(--ink-50)", cursor: "pointer",
      }}>
        Vedi tutti i {p.comments} commenti
      </div>

      {showHairline && <Hairline />}
    </article>
  );
}

/* Heart / chat with count inline. Keeps the action row tidy. */
function PariActionWithCount({ name, active, activeColor, count, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: "none", background: "transparent", cursor: "pointer",
      padding: "6px 10px 6px 8px",
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "inherit",
    }}>
      <Icon
        name={name}
        size={22}
        color={active ? activeColor : "var(--ink)"}
        weight={active ? "fill" : "regular"}
      />
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12,
        fontWeight: 500, color: "var(--ink-80)",
        letterSpacing: 0, lineHeight: 1,
      }}>
        {count.toLocaleString("it-IT")}
      </span>
    </button>
  );
}

/* ============================================================
   EMPTY STATES — Mi piace / Salvati filters
   ============================================================ */
function PariFeedEmpty({ tab, onAction }) {
  const config = tab === "piace" ? {
    icon: "heart",
    title: "Niente ancora nei mi piace.",
    body:  "Tocca il cuore sui post che ti interessano per ritrovarli qui.",
  } : {
    icon: "bookmark",
    title: "Nessun taglio salvato.",
    body:  "Salva un post con il segnalibro per metterlo da parte.",
  };

  return (
    <div style={{ padding: "56px 32px 32px", textAlign: "center" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--paper)", border: "1px solid var(--ink-08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Icon name={config.icon} size={20} color="var(--ink-40)" />
      </div>
      <div style={{
        fontFamily: "var(--font-display)", fontWeight: 500,
        fontSize: 19, letterSpacing: "-0.022em", color: "var(--ink)",
      }}>{config.title}</div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 6, lineHeight: 1.55, maxWidth: 280, margin: "6px auto 0" }}>
        {config.body}
      </div>
      <button onClick={onAction} style={{
        marginTop: 18,
        padding: "8px 16px",
        background: "var(--paper-2)", border: "1px solid var(--ink-15)",
        borderRadius: 9999, cursor: "pointer",
        fontFamily: "inherit", fontSize: 13, fontWeight: 500, color: "var(--ink)",
      }}>Torna al feed</button>
    </div>
  );
}

/* Expose to window so pari-prototype-app.jsx can pick it up. */
Object.assign(window, { PariScreenFeed });
