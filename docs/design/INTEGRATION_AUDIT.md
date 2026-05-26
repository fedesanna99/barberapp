# Integration Audit · Pari V4 → barberapp codebase

> **Blocco 2** del piano `DESIGN_HANDOFF_INTEGRATION_PLAN.md` — audit read-only.
> Confronto pack design Pari V4 (`docs/design/pack/design_handoff_barberbook_v4/v4_pari_mappa/`)
> col codebase su branch `test` (HEAD `06f5b5c`). **Nessuna modifica al codice**.
> Output: planning input per Blocchi 3-8.
>
> Eseguito 2026-05-26. Tool: 4 agent paralleli (read-only) + sintesi manuale.

---

## Sommario esecutivo

- **11 screen mappate** + 1 esclusa (Discover, drop-in Blocco 4) + 0 missing + 1 extra (`StatusPages.tsx` non nel pack)
- **~157 drift identificati** totali, distribuiti:
  - **34 critical** — visibili in primo piano, danneggiano UX
  - **60 major** — degradano coerenza, non bloccanti
  - **44 minor** — noticeable solo a confronto fianco a fianco
  - **19 cosmetic** — micro-pixel
- **Token CSS**: codebase è **superset** del pack (legacy aliases + Pari V4 additions). Zero token-pack mancante. 2 differenze di convention (dark activation, Geist Mono w600).
- **Dark mode**: parità completa. 1 override `[data-theme="dark"]` (pack) vs `:root.dark` (codebase) — codebase ha l'equivalente.
- **Asset gap**: `logo.svg` + `logo-inverse.svg` **mancanti**; `mark.svg` esiste come `<PoleMark>` React component (OK funzionale, OK Q1 decisione PoleMark definitivo); `favicon.svg` identico.
- **Instrument Serif (Q7)**: **gap totale** — utility `--font-display-serif` definita ma usata ZERO volte negli screens, neanche in `CancelBookingSheet` (PR-tris). 9 hero/sheet titles critical + 4 named entities major da convertire.
- **Geist Mono (Q8)**: `<Mono>` component **non esiste** (da creare in Blocco 5, ~10 LOC); `.bb-mono` utility presente ma applicata in modo inconsistente. ~6 prezzi + 1 orario user-facing non-mono.
- **Stima totale effort allineamento**: ~22h distribuiti in 6 PR (Blocchi 3-8).
- **22 domande aperte** al design team consolidate in §8.

---

## 1. Inventario screen

| File pack | Screen/component reale codebase | Path | Note |
|---|---|---|---|
| `pari-auth.jsx` | Login + Register + ResetPassword | `src/screens/Login.tsx`, `Register.tsx`, `ResetPassword.tsx` | 3 file divisi nel codebase |
| `pari-feed.jsx` | Feed | `src/screens/Feed.tsx` | timeline social |
| `pari-discover.jsx` | Discover | `src/screens/Discover.tsx` | **escluso dall'audit dettagliato — Blocco 4 drop-in invariato** |
| `pari-profile.jsx` | Profile (cliente) | `src/screens/Profile.tsx` | profilo cliente |
| `pari-barberprofile.jsx` | BarberProfileSheet | `src/screens/BarberProfileSheet.tsx` | profilo barbiere pubblico (sheet) |
| `pari-booking.jsx` | BookingSheet | `src/screens/BookingSheet.tsx` | booking sheet |
| `pari-bottega.jsx` | BarberDashboard | `src/screens/BarberDashboard.tsx` | dashboard barbiere |
| `pari-appointments.jsx` | MyAppointments | `src/screens/MyAppointments.tsx` | lista appuntamenti cliente |
| `pari-menu.jsx` | Menu | `src/screens/Menu.tsx` | menu/impostazioni |
| `pari-overlays.jsx` | Notifications + DirectMessages + SupportChat | `src/screens/Notifications.tsx`, `DirectMessages.tsx`, `SupportChat.tsx` | split in 3 file nel codebase |
| `pari-misc-sheets.jsx` | EditBarberInfoSheet + EditProfileSheet | `src/components/EditBarberInfoSheet.tsx`, `EditProfileSheet.tsx` | sheet minori |
| `pari-admin.jsx` | AdminPanel | `src/screens/AdminPanel.tsx` | pannello admin |
| `pari-prototype-app.jsx` | n/a (shell prototipo) | — | escluso (non screen reale) |

**Extra in codebase (NON nel pack)**:
- `src/screens/StatusPages.tsx` — pagine di stato error/loading. Da decidere: mantenere o sostituire con pattern Pari? **Q8.1** in domande aperte.

**Missing nel codebase (NON nel pack)**: nessuno — tutti gli screen pack hanno controparte.

---

## 2. Audit per screen

### Screen · Auth (Login + Register + ResetPassword)
**Pack JSX**: `pari-auth.jsx` (512 righe)
**Codebase**: `Login.tsx` + `Register.tsx` + `ResetPassword.tsx`
**Pack screenshots**: `v4-welcome.png`, `v4-welcome-crop.png`

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Welcome hero h1 "La sedia giusta" | Geist 42px w600, letterSpacing -0.035em | Geist 32px w600, letterSpacing -0.025em | major |
| Login/Register h1 "Bentornato / Crea account" | Geist 28px w600 | Geist 26px w600 | minor |
| Subtitle text | 14.5px w400 | 13.5px w400 | minor |
| Label spans (Email, Password) | 12.5px w500 | 12.5px w500 | none |
| Stat numbers (role pills) | font-mono tabular-nums | non mono in `Register.tsx` Stats | minor |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Page bg | `var(--paper-3)` #FCFAF5 | `var(--paper-3)` | none |
| Input border | `var(--ink-15)` | `var(--ink-15)` | none |
| Input bg | `var(--paper-2)` | `var(--paper-2)` | none |
| Hero "prenotata in 10 secondi" span | `var(--clay)` | non presente | critical |
| Forget password link | `var(--clay)` | `var(--clay)` | none |
| Demo barber button | `var(--ink-60)` | `var(--ink-60)` | none |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Welcome demo card (Marco Barba booking) | presente | non presente | major |
| Register role picker 2-col grid | sì | sì | none |
| Password strength 4-bar | 4 bars con colori dinamici | progress bar single-color full width | major |
| ResetPassword view | structured form | minimal form | minor |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Welcome title brand | "Pari" header | "Barberbook" header | critical |
| Login eyebrow | "Bentornato" | "Bentornato" | none |
| Register title | "Crea il tuo account" | "Crea il tuo account" | none |
| Placeholder email | "andrea@email.com" | "nome@esempio.com" | cosmetic |
| Password placeholder | "Almeno 8 caratteri" | "Minimo 6 caratteri" (discrepanza requisiti) | major |

#### Component riusabili da introdurre
- `pariPasswordStrength()` logic (score 0-4) — standardizzare algoritmo
- Password strength visualizer (4 bars colorati)
- Demo booking card component (Welcome)

#### Domande residue al design team
- Nome brand: **Pari** (pack) o **Barberbook** (codebase)? **Q1** (cross-cutting)
- Requisiti password: 8+ (pack) o 6+ (codebase)?
- Welcome demo card è scena demo solo design o va in prodotto?

#### Stima
- Critical: 2, Major: 4, Minor: 3, Cosmetic: 1

---

