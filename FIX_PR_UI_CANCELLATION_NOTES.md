# FIX_PR_UI_CANCELLATION_NOTES — PR-tris UI Cancellation (Pari V4)

## 1. File modificati / nuovi

| File | Tipo | Cambio |
|------|------|--------|
| `supabase/migrations/040_refund_status.sql` | **NEW** | Enum `refund_status_enum`, colonna `bookings.refund_status` + backfill, estensione trigger immutable con `refund_status` pinning, `REVOKE UPDATE (refund_status)` defense-in-depth, indice partial `idx_bookings_refund_status_failed`. |
| `supabase/functions/refund-booking/index.ts` | edit | Su Stripe error ora **NON ritorna 500**: prosegue update DB con `refund_status='failed_pending_manual'`, ritorna 200 con `refund_failed:true`. La cancellazione va avanti (slot si libera) — il supporto gestisce a mano. |
| `src/index.css` | edit | Aggiornato `@import` Google Fonts: aggiunto `Geist Mono 600` + `Instrument Serif`. Nuovo token `--font-display-serif`. Classi utility `.bb-h2-display` (Instrument Serif 22px) e `.bb-mono` (Geist Mono tabular-nums). |
| `src/screens/BarberDashboard.tsx` | edit | **Sezione A** — nuova `CancellationPolicySection` dentro AvailabilityTab. Chip presets 4/12/24/48/72/168 + Personalizza con input inline. "Finestra attuale" display in Instrument Serif. Callout rust warning quando window=0. Save via `useBarberInfo.saveInfo`. |
| `src/screens/BarberProfileSheet.tsx` | edit | **Sezione B** — trust pill clay-soft "Cancelli gratis fino a Xh prima" nello stat strip hero, sotto la riga city · distance. Icona chat bubble inline SVG. Edge case `window=0` → NON renderizza affatto. Formato: "1 settimana" per 168h, "N giorni" per multipli di 24, "Xh" altrimenti. |
| `src/screens/MyAppointments.tsx` | edit | **Sezione C+D** — sostituito `window.confirm` con `CancelBookingSheet`. `BookingCard` variant-aware: micro-copy "Cancelli gratis fino a {day} alle {time}" (within) o "Fuori dalla finestra Xh" (outside). Border tinto rust se outside-paid. Bottone ghost neutro / rust a seconda. Toast varianti (`'success'`/`'warning'`) basate su `data.refunded` + `data.refund_failed` + `withinWindow`. Alert sticky `RefundFailedAlert` in cima alla lista quando `refund_status='failed_pending_manual'`. `RefundResolvedBanner` mostrato una volta dopo che il supporto risolve (dedup via `localStorage.bb_refund_banner_<id>`). |
| `src/components/CancelBookingSheet.tsx` | **NEW** | 3 variant (`within-paid`/`outside-paid`/`cash`). Wrapper scrim+sheet identico a ConfirmSheet (animazioni scrimIn/sheetUp, niente portal). Refund-line sage soft (entro) / rust soft con barrato (oltre) / assente (cash). Bottoni stacked block-block (rust primary + transparent "Indietro"). Export helper `getCancelVariant(booking)`. |
| `src/components/RefundFailedAlert.tsx` | **NEW** | Alert sticky rust-soft + CTA "Contatta il supporto". Export anche `RefundResolvedBanner` sage check per la transition al cleared state. |
| `src/components/Toast.tsx` | edit | `ToastKind` esteso con `'warning'` → rust-soft background + gutter rust + 4s autodismiss (vs 3s degli altri). 'error' resta per fallimenti tecnici (red gutter, dark card). |
| `src/hooks/useBooking.ts` | edit | `BookingWithBarber` ora include `service:{price}` + `barbers.default_price` per il CancelBookingSheet. `CLIENT_SELECT` aggiornato. `RefundResp` esteso con `refund_failed?` + `refund_failed_reason?` + `refund_status?` su booking. |
| `src/hooks/useRefundFailedBookings.ts` | **NEW** | Query realtime su `bookings WHERE client_id=? AND refund_status='failed_pending_manual'`. Realtime UPDATE handler che aggiunge/rimuove dalla lista al cambiare di refund_status. Index `idx_bookings_refund_status_failed` (mig. 040) supporta la query. |
| `src/types/supabase.ts` | edit | Aggiunto type `RefundStatus`. Aggiunta colonna `refund_status` su `bookings` Row/Insert (Update intenzionalmente non include: il trigger blocca). Aggiunto Relationship `bookings_service_id_fkey` → `services` (mancava, necessario per la JOIN del CancelBookingSheet). |
| `DEPLOYMENT.md` | edit | Nota mig. 040 in §2.0 (descrizione enum + colonna + revoke + indice + coordinamento con refund-booking redeploy). |
| `docs/design/Booking_Lifecycle_V4.html` | **NEW** | Mock canonical 52 KB estratto dal zip handoff. Committato come fonte di verità per future PR. |
| `FIX_PR_UI_CANCELLATION_NOTES.md` | **NEW** | Questo file. |

