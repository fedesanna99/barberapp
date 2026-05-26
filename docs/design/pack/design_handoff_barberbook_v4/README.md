# Handoff: Barberbook · V4 "Pari + Mappa"

> Pacchetto per portare il redesign V4 nell'app di produzione (codebase `fedesanna99/barberapp` — React + Vite + Supabase).

---

## 📦 Overview

**V4 è la versione definitiva.** Confronto con V1:

| | V1 "Pari raffinato" | **V4 "Pari + Mappa"** |
|---|---|---|
| 12 schermate (welcome, login, register, feed, profilo, menu, bottega, profilo barbiere, booking, appuntamenti, notifiche, messaggi, admin) | ✅ identico | ✅ identico |
| Esplora | mappa + lista a toggle | **mappa-first, sheet snap (min/mid/full)** |
| Palette | carta · clay · ink | ✅ identico |
| Tipografia | Geist + Geist Mono | ✅ identico |

**Il delta tra V1 e V4 è UN SOLO FILE: `pari-discover.jsx`.** Tutto il resto è invariato. Se il tuo developer ha già implementato V1, l'aggiornamento a V4 = riscrivere solo l'Esplora.

Apri **`V4.html`** in un browser per vedere V4 in azione con switcher per le 5 schermate principali.

---

## 🚨 About the Design Files

I file in questo bundle sono **riferimenti di design creati in HTML/React/JSX** — prototipi che mostrano l'aspetto e il comportamento previsti, **NON codice di produzione da copiare direttamente**.

Il tuo compito è **ricreare questi design HTML nell'ambiente esistente del codebase** (React + Vite + Supabase, vedi `Architecture.txt` del repo) usando i pattern e le librerie già consolidate:
- Usa i tuoi componenti esistenti e estendili dove serve
- Adatta il routing alla tua architettura attuale
- Sostituisci i dati finti (`BARBERS`, `POSTS`, ecc.) con le query Supabase reali
- Mantieni le tue convenzioni TypeScript/JavaScript

Non eseguire mai questi file in produzione. Sono mock React in-browser con dati statici.

---

## 🎯 Fidelity

**Hi-fi (high-fidelity)**.

Le mock sono pixel-perfect:
- Colori finalizzati (hex esatti, sotto)
- Tipografia finalizzata (Geist + Geist Mono)
- Spaziature e radius da rispettare
- Tutte le interazioni chiave funzionano (booking, navigazione tab, sheet snap, dark mode)
- Stati hover/active/disabled/empty definiti
- Dark mode incluso

Il developer deve **ricrearle pixel-perfect** usando i componenti del codebase esistente.

---

## 🗂 File nel bundle

```
design_handoff_barberbook_v4/
├── README.md                       ← questo file (la fonte di verità)
├── SKILL.md                        ← per installazione come Claude Code skill
├── V4.html                         ← canvas: phone + switcher 5 schermate
├── V4 Esplora.html                 ← confronto V1 vs V3 vs V4 sull'Esplora
├── V1 Pages.html                   ← canvas con TUTTE le 13 schermate V1
│
├── v4_pari_mappa/                  ← LA VERSIONE DEFINITIVA
│   ├── index.html                  ← entry point del prototipo
│   ├── colors_and_type.css         ← TOKENS (la fonte di verità)
│   ├── pari-prototype-app.jsx      ← root component
│   ├── pari-auth.jsx               ← onboarding (welcome/login/register/reset)
│   ├── pari-discover.jsx           ← ⭐ ESPLORA MAP-FIRST (il cuore di V4)
│   ├── pari-feed.jsx               ← Feed (timeline social)
│   ├── pari-profile.jsx            ← Profilo cliente
│   ├── pari-barberprofile.jsx      ← Profilo barbiere pubblico
│   ├── pari-booking.jsx            ← Booking sheet
│   ├── pari-bottega.jsx            ← Dashboard barbiere
│   ├── pari-appointments.jsx       ← Overlay appuntamenti
│   ├── pari-menu.jsx               ← Menu / impostazioni
│   ├── pari-overlays.jsx           ← Notifiche, messaggi, support
│   ├── pari-misc-sheets.jsx        ← Sheet minori
│   ├── pari-admin.jsx              ← Pannello admin
│   ├── ios-frame.jsx               ← iPhone bezel (SOLO preview, NON prod)
│   ├── tweaks-panel.jsx            ← Pannello tweak (SOLO preview, NON prod)
│   ├── ui_kits/barberbook_app/
│   │   ├── primitives.jsx          ← Avatar, Button, BarberCard, ecc
│   │   ├── sheets.jsx              ← componenti sheet generici
│   │   ├── screens.jsx             ← shell + DEMO_BARBERS
│   │   └── app.css                 ← stili base shell
│   └── assets/
│       ├── favicon.svg             ← favicon
│       ├── logo.svg                ← logo full
│       ├── logo-inverse.svg        ← logo per fondi scuri
│       └── mark.svg                ← PoleMark (3 strisce ink/clay/ink)
│
├── v1_pari/                        ← V1 originale (referenza, per confronto)
└── screenshots/                    ← screenshot statici delle schermate
```