### Screen · Feed
**Pack JSX**: `pari-feed.jsx` (418 righe)
**Codebase**: `Feed.tsx`
**Pack screenshots**: `v4-feed.png`, `v4-feed-crop.png`

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Topbar wordmark | Geist w700 26px "Pari" | "Barberbook" Geist w700 22px | critical |
| Tab labels | 13.5px w500/600 | 14.5px w500/600 | minor |
| Barber name in post | 14.5px w600 -0.015em | 14.5px w600 | none |
| Caption | 13.5px w400 lh 1.55 | 13.5px w400 lh 1.55 | none |
| Action counts | font-mono tabular 12px | font-mono tabular | none |
| Empty state title | Geist w500 19px -0.022em | Geist w600 18px -0.02em | minor |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Page bg | implicito paper-3 | `C.bg` (ColorContext) | none |
| Tab indicator | `var(--clay)` 2px | `C.accent` | none |
| Badge bg | `var(--clay-soft)` text `var(--clay-deep)` | `C.accentLight` / `C.accentDeep` | none |
| Empty bg icon | `var(--paper)` border `var(--ink-08)` | `C.surface` border `C.border` | none |
| Style label overlay | `rgba(46,40,32,0.55)` blur | `rgba(20,17,13,0.65)` (più scuro) | cosmetic |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Stories strip "Aggiungi" tile | tab="tutti" | `!showLiked && !showSaved` (equiv) | none |
| 3-dot menu | popup absolute top:50 right:16 | bottom sheet | major |
| Like/save inline icon + mono count | sì | sì | none |
| End-of-feed divider ClayRule | 32px centered | linea 2px centered | minor |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Tab labels | "Tutti / Mi piace / Salvati" | "Tutti / Mi piace / Salvati" | none |
| Empty "Mi piace" title | "Niente ancora nei mi piace" | "Nessun post che ti piace" | minor |
| Empty "Salvati" subtitle | "Salva un post con il segnalibro" | "Tocca il segnalibro su un post" | minor |
| Button "Torna al feed" | presente | assente | critical |
| Footer | "Sei in pari." | "Sei in pari." | none |

#### Component riusabili da introdurre
- `PariActionWithCount` (like/comment/send inline)
- Empty state container astratto
- Post header (barber card + Prenota + menu)

#### Domande residue al design team
- 3-dot menu: popup absolute (pack) o bottom sheet (codebase)? **Q2**
- End-of-feed: ClayRule decorativo (pack) o linea semplice (codebase)?

#### Stima
- Critical: 2, Major: 1, Minor: 3, Cosmetic: 1

---

### Screen · Profile (cliente)
**Pack JSX**: `pari-profile.jsx` (464 righe)
**Codebase**: `Profile.tsx`
**Pack screenshots**: `v4-profilo.png`, `v4-profilo-crop.png`

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Screen title "Profilo" | topbar implicito | Geist w700 22px | none |
| Hero h1 name "Andrea Goretti" | Geist w600 22px -0.025em | Geist w600 22px -0.02em | cosmetic |
| Stat values (12 tagli) | font-mono w600 | font-mono w600 | none |
| Stat labels | 12px w400 | 11px w500 | minor |
| Tab labels | 13px w500/600 | 13px w500/600 | none |
| Grid cell labels (Skin fade, 12 mar) | 10px w500 + 9px mono date | non visibile (labels nascoste) | major |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Prossimo appuntamento card | `var(--clay-soft)` border `var(--clay-tint)` | `C.surface` (grigio) | critical |
| Date box in appt | paper-3 border clay-tint | non colorato | minor |
| Date text "SAB 24 MAG" | `var(--clay-deep)` | `C.muted` grigio | major |
| Seguiti pill | `var(--paper-2)` border `var(--ink-08)` | `C.surface` border `C.border` | none |
| Tab underline | `var(--clay)` 2px | `C.accent` | none |
| Grid gradient overlays | linear-gradient hsl | identici | none |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Prossimo appuntamento posizione | sotto Edit/Condividi | in fondo | critical |
| Edit/Condividi button pair | flex gap 8 sotto hero | non presente | major |
| Seguiti horizontal scroll | visibile | non scrollabile | minor |
| 3-col grid tagli | `1fr 1fr 1fr` gap 4 | `repeat(3, 1fr)` gap 2 | cosmetic |
| "Aggiungi" tile | ultima cella grid | non visibile | major |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Appointment eyebrow | "Prossimo appuntamento" uppercase 10.5px | non presente | critical |
| Followed pills eyebrow | "Seguiti" uppercase `.bb-eyebrow` | non presente | critical |
| Empty Salvati | "Nessun post salvato" | n/a | minor |
| Stat labels | "tagli / seguiti / salvati" | "Tagli / Barbieri / Follower" | major |
| Section title format | uppercase 0.06em tracking | inconsistente | minor |

#### Component riusabili da introdurre
- `PariStatRow` (value mono + label)
- `PariAppointmentCard` (clay-soft highlight + date mini-calendar)
- `PariFollowedPills` scroll container
- Grid cell con label overlay

#### Domande residue al design team
- Appointment card: sempre in cima (pack) o in fondo (codebase)?
- Seguiti pills: clickable per open profile?
- Edit/Condividi button pair: dove se appointment in cima?

#### Stima
- Critical: 3, Major: 3, Minor: 3, Cosmetic: 1

---

### Screen · Menu
**Pack JSX**: `pari-menu.jsx` (236 righe)
**Codebase**: `Menu.tsx`
**Pack screenshots**: `v4-menu.png`, `v4-menu-crop.png`

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| User card name | Geist w600 17px -0.018em | Geist w600 16px -0.015em | minor |
| Menu row labels | 13.5px w400 -0.005em | 14.5px w400 | minor |
| Hint text | 11.5px w400 | 11px w600 | minor |
| Badge numbers | font-mono 10.5px w600 | font-mono 11px w600 | cosmetic |
| App version footer | font-mono 11px | font-mono 11px | none |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| User card bg | `var(--paper)` border `var(--ink-08)` | `C.surface` border `C.border` | none |
| Menu row bg (card) | `var(--paper)` | nessun bg | major |
| Row icon bg | `var(--paper-2)` | nessuno (icon inline) | major |
| Row hint text | `var(--ink-50)` | non visibile | minor |
| Badge bg | `var(--clay)` white text | `var(--clay)` `var(--paper-3)` | none |
| Theme picker bg | `var(--paper-2)` border `var(--ink-08)` | `C.surface` border `C.border` | cosmetic |
| Logout button | `kind="danger"` | border `C.red` bg transparent | cosmetic |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Menu rows grouping | 3 sections (Attività/Preferenze/Altro) in card | flat list con divider | major |
| `PariMenuSection` card | bg paper br 12 overflow hidden | nessun card container | major |
| Row icon 32x32 box | paper-2 bg centered | icon inline senza box | major |
| Theme row | segmented control in card | grid 3-col con clay active | none |
| Confirm logout sheet | bottom sheet PariConfirmSheet | non visibile | critical |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Section titles (Attività/Preferenze/Altro) | uppercase eyebrow | non presenti | critical |
| Menu row label Appuntamenti | "Appuntamenti" | "I miei appuntamenti" | minor |
| Menu row label Messaggi | "Messaggi" | "Messaggi" | none |
| Menu row label Salvati | "Salvati" | "Post salvati" | minor |
| Row hint format | badge + hint text | solo badge | major |
| Logout confirm title | "Vuoi uscire?" | non visibile | critical |
| Theme label row | "Tema" | "Aspetto" | minor |

#### Component riusabili da introdurre
- `PariMenuSection` (title + card container)
- `PariMenuRow` (icon + label + hint + badge + chevron)
- `PariThemeRow` segmented (light/dark/auto)
- Logout confirm sheet

#### Domande residue al design team
- Sections come card container: voluto in produzione o fallback flat?
- Row icon background box: obbligatorio o opzionale?
- Hint text placement: accanto badge o secondaria?

#### Stima
- Critical: 2, Major: 6, Minor: 4, Cosmetic: 2

---

### Screen · BarberProfile
**Pack JSX**: `pari-barberprofile.jsx` (417 righe)
**Codebase**: `BarberProfileSheet.tsx`
**Pack screenshots**: `v4-profilo.png`, `v4-profilo-crop.png`

