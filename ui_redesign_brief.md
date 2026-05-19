# Brief per Claude Code — Rifacimento completo UI/UX su design system "CutBook · Modern Minimal"

> **Obiettivo in una riga:** sostituire **tutto** il layer di presentazione dell'app col linguaggio visivo del design system *CutBook Modern Minimal* (skill `cutbook-design`), **senza toccare una riga del layer logico/dati**. Stessa app, stesse funzionalità, stesse query Supabase, stesse regole RLS — pelle nuova, costruita applicando il design system. Il kit canonico è la **direzione di riferimento da adattare** ai dati e agli stati reali, non un mockup da riprodurre al pixel.
>
> **Contesto stack:** React 18 + Vite + TypeScript + Supabase (Postgres + Auth + Storage + Realtime), MapLibre GL, deploy su Vercel. App mobile-first, bottom nav. Esiste già un brief separato (`discover_map_brief.md`) per la mappa di Esplora: questo brief **non lo sostituisce**, lo integra (vedi §7).
>
> **Fonte del design:** la skill `cutbook-design`. La **verità visiva** sono i token (`colors_and_type.css`) + le regole dure + la voce. Il riferimento canonico di *come si applica* è `ui_kits/cutbook_app/` (ricostruzione hi-fi, ma con **dati demo e composizioni illustrative**: è una direzione da adattare, non la fotografia dell'app finale). Qualsiasi cosa diverga da `colors_and_type.css` è un bug del kit, non del sistema.

---

## 0. Prompt sintetico da incollare in Claude Code

> Rifai da zero **solo lo strato UI** dell'app barbieri (React + Vite + TS + Supabase). Il design di destinazione è il design system **CutBook Modern Minimal**, disponibile nella skill `cutbook-design`: superfici bianche, inchiostro quasi nero, **un solo accent corallo `#FF5C39`** usato con parsimonia, font **Onest** (display+body) + **JetBrains Mono** (solo numeri), icone **Phosphor Thin**, copy **in italiano**, sentence case, niente emoji, niente gradienti, niente backdrop-filter, raggi `6/10/16/pill`, bordi `1px` inchiostro al 10%. Adotta **verbatim** `colors_and_type.css` (nella sua versione **aggiornata che include il blocco dark**) e `ui_kits/cutbook_app/app.css` come fogli di stile globali. **Dark mode è in scope** (decisione presa, l'app esistente la usa): i token scuri arrivano dal design system aggiornato e fanno override degli stessi nomi di variabile via `@media (prefers-color-scheme: dark)` — i componenti non cambiano, vedi §9. Porta i componenti del kit (`primitives.jsx`, `sheets.jsx`, `screens.jsx`, `screens-extra.jsx`, `App.jsx`) da JSX a **TSX tipizzati**, sostituendo i dati `DEMO_*` con gli **hook reali esistenti** (`useAuth`, `useFeed`, `useBarbers`, `useAvailability`, `useBooking`) e cablando le callback al routing/stato esistente. **Il kit è la direzione di riferimento, non un mockup da clonare al pixel:** ha dati finti e composizioni fisse — applica fedelmente token/primitive/regole/voce/struttura dei flussi, ma **adatta** layout e stati alla realtà (dati a lunghezza variabile, paginazione, loading/empty/error, varianti ruolo, gap di schema) con criterio di designer, vedi §1.1. **Non modificare**: client Supabase, hook, query, tipi generati, policy RLS, schema DB, logica di booking. Migra le icone da Tabler (`ti ti-*`) a Phosphor Thin (`ph-thin ph-*`) con la tabella in §3. Mantieni il flusso di prenotazione a 2 step (data/ora → conferma → toast) ma alimentalo con `useAvailability` reale al posto degli slot hardcoded. **Prima di scrivere codice, esegui la Fase 0 (§0.1): recon del repo reale, inventario di ogni funzione esistente, piano scritto, e fermati per conferma.** Poi rispetta in dettaglio le sezioni 1–12 e la checklist §11.

---

## 0.1 Fase 0 — Recon e piano prima di scrivere codice (obbligatoria, nessuna modifica)

**Si fa per prima. In Fase 0 non si tocca nessun file — l'unico output è un piano scritto, e ci si ferma per conferma umana prima che parta il piano commit (§12).** Questa fase serve a validare le assunzioni di questo brief contro il repository *reale* e a fissare il contratto "nessuna funzione si perde" prima che si muova qualcosa.

