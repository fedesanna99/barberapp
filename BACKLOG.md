# Backlog — feature mancanti, stub, demo da implementare

Snapshot al 2026-05-18 (dopo audit + applicazione dei 2 CRITICAL e dei 9 IMPORTANT).
Lista delle UI / feature che attualmente NON funzionano o girano solo in demo. Quando affronti un item: leggi la sezione "Come verificare", spunta il check, segui "Cosa fare", tocca i file indicati.

**Legenda:**
- 🔧 STUB = bottone/icona visibile ma senza handler → non fa nulla
- 🟡 PARTIAL = UI completa ma dati hardcoded o local-only (perde tutto al refresh)
- ❌ MISSING = feature implicata da UI/route/schema ma codice assente
- Effort: **S** < 1h · **M** mezza giornata · **L** 1+ giorni

---

## Indice

- [Quick wins (~3-4 ore totali)](#quick-wins)
- [🔧 STUB (10)](#-stub--bottoniicone-senza-handler)
- [🟡 PARTIAL (10)](#-partial--ui-completa-dati-hardcodedlocal)
- [❌ MISSING (12)](#-missing--non-implementato)
- [Pattern di test](#pattern-di-test)
- [Comandi utili](#comandi-utili)

---

## Quick wins

Attacca questi prima per il massimo impatto/effort ratio. Stimato 3-4h totali per tutto il blocco.

- [x] STUB #1 + #2 — collegare le ⚙️ settings ai sheet esistenti ✅ commit `a397b67`
- [x] STUB #3 + #4 — nascondere icone send finché non c'è feature ✅ commit `94f1ad1`
- [x] STUB #5 — schermata "I miei appuntamenti" + cancel client ✅ commit `0016f64`
- [x] PARTIAL #2 + #3 — badge dinamico + rimuovi hardcoded "3" ✅ in commits `d7ea8eb` e `0016f64`
- [x] MISSING #3 — bottone "Annulla" prenotazioni cliente ✅ commit `0016f64`

---

## ✅ Stato globale (sessione audit + STUB bundle)

| Categoria | Iniziale | Chiusi | Rimasti |
|---|---|---|---|
| 🔧 STUB | 10 | 10 | 0 |
| 🟡 PARTIAL | 10 | 6 | 4 |
| ❌ MISSING | 12 | 1 | 11 |

I 10 STUB e il MISSING #3 sono stati implementati e testati live in browser
nella sessione del 2026-05-18. Vedi commit `94f1ad1` → `0016f64`.

PARTIAL chiusi successivamente: #2, #3 (badge dinamici, già coperti dai
commit STUB), #4 (Stories real data), #8, #9 (durata e prezzo per barbiere),
#1 (bookmark persistente + vista Post salvati). Vedi commit `f2dd88d`,
`b45fdbc`, `7c31515`.

---

## 🔧 STUB — bottoni/icone senza handler

> ✅ **Tutti i 10 STUB sono stati chiusi nella sessione del 2026-05-18** (commit `94f1ad1` → `0016f64`). Le sezioni sotto restano come storico / riferimento per chi guarda i diff.

### #1 — ⚙️ Settings in Profile ✅ DONE

- **Cosa l'utente vede:** icona ingranaggio in alto a destra in Profilo
- **Dove:** [src/screens/Profile.tsx:194](src/screens/Profile.tsx:194)
- **Come verificare:** apri Profilo, clicca ⚙️ → non succede nulla
- **Cosa fare:**
  - Sostituire l'`<i>` con `<button onClick={() => setShowEditProfile(true)}>` (state già esistente)
  - O creare un nuovo sheet "Impostazioni" con voci come notifiche email, privacy, lingua
- **File da toccare:** `src/screens/Profile.tsx`
- **Effort:** S (5 min se riusi `EditProfileSheet`)

### #2 — ⚙️ Settings in BarberDashboard ✅ DONE

- **Cosa l'utente vede:** icona ingranaggio accanto al titolo "Dashboard"
- **Dove:** [src/screens/BarberDashboard.tsx:59](src/screens/BarberDashboard.tsx:59)
- **Come verificare:** loggato come barbiere, vai Dashboard, clicca ⚙️ → niente
- **Cosa fare:**
  - Collegare a `EditBarberInfoSheet` (che oggi è raggiungibile solo da Menu)
  - Aggiungere state `showEdit` + handler + render dello sheet
- **File da toccare:** `src/screens/BarberDashboard.tsx`
- **Effort:** S (15 min)

### #3 — ✈️ Send in Feed top-bar ✅ DONE (rimosso)

- **Cosa l'utente vede:** icona aeroplano in alto a destra nel Feed (accanto al cuore)
- **Dove:** [src/screens/Feed.tsx:159](src/screens/Feed.tsx:159)
- **Come verificare:** apri Feed, clicca ✈️ → niente
- **Cosa fare:** decidere
  - Se nessuna feature di messaggistica → **rimuovi l'icona**
  - Se vuoi DM in futuro → aggiungi `onClick` con `console.log('TODO DM')` e issue tracker
- **File da toccare:** `src/screens/Feed.tsx`
- **Effort:** S (5 min per rimuovere)

### #4 — ✈️ Send sotto ogni post ✅ DONE (rimosso)

- **Cosa l'utente vede:** icona aeroplano nella riga azioni di ogni post (tra commento e bookmark)
- **Dove:** [src/screens/Feed.tsx:253](src/screens/Feed.tsx:253)
- **Come verificare:** scorri Feed, clicca ✈️ sotto un post → niente
- **Cosa fare:** stesso ragionamento di #3 (rimuovi o cabla a DM/share)
- **File da toccare:** `src/screens/Feed.tsx`
- **Effort:** S (5 min)

### #5 — Voce Menu "I miei appuntamenti" (badge "2") ✅ DONE

- **Cosa l'utente vede:** prima voce nel Menu, con badge numerico
- **Dove:** [src/screens/Menu.tsx:10](src/screens/Menu.tsx:10)
- **Come verificare:** Menu → tocca "I miei appuntamenti" → niente
- **Cosa fare:**
  - Aggiungere `action: 'appointments'` al `MenuItem`
  - In `App.tsx` gestire l'action → cambiare screen a un nuovo `<MyAppointments />`
  - Componente che riusa `useClientBookings(userId)` + visualizza upcoming + past
  - Bonus: bottone "Annulla" su upcoming (vedi MISSING #3)
- **File da toccare:** `src/screens/Menu.tsx`, `src/App.tsx`, nuovo `src/screens/MyAppointments.tsx`
- **Effort:** M (1-2h)

### #6 — Voce Menu "Notifiche" (badge "3") ✅ DONE (placeholder)

- **Cosa l'utente vede:** seconda voce nel Menu con badge "3"
- **Dove:** [src/screens/Menu.tsx:12](src/screens/Menu.tsx:12)
- **Come verificare:** tocca → niente
- **Cosa fare:** dipende da MISSING #5 (sistema notifiche). Quick win temporaneo:
  - Rimuovi il badge "3" hardcoded
  - Aggiungi `action: 'notifications'` che apre schermata placeholder "Nessuna notifica"
- **Effort:** S (10 min per placeholder) → L se implementi vero sistema
- **Vedi anche:** MISSING #5

### #7 — Voce Menu "Impostazioni posizione" ✅ DONE

- **Cosa l'utente vede:** voce con icona pin
- **Dove:** [src/screens/Menu.tsx:13](src/screens/Menu.tsx:13)
- **Cosa fare:**
  - Sheet che chiede al cliente di salvare lat/lng (manualmente o via `navigator.geolocation`)
  - Salva in `profiles.lat`/`profiles.lng` (campi esistono già)
  - Usato da `Discover` per "Vicini"
- **File da toccare:** `src/screens/Menu.tsx`, nuovo `src/components/LocationSettingsSheet.tsx`, `src/hooks/useProfile.ts` (aggiungi `updateLocation`)
- **Effort:** M (1-2h)

### #8 — Voce Menu "Valuta l'app" ✅ DONE (rimosso)

- **Cosa l'utente vede:** voce con stella
- **Dove:** [src/screens/Menu.tsx:16](src/screens/Menu.tsx:16)
- **Cosa fare:**
  - PWA: link a store (Play / App Store quando pubblichi)
  - Web only: link a un form / "Lascia recensione"
  - In assenza di store URL: nascondere finché non hai una destinazione
- **Effort:** S (5 min per nascondere, 15 min per link)

### #9 — Voce Menu "Invita un amico" ✅ DONE

- **Cosa l'utente vede:** voce con icona share
- **Dove:** [src/screens/Menu.tsx:17](src/screens/Menu.tsx:17)
- **Cosa fare:**
  - Usare Web Share API: `navigator.share({ title, text, url })`
  - URL: link all'app + eventuale referral code
- **File da toccare:** `src/screens/Menu.tsx`
- **Effort:** S (20 min)

### #10 — Voce Menu "Privacy policy" ✅ DONE (rimosso)

- **Cosa l'utente vede:** voce con icona scudo
- **Dove:** [src/screens/Menu.tsx:21](src/screens/Menu.tsx:21)
- **Cosa fare:**
  - Servire un documento privacy (richiesto per legge se trattate dati)
  - Opzione A: link esterno (hosted su sito statico)
  - Opzione B: schermata in-app con il testo
- **File da toccare:** `src/screens/Menu.tsx`, eventualmente nuovo `src/screens/PrivacyPolicy.tsx`
- **Effort:** S (10 min link / M per testo)

---

## 🟡 PARTIAL — UI completa, dati hardcoded/local

### #1 — Bookmark/segnalibro 🔖 sui post ✅ DONE (`7c31515` + fix icon `e0c3417`, richiede migration 021)

- **Cosa l'utente vede:** icona bookmark sotto ogni post, si "riempie" quando cliccato
- **Dove:** [src/screens/Feed.tsx:54](src/screens/Feed.tsx:54), [src/screens/Feed.tsx:255](src/screens/Feed.tsx:255)
- **Stato attuale:** `setSaved` salva solo in state locale → si perde al refresh
- **Come verificare:** clicca bookmark su un post, refresha (F5), il bookmark torna vuoto
- **Cosa fare:**
  - Nuova tabella `saved_posts(user_id, post_id, created_at)` con RLS analoga a `likes`
  - Nuovo hook `useSavedPosts` (struttura simile a `useLikes`)
  - In `Feed.tsx`: sostituire `setSaved` con il nuovo hook
  - Schermata "Salvati" in Menu (analoga a "Post che ti piacciono")
- **File da toccare:** nuova migration, `src/hooks/useSavedPosts.ts`, `src/screens/Feed.tsx`, `src/screens/Menu.tsx`
- **Effort:** M (2-3h)

### #2 — Badge "2" su "I miei appuntamenti"

- **Cosa l'utente vede:** numero "2" hardcoded sulla voce Menu
- **Dove:** [src/screens/Menu.tsx:10](src/screens/Menu.tsx:10)
- **Cosa fare:**
  - Rimuovere `badge: '2'` dal SECTIONS
  - In `Menu.tsx` chiamare `useClientBookings(userId)`, calcolare `upcoming.length`, passare badge dinamico
- **File da toccare:** `src/screens/Menu.tsx`
- **Effort:** S (15 min)

### #3 — Badge "3" su "Notifiche"

- **Cosa l'utente vede:** "3" hardcoded
- **Dove:** [src/screens/Menu.tsx:12](src/screens/Menu.tsx:12)
- **Cosa fare:**
  - Se MISSING #5 non implementato → rimuovere badge
  - Se implementato → conteggio unread da DB
- **Effort:** S (5 min per rimuovere)

### #4 — Stories row (cerchi barbieri in alto al Feed) ✅ DONE (`f2dd88d`)

- **Cosa l'utente vede:** 5 cerchi con iniziali in alto al Feed, sempre gli stessi
- **Dove:** [src/screens/Feed.tsx:165-185](src/screens/Feed.tsx:165)
- **Stato attuale:** sempre `BARBERS` di `demoData.ts` anche in produzione
- **Come verificare:** loggato in prod, vedi sempre Marco/Fadi/Nico/Tariq/Luca (demo)
- **Cosa fare:**
  - Decidere semantica: barbieri seguiti? top-rated? recenti?
  - Caricare da `useFollows(userId)` (se seguiti) o da `useBarbers('popular', ...)`
  - Cliccando sul cerchio si apre `BarberProfileSheet` (già fatto)
  - In futuro: estendere a vere stories (vedi MISSING #11)
- **File da toccare:** `src/screens/Feed.tsx`
- **Effort:** M (30 min)

### #5 — Pill tag profilo cliente ("Skin fade · Beard · Line up")

- **Cosa l'utente vede:** 3 pill sotto al nome nel profilo
- **Dove:** [src/screens/Profile.tsx:243-250](src/screens/Profile.tsx:243)
- **Stato attuale:** in prod mostra primi nomi seguiti; in demo hardcoded
- **Cosa fare:**
  - Decidere semantica:
    - Opzione A: tag stile preferiti dell'utente (nuovo campo `profiles.preferred_styles[]`)
    - Opzione B: barbieri seguiti (già implementato in prod, ma label confusa)
  - Allineare label + dato
- **Effort:** S (30 min) — dipende dalla decisione di prodotto

### #6 — Stat "Stelle" in profilo cliente

- **Cosa l'utente vede:** terzo numero nelle stat profilo, label "Stelle", icona ⭐
- **Dove:** [src/screens/Profile.tsx:283-286](src/screens/Profile.tsx:283)
- **Stato attuale:** valore = `barbersCount` (numero seguiti), label = "Stelle" → **mismatch**
- **Origine:** commit `79cfbb4` precedente all'audit (rinomina stat) — non introdotto da me
- **Cosa fare:**
  - Opzione A: cambiare label in "Seguiti"
  - Opzione B: usare rating medio dato (richiede MISSING #4)
- **File da toccare:** `src/screens/Profile.tsx`
- **Effort:** S (2 min cambiare label)

### #7 — Servizi al booking

- **Cosa l'utente vede:** card con tag "Skin fade · Beard", "Sessione 30 min · ~€25"
- **Dove:** [src/screens/BookingSheet.tsx:66-68](src/screens/BookingSheet.tsx:66)
- **Stato attuale:** `barber.tags.join(' · ')` — solo display, nessuna selezione
- **Cosa fare:** vedi MISSING #6 (catalogo servizi)
- **Effort:** L (parte di feature più grande)

### #8 — Durata 30 min hardcoded ✅ DONE (`b45fdbc`, richiede migration 020 applicata)

- **Cosa l'utente vede:** "30 min" ovunque
- **Dove:** [src/screens/BookingSheet.tsx:67,188](src/screens/BookingSheet.tsx:67), [src/hooks/useAvailability.ts:5-18](src/hooks/useAvailability.ts:5)
- **Stato attuale:** hardcoded a 30 min in `generateSlots(start, end, 30)`
- **Cosa fare:**
  - Breve termine: aggiungere `barbers.default_slot_minutes int default 30`, leggere in `useAvailability`
  - Lungo termine: durata per servizio (legato a MISSING #6)
- **File da toccare:** migration, `src/hooks/useAvailability.ts`, `src/types/supabase.ts` (rigenera)
- **Effort:** M (1-2h breve termine)

### #9 — Prezzo "~€25" hardcoded ✅ DONE (`b45fdbc`, stessa migration 020 di #8)

- **Cosa l'utente vede:** "~€25" nel summary booking
- **Dove:** [src/screens/BookingSheet.tsx:67,189](src/screens/BookingSheet.tsx:67)
- **Cosa fare:**
  - Breve termine: `barbers.default_price numeric default 25`, leggere e mostrare con `€{barber.default_price}`
  - Lungo termine: prezzo per servizio (MISSING #6)
- **Effort:** M (1-2h breve termine)

### #10 — Delete comment button — non listato (commenti già demo-only per scelta)

---

## ❌ MISSING — non implementato

### #1 — Schermata Notifiche

- **Promessa da:** badge "3" nel Menu
- **Cosa fare:**
  - Decidere il tipo di notifiche:
    - Lato cliente: "Booking confermato/cancellato dal barbiere", "Risposta a commento", ecc.
    - Lato barbiere: "Nuova prenotazione", "Cancellazione"
  - Tabella `notifications(user_id, type, ref_id, message, read_at, created_at)` + RLS
  - Hook `useNotifications(userId)` con Realtime subscription
  - Schermata `Notifications.tsx` (lista con read/unread visual)
  - Trigger DB su `bookings` INSERT/UPDATE → insert notifica
  - `useBookingToast` esistente sostituisce in parte questo (toast su evento) ma niente storico
- **Effort:** L (1-2 giorni)

### #2 — Modifica prenotazione (cambio data/slot)

- **Stato attuale:** Il mio trigger `bookings_immutable` (migration 016, parte del fix C1) **blocca** cambi a `date`/`time_slot`/`barber_id` per sicurezza
- **Cosa fare:**
  - Se si vuole permettere reschedule, modificare il trigger per consentire cambio di `date` e `time_slot` quando `status='pending'` (e magari aggiungere `WITH CHECK` che blocca slot occupati)
  - UI: bottone "Modifica" su prenotazione pending in BarberDashboard / nuova schermata appuntamenti cliente
  - Riapre `BookingSheet` con barbiere preselezionato
- **File da toccare:** nuova migration che relaxes immutability, `src/screens/BookingSheet.tsx`, `src/screens/BarberDashboard.tsx`
- **Effort:** M (3-4h)

### #3 — Cancellazione prenotazione lato cliente ✅ DONE (in `0016f64`, bonus dello STUB #5)

- **Stato attuale:** RLS [001:279](supabase/migrations/001_initial_schema.sql:279) + WITH CHECK del mio C1 (migration 016) **permettono** al client di cancellare. UI manca.
- **Cosa fare:**
  - In `Profile.tsx` `RealUpcoming` aggiungere bottone "Annulla" su ogni booking
  - On click: `cancelBooking(b.id)` (hook esistente), refetch
  - Toast di conferma "Prenotazione annullata"
- **File da toccare:** `src/screens/Profile.tsx`
- **Effort:** S (30 min)

### #4 — Review/rating post-appuntamento

- **Promessa da:** `barbers.rating` (default 0), `barber.rating >= 4.9 → badge "TOP"` in Discover
- **Cosa fare:**
  - Nuova tabella `reviews(id, booking_id unique, client_id, barber_id, rating int 1-5, comment text, created_at)` + RLS
  - Trigger: dopo INSERT in reviews → ricalcolare `barbers.rating` come media
  - UI: dopo `status='done'` in profilo cliente, prompt review (bottone "Lascia una recensione")
  - Sheet con stars 1-5 + textarea
- **File da toccare:** migration, `src/screens/ReviewSheet.tsx`, `src/screens/Profile.tsx`, `src/hooks/useReview.ts`
- **Effort:** M (3-4h)

### #5 — Sistema notifiche

- **Vedi MISSING #1** (è la stessa feature). Push notifications richiede service worker + permission API.

### #6 — Catalogo servizi strutturato

- **Stato attuale:** `barbers.specialties` text (es. "Skin fade, Beard, Line up")
- **Cosa fare:**
  - Tabella `services(id, barber_id, name, duration_min, price numeric, active bool)` + RLS
  - Hook `useServices(barberId)` per CRUD
  - UI nel BarberDashboard: nuova tab "Servizi" con add/edit/delete
  - In BookingSheet: dopo selezione data, mostra select servizi del barbiere
  - Aggiungere `bookings.service_id uuid references services`
  - `useAvailability` usa la durata del servizio invece di hardcoded 30
- **File da toccare:** migration (grossa), nuove schermate, modifiche estese a BookingSheet
- **Effort:** L (1-2 giorni)

### #7 — Pagamenti

- **Promessa da:** prezzo mostrato ("~€25")
- **Cosa fare:**
  - Scegliere provider: Stripe (più completo, fee 1.4%+€0.25), Satispay (IT-friendly), bonifico (zero fee, friction alta)
  - Stripe Checkout è il più semplice: redirect a pagina hosted, webhook → mark booking `paid`
  - Nuovo campo `bookings.paid_at timestamptz`, `bookings.payment_provider text`, `bookings.payment_ref text`
  - Edge function per gestire webhook (gia hai pattern in `admin-create-user`)
- **Effort:** L (2-3 giorni con test)

### #8 — Sharing profilo barbiere

- **Cosa fare:**
  - In `BarberProfileSheet` aggiungere bottone share in alto
  - `navigator.share({ title, text, url: `${origin}/barber/${id}` })`
  - **Nota:** servono URL routes deep-linkable → dipende da NICE-TO-HAVE A1 (react-router)
- **Effort:** S senza routing (share solo URL home), M con deep link

### #9 — Dark mode toggle

- **Promessa da:** CSS variables `--color-*` già definite in [src/lib/colors.ts](src/lib/colors.ts)
- **Cosa fare:**
  - Hook `useTheme` con `'light' | 'dark' | 'auto'`
  - Salvare scelta in `localStorage`
  - Listener su `prefers-color-scheme` per 'auto'
  - Aggiungere set di colori dark (define `--color-*-dark`)
  - Toggle nel Menu (sopra "Esci"?)
- **File da toccare:** `src/lib/colors.ts`, nuovo `src/hooks/useTheme.ts`, `src/screens/Menu.tsx`
- **Effort:** M (2-3h fatto bene)

### #10 — Photo album / multi-photo posts

- **Stato attuale:** ogni post ha `image_url text` (singolo)
- **Cosa fare:**
  - Migration: nuova tabella `post_images(post_id, url, sort_order)` o cambiare `posts.image_url` in `image_urls text[]`
  - UI post upload: permettere multi-select file
  - UI feed: carousel o griglia
- **Effort:** M (3-4h)

### #11 — Stories interattive

- **Stato attuale:** "Stories row" in Feed è solo navigazione a profilo barbiere
- **Cosa fare se vuoi vere stories:**
  - Tabella `stories(id, barber_id, image_url, created_at, expires_at)` con TTL 24h
  - Cleanup cron per cancellare expired
  - Full-screen viewer con tap-to-advance
- **Effort:** L (1-2 giorni)
- **Nota:** valuta se serve davvero o se è scope creep

### #12 — Cleanup blob orfani in Storage

- **Problema:** se upload Storage riesce ma DB insert fallisce, il file resta orfano
- **Cosa fare:**
  - Edge function settimanale che lista file in `posts/` e `avatars/`
  - Per ogni file, cerca riferimento in `posts.image_url` o `profiles.avatar_url`
  - Se non riferito da nessuna riga DB → delete
  - Schedule via Supabase cron extension
- **File da toccare:** nuova `supabase/functions/cleanup-orphan-blobs/index.ts`
- **Effort:** M (3-4h)

---

## Pattern di test

Per ogni item dopo l'implementazione:

1. **TypeScript:** `npx tsc --noEmit` deve essere pulito
2. **Build:** `npm run build` deve passare
3. **Manuale in browser:** `npm run dev`, esegui flusso e verifica UX
4. **DB:** se hai aggiunto migration, applica nel SQL Editor e verifica con `select` mirate
5. **RLS:** se hai aggiunto policy, testa con `set role authenticated; set_config('request.jwt.claims', ...)` per simulare l'utente sbagliato

## Comandi utili

```bash
# Dev server
npm run dev                    # localhost:5173 (o 5174 se 73 in uso)

# Build + typecheck
npm run build                  # tsc + vite build

# Solo typecheck
npx tsc --noEmit

# Rigenera tipi Supabase dopo migration (richiede CLI installato)
npm run types

# Vedere cosa è cambiato dall'ultima volta
git log --oneline --all -20
git diff <commit> HEAD -- src/

# Test RLS in SQL Editor (esempio C1)
set role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<user_id>', 'role', 'authenticated')::text,
  false
);
-- ...tua query...
reset role;
select set_config('request.jwt.claims', null, false);
```

## File chiave (mappa rapida)

| Cosa | Dove |
|---|---|
| Client Supabase | [src/lib/supabase.ts](src/lib/supabase.ts) |
| Auth + retry | [src/hooks/useAuth.ts](src/hooks/useAuth.ts) |
| Booking logic | [src/hooks/useBooking.ts](src/hooks/useBooking.ts) |
| Availability | [src/hooks/useAvailability.ts](src/hooks/useAvailability.ts) |
| Profile CRUD | [src/hooks/useProfile.ts](src/hooks/useProfile.ts) |
| Demo data | [src/lib/demoData.ts](src/lib/demoData.ts) |
| Auto-gen types | [src/types/supabase.ts](src/types/supabase.ts) (NON editare a mano) |
| Validation helpers | [src/lib/validation.ts](src/lib/validation.ts) |
| Colori | [src/lib/colors.ts](src/lib/colors.ts) |
| Tutte le migration | [supabase/migrations/](supabase/migrations/) |
| Edge function admin-create-user | [supabase/functions/admin-create-user/index.ts](supabase/functions/admin-create-user/index.ts) |
| Setup hCaptcha | [HCAPTCHA_SETUP.md](HCAPTCHA_SETUP.md) |

---

*Ultimo update: 2026-05-18*