**Note**: trust pill cancellation **già implementata** in PR-tris (linee 154-179). Quella non è gap.

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Eyebrow "Profilo barbiere" | 12px font-display 500wt ink-60 | 12px font-display 500wt | minor |
| H1 name | 24px font-display 600wt -0.025em | 22px font-display 600wt -0.02em | minor |
| Distance km | `var(--font-mono)` | non mono inline | minor |
| Service prices | font-mono 600wt 14px | font-mono 600wt 14px | none |
| Stats values | 20px font-display 600wt | 22px font-display 600wt | minor |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Page bg | `var(--paper-3)` | `C.bg` (ColorContext) | major |
| Border | `var(--ink-08)` | `C.border` | major |
| Trust pill (cancellation) | clay-soft bg clay-deep fg | clay-soft / clay-deep | none |
| Pin icon | `var(--clay)` | `C.accent` | minor |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Trust pill presence | dopo city·distance | dopo avatar row | none (PR-tris) |
| Trust pill position | inline subtitle | dopo avatar row | minor |
| Contact box | 4 rows (address/hours/days/chat) | shop + address + phone/social | major |
| Stats tile layout | 3-col con divider | 3-col senza divider | minor |
| Tab badge | pill clay-soft clay-deep 9999 | identico | none |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Header | "Profilo barbiere" | non renderizzato | major |
| Status pills | "Aperto" / "In pausa" | "Aperto" / "In pausa" | none |
| Trust pill | "Cancelli gratis fino a X prima" | identico | none |
| Button "Segui" | "Segui" / "Seguendo" | "Segui" / "Stai seguendo" | minor |
| Button "Prenota" | "Prenota — € {price}" | "Prenota con {barber.name.split(' ')[0]}" | major |
| "Bottega" section (bio) | presente | non visibile | major |
| Services section title | "Servizi e prezzi" | non visibile (solo hook) | major |

#### Component riusabili da introdurre
- `Pill` tone-aware — presente
- `Avatar` ring — presente
- Trust pill — presente (PR-tris)
- Contact card 4-row model (refactor)

#### Domande residue al design team
- Contact card: ripristinare "Apre/Chiude" + "Lun-Sab"?
- "Bottega" bio + Services list: omessi intenzionalmente o gap?
- Header "Profilo barbiere": reinstaurarlo sopra back button?
- Button "Prenota": copy con prezzo (pack) o con nome (codebase)?

#### Stima
- Critical: 0, Major: 4, Minor: 7, Cosmetic: 0

---

### Screen · Booking
**Pack JSX**: `pari-booking.jsx` (420 righe)
**Codebase**: `BookingSheet.tsx`
**Pack screenshots**: `v4-booking.png`

**Note**: BookingSheet NON toccato da PR-tris — drift profondo atteso.

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Service card title | 14px 600wt clay-deep when active | 14px 600wt `C.text` | minor |
| Date strip label | 16px font-display 600wt | 16px font-display 600wt | none |
| Slot time | 13px 500wt font-mono | 13px 500wt font-mono tabular | none |
| Confirm step title | 26px font-display 600wt | 24px font-display 600wt | minor |
| Summary line value | 16px display / 13.5px body | display 16px body/mono 13.5px | none |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Sheet bg | `var(--paper-3)` | `C.bg` | major |
| Service active bg | `var(--clay-soft)` | `C.surface` (NON clay-soft) | critical |
| Service active border | `var(--clay)` | hardcoded (non token) | critical |
| Date selected bg | `var(--ink)` | `var(--clay)` | critical |
| Slot selected bg | `var(--ink)` | `var(--clay)` | critical |
| Error banner bg | `var(--rust-soft)` | hardcoded `#fff1f0` | major |
| Error banner border | `var(--rust)` | hardcoded `#ffa39e` | major |
| Error banner text | `var(--rust)` | hardcoded `#cf1322` | major |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Service picker radio style | filled radio 5px border clay when active | large circle 38px con scissors icon | critical |
| Date button layout | 3 col (day/num/month) | identico | none |
| Slot grid | 3 col | 3 col | none |
| Confirm step error banner | inline pre-summary | identico | none |
| Demo error buttons "Simula errore" | presenti | assenti | major |
| Payment step | non in pack | presente (StripePaymentStep) | n/a |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Header | "Prenota un appuntamento" + "con {barber}" | identico | none |
| Service label | "Scegli il servizio" | "Scegli il servizio" | none |
| Date label | "Scegli la data" | "Scegli la data" | none |
| Slot label | "Orario" | "Slot disponibili" | minor |
| Confirm title | "Tutto a posto?" | identico | none |
| Confirm subtitle | "Riepilogo… Tocca conferma…" | "Riepilogo… Scegli come pagare…" | minor |
| Error 23P01 | "Slot non più disponibile" | non demo-able | major |
| Cancellation note | "Cancellazione gratuita fino a 2 ore prima. Riceverai promemoria…" | identico minus "Riceverai…" | minor |
| Notes textarea | "Note al barbiere · opzionale" | non presente | major |

#### Component riusabili da introdurre
- Service selector refactor: radio + flex layout
- Error banner tone-aware (oggi hardcoded)
- Payment step (esiste già StripePaymentStep, pack non lo copre)

#### Domande residue al design team
- Service picker: radio (pack) o icon-heavy (codebase)? **Q3**
- Date selected color: `--ink` (pack) o `--clay` (codebase)? **Q4**
- Notes field: aggiungere o post-MVP?
- Demo error buttons: production o debug-only?

#### Stima
- Critical: 4, Major: 7, Minor: 5, Cosmetic: 0

---

### Screen · Appointments (Cliente)
**Pack JSX**: `pari-appointments.jsx` (644 righe)
**Codebase**: `MyAppointments.tsx`
**Pack screenshots**: nessuno specifico

**Note**: CancelBookingSheet, RefundFailedAlert, RefundResolvedBanner, micro-copy variant-aware **già implementati** in PR-tris.

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Topbar title | 18px font-display 600wt | 17px font-display 600wt | cosmetic |
| Section title | 16px font-display 600wt | identico | none |
| Card barber name | 14px 600wt -0.015em | identico | none |
| Date tile day | 9.5px 500wt uppercase | non visibile | n/a |
| Date tile number | 22px font-display 600wt | non visibile | n/a |
| Card time | 12px font-mono | 12.5px font-mono `.bb-mono` | minor |
| Pill badge count | 10.5px font-mono 600wt | 11px accent 600wt | cosmetic |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Page bg | `--paper-3` | `C.bg` | major |
| Card bg (done) | `--paper` | `C.surface` | major |
| Card bg (past non-done) | `--paper-2` | `C.surface` | major |
| Date tile bg clay | `--clay-soft` | (no tile) | major |
| Status pill | tone-aware | `STATUS_COLOR` map | none |
| Topbar border | `--ink-08` | `C.border` | major |
| Micro-copy "Cancelli gratis…" | `--ink-60` | `C.muted` | none |
| Micro-copy "Fuori dalla finestra" | `--rust` | `--rust` | none |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Date tile sidebar (square day/num/month) | presente | non presente | critical |
| Upcoming card layout | date tile + content flex | no tile flex avatar+name+status | critical |
| Past card opacity | 0.78 disabled | nessuna riduzione | major |
| Past card bg | `--paper-2` lighter | identico `C.surface` | major |
| Cancel button | `kind="hairline"` ghost | ghost (border + transparent) | none |
| Review button | "Recensisci" presente | presente | none |
| Status badges | pill tone | inline span | minor |
| Micro-copy section | sotto time/service | parte cancellation window conditional | major |
| Empty state | icon + title + body centered | identico | none |
| Tab badges | pill clay-soft | inline span accent | major |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Topbar | "Appuntamenti" | "I miei appuntamenti" | major |
| Status "Confermato" | "Confermato" | "Confermato" | none |
| Status "In attesa" | "In attesa" (pill safe tone) | "In attesa" (accent color) | minor |
| Status "Completato" | "Completato" | "Completato" | none |
| Status "Annullato" | "Annullato" | "Annullato" | none |
| Micro-copy "Cancelli gratis…" | "Cancelli gratis fino a {label} prima" | "Cancelli gratis fino a {dayLabel} {date} alle {time}" | minor |
| Micro-copy "Fuori dalla finestra" | "Fuori dalla finestra {window}h" | identico | none |
| Cancel button | "Annulla" / "Annulla senza rimborso" | identico variant | none |
| Review button | "Recensisci" | "Recensisci" | none |
| Confirm sheet title | "Annullare l'appuntamento?" | delegato a CancelBookingSheet | minor |