1. **Verifica l'inventario del layer logico (§1.2) contro il codice reale.** Apri ogni hook, `lib/supabase.ts`, `lib/geo.ts`, `lib/mapStyle.ts`, `types/` e `App.tsx`. Per ciascuno annota la firma / shape di ritorno *reale* e **ogni scostamento** da §1.2 (es. un hook ritorna una shape diversa, `useGeolocation` non esiste ancora, `App.tsx` mescola logica e markup). Il codice reale vince su questo brief — segnala le differenze, non seguire il brief in silenzio.
2. **Leggi il design system per intero.** `cutbook-design/README.md`, `colors_and_type.css` (**conferma che il blocco dark sia presente** — se non c'è, fermati e richiedilo come da §2.1/§9, non improvvisare) e ogni file del kit (`primitives.jsx`, `sheets.jsx`, `screens.jsx`, `screens-extra.jsx`, `App.jsx`, `app.css`).
3. **Inventario della UI ATTUALE, funzione per funzione.** Elenca ogni schermata, route/tab, elemento interattivo e stato che l'app ha oggi: opzioni sort/filtro, voci di menu, tab del profilo, azioni barbiere, like/save/follow, paginazione, role gating, sheet, toast, stati edge. **Questa lista è la baseline della regola no-feature-loss (§1.1).**
4. **Produci la mappatura.** Una tabella: *funzione esistente* → *componente kit / collocazione di destinazione* → *stato* (`match diretto` / `adatta — come` / `gap — adattamento proposto nel linguaggio del design` / `domanda aperta`). Ogni voce del punto 3 deve comparire qui; niente può mancare o essere marcato "rimuovi".
5. **Elenca domande aperte e gap:** gap di schema (prezzo/durata, `open_now`, DM, notifiche), presenza del blocco dark, tutto ciò che il kit non disegna, tutto ciò che è ambiguo tra brief e codice reale.
6. **Output `REDESIGN_PLAN.md`** (o la descrizione della PR) con i punti 1–5, poi **fermati e aspetta conferma umana.** Non iniziare il commit 1 finché il piano non è approvato.

Tieni la Fase 0 **delimitata**: è recon più un piano, non refactoring esplorativo. Niente codice, niente modifiche, niente pulizie "già che ci sono". Se la Fase 0 fa emergere una contraddizione tra questo brief e il codice reale, il piano la segnala e chiede — non sceglie un lato da solo.

---

## 1. Principio guida + cosa NON si tocca

### 1.1 Il principio

Questa è una **sostituzione del solo view layer**. Il comportamento dell'app non cambia: cambia *come appare*, non *cosa fa*. La regola operativa per ogni file che tocchi:

- Se contiene **logica, dati, query, tipi, auth, routing-state, RLS** → **non si tocca** (lo si *consuma*).
- Se contiene **markup, stile, layout, copy, icone** → **si riscrive applicando il design system** (token, primitive, regole dure, voce). Il kit `cutbook-design` è l'**esempio canonico** di come si applica quel sistema — un riferimento da **adattare**, non un mockup da clonare al pixel.

Il layer logico è la verità funzionale. La verità visiva è il **design system** (token in `colors_and_type.css`, primitive, regole dure §2.3, voce §8): quello va applicato con fedeltà assoluta. Il **kit** (`ui_kits/cutbook_app/`) è la sua applicazione canonica di riferimento, ma con **dati demo e composizioni fisse**: va usato come direzione e punto di partenza, poi adattato alla superficie funzionale reale. Il tuo lavoro è ricablare l'uno sull'altro **con giudizio**, non fare un copia-incolla del mockup.

> ### Il kit è una direzione, non una riproduzione di come sarà l'app
>
> Questo è il punto su cui non equivocare. Il kit `cutbook_app/` mostra **una** composizione per schermata, con **dati finti, conteggi fissi, liste di lunghezza nota, un solo ruolo per volta, nessuno stato di caricamento/errore reale**. L'app vera ha dati a lunghezza variabile, paginazione, stati loading/empty/error, varianti per ruolo (cliente/barbiere/admin), gap di schema, contenuti che il kit non disegna affatto. **Claude Code deve estendere lo stesso linguaggio visivo a tutto questo**, con criterio di designer — non forzare la realtà dentro il layout del mockup, né bloccarsi se una schermata reale ha più stati di quanti il kit ne mostri.
>
> Cosa è **vincolante** (fedeltà assoluta): i token (colori/tipo/raggi/spazi/ombre/motion), le primitive, le regole dure §2.3, la voce/copy IT §8, la struttura dei flussi (es. booking a 2 step), il comportamento logico.
>
> Cosa è **riferimento da adattare** (non pixel-target): la composizione esatta delle schermate del kit, i suoi dati demo, i conteggi e le liste fisse, il numero di elementi mostrati, l'assenza di stati nel mockup. Dove la realtà diverge dal kit, **si applica il design system alla realtà**, non si piega la realtà al kit.
>
> In sintesi: stesso *linguaggio*, adattato; non stessa *pagina*, clonata.

### 1.2 Inventario del layer logico da preservare (consumare, non modificare)

| Modulo | Cosa espone in uscita | Cosa accetta in ingresso |
|---|---|---|
| `lib/supabase.ts` | istanza singleton `supabase` (client tipizzato `<Database>`, env `VITE_SUPABASE_*`) | — |
| `types/supabase.ts` | tipi DB generati (`supabase gen types`) | — |
| `hooks/useAuth.ts` | `{ session, profile, signInWithGoogle, signOut }` — `profile` include join `barbers(*)`, quindi il **ruolo** (`profiles.role` + `is_admin`) è derivabile da qui | callback `signInWithGoogle`, `signOut` |
| `hooks/useFeed.ts` | `{ posts, loadMore }` — post paginati dai barbieri seguiti, join `barbers→profiles` | `userId`; azione `loadMore()` (paginazione) |
| `hooks/useBarbers.ts` | `{ barbers, loading }` — lista discover con coordinate dal profilo | `sort: 'nearby'\|'popular'\|'new'\|'toprated'`, `userLat?`, `userLng?`, `search?` |
| `hooks/useAvailability.ts` | `{ slots, booked }` — slot generati client-side + set degli orari occupati | `barberId`, `date` |
| `hooks/useBooking.ts` | `{ createBooking, cancelBooking, loading }` — `createBooking` inserisce con `status:'pending'`; `cancelBooking` → `status:'cancelled'` | `{ clientId, barberId, date, timeSlot }` / `bookingId` |
| `hooks/useGeolocation.ts` | `{ coords, denied, locate, fallback }` (previsto da `discover_map_brief.md`) | azione `locate()` |
| `lib/geo.ts` | `haversine(profile, lat, lng)` | — |
| `lib/mapStyle.ts` | `MAP_STYLE` (MapTiler + fallback OpenFreeMap) | — |
| `App.tsx` (routing/stato) | tab attivo, **role gating** (client/barber/admin), stato sheet (`bookingBarber`, `profileBarber`, `showNotifications`, `showMessages`), coda toast | callback di navigazione e apertura sheet |
| Supabase Realtime | aggiornamenti tabella `bookings` (dashboard barbiere) | — |
| Supabase Auth | Google/Apple, trigger che crea `profiles` alla registrazione | — |

> **Da `App.tsx` puoi modificare solo il *rendering* della bottom nav e del montaggio schermate/sheet** (markup + classi), **non** la macchina a stati (quali stati esistono, chi li setta, role gating). Se l'attuale `App.tsx` mescola logica e markup, estrai prima la logica in hook/funzioni e lasciala intatta, poi riscrivi solo il JSX.

---

## 2. Design system: file da adottare e regole dure

### 2.1 File da portare nel progetto **verbatim**

1. **`cutbook-design/colors_and_type.css`** → copia in `src/styles/tokens.css` (o `src/index.css` se preferisci un solo entrypoint). Contiene tutte le CSS variables: palette (`--carta*`, `--inchiostro*`, `--ottone*`, semantici), tipo (`--font-display/body/mono`, scala), raggi (`--r-sm/md/lg/pill`), spacing 4px, ombre, motion. **Non rinominare le variabili**: i componenti del kit le usano tutte. **Usa la versione aggiornata del file, quella che contiene anche il blocco dark** (override degli stessi nomi di variabile sotto `@media (prefers-color-scheme: dark)` ed eventualmente `[data-theme="dark"]`): copiala **integralmente, blocco dark incluso**. **Non inventare valori scuri**: i colori dark sono parte del design system: se il file nel progetto non contiene ancora il blocco dark, richiedilo al design system / fermati, non improvvisare una palette scura.
2. **`cutbook-design/ui_kits/cutbook_app/app.css`** → copia in `src/styles/app-shell.css`. Contiene la shell: `.cb-app`, `.cb-screen`, `.cb-safe-top/bot`, `.cb-topbar` (+ `.wordmark`/`.no-dot`), `.cb-bottom-nav*`, `.cb-scrim`, `.cb-sheet*`, `.cb-toast*`, keyframes, helper. Importa entrambi una sola volta in `main.tsx`. **Attenzione (per il dark):** `app.css` ha alcuni valori cablati a mano che *non* passano dai token e quindi **non si adattano da soli** al tema: il `background: #F0F0EE` di `html, body`, i gradienti placeholder foto (`#2A2520 → #15110D`) e gli `rgba(10,10,10,…)` grezzi di ombre/segnaposto. Sostituiscili con riferimenti a variabile (es. `var(--carta)` per il body, un token segnaposto foto, le ombre tokenizzate) così seguono `prefers-color-scheme`. Lo `--scrim` è già un token e va bene.
3. **Asset** da `cutbook-design/assets/`: `cutbook-wordmark.svg`, `cutbook-monogram.svg`, `favicon.svg` → in `src/assets/` (favicon anche in `public/` e referenziata in `index.html`).

### 2.2 Dipendenze da installare

```bash
npm i @phosphor-icons/web@^2.1.1
```

- **Icone:** il kit usa le classi `ph-thin ph-*` (webfont Phosphor). Per restare **1:1 col kit** importa il webfont una sola volta in `main.tsx`:
  ```ts
  import '@phosphor-icons/web/thin'
  import '@phosphor-icons/web/fill'   // serve per ph-fill ph-star / ph-heart / ph-bookmark-simple
  ```
  (Alternativa `@phosphor-icons/react` solo se preferisci componenti tipizzati: in tal caso devi riscrivere ogni `<i className="ph-thin ph-x">` in `<X weight="thin"/>` — più lavoro, stessa resa. Default: webfont, porting meccanico.)
- **Font:** `Onest` + `JetBrains Mono` arrivano via `@import` già dentro `colors_and_type.css` (Google Fonts). Va bene per la v1. Se vuoi self-host per performance/offline, scarica i woff2 e sostituisci l'`@import` con `@font-face` — **opzionale, non bloccante**.
- **Rimuovi** `@tabler/icons-webfont` dalle dipendenze e ogni suo import una volta completata la migrazione icone (§3).

### 2.3 Regole dure (non infrangibili — valgono ovunque)

Sono le hard rules del design system. Trattale come lint a mano:

- **Niente emoji.** Da nessuna parte: copy, toast, bio, empty state.
- **Sentence case ovunque.** Bottoni, label, pill di stato, nav. Mai ALL CAPS, mai Title Case.
- **Un solo accent — corallo `#FF5C39`.** Una o due cose corallo per schermata, mai come superficie primaria. I bottoni primari pieni sono **inchiostro**, non corallo. Corallo = il pallino sotto l'avatar seguito, l'alone dell'input a fuoco, l'icona del tab attivo, la pill "Top".
- **Niente gradienti.** Profondità = una tinta più scura. (Eccezione tollerata: i placeholder foto del kit usano un gradiente scuro come segnaposto immagine — sostituiscili con la **foto reale** appena colleghi Storage; finché è placeholder va bene.)
- **Niente frosted glass, niente `backdrop-filter`.** Scrim = inchiostro piatto al 46% (`var(--scrim)`).
- **Raggi solo `6 / 10 / 16 / pill (9999)`.** Niente valori intermedi.
- **Bordi `1px` inchiostro al 10%** (`var(--border)`). Niente hairline a 0.5px (l'app vecchia li usava: vanno eliminati).
- **Copy italiano, `tu`.** Decimale con virgola (`4,9`), orario 24h (`09:30`), prezzo `€ 22` con spazio sottile, migliaia col punto (`1.240`), `·` (spazio + middot + spazio) per metadati inline, `—` per gli incisi.
- **Phosphor Thin** per tutte le icone, taglie **solo 16/20/22/24px**. Mai disegnare SVG di icone a mano.
- **Niente corsivo nei titoli.** Il corsivo è solo per `<em>` inline, raro. Il wordmark resta dritto.
- **Superficie = sempre i token, mai colori cablati.** Niente texture, niente immagini full-bleed dietro la UI. La pagina è `--carta` (chiaro) o il suo override scuro: deve restare *token-driven* perché il dark funzioni → vedi §9.

---

## 3. Migrazione icone: Tabler → Phosphor Thin

L'app vecchia usa Tabler (`ti ti-*`). Il design usa Phosphor Thin (`ph-thin ph-*`), `ph-fill ph-*` per gli stati attivi pieni (cuore/bookmark/stella). Sostituisci classe per classe. Tabella di equivalenza per le icone in uso:

| Uso | Tabler (vecchio) | Phosphor (nuovo) |
|---|---|---|
| Feed / griglia | `ti ti-layout-grid` | `ph-thin ph-square-half` |
| Esplora / mappa | `ti ti-map-search` / `ti ti-map` | `ph-thin ph-map-trifold` |
| Profilo | `ti ti-user` | `ph-thin ph-user` |
| Menu | `ti ti-menu-2` | `ph-thin ph-list` |
| Bottega (barbiere) | — | `ph-thin ph-storefront` |
| Cuore (off/on) | `ti ti-heart` | `ph-thin ph-heart` / `ph-fill ph-heart` |
| Commenti | `ti ti-message-circle` | `ph-thin ph-chat-circle` |
| Condividi / invia | `ti ti-send` | `ph-thin ph-paper-plane-tilt` |
| Salva (off/on) | `ti ti-bookmark` | `ph-thin ph-bookmark-simple` / `ph-fill ph-bookmark-simple` |
| Stella rating | `ti ti-star-filled` / `ti ti-star` | `ph-fill ph-star` |
| Notifiche | `ti ti-bell` | `ph-thin ph-bell` |
| Ricerca | `ti ti-search` | `ph-thin ph-magnifying-glass` |
| Pin mappa | `ti ti-map-pin` | `ph-thin ph-map-pin` |
| Chevron destro | `ti ti-chevron-right` | `ph-thin ph-caret-right` |
| Chevron giù | — | `ph-thin ph-caret-down` |
| Indietro | — | `ph-thin ph-arrow-left` |
| Chiudi | `ti ti-x` | `ph-thin ph-x` |
| Impostazioni | `ti ti-settings` | `ph-thin ph-gear` |
| Calendario / esito | `ti ti-calendar` / `ti ti-calendar-check` | `ph-thin ph-calendar` |
| Forbici | `ti ti-scissors` | `ph-thin ph-scissors` |
| Posizione utente | `ti ti-current-location` | `ph-thin ph-crosshair` |
| Aiuto / supporto | `ti ti-help-circle` | `ph-thin ph-question` |
| Esci | `ti ti-logout` | `ph-thin ph-sign-out` |
| Privacy / scudo | `ti ti-shield` | `ph-thin ph-shield` |
| Condividi (rete) | `ti ti-share` | `ph-thin ph-share-network` |
| Google | — | `ph-thin ph-google-logo` |
| Wifi / batteria (status bar finta) | `ti ti-wifi` / `ti ti-battery` | rimuovere: la nuova shell non disegna la status bar finta, usa `cb-safe-top` |

Per icone non in tabella: cerca l'equivalente più vicino su phosphoricons.com, peso **thin**. Stati attivi (tab corrente, like attivo, bookmark attivo, stella) → variante `ph-fill`.

---

## 4. Struttura file (cosa creare / sostituire)

Allinea alla struttura d'architettura già prevista (`hooks/` separati da `screens/`, `components/`). Crea/sostituisci:

```
src/
├── styles/
│   ├── tokens.css            ← NUOVO  (copia di colors_and_type.css, §2.1)
│   └── app-shell.css         ← NUOVO  (copia di ui_kits/.../app.css, §2.1)
├── assets/                   ← NUOVO  (wordmark, monogram, favicon)
├── lib/
│   ├── supabase.ts           ← INVARIATO
│   ├── geo.ts                ← INVARIATO
│   ├── mapStyle.ts           ← INVARIATO
│   └── format.ts             ← NUOVO  (helper localizzazione IT, §8)
├── hooks/                    ← TUTTI INVARIATI (useAuth/useFeed/useBarbers/
│                                useAvailability/useBooking/useGeolocation)
├── types/supabase.ts         ← INVARIATO
├── components/
│   ├── primitives/           ← NUOVO  (port di primitives.jsx → .tsx tipizzati:
│   │                            Avatar, Button, IconBtn, Pill, Hairline,
│   │                            BrassRule, Stat, SectionHeader, Toast, PhotoBlock)
│   ├── BookingSheet.tsx      ← RISCRITTO sul kit, cablato a dati reali (§5,§6)
│   ├── BarberProfileSheet.tsx← NUOVO (dal kit; cablato a barbiere reale)
│   └── NavBar.tsx            ← RISCRITTO (bottom nav del kit, role-aware)
├── screens/
│   ├── Login.tsx             ← RISCRITTO (welcome + form dal kit)
│   ├── Onboarding.tsx        ← NUOVO (dal kit; cablato a signup reale)
│   ├── Feed.tsx              ← RISCRITTO (kit) ← useFeed
│   ├── Discover.tsx          ← RISCRITTO (kit "Esplora") ← useBarbers  (vedi §7)
│   ├── Profile.tsx           ← RISCRITTO (kit) ← useAuth + dati profilo
│   ├── Menu.tsx              ← RISCRITTO (kit) ← useAuth (ruolo, logout)
│   ├── Bottega.tsx           ← NUOVO (dashboard barbiere; dati booking reali)
│   ├── Notifications.tsx     ← NUOVO (overlay full-screen dal kit)
│   └── Messages.tsx          ← NUOVO (overlay full-screen + thread dal kit)
└── App.tsx                   ← solo rendering shell/nav riscritto; stato/routing/role gating INVARIATI
```

**Porting kit → progetto:** i file del kit usano JSX con `Object.assign(window, …)` e `<script type="text/babel">`. Nel progetto **non** replicare quel pattern: converti in **moduli ESM TSX** con `export`/`import` e **props tipizzate**. Mantieni gli inline-style così come sono nel kit (usano già le CSS variables: è coerente col design system) — non serve estrarre tutto in CSS modules in questa pass.

---

## 5. Mappatura schermo-per-schermo: componente kit → hook reale → props/callback

Per ogni schermata: prendi il componente del kit come **riferimento del linguaggio visivo e punto di partenza**, sostituisci i dati demo con l'hook reale, ricabla le callback sullo stato di `App` esistente — e **adatta** la composizione ai dati reali (lunghezze variabili, paginazione, stati loading/empty/error, varianti ruolo) usando lo stesso linguaggio, non forzando la realtà nel layout fisso del mockup. Le callback del kit hanno **già la firma giusta** — devi solo collegarle ai setter reali.

| Schermo (kit) | Hook/dato reale che lo alimenta | Props/callback in ingresso da `App` | Note di cablaggio |
|---|---|---|---|
| **`ScreenLogin`** (welcome + form) | `useAuth` | `onLogin` → non più `("client")` finto: usa il vero `signInWithGoogle` / login email-password reale; `onStartOnboarding` → naviga a Onboarding | **Niente login finto per ruolo.** Il ruolo arriva da `profiles.role` dopo l'auth, non da un bottone "entra come barbiere". Rimuovi il link demo. Password input: l'utente la digita, non precompilare. |
| **`ScreenOnboarding`** | Supabase Auth (signup) + trigger `profiles` | `onComplete(role)` → completa registrazione reale; `onBack` | Lo step "scegli ruolo cliente/barbiere" deve scrivere `profiles.role` (o avviare la self-registration barbiere come da schema: `BARBERS` creato solo se l'utente si registra barbiere). |
| **`ScreenFeed`** | `useFeed(userId)` → `posts`; `useBarbers` o join per gli avatar storie | `onOpenBooking(barber)`, `onOpenProfile(barber)`, `onOpenNotifications`, `onOpenMessages`; badge `notifCount`/`dmCount` da dati reali | `DEMO_POSTS`/`DEMO_BARBERS` → `posts` reali. Like/save: usano stato locale nel kit; collega ai veri `LIKES` (insert/delete su tabella `likes`) **mantenendo l'ottimismo UI del kit**. `loadMore()` di `useFeed` → infinite scroll a fondo lista. La caption usa `b.name.split(" ")[0].toLowerCase()` come "handle": va bene come display, non è logica. |
| **`ScreenDiscover`** ("Esplora") | `useBarbers(sort, lat, lng, search)` + `useGeolocation` | `onOpenBooking`, `onOpenProfile` | **Coordina con §7.** Il toggle Lista/Mappa del kit resta; la **Lista** usa il markup `DiscoverList` del kit; la **Mappa** NON è l'SVG stilizzato del kit ma la mappa MapLibre reale di `discover_map_brief.md`, *rivestita* col design system. Le pill filtro del kit (`Tutti/Aperti ora/Vicino a me/Top`) vanno mappate sull'enum reale `sort` (vedi §7.2). |
| **`ScreenProfile`** | `useAuth` (`profile`) + query appuntamenti/storico/salvati reali | `role` (da `profile`), `onOpenSettings` | Tabs Appuntamenti/Storico/Salvati: alimenta con `bookings` reali (futuri/passati) e `likes`/saved reali. Stat (Tagli/Barbieri/Salvati) da conteggi reali. La pill ruolo da `profiles.role`. |
| **`ScreenMenu`** | `useAuth` | `role`, `onLogout` (→ `signOut` reale), `onOpenMessages`, `onOpenNotifications` | **Rimuovi lo switch "Modalità demo / Cambia ruolo"**: in produzione il ruolo non si cambia con un toggle. Le voci menu restano; "Esci" chiama `signOut`. Badge messaggi/notifiche da dati reali. |
| **`ScreenBottega`** (barbiere) | `bookings` del barbiere via Supabase + **Realtime**; `availability` | montato solo se `role === 'barber'` | Il kit ha agenda/stat/settimana **hardcoded**: sostituisci con l'agenda di oggi reale (query `bookings` del barbiere loggato), lo stato pausa con un vero flag, "Conferma" su prenotazione `pending` → update `status:'confirmed'`. Ascolta Realtime per aggiornare l'agenda live. |
| **`ScreenNotifications`** | tabella notifiche reali (o derivata) | `onClose`, `onOpenBooking`, `onOpenProfile` | Overlay full-screen sopra il tab attivo (pattern `FullOverlay` del kit). |
| **`ScreenMessages`** + `MessagesThread` | DM reali (se previsti dallo schema) o stub onesto | `onClose` | Se i DM non sono ancora nello schema, monta lo schermo ma con stato vuoto onesto ("Nessun messaggio"), **non** fingere conversazioni. Flag come gap (vedi §10). |
| **`BookingSheet`** | `useAvailability(barberId, date)` + `useBooking` | `barber`, `onClose`, `onConfirm` | Vedi **§6** — è il punto più delicato. |
| **`BarberProfileSheet`** | barbiere reale + `useBooking`/follow reale | `barber`, `onClose`, `onBook`, `onMessage` | Toggle "Segui" → insert/delete su `follows` reale (il kit ha un bug: entrambe le label dicono "Segui" → corretto: non-seguito = `Segui`, seguito = `Segui già` o `Smetti di seguire`). Stat (Follower/Tagli) da dati reali. |
| **`NavBar`** (bottom nav) | `useAuth` per il ruolo | tab attivo + setter (da `App`) | `NAV_CLIENT` vs `NAV_BARBER` del kit; aggiungi `NAV_ADMIN` (Feed · Esplora · **Admin** · Menu) come da product context. Tab attivo = icona corallo, label inchiostro. Nessun bounce/scale/underline. |
| **`Toast`** | esito `createBooking` reale | `{kind,title,message}`, `onClose` | Copy IT del kit: `title:"Prenotato."`, `message:"sab 24 mag · 10:00 · Marco Barba"`. Su errore: `kind:"danger"`, copy onesto (`"Slot occupato. Scegline un altro."`). |

> **Routing/role gating:** la mappa `authStage` (`login`/`onboarding`/`app`) e la scelta `NAV_CLIENT|NAV_BARBER|NAV_ADMIN` del kit `App.jsx` rispecchiano *concettualmente* la logica esistente, ma in produzione la sorgente di verità è `useAuth().profile.role` + `is_admin`, **non** uno stato locale. Allinea il rendering del kit alla logica reale, non viceversa.

---

## 6. Il flusso prenotazione cablato ai dati reali

Il `BookingSheet` del kit definisce il **linguaggio e la struttura** da mantenere fedeli (2 step: *data/ora* → *conferma* → toast, header con barbiere, card servizio, strip date "prossimi 7 giorni", griglia slot 3 colonne in `JetBrains Mono`, bottone `Continua — HH:MM` poi `Conferma appuntamento` corallo). Struttura e trattamento visivo si tengono; i **contenuti si adattano ai dati reali**. Nel kit gli slot sono **hardcoded**:

```js
const SLOTS = ["09:00", … ];
const TAKEN = new Set(["09:30","11:30","14:30"]);
```

**Sostituzione obbligatoria:** questi due array spariscono. Il loro contenuto viene da `useAvailability(barber.id, dates[selDate].date)`:

- `slots` (da `useAvailability`) → rimpiazza l'array `SLOTS`. L'ordine/formato `HH:MM` 24h è già coerente col design.
- `booked` (set/array da `useAvailability`) → rimpiazza `TAKEN`. Uno slot in `booked` si renderizza **disabilitato + barrato** esattamente come fa il kit (`textDecoration:"line-through"`, colore `--inchiostro-40`, `cursor:not-allowed`).
- Il contatore "X liberi su Y" in alto a destra → `slots.length - booked.length` su `slots.length`.
- Cambiando data (`selDate`) si **rilancia** `useAvailability` con la nuova `date` (l'hook ha già `date` come dipendenza); reset di `selTime` come già fa il kit.
- `Conferma appuntamento` → chiama `useBooking().createBooking({ clientId: profile.id, barberId: barber.id, date: dates[selDate].date, timeSlot: selTime })`. Su successo: chiudi sheet + `onConfirm` → Toast verde col riepilogo reale. Su errore (`{ error }` non nullo) → Toast `danger` con copy onesto, **non** chiudere lo step se lo slot è ora occupato (re-fetch availability).
- La card servizio/prezzo/durata: il kit usa `barber.price ?? 22`, `barber.tags?.[0]`, "30 min". Usa i valori reali dal barbiere/servizio se presenti nello schema; se lo schema non ha ancora prezzo/durata per-servizio, **tienilo come default visibile ma segnalato come gap** (§10) — non inventare un listino.
- Stati: mentre `useAvailability` carica → skeleton leggero della griglia (non bloccare l'intero sheet). Se `slots` è vuoto per quella data → messaggio onesto nello stile empty-state del kit ("Nessuno slot in questa data. Prova un altro giorno."), niente icona gigante.

**Niente dati di pagamento.** Il flusso si ferma alla conferma prenotazione (status `pending`/`confirmed`); non aggiungere campi carta/IBAN.

---

## 7. Rapporto con `discover_map_brief.md`

I due brief sono **complementari e non in conflitto**, ma vanno letti insieme per Esplora. Regola di precedenza:

### 7.1 Chi decide cosa

- **Funzionalità/architettura della mappa** (libreria `react-map-gl/maplibre` + `maplibre-gl`, `supercluster`, `useGeolocation`, fullscreen tra status bar e bottom nav, clustering, preview card che sale, fallback Cagliari, env `VITE_MAPTILER_KEY`, edge case) → **resta esattamente come in `discover_map_brief.md`**. Questo brief **non** la ridefinisce.
- **Aspetto visivo** di tutto ciò che la mappa disegna (pin barbiere, cluster, preview card, search bar flottante, toggle Lista/Mappa, bottone "trova posizione", empty/error state) → **deve seguire il design system CutBook** di questo brief, non uno stile generico. In pratica: i `BarberMarker`/`ClusterMarker`/`BarberPreviewCard`/`MapSearchBar`/`MapListToggle` di `discover_map_brief.md` vanno costruiti con i token `--ottone`/`--inchiostro`/`--carta`, raggi `6/10/16/pill`, Phosphor Thin, copy IT, esattamente come gli equivalenti del kit (`DiscoverMap`/preview card del kit sono il riferimento estetico; la *logica* è quella del brief mappa).
- **La Lista** di Esplora usa il markup `DiscoverList` del kit (card barbiere con avatar `ring` se rating ≥ 4,9, pill `Aperto`/`In pausa`, stella `ph-fill ph-star`, distanza `X,X km`, bottone `Prenota` hairline).

### 7.2 Pill filtro: riconciliazione

Tre set di etichette girano nei documenti — vanno unificate **mantenendo l'enum logico** di `useBarbers` (`'nearby'|'popular'|'new'|'toprated'`, che **non si tocca**) e adottando le **etichette del kit** in italiano:

| Etichetta UI (dal kit, IT) | `sort`/filtro reale (logica invariata) |
|---|---|
| `Tutti` | nessun filtro (default sort, es. `nearby` se c'è posizione, altrimenti `toprated`) |
| `Vicino a me` | `sort='nearby'` (richiede `coords` da `useGeolocation`) |
| `Top` | `sort='toprated'` |
| `Aperti ora` | filtro client su disponibilità/stato barbiere |

> **Gap dati da segnalare:** "Aperti ora" presuppone uno stato di apertura. Lo schema non ha un campo `open_now`; va **derivato** da `availability` (finestra del giorno corrente) o da un flag pausa del barbiere. Se non derivabile ora, **non inventare**: o ometti "Aperti ora", o calcolalo da `availability`. Decisione esplicita richiesta (§10). L'etichetta "Popolari/Nuovi" dell'enum (`popular`/`new`) può comparire come filtro extra o nel pannello filtri (`ph-thin ph-funnel`) — non perdere capacità logiche già esistenti solo perché il kit mostra 4 chip.

---

## 8. Localizzazione & copy

Centralizza la formattazione in `src/lib/format.ts` e usala ovunque (niente formattazioni sparse):

- `formatRating(n)` → `4,9` (virgola, 1 decimale).
- `formatKm(n)` → `1,2 km`.
- `formatPrice(n)` → `€ 22` con **spazio sottile** (`\u202F` o `&thinsp;`).
- `formatCount(n)` → migliaia col punto: `1.240` (`toLocaleString('it-IT')`).
- `formatTime(d)` → `09:30` (24h, due cifre).
- `formatDateShort(d)` → `sab 24 mag` (giorni/mesi abbreviati IT come nel kit: `lun…dom`, `gen…dic`).
- Separatore metadati inline: ` · ` (spazio + `·` + spazio). Incisi: ` — `.

Voce del prodotto: quieta, diretta, `tu`, frasi corte, niente punti esclamativi, niente emoji, sentence case. Esempi guida (dal design system):

| Generico | CutBook |
|---|---|
| "🎉 Booking confirmed!" | `Prenotato. Sabato 24, ore 10:00.` |
| "Sorry, that slot is taken." | `Slot occupato. Scegline un altro.` |
| "Welcome back, Marco!" | `Bentornato, Marco.` |
| "Unavailable" | `In pausa.` |

Rinomina la nav e i titoli in italiano: `Feed · Esplora · Profilo · Menu` (+ `Bottega` barbiere, `Admin` admin). "Discover" → "Esplora" ovunque (UI; i nomi di file/route tecnici possono restare `Discover`).

---

## 9. Stati: loading / empty / error — e dark mode

- **Loading:** skeleton leggeri e progressivi, mai bloccare l'intera UI. La mappa può comparire e i marker arrivare dopo (coerente con `discover_map_brief.md` §8). Per liste: righe placeholder con il fill `--carta-3`, opzionale shimmer (`@keyframes shimmer` è già in `app.css`).
- **Empty state:** pattern del kit — **piccolo disco/segno corallo, non un'icona gigante**, titolo display sentence case, sottotitolo `--inchiostro-60`. Mai emoji. (Riferimenti: `cutbook-design/preview/components-empty-state.html`, e `DiscoverList` empty nel kit.)
- **Error:** copy onesto, niente stack/gergo. Tile mappa non caricano → fallback automatico a Lista con messaggio ("Mappa non disponibile, mostro la lista") come da `discover_map_brief.md` §9.

### DARK MODE — in scope (decisione presa)

La dark mode **è richiesta e fa parte di questa pass**. Il prototipo attuale del progetto la usa già (le schermate girano su variabili tematizzate che reagiscono a `prefers-color-scheme`), e il design system è stato esteso con le istruzioni per il dark. Quindi: nessuna decisione aperta, si implementa. La riga "dark mode" di `discover_map_brief.md` (§3, §6.2, checklist) è **attiva, non superata**.

**Sorgente di verità dei colori scuri:** il design system aggiornato. I valori dark **non si inventano** e non si derivano per inversione automatica del chiaro — sono progettati. Claude Code adotta il blocco dark **dal `colors_and_type.css` aggiornato** (vedi §2.1) e basta. Se quel file non contiene ancora il blocco dark, fermarsi e richiederlo, non improvvisare.

**Meccanismo (questo è indipendente dai valori esatti e va rispettato così):**

1. Il dark si esprime come **override degli stessi nomi di variabile** già usati ovunque (`--carta`, `--carta-2/3`, `--inchiostro*`, `--border`, ombre, ecc.), dentro un blocco `@media (prefers-color-scheme: dark) { :root { … } }` nel token file. L'accent corallo `--ottone` resta l'accent anche al buio (eventuale micro-aggiustamento di luminosità solo se il design system lo specifica — non deciderlo tu).
2. Conseguenza voluta: **i componenti non cambiano di una riga.** Tutto il kit usa già `var(--…)`; se i token flippano, l'intera UI flippa da sola. È esattamente il motivo per cui §1.1 impone di adottare il token file verbatim e §2.3 vieta i colori cablati a mano. Ogni `#fff`/`#0A0A0A`/`rgba(10,10,10,…)` scritto a mano è un bug che rompe il dark: vanno tutti tokenizzati (vedi §2.1 punto 2 per i casi noti in `app.css`).
3. **Override manuale (solo se il design system lo prevede):** se è richiesto un toggle tema in-app oltre al rilevamento di sistema, usa un attributo `[data-theme="dark"]` / `[data-theme="light"]` su `<html>` che applica lo stesso set di override; default = `prefers-color-scheme`. Non aggiungere un toggle se il design system non lo chiede.
4. **Mappa (Esplora):** lo stile MapTiler **`streets-v2-dark`** va selezionato quando il tema è scuro (come già previsto da `discover_map_brief.md` §3/§6.2). `lib/mapStyle.ts` resta invariato come logica; la selezione chiaro/scuro dello style e il **re-render allo switch di tema a runtime** sono parte del lavoro mappa, non da reinventare qui.
5. **Realtime theme switch:** cambiare tema di sistema mentre l'app è aperta non deve richiedere reload — i token CSS lo fanno gratis; assicurati solo che la mappa (punto 4) e qualsiasi colore calcolato in JS reagiscano.

**Verifica:** ogni schermata va controllata in **entrambi** i temi (Feed, Esplora lista+mappa, Profilo, Menu, Bottega, Login, Onboarding, Notifiche, Messaggi, BookingSheet, BarberProfileSheet, Toast). Niente testo a basso contrasto, niente bordi invisibili, niente placeholder che restano chiari nel dark.

---

## 10. Edge case e gap da gestire esplicitamente

- **Auth reale, non finta:** rimuovere ogni "entra come cliente/barbiere" demo e il toggle ruolo del Menu. Ruolo = `profiles.role` + `is_admin`.
- **Ruolo che cambia** (barbiere che è anche cliente): la nav e le schermate seguono `profile.role`; un barbiere può comunque navigare Feed/Esplora e prenotare altri barbieri (come da product context).
- **`createBooking` race:** slot occupato tra apertura sheet e conferma → errore gestito, re-fetch `useAvailability`, toast `danger`, niente crash.
- **Like/save/follow:** ottimismo UI del kit mantenuto, ma con scrittura reale su `likes`/`follows` e rollback visivo se la mutation fallisce.
- **Gap schema da segnalare nel README (non inventare dati):**
  - prezzo/durata per-servizio (il kit assume `€ 22 / 30 min`);
  - stato "aperto ora" (deriva da `availability` o ometti il filtro);
  - DM/messaggi (se non a schema: schermo presente ma stato vuoto onesto);
  - notifiche (se non a schema: stesso trattamento).
- **`VITE_MAPTILER_KEY` assente** → fallback OpenFreeMap, nessuna schermata bianca (come da `discover_map_brief.md`).
- **Cambio tab con sheet/preview aperti** → reset pulito dello stato (già previsto dal kit/`App`).
- **Niente pagamenti, niente dati sensibili** in form.
- **RLS attiva da subito:** testare ogni schermata con RLS on; nessuna schermata deve perdere dati per policy mancanti — ma **non scrivere nuove policy** in questa pass (il layer dati non si tocca; se manca una policy è un bug del layer dati, da segnalare, non da patchare qui).

---

## 11. Criteri di accettazione (checklist finale per Claude Code)

- [ ] **Fase 0 fatta (§0.1):** esiste `REDESIGN_PLAN.md` con inventario del layer logico verificato, inventario completo delle funzioni attuali, mappatura funzione→kit e domande aperte; è stato confermato prima di scrivere codice.
- [ ] `tokens.css` (= `colors_and_type.css`) e `app-shell.css` (= kit `app.css`) importati una sola volta in `main.tsx`; nessuna variabile rinominata.
- [ ] Phosphor Thin + Fill caricati; **zero** classi `ti ti-*` residue; `@tabler/icons-webfont` rimosso.
- [ ] Onest + JetBrains Mono attivi; i numeri (rating, slot, prezzi, distanze, contatori) sono in `JetBrains Mono`.
- [ ] Tutte le schermate (Login, Onboarding, Feed, Esplora, Profilo, Menu, + Bottega se barbiere, + Notifiche/Messaggi overlay) sono **fedeli al design system** e **coerenti col kit** dove la composizione coincide; dove i dati/stati reali divergono dal mockup, sono **adattate con lo stesso linguaggio** (liste a lunghezza variabile, loading/empty/error, varianti ruolo) — non una clonazione pixel del kit, ma nessuna deriva dal linguaggio visivo.
- [ ] **Nessun** file in `hooks/`, `lib/supabase.ts`, `lib/geo.ts`, `lib/mapStyle.ts`, `types/`, né policy RLS, né schema, è stato modificato. `git diff` su quei path è vuoto.
- [ ] `App.tsx`: solo il rendering di shell/nav/montaggio è cambiato; la macchina a stati, il role gating e i setter sono invariati nella sostanza.
- [ ] Feed legge da `useFeed` reale (post + paginazione `loadMore`); like/save scrivono davvero su `likes`.
- [ ] Esplora: Lista col markup kit + `useBarbers`; Mappa = MapLibre reale di `discover_map_brief.md` **rivestita** col design system; `sort`/`search` condivisi Lista↔Mappa; enum `sort` invariato.
- [ ] `BookingSheet`: `SLOTS`/`TAKEN` hardcoded **eliminati**, sostituiti da `useAvailability`; conferma chiama `useBooking.createBooking` reale; toast IT su successo, toast `danger` onesto su errore.
- [ ] Bottega (barbiere): agenda/stat/pausa da dati reali + Realtime, non hardcoded.
- [ ] Copy 100% italiano, sentence case, `tu`, niente emoji, formati IT (`4,9` · `€ 22` · `09:30` · `1.240`) centralizzati in `lib/format.ts`.
- [ ] Regole dure §2.3 rispettate: un solo accent corallo, raggi `6/10/16/pill`, bordi 1px@10%, niente gradienti (salvo placeholder foto), niente `backdrop-filter`, scrim 46%.
- [ ] Stati loading/empty/error nello stile kit (empty = disco corallo, non icona gigante).
- [ ] **Dark mode funzionante in entrambi i temi**: blocco dark del `colors_and_type.css` aggiornato copiato verbatim; tutto via override di variabile + `prefers-color-scheme`; **zero** colori cablati a mano residui (body bg, placeholder, ombre tokenizzati); mappa Esplora usa `streets-v2-dark` al buio e cambia stile a runtime allo switch di tema; nessun valore dark inventato.
- [ ] Gap dati (prezzo/durata, "aperti ora", DM, notifiche) elencati nel README; nessun dato inventato.
- [ ] `npm run build` pulito, **zero errori TypeScript**; props dei componenti portati sono tipizzate (no `any` di comodo).
- [ ] README aggiornato: design system adottato, migrazione icone fatta, env invariate, **dark mode implementata (sorgente token = design system, meccanismo `prefers-color-scheme`)**, gap noti, rapporto con `discover_map_brief.md`.

---

## 12. Piano commit suggerito (passi piccoli e verificabili)

0. **Fase 0 — recon e piano (§0.1):** niente codice. Produci `REDESIGN_PLAN.md` (verifica layer logico, inventario completo delle funzioni attuali, mappatura funzione→kit, domande aperte). **Fermati per conferma umana prima del passo 1.**
1. **Fondamenta visive:** `tokens.css` (= `colors_and_type.css` aggiornato, **blocco dark incluso**) + `app-shell.css` con i valori cablati tokenizzati per il dark + asset + Phosphor + font; import in `main.tsx`. Build verde; verifica subito che il toggle di sistema chiaro/scuro faccia flippare i token (anche con app ancora vecchia).
2. **Primitives:** port di `primitives.jsx` → `components/primitives/*.tsx` tipizzati (Avatar, Button, IconBtn, Pill, Hairline, BrassRule, Stat, SectionHeader, Toast, PhotoBlock).
3. **Shell + NavBar:** `.cb-app`/`.cb-screen`/`.cb-topbar` + bottom nav role-aware cablata a `useAuth().profile.role`.
4. **Feed** riscritto sul kit + `useFeed` reale (+ like/save reali, `loadMore`).
5. **BookingSheet** sul kit, cablato a `useAvailability` + `useBooking` (§6) — è il pezzo critico, isolarlo.
6. **Esplora — Lista** (markup kit + `useBarbers`, riconciliazione pill §7.2).
7. **Esplora — Mappa**: applicare il design system ai componenti mappa di `discover_map_brief.md` (senza rifare la logica mappa).
8. **Profilo** + **Menu** sul kit + `useAuth`/dati reali (rimuovere demo/role-switch).
9. **Bottega** (barbiere) + **Notifiche** + **Messaggi** sul kit + dati reali/stub onesti.
10. **Login** + **Onboarding** sul kit cablati ad auth reale (rimuovere login finto per ruolo).
11. Stati loading/empty/error, edge case §10, `lib/format.ts` ovunque.
12. Pulizia: rimozione Tabler e CSS morto, tipi, memoizzazione dove serve, **passata finale di verifica di ogni schermata in entrambi i temi (chiaro + scuro)**, README + checklist §11.

Dopo ogni passo: `npm run build` verde e schermata toccata **fedele al design system e coerente col linguaggio del kit**, adattata ai dati/stati reali, prima di procedere.