**Totale: 14 file (11 modified + 3 new + 1 design HTML + 1 NOTES).**

## 2. Decisioni prese

- **Sezione A location**: dentro `AvailabilityTab` di BarberDashboard (non un tab dedicato, non in EditBarberInfoSheet). Coerente con UX "tutte le booking policies sono in Disponibilità".
- **Sezione B target**: `BarberProfileSheet.tsx` (bottom sheet, NON una screen full). Già il pattern del codebase per "profilo barbiere visto dal cliente".
- **Toast 'warning' nuovo kind**: rust-soft background + ink text (NON dark card). Necessario per cancel-no-refund — il design dice esplicitamente "rust soft" (non red 'error', non clay 'info').
- **Sheet pattern**: riuso shell ConfirmSheet (scrim absolute inset-0, sheet bottom radius-top, animazioni scrimIn+sheetUp). Body custom inline. Niente portal. Niente refactoring di ConfirmSheet — `CancelBookingSheet` è separato.
- **Refund failure path** (refund-booking): cambio comportamento. Prima: 500. Ora: 200 con `refund_failed:true` + DB aggiornato con `refund_status='failed_pending_manual'`. La cancellazione va avanti (slot si libera), solo il refund resta in manual queue. Supporto si contatta entro 48h.
- **Booking type extension**: incluso `service:services(price)` + `barbers(default_price)` nel SELECT realtime. Senza, il CancelBookingSheet non avrebbe l'amount da mostrare nel refund-line. Costa 1 join in più al refetch realtime (negligibile).
- **localStorage marker per cleared banner**: scelta intenzionale di NON tenere lo stato nel DB. Il "ho visto il banner" è puramente client-side, eventualmente consistent fra sessioni dello stesso device. Trade-off: se cambi device, vedi il banner di nuovo. Acceptable per MVP.
- **`refund_status` Relationships TS**: aggiunto `bookings_service_id_fkey` nel `Relationships` array di bookings. Mancava dal type generato (mig. 037 l'aveva creato in DB, ma il TS non era stato rigenerato). Lo aggiungo a mano qui — `npm run types` lo rigenererebbe identico.
- **Defense-in-depth REVOKE su refund_status only**: il prompt indica REVOKE solo per `refund_status` (no retroattivo su payment_status / cancellation_window_hours che restano "trigger-only" come PR-bis).

## 3. Edge case incontrati

- **`useBarberDefaults` vs `useBarberInfo` in BarberProfileSheet**: avevo importato `useBarberDefaults` ma `useBarberInfo` (già presente in linea 59) espone `cancellation_window_hours` come stringa. Riuso quello, rimuovo l'import aggiuntivo.
- **`getCancelVariant` con `payment_status='pending_online'`**: tecnicamente paid intent creato ma webhook non confermato. Trattato come `cash` (no refund Stripe ancora). Coerente: se la booking è in pending_online, niente da rimborsare.
- **Window=168h (1 settimana)**: trust pill mostra "1 settimana" invece di "168h" per leggibilità. Logica `win === 168 ? '1 settimana' : (win % 24 === 0 ? '${days} giorni' : '${h}h')`.
- **Toast 'warning' message color**: usa `var(--rust)` invece di `rgba(255,255,255,0.65)` del default (perché il background è rust-soft chiaro, non dark ink).

## 4. Smoke test

**Non eseguito da me.** Io scrivo solo il codice + verifico tsc/vite build. Il manual browser test (Step 9 del brief, 30+ checkbox) è a carico utente. Lista da eseguire prima del commit:

- [ ] BarberDashboard → tab Disponibilità → sezione "Politica di cancellazione" visibile dopo i giorni
- [ ] Tap chip 48h → save, toast "Politica aggiornata."
- [ ] Tap chip 0h → callout rust visibile
- [ ] Tap Personalizza → input inline 0-168
- [ ] Cambia window a 48h → ricarica BarberProfileSheet del barbiere lato cliente → trust pill mostra "48h"
- [ ] Cambia window a 0 → trust pill scompare
- [ ] MyAppointments: card booking entro-paid → micro-copy verde, bottone ghost neutro
- [ ] Tap Annulla → sheet variant within-paid (sage refund-line)
- [ ] Confirm → toast success sage
- [ ] Card booking oltre-paid → border rust, micro-copy rust, bottone ghost rust "Annulla senza rimborso"
- [ ] Tap → sheet variant outside-paid (rust refund-line con strikethrough)
- [ ] Confirm → toast warning rust-soft
- [ ] Card booking cash → bottone ghost neutro, niente micro-copy
- [ ] Tap → sheet variant cash (no refund-line)
- [ ] Confirm → toast success sage
- [ ] Manipola DB: UPDATE bookings SET refund_status='failed_pending_manual' WHERE id=<test> → MyAppointments mostra alert sticky in cima
- [ ] UPDATE refund_status='resolved_manually' → alert sparisce, mostra banner sage "Rimborso completato"
- [ ] Tap banner → sparisce, localStorage marker settato
- [ ] Refresh → banner non riappare
- [ ] Dark mode toggle → tutti i componenti coerenti (variabili CSS già hanno fallback dark)

## 5. BLOCKER test (Step 13)

**TEST 9 — refund failure path**: documentato nel brief, da eseguire dopo deploy (post commit/merge). Pattern:
1. Crea booking `payment_status='paid' + stripe_payment_intent_id='pi_TEST_FAKE_9'` (PI fake)
2. Cliente loggato → cancelBooking via JWT
3. Atteso: HTTP 200, `refund_failed:true`, DB: `status='cancelled', payment_status='paid', refund_status='failed_pending_manual'`

Eseguito autonomamente nel Step 13 dopo deploy (gate utente prima).

## 6. TODO out-of-scope (NON fatto in questa PR)

- **Estrazione `SheetWrapper` reusable**: `ConfirmSheet` + `CancelBookingSheet` + futuri sheet condividono shell scrim+sheet+animazioni. Pattern da estrarre in `src/components/Sheet.tsx` per ridurre duplicazione. Stima: 1h. Non fatto qui per evitare refactoring opportunistico.
- **Contatta il supporto handler**: ora `onContact` chiama un toast informativo "Apri Menu → Aiuto". Quando il flow Help/Support è disponibile (chat ticket / mailto / form), wirare il bottone. TODO segnalato.
- **Dark mode visual smoke test**: io non ho aperto browser, l'utente deve verificare ogni nuovo component in dark mode (Toggle dark class su html).
- **`useBarberDefaults` aggiornamento**: il hook `useBarberDefaults` espone già `cancellationWindowHours` (da PR-bis), ma il flow di SAVE va attraverso `useBarberInfo`. Coerente con pattern esistente: `useBarberDefaults` è read-only public, `useBarberInfo` è write per il barbiere stesso. Non serve modifica qui.
- **Re-deploy refund-booking**: il file refund-booking è modificato ma il deploy avviene allo Step 12 (post commit/merge), non in questa pass di scrittura codice.
- **Auto-decline-expired**: NON modificato (la function legge `auto_expire` reason e va a refund-booking che ora gestisce il refund_status — propagazione automatica del fix anche per il path cron 72h).

## 7. Build status

- `tsc --noEmit` → **0 errori**
- `vite build` → **success** in ~4s, solo warning preesistente sul chunk maplibre-gl (>500 kB) non causato da questa PR
- Lint: non eseguito (no `pnpm lint` configurato; tsc copre già la maggior parte dei check)

## 8. DEBT (da chiudere prima di considerare la PR davvero chiusa)

- **Smoke test visuale UI**: lo Step 9 originale (30+ checkbox in §4) NON è stato eseguito. Da fare a deployment completato, lato utente, prima di considerare la PR davvero chiusa. Coprirsi: light/dark mode, tutti i 3 variant del sheet, alert sticky + banner cleared, micro-copy e toast variants.

## 9. Post-deploy verification (PR-tris commit/deploy/test)

Eseguiti il 2026-05-26 dopo commit `ac9ea34` + merge `38a06a5`:

- **Mig 040 applied**: `040 | 040 | 040` (Local + Remote OK)
- **Column `bookings.refund_status`**: data_type=USER-DEFINED, is_nullable=NO, default=`'none'::refund_status_enum` OK
- **Enum `refund_status_enum`**: 4 valori (`none`, `succeeded`, `failed_pending_manual`, `resolved_manually`) OK
- **Backfill NULL check**: COUNT=0 OK
- **Edge function `refund-booking`**: VERSION 4, ACTIVE, updated 2026-05-26 15:32:02 UTC OK
- **TEST 9 BLOCKER (refund failure path)**: **PASS**
  - Booking: `pi_TEST_FAKE_9`, payment_status=paid, status=pending
  - Response: HTTP 200, `refund_failed:true`, `refund_failed_reason:"No such payment_intent: 'pi_TEST_FAKE_9'"`
  - DB finale: `status='cancelled', payment_status='paid', refund_status='failed_pending_manual'`
  - Cleanup booking di test eseguito (DELETE OK)