#### Component riusabili da introdurre
- `DateTile` (day/num/month) — backport da pack
- `BookingCard` wrapper con date tile layout
- Status color mapping (già in codebase)

#### Domande residue al design team
- Date tile: reinstaurare nel codebase?
- Tab badge styling: pill clay-soft (pack) o inline accent (codebase)?
- Past card opacity + bg: ridurre opacity per "spent"?
- Topbar copy: "Appuntamenti" (pack) o "I miei appuntamenti" (codebase)?

#### Stima
- Critical: 2, Major: 8, Minor: 4, Cosmetic: 1

---

### Screen · Bottega (BarberDashboard)
**Pack JSX**: `pari-bottega.jsx` (619 righe)
**Codebase**: `BarberDashboard.tsx`
**Pack screenshots**: nessuno specifico

**Note**: CancellationPolicySection **già implementata** in PR-tris (linee 393-576).

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Topbar barber name | font-display 22px 600wt (`pari-bottega:132`) | font-display 22px 700wt (`BarberDashboard:68`) | minor |
| Section labels | `.bb-h2-display` implied 16-18px | explicit 16px (`BarberDashboard:584`) | cosmetic |
| Mono time labels | font-mono 10-12px (`pari-bottega:385-386`) | identico (`BarberDashboard:628`) | none |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Toggle active | `--sage` (`pari-bottega:328`) | `C.text` (`BarberDashboard:677`) | major |
| Toggle inactive | `--ink-15` (`pari-bottega:328`) | `C.borderMed` (`BarberDashboard:677`) | major |
| Status pill "In attesa" | `--clay-soft` bg `--clay-deep` text (`pari-bottega:73`) | `C.accentLight` / `C.accentDeep` (`BarberDashboard:588`) | critical |
| Vacation banner | `--rust` + `--rust-soft` (`pari-bottega:147`) | `C.greenSoft` + `C.green` (`BarberDashboard:280`) | critical |
| Tab active bg | `var(--ink)` (`pari-bottega:241`) | `C.bg` (`BarberDashboard:89`) | critical |
| Tab active text | `var(--linen)` (`pari-bottega:242`) | `C.text` (`BarberDashboard:90`) | critical |
| Accent chips | `--clay` (`pari-bottega:216`) | `C.accent` (`BarberDashboard:588`) | major |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Tab control layout | segmented 2-col toggle + flex pills | 3-tab segmented in flex (`BarberDashboard:79-102`) | major |
| Vacation + Auto-accept cards | side-by-side 1fr 1fr (`pari-bottega:166`) | stacked full-width (`BarberDashboard:277-303`) | major |
| Filter chips "In arrivo" | horizontal scroll pill (`pari-bottega:230-249`) | rimossi — Section header (`BarberDashboard:305-327`) | critical |
| Live indicator | inline pulse dot + label (`pari-bottega:251-262`) | mancante | critical |
| Booking row columns | left time col 56px centered, right content flex (`pari-bottega:370-387`) | card avatar+name row, time meta (`BarberDashboard:606-647`) | major |
| Empty state | icon + title + body centered (`pari-bottega:483-501`) | identico (`BarberDashboard:598-603`) | none |
| CancellationPolicySection | spec V4 §3.18 | presente (`BarberDashboard:393-576` PR-tris) | none |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Tab label | "Prenotazioni", "Disponibilità" (`pari-bottega:191-192`) | "Prenotazioni", "Servizi", "Disponibilità" (`BarberDashboard:82`) | minor |
| Toggle label text | "Aperta"/"Chiusa", "Sì"/"No" (`pari-bottega:170-174`) | non esposto in UI (`BarberDashboard:294`) | minor |
| Empty state title | "Nessuna prenotazione in arrivo." (`pari-bottega:474`) | "Nessuna richiesta in attesa." (`BarberDashboard:307`) | cosmetic |
| Auto-accept desc | "Le nuove prenotazioni vengono confermate subito." | identico (`BarberDashboard:300`) | none |

#### Component riusabili da introdurre
- `PariOverlayShell` animation pattern (scrimIn/sheetUp)
- `StatusPill` tone system (clay-soft, sage, rust)
- Live indicator pulse animation sage
- Filter chip horizontal scroll
- Time-based grouping logic con dateLabel headers

#### Domande residue al design team
- Vacanza banner: `--rust` (pack) o `C.green` (codebase)?
- Toggle: `--sage` (pack) o `C.text` (codebase)?
- Tab layout: 3-tab (codebase) o 2-tab + Servizi separato (pack)?
- Filter chips: re-introdurre o flag separato?

#### Stima
- Critical: 3, Major: 5, Minor: 3, Cosmetic: 2

---

### Screen · Admin
**Pack JSX**: `pari-admin.jsx` (642 righe)
**Codebase**: `AdminPanel.tsx`
**Pack screenshots**: nessuno specifico

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Topbar "Admin" | 22px 600wt (`pari-admin:50`) | 22px 700wt (`AdminPanel:1014`) | minor |
| Tab labels | 12.5px 500wt (`pari-admin:75`) | identico (`AdminPanel:1032`) | none |
| User name in list | 13.5px 600wt (`pari-admin:148`) | 14px 600wt (`AdminPanel:368`) | cosmetic |
| Log action mono | font-mono 11.5px (`pari-admin:339`) | font-mono 12px (`AdminPanel:568`) | cosmetic |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Tab active bg | `var(--ink)` (`pari-admin:289`) | `C.text` (`AdminPanel:1029`) | none |
| Tab inactive pill | `var(--paper-2)` (`pari-admin:289`) | `C.surface` (`AdminPanel:1020`) | minor |
| Search icon | `var(--ink-60)` (`pari-admin:127`) | `C.muted` (`AdminPanel:312`) | none |
| Log level badge bg | tone-specific: error `--rust-soft`, warning `--clay-soft` (`pari-admin:329-331`) | `C.redSoft` / default (`AdminPanel:342`) | major |
| Log level badge fg | tone-specific (`pari-admin:313-315`) | `C.red` (`AdminPanel:505`) | major |
| Message bubble mine | `var(--clay)` (`pari-admin:471`) | `C.text` (`AdminPanel:600`) | critical |
| Message bubble theirs | `var(--paper)` (`pari-admin:471`) | `C.surface` (`AdminPanel:600`) | none |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Tab order | users/logs/support/notif (`pari-admin:64-96`) | users/notify/logs/support (`AdminPanel:1003-1008`) | minor |
| Users tab header | Search + "+ Nuovo" button (`pari-admin:122-136`) | Search + "+" FAB (`AdminPanel:336-424`) | major |
| User list expansion | toggle row collapsible actions (`pari-admin:348-406`) | multi-row expand sub-actions (`AdminPanel:354-407`) | minor |
| Delete confirmation | PariConfirmSheet (`pari-admin:172-185`) | ConfirmDeleteSheet (`AdminPanel:156-200`) | none |
| Add user sheet | form fields vertical (`pari-admin:193-264`) | AddUserModal fullscreen (`AdminPanel:54-152`) | minor |
| Logs filter | horizontal pill chips (`pari-admin:279-299`) | identico (`AdminPanel:512-538`) | none |
| Log row | collapsible level badge + action + msg (`pari-admin:311-363`) | card borderLeft color stripe (`AdminPanel:559-584`) | major |
| Support list | conversation cards avatar+name+preview (`pari-admin:381-422`) | identico (`AdminPanel:765-795`) | none |
| Support thread | full-screen overlay header+msg+input (`pari-admin:426-516`) | full-height flex (`AdminPanel:620-728`) | none |
| Notify tab targets | "Tutti / Barbieri / Utente specifico" (`pari-admin:537-555`) | "Tutti / Utente singolo" (`AdminPanel:851-856`) | major |
| Notify preview | bubble icon+title+body+footer (`pari-admin:584-612`) | identico (`AdminPanel:937-962`) | none |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Notif tab label | "Notifiche" (`pari-admin:68`) | "Notifiche" (`AdminPanel:1005`) | none |
| Add user title | "Nuovo utente" (`pari-admin:215`) | "Aggiungi utente" (`AdminPanel:96`) | cosmetic |
| Field labels | uppercase 11.5px 0.02em (`pari-admin:219`) | 12.5px 500wt (`AdminPanel:86`) | cosmetic |
| Notify targets | "Barbieri" / "Utente specifico" (`pari-admin:540-541`) | "Barbieri" / "Utente singolo" (`AdminPanel:853`) | cosmetic |