---

## 🎨 Design Tokens

> **TUTTI i token sono già in `v4_pari_mappa/colors_and_type.css`**. Copialo nel tuo codebase come fonte di verità unica.

### Light mode (default)

```css
/* Paper (sfondi) */
--paper-3:  #FCFAF5;   /* sfondo pagina */
--paper-2:  #F9F6EF;   /* sfondo elevato */
--paper:    #F4F0E8;   /* surface */
--linen:    #EDE9E1;   /* surface deep */
--linen-2:  #E4DFD5;   /* hover surface */

/* Ink (testo + bordi) */
--ink:      #46413B;   /* testo primario */
--ink-80:   rgba(70,65,59,0.80);   /* body */
--ink-60:   rgba(70,65,59,0.58);   /* secondary */
--ink-50:   rgba(70,65,59,0.46);   /* muted / eyebrow */
--ink-40:   rgba(70,65,59,0.36);   /* placeholder */
--ink-25:   rgba(70,65,59,0.22);   /* disabled */
--ink-15:   rgba(70,65,59,0.13);   /* border default */
--ink-08:   rgba(70,65,59,0.07);   /* hairline */

/* Clay (accent primario) */
--clay:        #B07F61;   /* CTA, link, badge, chip attivo */
--clay-deep:   #8E6244;   /* clay hover/press */
--clay-soft:   #E7DACD;   /* clay background */
--clay-tint:   rgba(176,127,97,0.10);

/* Semantici */
--sage:       #7C8C6E;   /* success / aperto / confermato */
--sage-soft:  #DDE3D5;
--rust:       #B05E48;   /* error / cancellato */
--rust-soft:  #EEDCD3;

--scrim:      rgba(46,42,37,0.34);   /* overlay backdrop */
--border:     var(--ink-15);
```

### Dark mode (`class="dark"` su `<html>`)