#### Component riusabili da introdurre
- `PariAdmAddUserSheet` modal pattern (scrim + animations)
- `PariConfirmSheet` generic (title/body/confirmLabel/confirmTone)
- Log level color mapping (error/warning/info → tone)
- Notify recipient picker

#### Domande residue al design team
- Notify "Barbieri" vs "Utente singolo": role-filtered broadcast?
- Log card design: pill badge (pack) o borderLeft stripe (codebase)?
- Admin message bubble: `--clay` (pack) o `C.text` (codebase)?

#### Stima
- Critical: 1, Major: 5, Minor: 4, Cosmetic: 3

---

### Screen · Overlays (Notifications / DirectMessages / SupportChat)
**Pack JSX**: `pari-overlays.jsx` (590 righe)
**Codebase**: `Notifications.tsx` + `DirectMessages.tsx` + `SupportChat.tsx`
**Pack screenshots**: nessuno specifico

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Overlay title | 18px font-display (`pari-overlays:544`) | 17px font-display (`Notifications:32`) | minor |
| Notification body | 13px (`pari-overlays:111`) | identico (`Notifications:110`) | none |
| DM peer name | 14px 600wt (`pari-overlays:281`) | 15px 600wt (`DirectMessages:223`) | cosmetic |
| Support chat title | "Supporto Pari" (`pari-overlays:426`) | "Supporto Barberbook" (`SupportChat:69`) | cosmetic |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Overlay bg | `var(--paper-3)` (`pari-overlays:534`) | `C.bg` (`Notifications:27`) | major |
| Icon bg broadcast | `var(--paper)` (`pari-overlays:96`) | `C.surfaceAlt` (`Notifications:97`) | minor |
| Icon color broadcast | `var(--ink-80)` (`pari-overlays:104`) | `C.muted` (`Notifications:98`) | minor |
| Unread notif bg | `var(--paper-2)` (`pari-overlays:86`) | `C.accentLight + 40` (`Notifications:90`) | major |
| DM mine bubble | `var(--clay)` (`pari-overlays:312`) | `var(--clay)` (`DirectMessages:276`) | none |
| DM theirs bubble | `var(--paper)` (`pari-overlays:312`) | `C.surface` (`DirectMessages:276`) | minor |
| Support mine bubble | `var(--clay)` (`pari-overlays:466`) | `var(--clay)` (`SupportChat:146`) | none |
| Support theirs bubble | `var(--paper)` (`pari-overlays:466`) | `C.surface` (`SupportChat:172`) | minor |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Notifications overlay | PariOverlayShell wrapper (`pari-overlays:57-130`) | raw flex+header+body (`Notifications:27-76`) | minor |
| Notifications unread count | header top-left label (`pari-overlays:68-71`) | rimosso — solo Mark All aria (`Notifications:35-45`) | critical |
| Notification row bg unread | conditional `--paper-2` (`pari-overlays:86`) | `C.accentLight + '40'` tint (`Notifications:90`) | minor |
| Notif icon badge | avatar OR icon circle (`pari-overlays:91-107`) | icon circle broadcast only (`Notifications:95-102`) | major |
| DM list search | search field overlay (`pari-overlays:176-189`) | mancante (`DirectMessages:74-157`) | critical |
| DM list structure | avatar 48 preview 12.5 (`pari-overlays:208`) | avatar 44 preview 12.5 (`DirectMessages:131`) | cosmetic |
| DM thread input | inline bar bottom (`pari-overlays:334-363`) | identico (`DirectMessages:293-341`) | none |
| Support banner welcome | info box icon (`pari-overlays:437-446`) | mancante (`SupportChat`) | major |
| Support header icon | help icon circle (`pari-overlays:414-421`) | chat icon circle (`SupportChat:60-65`) | minor |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Notif empty title | "Nessuna notifica." (`pari-overlays:74`) | "Nessuna notifica" (`Notifications:64`) | cosmetic |
| Notif empty body | "Le notifiche su prenotazioni…" (`pari-overlays:75`) | "Quando avrai aggiornamenti…" (`Notifications:66-67`) | minor |
| DM empty title | "Nessuna conversazione." (`pari-overlays:194`) | "Nessuna conversazione" (`DirectMessages:108`) | cosmetic |
| Support welcome | "Rispondiamo entro 24h…" (`pari-overlays:444`) | mancante (`SupportChat`) | critical |

#### Component riusabili da introdurre
- `PariOverlayShell` (header + back + title + optional headerRight + body + animations)
- `PariOverlayEmpty` (icon + title + body centered)
- Notification badge icon color mapping (clay-soft/sage-soft by tone)
- DM list search pattern
- Support welcome banner

#### Domande residue al design team
- Overlay bg: `C.bg` (codebase) o `--paper-3` (pack)?
- Unread notif bg: `C.accentLight + 40` (codebase) o `--paper-2` (pack)?
- Support banner: mandatory o opzionale?

#### Stima
- Critical: 3, Major: 3, Minor: 5, Cosmetic: 3

---

### Screen · Misc Sheets (EditProfile + EditBarberInfo)
**Pack JSX**: `pari-misc-sheets.jsx` (308 righe)
**Codebase**: `EditProfileSheet.tsx` + `EditBarberInfoSheet.tsx`

#### Drift tipografico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Sheet title | 22px 600wt (`pari-misc-sheets:35`) | 17px 600wt (`EditProfileSheet:50`) | major |
| Field label | 11.5px uppercase 0.02em (`pari-misc-sheets:281`) | 12.5px 500wt (`EditProfileSheet:109`) | major |
| Caption counter | 11px mono (`pari-misc-sheets:195`) | identico (`EditProfileSheet:103`) | none |

#### Drift cromatico
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Scrim bg | `var(--scrim)` (`pari-misc-sheets:25`) | identico (`EditProfileSheet:40`) | none |
| Sheet handle | inferred `--ink-15` | `C.border` (`EditProfileSheet:47`) | cosmetic |
| Input border | 1px `--ink-15` (`pari-misc-sheets:147`) | 1px `C.border` (`EditProfileSheet:117`) | none |
| Save button | `kind="filled"` → `var(--ink)` text default bg (`pari-misc-sheets:100-105`) | `var(--clay)` (`EditBarberInfoSheet:119`) | critical |
| Cancel button | `kind="hairline"` outline + dark text (`pari-misc-sheets:100`) | `C.bg` + `C.border` (`EditProfileSheet:90`) | minor |

#### Drift strutturale
| Element | Pack | Codebase | Severity |
|---|---|---|---|
| Sheet wrapper | scrim + sheet maxHeight 94% (`pari-misc-sheets:25-26`) | scrim + sheet implicit (`EditProfileSheet:38-46`) | cosmetic |
| Sheet header | padding + justify-between flex (`pari-misc-sheets:29-32`) | padding + flex close (`EditProfileSheet:49-56`) | minor |
| Handle bar | pattern in SupportChat | presente (`EditProfileSheet:47`) | minor |
| Field structure | label + input (`pari-misc-sheets:278-286`) | label + input (`EditProfileSheet:59-66`) | cosmetic |
| Text limits | inline counter "200/200" (`pari-misc-sheets:195`) | CharCount component (`EditProfileSheet:102-104`) | cosmetic |
| Error display | inline alert box | inline div C.red + C.redSoft (`EditProfileSheet:81-85`) | cosmetic |
| Button grid | 2-col [Cancel, Save] bottom (`pari-misc-sheets:99-106`) | single stacked (`EditProfileSheet:87-95`) | major |
| Info callout | light bg 11.5px text (`pari-misc-sheets:90-97`) | non presente (`EditProfileSheet`) | major |