Vedi `colors_and_type.css` per i valori completi — paper diventa near-black warm ink (#14110D base), ink diventa warm bone (#ECE5D6).

### Typography

```css
--font-display:  "Geist", -apple-system, sans-serif;
--font-body:     "Geist", -apple-system, sans-serif;
--font-mono:     "Geist Mono", ui-monospace, Menlo, monospace;
```

**Scala display:**
- `h1`: 36px / 1.05 / weight 500
- `h2`: 26px / 1.15 / weight 500
- `h3`: 20px / 1.20 / weight 500
- `h4`: 16px / 1.25 / weight 500

**Scala body:**
- `body`: 14px / 1.55 / weight 400
- `caption`: 12.5px / 1.45 / weight 400
- `eyebrow`: 11.5px / 1.40 / weight 500 / uppercase / letter-spacing 0.06em
- `mono`: 13px / 1.40 / Geist Mono / weight 500 — **per tutti i numeri (orari, prezzi, distanze, contatori)**

**Webfont:**
```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Spacing / Radius / Shadow / Motion

Vedi `colors_and_type.css` — base 4px scale, 4 radius values (8/12/18/9999), shadow leggere accoppiate a hairline, motion con `--ease: cubic-bezier(.2, .8, .2, 1)`.

---

## ⭐ Il delta V1 → V4: l'Esplora map-first

Questa è la parte chiave del pacchetto. Sostituisce completamente la vecchia Esplora di V1.

### Il pattern

**La mappa È il canvas dell'Esplora**, sempre presente. Sopra galleggiano:
- **Search bar** (top, paper-3 con hairline)
- **Top strip** (sotto search): agenda pill nera "sab 10:00" a sinistra + chip filtri a destra
- **Pin price-pill** sulla mappa (color-coded per stato)
- **FAB Locate + Layers** in basso a destra
- **Bottom sheet** in basso, con **3 snap states**:
  - **min** (default): solo handle + count "5 bottega vicino a te" + bottone "Lista" — mappa quasi fullscreen
  - **mid** (55% altezza): lista barbieri scrollable, sticky header con sort tabs
  - **full** (94% altezza): lista completa, mappa quasi nascosta
- **Card mode**: tap su un pin → sheet diventa scheda barbiere con stat strip, tags, quick slots di oggi, CTA "Prenota una sedia"

### Pin states (colori da `colors_and_type.css`)

| Stato | Pin background | Dot color | Label |
|---|---|---|---|
| aperto | paper-3 | **sage** (#7C8C6E) | "aperto" |
| occupato | paper-3 | **clay** (#B07F61) | "occupato" |
| chiuso | paper-3 | ink-40 | "chiuso" |
| selezionato | **ink** | (alone clay pulse 1.6s) | (la card sheet si apre) |

Pin con tail in basso (5×7px triangolo), price in mono al centro ("€22"), shadow soft + 1.5px paper-3 outline.

### Sheet snap behavior

```
┌─────────────────────────────────────────┐
│ MIN (default)                           │
│ ┌─────────────────────────────────────┐ │
│ │  [mappa fullscreen + pins]          │ │
│ │                                     │ │
│ │                                     │ │
│ ├─────────────────────────────────────┤ │
│ │  5 bottega vicino a te    [⌃ Lista] │ │  ← handle row, ~64px
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Tap "Lista" o tap handle → mid (55%)
Tap handle from mid → full (94%)
Tap handle from full → torna a min
Tap pin → card mode (scheda barbiere, sheet ~auto height)
```

### Empty state

Quando un filtro o search non ha risultati, lo sheet (in mid/full) mostra:
- Icona search circolare in linen
- "Nessuna bottega" h3
- Sub-copy con il filtro applicato
- Bottone "Mostra tutti" che resetta filtri

### Top strip layout

```
┌─────────────────────────────────────────────┐
│ 🔍 Cerca barbiere, via, stile…              │ ← search (top 18, full width)
├─────────────────────────────────────────────┤
│ [⏰ sab 10:00 ›]  [Tutti] [Aperti] [Top] [Vicini] │ ← top strip (top 76, gap 14)
└─────────────────────────────────────────────┘
```

- Agenda pill: **ink** background, **clay** clock icon. Cliccabile per aprire agenda.
- Filter chips: paper-3 background, ink-15 border. Chip attivo = **clay** background, paper-3 text. (NON ink — sennò si confonde visualmente con l'agenda pill nera.)

Vedi `v4_pari_mappa/pari-discover.jsx` per il codice completo.

---

## 📱 Tutte le 13 schermate

Apri `V1 Pages.html` per vedere tutte le schermate live affiancate. Apri `V4.html` per vedere V4 specifico con switcher.

### 1. Onboarding (4)
- **Welcome** — marchio + 2 CTA (Inizia / Accedi)
- **Login** — email + password
- **Registrati** — segmented "Cliente/Barbiere" + nome + email + password con strength bar
- **Reset password** — solo email + CTA disabilitato finché non valida

### 2. Cliente — Golden Path (4)
- **Esplora** ⭐ — la mappa map-first di V4 (vedi sezione sopra)
- **Feed** — stories row + post 4:5 + actions row
- **Profilo cliente** — avatar + stat strip + griglia tagli + preferenze
- **Menu** — voci scorciatoia (appuntamenti, notifiche, messaggi, supporto, tema)

### 3. Barbiere (2)
- **Bottega · oggi** — dashboard barbiere con stat strip mono + timeline slot
- **Profilo barbiere** — vetrina pubblica con hero foto + tab Lavori/Servizi/Recensioni + CTA sticky

### 4. Sheet & Overlay (4)
- **Booking sheet** — servizio + data + ora + pagamento, sticky summary in fondo
- **I miei appuntamenti** — prossimi + storia, date pill mono, status chip
- **Notifiche** — raggruppate per tempo
- **Messaggi** — lista conversazioni + chat singola + composer

### 5. Admin (1)
- **Pannello** — validazione barbieri + segnalazioni

---

## 🔄 Interactions & Behavior

### Navigazione globale (bottom nav)

- **Cliente**: 4 tab — Feed · Esplora · Profilo · Menu
- **Barbiere**: 4 tab — Feed · Bottega · Profilo · Menu
- **Admin**: 1 tab — Admin

Tab attiva: ink color + clay dot piccolo sotto. Inattiva: ink-40.

### Animazioni

- **Sheet enter** (booking, overlay): `translateY(100%) → 0` in 280ms con `cubic-bezier(.2, .8, .2, 1)`
- **Scrim fade**: 0 → 1 in 200ms
- **Sheet snap transition** (min ↔ mid ↔ full): `height` transition 320ms con `--ease`
- **Card sheet appears**: fade-in + translateY(4px) in 220ms
- **Pin selected halo**: clay pulse animato 1.6s loop (scale 0.85 → 1.6, opacity 0.35 → 0)
- **Hover state**: `opacity 0.85` per icon buttons, `background var(--linen)` per list rows
- **Press state**: `transform: scale(0.98)` per i bottoni primari

### Stati (loading, vuoto, errore)

| Stato | Pattern visivo |
|---|---|
| Loading | Skeleton card con `var(--linen)` background + shimmer; oppure spinner clay 24px |
| Empty | Icona search circolare linen + h3 + sub-copy + bottone "Mostra tutti" (vedi Esplora) |
| Errore | Icona rust + messaggio + bottone "Riprova" |
| Toast successo | Bottom sheet 14px padding, sage soft bg, sage 4px left bar |
| Toast errore | Stesso ma rust |

### Form validation

- Inline subito sotto il field (12px, var(--rust))
- Bottone primario disabilitato finché form non valido (`opacity: 0.4`, `cursor: not-allowed`)
- Password strength bar: 4 segmenti, scala rust → clay → sage (vedi `pari-auth.jsx` → `pariPasswordStrength`)

---

## 💾 State Management

Il prototipo usa solo `useState` locale. Nella produzione ti servirà:

### Auth (Supabase Auth)
- `session`, `user` da Supabase
- Ruolo (`client | barber | admin`) memorizzato in `profiles` table

### Dati principali (Supabase)
Vedi `Architecture.txt` del repo per lo schema completo. Tabelle chiave:
- `profiles` — utenti (client + barber)
- `barber_profiles` — info extra barbiere (shop_name, address, **lat/lng** ⭐, services array, tags)
- `appointments` — id, client_id, barber_id, service, date, time, duration, status, price
- `posts` — feed
- `reviews` — recensioni
- `messages`, `conversations` — chat
- `notifications`

**Per V4 specifically**: la mappa ha bisogno di `lat/lng` su `barber_profiles`. Se ancora non c'è, va aggiunto allo schema.

### Mappa reale (sostituzione del MapCanvas SVG)

Il prototipo usa un SVG astratto stilizzato di Cagliari. **In produzione, integra una mappa vera**:

**Opzione consigliata: Mapbox GL JS** — perché supporta custom styles facilmente (puoi creare uno stile "Pari" via Mapbox Studio con sage parks, clay accents, paper roads).

```bash
npm install mapbox-gl
```

Style URL Mapbox: crea uno style custom con questi colori chiave:
- water: `#A8BFCB` (a fa scoprire al brand) → meglio `rgba(176,127,97,0.10)` per restare nel sistema
- land: `var(--linen)` con opacity 0.55
- parks: `var(--sage-soft)`
- roads: `var(--paper-3)` (fill) + `var(--linen-2)` (stroke)
- labels: `var(--ink-40)` (street names) + `var(--clay-deep)` (POI)

Pin = HTML markers personalizzati (non i pin Mapbox default) — riusa esattamente il componente `V4Pin` da `pari-discover.jsx`.

### Realtime
Subscription Supabase realtime per:
- Notifiche push in-app
- Chat live
- Dashboard barbiere (aggiornamenti slot in tempo reale)
- Mappa: aggiornamento status barbiere in tempo reale (aperto → occupato → chiuso)

---

## 🎯 Approccio consigliato per il developer

### Ordine consigliato di implementazione

1. **Setup token system** — copia `colors_and_type.css` nel codebase, configura webfont Geist
2. **Componenti primitivi** — Avatar, Button, Input, Chip, Card, Sheet (con il tuo design system esistente)
3. **Onboarding** — schermate più semplici, perfette per stabilizzare il sistema
4. ⭐ **Esplora map-first** (V4) — il delta vs V1, il cuore del prodotto. Setup Mapbox o equivalente.
5. **Booking sheet** — il cuore commerciale, attenzione massima
6. **Profilo barbiere** — l'altra metà del booking flow
7. **Feed + Profilo cliente** — social layer
8. **Bottega dashboard** — il lato barbiere
9. **Sheet & overlay** — appuntamenti, notifiche, messaggi
10. **Admin** — quando il resto è stabile

### Pattern da rispettare (regole non negoziabili)

- **Niente nuovi colori inventati**: usa solo i token in `colors_and_type.css`
- **4 radius, max**: `--r-sm` (8), `--r-md` (12), `--r-lg` (18), `--r-pill` (9999)
- **Mono per i numeri**: orari, prezzi, contatori, distanze sempre in Geist Mono
- **Eyebrow obbligatorio sopra le sezioni**: uppercase, letter-spacing 0.06em, ink-50
- **Hairline 1px ink-15 ovunque ci sia una separazione**: niente shadow forti
- **Italiano informale**: "Vieni dentro", "Le tue sedie", "Vicino a te". Mai "il sistema", mai "tu hai"
- **Niente emoji**: usa icone SVG (Lucide-style, 1.85px stroke). Vedi `Icon.tsx` del repo per il set canonico
- **Map UX V4 è prescrittivo**: 3 snap states (min/mid/full), pin price-pill color-coded, agenda pill + filter chips in top strip. Non improvvisare.

---

## 🛠 Assets

Tutti gli asset sono in `v4_pari_mappa/assets/`:

| File | Uso |
|---|---|
| `favicon.svg` | Favicon PWA |
| `logo.svg` | Marchio completo per light backgrounds |
| `logo-inverse.svg` | Per fondi scuri (dark mode) |
| `mark.svg` | Solo il "PoleMark" senza wordmark |

**PoleMark**: tre rettangoli verticali 4×24 con radius 1.5, colori ink/clay/ink. Spaziatura: x=6, 14, 22. Viewbox 32×32.

**Icone**: nel repo originale (`src/components/Icon.tsx`) trovi il set completo — 1.85px stroke, 24×24 viewbox, Lucide-style. **Riusa quello**, non inventare icone nuove.

---

## 🚀 Per Claude Code: portarlo in produzione

Apri **`migration/README.md`** in questa cartella. Contiene:
- Procedura passo-passo per applicare V4 al repo `fedesanna99/barberappit`
- Drop-in `Discover.tsx` (TSX, tipato, usa i tuoi hook esistenti) → sostituisce direttamente il vecchio file
- Lista dei componenti da rimuovere (`MapListToggle`, `MapSearchBar`, `BarberPreviewCard`)
- Lista dei file invariati (la maggior parte del codebase)
- FAQ specifiche per la migrazione

**Risultato finale:** un solo file modificato (`src/screens/Discover.tsx`) + 3 componenti rimossi = V1 → V4 completato.

---



Se hai già implementato V1, l'aggiornamento a V4 = **solo l'Esplora**.

**File da sostituire/riscrivere:**
- `pari-discover.jsx` (o equivalente schermata Esplora) → vedi `v4_pari_mappa/pari-discover.jsx`

**Componenti nuovi richiesti:**
- `V4MapCanvas` — wrapper SVG/Mapbox per la mappa
- `V4Pin` — pin price-pill color-coded
- `V4PeekSheet` / `V4ListSheet` / `V4CardSheet` — i 3 stati del bottom sheet
- `V4Stat` — helper per stat strip

**Schema DB da aggiungere (se non c'è):**
- `barber_profiles.lat` (float, indicizzato)
- `barber_profiles.lng` (float, indicizzato)
- Eventualmente `barber_profiles.next_available_slot` (timestamp computed) per il "prossimo slot" sotto i nomi

**Componenti rimossi rispetto a V1:**
- Il vecchio toggle "Mappa / Lista" non esiste più
- La "vecchia" lista verticale dei barbieri è sostituita dalla `V4ListSheet`

---

## ❓ FAQ per il developer

**Q: Posso copiare il JSX così com'è?**
A: No. È pseudo-React con dati hardcoded e wrapping pensato per il browser preview. Lo schema, la struttura, i token sono giusti — la implementazione finale va fatta nel tuo codebase con i tuoi pattern.

**Q: I dati finti dove sono?**
A: `BARBERS`, `POSTS`, `SERVICES`, `TIME_SLOTS`, `APPTS`, `PARI_BARBERS_MAP` sono definiti nei file `pari-*.jsx` e in `ui_kits/barberbook_app/screens.jsx`. Sostituiscili con query Supabase.

**Q: Il tweaks panel e ios-frame vanno in produzione?**
A: NO. Sono solo per il preview canvas. Non includere.

**Q: La mappa SVG astratta va in produzione?**
A: NO. È solo un placeholder per il preview. In produzione usa Mapbox GL JS (consigliato) o equivalente con uno stile custom Pari.

**Q: E il dark mode?**
A: Già definito in `colors_and_type.css` — basta che `<html class="dark">` venga attivato. Usa `prefers-color-scheme` come default e dai all'utente toggle manuale dentro Menu.

**Q: Cosa NON è coperto da questo handoff?**
A: Flussi secondari ancora da disegnare:
- Onboarding barbiere completo con verifica documenti
- Flow di pagamento end-to-end (Stripe)
- Upload foto reali (post + story)
- Permessi push notification
- Vista calendario barbiere settimana/mese
- Submission recensione post-appuntamento

Chiedi al design team prima di inventare quelle schermate.

---

## 📚 Riferimenti

- **Repo originale**: https://github.com/fedesanna99/barberapp
- **Stack**: React 18 + Vite + Supabase + Vercel (vedi `stack.txt`)
- **Architecture**: vedi `Architecture.txt` del repo per lo schema DB completo
- **Vivere V4**: apri `V4.html` per il canvas con switcher schermate; apri `v4_pari_mappa/index.html` per il prototipo completo navigabile

---

**Domande?** Fammele al chat di design (Claude artifact), non al chat di code.