#### Drift copy italiana
| Element | Pack (italiano) | Codebase | Severity |
|---|---|---|---|
| Sheet label barber | "Modifica info salone" (`pari-misc-sheets:30`) | "Info salone" (`EditBarberInfoSheet:73`) | cosmetic |
| Sheet title barber | "La tua bottega" (`pari-misc-sheets:37`) | non presente | minor |
| Field label case | uppercase + spaces (`pari-misc-sheets:281`) | sentence case (`EditProfileSheet:109`) | minor |
| Bio placeholder | non in pack barber sheet | "Una breve descrizione di te" (`EditProfileSheet:74`) | cosmetic |
| Save label | depends on context (`pari-misc-sheets:104`) | "Salva" (`EditProfileSheet:94`) | none |

#### Component riusabili da introdurre
- Scrim + sheet animation pattern (scrimIn/sheetUp)
- Field wrapper (label + input + optional error)
- CharCount subcomponent
- Info callout style
- Two-button footer layout (Cancel | Save)

#### Domande residue al design team
- Sheet title: display-style 22px (pack) o 17px (codebase)?
- Field labels: uppercase 0.02em (pack) o sentence-case (codebase)?
- Save button: `--clay` (codebase) o `kind="filled"` ink style (pack)?
- Two-button footer: reintrodurre?

#### Stima
- Critical: 1, Major: 3, Minor: 3, Cosmetic: 5

---

### Screen · Discover (escluso — Blocco 4 drop-in)
**Pack JSX**: `pari-discover.jsx` (964 righe)
**Codebase**: `Discover.tsx`

**Status**: escluso da audit dettagliato. Pack pari-discover sarà sostituito drop-in nel Blocco 4 (decisione utente Q4 — `next_available_slot` RPC + agenda pill cablata + pin pulse). Nessuna analisi drift in questo audit.

---

## 3. Audit token CSS

**File**: `docs/design/pack/design_handoff_barberbook_v4/v4_pari_mappa/colors_and_type.css` (249 righe) vs `src/index.css` (446 righe).

### Token in pack presenti in codebase (identici)
Tutti i token surface/ink/accent/semantic/type/radii/shadow/spacing/motion del pack sono **presenti nel codebase con valori identici**:
- `--paper-3`, `--paper-2`, `--paper`, `--linen`, `--linen-2`
- `--bg`, `--bg-2`, `--surface`, `--surface-deep` (semantic aliases)
- `--ink`, `--ink-80/60/50/40/25/15/08/04`
- `--clay`, `--clay-deep`, `--clay-soft`, `--clay-tint`
- `--sage`, `--sage-soft`, `--rust`, `--rust-soft`
- `--scrim`, `--border`
- `--font-display`, `--font-body`, `--font-mono`
- `--t-eyebrow`, `--t-label`, `--t-body`, `--t-body-strong`, `--t-caption`, `--t-mono`
- `--t-h1`, `--t-h2`, `--t-h3`, `--t-h4`
- `--tracking-display`, `--tracking-body`
- `--r-sm` 8, `--r-md` 12, `--r-lg` 18, `--r-pill` 9999
- Shadow: `--shadow-card`, `--shadow-lift`, `--shadow-sheet`, `--shadow-toast`
- Spacing: `--s-1` ... `--s-9`
- Motion: `--ease`, `--ease-spring`, `--d-fast`, `--d-med`, `--d-slow`

### Token presenti in codebase ma NON nel pack (additions)
| Token | Origine | Note |
|---|---|---|
| `--font-display-serif` | Pari V4 (PR-tris) | Instrument Serif — addition voluta |
| `--pole-mark-side`, `--pole-mark-middle` | Pari V4 | PoleMark logo colors |
| `--carta`, `--carta-2`, `--carta-3` | Legacy (CutBook) | alias verso paper-3/2/1 |
| `--inchiostro`, `--inchiostro-80/60/40/20/12/04` | Legacy | alias verso ink/* |
| `--ottone`, `--ottone-deep`, `--ottone-soft` | Legacy | alias verso clay/* |
| `--sangue`, `--sangue-soft` | Legacy | alias verso rust/* |
| `--muschio`, `--muschio-soft` | Legacy | alias verso sage/* |
| `--color-background-primary/secondary` | Legacy | alias verso paper-3/2 |
| `--color-text-primary/secondary/tertiary` | Legacy | alias verso ink/ink-60/40 |
| `--color-border-secondary/tertiary` | Legacy | alias verso ink-25/15 |

**Verdetto**: legacy aliases sono compatibility shim per code pre-rebrand (`lib/colors.ts`, screens CutBook). Codebase è **superset** del pack senza drift di valore. Aliases sono safe da rimuovere progressivamente quando il chiamante viene migrato a token Pari.

### Token presenti in pack ma NON nel codebase
**Nessuno**. Tutti i token pack sono presenti.

### Drift di convention / differenze utility

| Aspetto | Pack | Codebase | Note |
|---|---|---|---|
| Dark activation | `[data-theme="dark"]` (CSS attribute selector) | `:root.dark` (class selector) | entrambi validi; codebase coerente con `useTheme.ts` che toggla `.dark` su `<html>` |
| Geist Mono weights | `400;500` (pack `@import`) | `400;500;600` (codebase `@import`) | codebase ha weight 600 extra (usato in stat values) |
| Instrument Serif import | non in pack | `Instrument+Serif:ital@0;1` | Pari V4 addition |
| `.bb-eyebrow` utility | sì (linee 242-249 pack) | sì (linee 407-414 codebase) | identici |
| `.bb-h2-display` utility | non in pack | sì (linee 419-427 codebase) | Pari V4 addition |
| `.bb-mono` utility | non in pack | sì (linee 431-434 codebase) | Pari V4 addition |

### App shell CSS (codebase only)
Codebase ha ~200 righe di CSS app shell che il pack non ha:
- `.bb-app` (container 520 max-width + safe-area-inset-top iOS PWA)
- `.bb-screen`, `.bb-safe-top`, `.bb-safe-bot`
- `.bb-pull-refresh`
- `.bb-topbar` (wordmark + actions)
- `.bb-bottom-nav` + `.bb-bottom-nav__btn` + `.lbl`
- `.bb-scrim` + `.bb-sheet` + `.bb-sheet__handle`
- `.bb-toast` + `.bb-toast__gutter` + `.ttl` + `.msg`

**Verdetto**: app shell è scope codebase-only (mobile/PWA chrome). Non parte di colors_and_type.css del pack. No drift.

---

## 4. Audit dark mode token

### Parità dark mode
Tutti i token dark del pack sono presenti nel codebase con **valori identici**:
- Surfaces dark: `--paper-3` #14110D, `--paper-2` #1B1814, `--paper` #221E1A, `--linen` #2A2520, `--linen-2` #332D26
- Ink dark: `--ink` #ECE5D6, alphas tutti uguali
- `--clay-deep` #D9B091, `--clay-soft` rgba(176,127,97,0.20), `--clay-tint` rgba(176,127,97,0.16)
- `--sage` #9DB089, `--sage-soft` rgba(157,176,137,0.18)
- `--rust` #D27F66, `--rust-soft` rgba(210,127,102,0.18)
- `--scrim` rgba(0,0,0,0.58)
- Shadows dark con alphas appropriati

### Override dark codebase-only
| Override | Note |
|---|---|
| `--pole-mark-side: var(--ink)` / `--pole-mark-middle: var(--ink)` | dark mode: PoleMark perde l'accento clay, diventa monocromatico ink (decisione voluta — Q1 PoleMark = logo definitivo, OK) |
| `.bb-toast` dark override (line 404-405) | identico al pack (toast bg=ink, foreground re-toned) |

### Override pack-only (mancanti in codebase)
**Nessuno**. Tutte le override dark del pack sono presenti.

### Verdetto dark mode
Parità completa. **Zero drift dark**. Pronta per Blocco 3 dove dark mode è priority.

---

## 5. Audit asset visivi

**Pack assets**: `docs/design/pack/design_handoff_barberbook_v4/v4_pari_mappa/assets/`
**Codebase**: `public/` + `src/components/primitives.tsx`

| Asset pack | Presente codebase | Drift | Severity |
|---|---|---|---|
| `favicon.svg` | sì (`public/favicon.svg`) | identico (viewBox + rect + colori) | none |
| `logo.svg` (wordmark "Barberbook"/"Pari") | no — sostituito da `<Wordmark>` React in `primitives.tsx` | gap come asset, OK funzionale | minor |
| `logo-inverse.svg` (variante dark) | no | gap totale | major |
| `mark.svg` (PoleMark standalone) | no come SVG, sì come `<PoleMark>` inline `primitives.tsx:15-23` | gap come asset, OK funzionale | minor |

**PoleMark in codebase** (Q1 decretato logo definitivo):
- Component `<PoleMark>` in `primitives.tsx:15-23`, 3 rettangoli verticali via `<rect>` inline
- Colori da CSS vars `--pole-mark-side` e `--pole-mark-middle`
- Coerente con `mark.svg` del pack — implementazione differente (TSX vs SVG file) ma stesso risultato visivo
- Dark mode: `--pole-mark-middle` flippa a `--ink` (monocromatico)

**PWA icons** (codebase only, non in pack):
- `apple-touch-icon-180x180.png`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`
- Tutti PNG raster — non c'è SVG sorgente nel pack da cui generarli. **Q5**: rigenerarli da `logo.svg` quando aggiunto?

**Verdetto asset**:
- `favicon.svg`: parità ✓
- `mark.svg`/PoleMark: parità funzionale ✓
- `logo.svg` + `logo-inverse.svg`: gap, da aggiungere in Blocco 3 (cosmetic baseline)

---

## 6. Instrument Serif application gap

**Scope decretato (Q7)**: hero h1 + section title + sheet title + named entities (barber name, client name) + appointment names. `<em>` clay SOLO h1 hero.

### Status attuale
- **Definizione**: `--font-display-serif` in `index.css:92`
- **Utility `.bb-h2-display`** in `index.css:419-427` (22px font-display-serif italic letterSpacing -0.022em weight 400)
- **Usage negli screens**: **ZERO**
- **Anche `CancelBookingSheet.tsx`** (PR-tris) usa Geist sans inline, NON `.bb-h2-display`. Gap residuo PR-tris.

### Lista occorrenze da convertire

#### Critical (titoli hero / sheet / section)
| File:Linea | Element | Attualmente | Note |
|---|---|---|---|
| `Login.tsx:122` | h1 "Chi sei?" | Geist sans inline | hero auth |
| `Login.tsx:143` | h1 "Bentornato." | Geist sans inline | hero auth |
| `Register.tsx:90` | h1 (nome screen) | Geist sans inline | hero auth |
| `ResetPassword.tsx:44` | h1 (recovery) | Geist sans inline | hero auth |
| `BarberProfileSheet.tsx:147` | h1 sheet header | Geist sans 22px | sheet title |
| `BookingSheet.tsx:291` | h2 "con {barber.name}" | Geist sans 22px | sheet title |
| `BookingSheet.tsx:386` | h2 step 2 | Geist sans 22px | section title |
| `BookingSheet.tsx:557` | h2 datetime | Geist sans 24px | section title |
| `BookingSheet.tsx:766` | h2 payment | Geist sans 24px | section title |
| `CancelBookingSheet.tsx` | h2 sheet title (PR-tris) | Geist sans inline | sheet title — gap residuo PR-tris |
| `MyAppointments.tsx` | section titles "Imminenti" / "Storico" | Geist sans | section title |
| `BarberDashboard.tsx` | section title "Politica di cancellazione" (PR-tris) | Geist sans 16px | gap residuo PR-tris |

#### Major (named entities — barber/client name)
| File:Linea | Element | Note |
|---|---|---|
| `MyAppointments.tsx:84` | barber.profile.display_name | named entity |
| `MyAppointments.tsx:175` | barber.profile.display_name | named entity |
| `MyAppointments.tsx:246` | named entity barbiere | named entity |
| `Discover.tsx:33-34` | barber.profile.display_name | named entity (Blocco 4 drop-in) |

### `<em>` clay (h1 hero only)
Da aggiungere pattern `<em style="color: var(--clay); font-style: italic">` solo in **h1 hero screens** (es. Welcome screen "La sedia giusta <em>prenotata in 10 secondi</em>"). Mock pack-feed usa "Sei in <em>pari</em>." pattern.

Occorrenze candidate:
- Login.tsx welcome screen hero (se reinstaurato — Q1)
- Eventuale hero Feed/Discover

### Stima Blocco 5
- 9 critical h1/h2/sheet/section titles
- 4 major named entities
- ~13 punti applicazione totale
- Stima Claude Code: ~2h (semplice replace + utility classes)

---

## 7. Geist Mono numeri gap

**Status attuale**:
- `<Mono>` component: **non esiste** in `src/components/`
- `.bb-mono` utility: presente (`index.css:431-434`)
- `--font-mono`: "Geist Mono" definito (`index.css:94`)

### `<Mono>` component da creare (Blocco 5)
```typescript
// src/components/Mono.tsx (~10 LOC)
export function Mono({ children, className = '', ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={`bb-mono ${className}`} {...rest}>{children}</span>
}
```

### Occorrenze numeri user-facing non-mono — top issues

#### Major (prezzi inline)
| File:Linea | Contesto | Numero | Attualmente |
|---|---|---|---|
| `BookingSheet.tsx:82` | `priceFmt` inline | `€ {price}` | Geist sans |
| `BookingSheet.tsx:417` | Meta appuntamento | `{slotMinutes} min · {priceFmt}` | Geist sans |
| `BookingSheet.tsx:613` | Pay button | `{priceFmt}` | Geist sans |
| `BookingSheet.tsx:813` | Stripe pay button | `{priceFmt}` | Geist sans |

#### Major (altri numeri visibili)
| File:Linea | Contesto | Numero | Attualmente |
|---|---|---|---|
| `Profile.tsx:544` | Booking history | `{b.time_slot}` orario | Geist sans |
| `BarberProfileSheet.tsx:247` | Stat follower count | `{followersCount}` | Geist sans |
| `BarberProfileSheet.tsx` (rating) | Rating display | numeri rating | Geist sans |

#### Già mono (no drift) — riferimento
- `BookingSheet.tsx:337` service card price ✓
- `BookingSheet.tsx:488-495` summary price ✓
- `MyAppointments.tsx:262` time_slot ✓
- `EditProfileSheet.tsx:103` CharCount ✓ (tabular-nums)
- `AdminPanel.tsx:612` log timestamp ✓
- `BarberDashboard.tsx:440` row.timeLabel ✓
- `DirectMessages.tsx:282/318` message timestamp ✓

### Stima Blocco 5
- 1 component `<Mono>` (~10 LOC)
- 6-8 punti applicazione critici (prezzi/orari/rating/followers)
- Stima Claude Code: ~1.5h (component + sweep applicazione)

---

## 8. Domande aperte al design team

Consolidate da tutti gli screen audit. **22 domande** numerate per riferimento futuro:

### Brand & copy
1. **Nome brand**: "Pari" (pack) o "Barberbook" (codebase)? Cross-cutting su Feed wordmark, Auth header, Support chat title. **Q1 cross-cutting**.
2. **Auth Welcome demo card** (Marco Barba booking): è scena solo design o va in prodotto?
3. **Auth password requisiti**: 8+ (pack) o 6+ (codebase)?

### Layout / structural
4. **Feed 3-dot menu**: popup absolute (pack) o bottom sheet (codebase)?
5. **Profile prossimo appuntamento card**: sopra (pack) o sotto (codebase)?
6. **Profile Edit/Condividi button pair**: dove se appointment è in cima?
7. **BarberProfile contact card**: 4 rows con hours/days (pack) o leaner (codebase)?
8. **BarberProfile "Bottega" bio + Services list**: visibili o omessi?
9. **Booking service picker**: radio (pack) o icon-heavy 38px (codebase)?
10. **Appointments date tile sidebar**: reinstaurare?
11. **Appointments topbar**: "Appuntamenti" o "I miei appuntamenti"?
12. **Bottega tab layout**: 2-tab + Servizi separato (pack) o 3-tab (codebase)?
13. **Bottega filter chips "In arrivo"**: re-introdurre o flag separato?
14. **Menu sections**: card container (pack) o flat list (codebase)?
15. **EditSheets two-button footer**: reintrodurre Cancel + Save side-by-side?

### Color
16. **Booking date/slot selected color**: `--ink` (pack) o `--clay` (codebase)?
17. **Bottega vacation banner**: `--rust` (pack) o `--green` (codebase)?
18. **Bottega toggle active**: `--sage` (pack) o `C.text` (codebase)?
19. **Admin message bubble mine**: `--clay` (pack) o `C.text` (codebase)?
20. **Overlay bg**: `--paper-3` (pack) o `C.bg` (codebase)?

### Asset
21. **PoleMark/`mark.svg`**: confermare React component inline (`primitives.tsx`) vs SVG file dedicato. Q1 decretato PoleMark definitivo → OK component inline.
22. **PWA PNG icons**: rigenerarli quando arriva `logo.svg`?

---

## 9. Raccomandazione ordine sub-blocchi

### Blocco 3 — Cosmetic baseline + dark + asset
**Scope**: token CSS già allineati (no work), asset gap (`logo.svg` + `logo-inverse.svg`), Wordmark conferma, dark mode visual sweep su tutti gli screen post-PR-tris.
**Effort**: ~2h
**Output**: 2 SVG asset committati in `public/`, eventuale aggiornamento `<Wordmark>` se ridotto/inverse, screenshot dark sample per QA.

### Blocco 4 — Discover drop-in
**Scope**: `pari-discover.jsx` (964 righe) come drop-in invariato in `Discover.tsx`. Solo adattamento React + hook reali (no `next_available_slot` ancora).
**Effort**: ~4h
**Output**: Discover.tsx riscritto seguendo pack, integrazione con `useBarberMarkers` + `useUserLocation` esistenti.

### Blocco 4.5 — `next_available_slot` RPC (Q4 decretato)
**Scope**: nuova RPC Postgres `next_available_slot(barber_id, from_ts)` che calcola lo slot disponibile più vicino. Cablata in Discover (agenda pill) e BarberProfileSheet.
**Effort**: ~3h (migration + RPC + hook + test)
**Output**: mig 041, hook `useNextSlot.ts`, agenda pill cablata + null-hidden (Q5 decretato).

### Blocco 5 — Instrument Serif + `<Mono>` (Q7+Q8 decretati)
**Scope**:
- Creare `src/components/Mono.tsx` (~10 LOC)
- Applicare `<Mono>` ai 6-8 punti major identificati in §7
- Applicare `.bb-h2-display` o nuova utility `.bb-h1-hero` ai 9 critical + 4 major identificati in §6
- Aggiungere pattern `<em>` clay nei h1 hero
**Effort**: ~3.5h
**Output**: Mono.tsx + sweep applicazione + utility CSS aggiornate.

### Blocco 6 — Drift screen-per-screen high-impact
**Scope**: chiudere drift critical + major per gli screen più toccati frequentemente dall'utente, in ordine:
1. **Auth** (Welcome + Login + Register) — primo touch utente
2. **Feed** — secondo touch
3. **Discover** (post Blocco 4) — già drop-in
4. **BarberProfile** — terzo touch
5. **Booking** — flow critico
6. **Appointments** — flow critico
7. **Profile** (cliente) — visita meno frequente
8. **Menu** — visita rara
9. **Bottega** (barber-only) — basso volume utenti
10. **Admin** (interno) — basso volume

**Effort totale**: ~8h split in 5-6 sub-PR (Auth+Feed insieme, Discover, BarberProfile+Booking insieme, Appointments+Profile, Menu+Bottega+Admin insieme).

### Blocco 7 — Misc sheets + overlays
**Scope**: chiudere drift critical+major su EditProfileSheet, EditBarberInfoSheet, Notifications, DirectMessages, SupportChat.
**Effort**: ~3h
**Output**: 2-3 sub-PR.

### Blocco 8 — Cleanup + chiusura
**Scope**: rimozione legacy aliases CSS dove migration completata (`--carta`, `--inchiostro`, `--ottone`, ecc.), estrazione `SheetWrapper` reusable (debt da PR-tris), audit finale.
**Effort**: ~2h

**STIMA TOTALE Blocchi 3-8**: ~22h Claude Code (escluso smoke test utente).

---

## 10. Note tecniche emerse

### Pattern coexistence: `C.*` vs `var(--*)` direct
Il codebase usa **due pattern** per accedere ai design token:
1. **`var(--clay)`** direct CSS variable — usato in PR-tris (CancelBookingSheet, RefundFailedAlert, useBooking inline styles)
2. **`C.accent`** via `ColorContext` (definito in `primitives.tsx`) — usato in screen pre-Pari (Discover, Feed, BarberDashboard, AdminPanel)

**Impatto audit**: la maggior parte dei "drift cromatico minor" identificati negli screens C e B sono in realtà differenze di **pattern access**, non di valore (es. `C.accent` = `var(--clay)` runtime). Quando l'audit segna `--clay` (pack) vs `C.accent` (codebase) → severity dovrebbe essere **none** se la mappa è corretta, **major** solo se la mappa porta a valore diverso.

**Raccomandazione**: in Blocco 8 cleanup, scegliere un pattern unico (verosimilmente `var(--*)` direct per coerenza con Pari V4 design intent) e migrare gradualmente. Non in scope per Blocchi 3-7.

### Sheet shell duplication
PR-tris ha annotato come DEBT l'estrazione di `SheetWrapper` (scrim + sheet + animations) da `ConfirmSheet` + `CancelBookingSheet`. Questo audit conferma che anche `EditProfileSheet`, `EditBarberInfoSheet`, `BookingSheet`, e gli overlay (Notifications, DirectMessages, SupportChat) potrebbero usare lo stesso wrapper. **Refactoring scope per Blocco 8**, non per Blocchi 3-7.

### Token `C.*` non documentati nel pack
Il codebase ha token semantici via `ColorContext`:
- `C.accent` / `C.accentLight` / `C.accentDeep` → clay variants
- `C.green` / `C.greenSoft` → sage (mappa errata? sage non è green)
- `C.red` / `C.redSoft` → rust
- `C.surface` / `C.surfaceAlt` → paper/paper-2
- `C.text` / `C.muted` / `C.borderMed` → ink/ink-60/ink-25

**Caveat**: il nome `C.green` per sage e `C.red` per rust è **storica eredità CutBook** (rebrand non completato). Tecnicamente non drift ma debt naming. **Q23**: rinominare semantic context post-rebrand? (non urgente, scope Blocco 8).

### `StatusPages.tsx` non in pack
Il codebase ha `src/screens/StatusPages.tsx` (error/loading/maintenance). Il pack non ha equivalente. Da decidere:
- Mantenere come è (extra) — **Q8.1**
- Riportare in stile Pari V4 (paper-3 bg + ink text)
- Sostituire con pattern overlay (PariOverlayShell)

### Build status post-audit
Audit è read-only. Nessun touch al codice → build status invariato (tsc 0, vite build 0 da PR-tris).

---

**Fine audit.**

Per le decisioni utente (8 Q già decretate dall'orchestrator chat + 22 nuove qui), il piano integrato è pronto per esecuzione Blocco 3.
