# FIX_PAYMENT_NOTES — PR Cluster pagamenti (6 finding)

## 1. File modificati

| File | Cambio |
|------|--------|
| `supabase/migrations/038_payment_security.sql` | **NEW** — `failed` in CHECK, INSERT policy estesa, trigger esteso, 3 SECURITY DEFINER, indice partial, pg_cron cleanup. |
| `supabase/functions/create-payment-intent/index.ts` | **REWRITE** — JWT auth, body `{bookingId}`, amount server-side da `services.price`/`barbers.default_price`, idempotencyKey=bookingId, CORS via `ALLOWED_ORIGIN`. |
| `supabase/functions/stripe-webhook/index.ts` | **NEW** — verifica firma HMAC, gestisce `payment_intent.succeeded/payment_failed/charge.refunded` via RPC alle 3 mark_booking_*. Idempotente. |
| `src/hooks/useBooking.ts` | Tipo `paymentStatus` ristretto a `'pending_cash' \| 'pending_online'`. Rimosso param `stripePaymentIntentId` (client non può settarlo). |
| `src/screens/BookingSheet.tsx` | Reorder: INSERT prima del PI. `handlePayOnline` ora fa l'INSERT con `pending_online`, poi invoca PI con `bookingId`. `StripePaymentStep` osserva Realtime su `payment_status` con fallback 20s. Niente back-button da step `payment`. |
| `src/App.tsx` | `handleConfirm` branch su `paymentMethod`: per `online` solo side-effects (booking già esiste); per `cash` INSERT con `pending_cash`. Error code `23P01` → `23505`. Pass `userId` + `onSlotConflict` a `BookingSheet`. |
| `src/screens/BarberDashboard.tsx` | **Fix #3-bis**: `runAutoAccept` filter ora richiede `payment_status IN ('pending_cash','paid')` oltre a `status='pending'`. Senza, una booking online ancora in `pending_online` veniva auto-confermata PRIMA che il cliente pagasse. Quando il webhook flippa a `paid`, Realtime triggera l'effect e l'auto-accept procede. |
| `src/types/supabase.ts` | `PaymentStatus` esteso con `'failed'`. |
| `.env.example` | Aggiunto `VITE_STRIPE_PUBLISHABLE_KEY` + secret server-side `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`ALLOWED_ORIGIN` (con nota: NON `VITE_`). |
| `DEPLOYMENT.md` | §1 secret server-side, §2.1 bump 032→038, §2.3 inventario edge functions, nuove §Stripe / §Webhook / §Cleanup. |

## 2. Decisioni prese (dove il brief lasciava scelta)

- **Enum payment_status**: riutilizzato `pending_online` come stato "PI creato, attesa webhook" (per esplicita scelta utente). Aggiunto solo `failed`. Finale: `pending_cash | pending_online | paid | refunded | failed`.
- **Pin colonne payment**: scelto il **trigger esistente esteso**, non `ALTER POLICY ... WITH CHECK` self-referenziale. Motivazione: il pattern WITH CHECK con sub-SELECT su `bookings WHERE id = bookings.id` su Postgres 15 ha semantica di snapshot fragile (READ COMMITTED può vedere o NEW o OLD a seconda del momento di rivalutazione); il trigger BEFORE UPDATE ha accesso esplicito a `OLD` vs `NEW` con semantica deterministica. Single trigger esistente, function rewritten via `CREATE OR REPLACE`, nessun nuovo trigger.
- **INSERT policy**: estesa anche `bookings_insert` con vincolo `payment_status IN ('pending_cash','pending_online') AND stripe_payment_intent_id IS NULL`. Senza, F002 sarebbe rimasta aperta sul percorso INSERT (un client poteva fare INSERT diretto con `payment_status='paid'`).
- **Cleanup booking abbandonate**: solo pg_cron (5 min cadence, 15 min TTL). **NO** DELETE on-unmount client-side: non esiste policy `bookings_delete`, aggiungerla è fuori scope. Worst-case lo slot resta bloccato 15-20 min. Fallback se pg_cron non disponibile sul piano Supabase: scheduled edge function (pattern documentato in DEPLOYMENT.md §Cleanup).
- **Realtime verifying fallback**: 20s timeout. Se il webhook non promuove `payment_status` a `paid` entro 20s, lo sheet si chiude comunque con esito ottimistico (la carta è stata charged da Stripe; il webhook arriverà). pg_cron non cancella la booking se è già `paid` o sta per esserlo.
- **Race subscribe vs webhook (chiusa)**: il subscribe Realtime può attivarsi DOPO che il webhook ha già fatto l'UPDATE — evento perso, utente bloccato in "Confermo…" finché il timeout. Fix applicato: `subscribe(async (status) => { if (status==='SUBSCRIBED') { GET puntuale su bookings.payment_status; se già paid/failed gestisci subito e unsubscribe } })`. Niente race window residua.
- **pg_cron loud-fail**: il blocco pg_cron in mig. 038 ora controlla `pg_extension` e fa `RAISE EXCEPTION` con HINT se non è abilitato (Supabase richiede di abilitarlo da Dashboard, non da SQL). Meglio errore esplicito che cleanup silenziosamente inattivo.
- **Back button da step 'payment'**: rimosso. Una volta che la booking è committed in `pending_online`, tornare indietro creerebbe un orfano. Si può solo chiudere lo sheet (pg_cron pulisce).
- **`auth.role()='service_role'` verification** (30 sec test pre-merge): in Supabase SQL Editor esegui `SET LOCAL request.jwt.claims = '{"role":"service_role"}'; SELECT auth.role();` — deve ritornare `'service_role'`. Se ritorna `null` o `'authenticated'`, il trigger `bookings_prevent_immutable_change` blocca anche il webhook stesso (no pagamento può completare). Il pattern è quello usato da `admin-create-user` (ed è già in produzione), quindi a meno di modifiche custom alla auth.role() function, deve funzionare. Verifica obbligatoria sul DB di staging prima del merge.
- **Backward-compat payload `{amount}` su `create-payment-intent`**: NON implementata. App pre-production, non c'è una user base con build vecchia da preservare; il PWA update prompt (`PWAUpdatePrompt.tsx`, commit `8f71cb8`) gestisce l'aggiornamento. Deploy diretto, edge function accetta solo il nuovo contratto `{bookingId}`. Decisione esplicita utente.
- **`onSuccess` idempotenza in StripePaymentStep**: tutte e 3 le call site (Realtime UPDATE callback, GET puntuale post-SUBSCRIBED, fallback timer 20s) settano `resolved = true` PRIMA di chiamare `onSuccess()` / `setError()`. `channel.unsubscribe()` rimuove il listener ma non svuota callback già queued nell'event loop — il flag è la safety net che evita doppio onSuccess su race tra timer e Realtime.

## 3. Test manuali pre-merge — suite ordinata per priorità decrescente

I primi **4 sono BLOCKER** per il merge (security gating). 5/9/10 richiedono tooling esterno (Stripe CLI, due browser, attesa del cron). Test 8 si chiude completamente solo dopo PR-bis (cancellation policy); qui basta verificare che lo status resti `pending` post-paid quando auto_accept è OFF.

1. **[BLOCKER] Frode UPDATE diretta via PostgREST**: con JWT di un client owner di una booking, `PATCH /rest/v1/bookings?id=eq.<mio-booking-id>` con body `{"payment_status":"paid"}` → **403 / errore trigger** `payment_status can only be modified by service_role` (ERRCODE `42501`).
2. **[BLOCKER] Frode INSERT diretto via PostgREST**: con JWT del client, `POST /rest/v1/bookings` con body `{client_id, barber_id, date, time_slot, payment_status:"paid"}` → **403 / RLS rejection** `new row for relation "bookings" violates row-level security policy` (la INSERT policy della mig. 038 vincola `payment_status IN ('pending_cash','pending_online')`).
3. **[BLOCKER] Frode amount tampering**: crea una booking con `service_id` del servizio "Taglio classico 50€". Chiama `create-payment-intent` con quel `bookingId` (autenticato). Su Stripe Dashboard → Payments verifica che il PI creato sia da `amount=5000` (centesimi), non un valore arbitrario inviato dal client. Cross-check: chiama l'edge function con body alterato (es. `{"bookingId":"...","amount":1}`) e verifica che venga ignorato (il nuovo contratto accetta solo `bookingId`).
4. **[BLOCKER] auth.role() returns 'service_role'**: in Supabase SQL Editor, esegui `SET LOCAL request.jwt.claims = '{"role":"service_role"}'; SELECT auth.role();` → atteso `'service_role'`. Se ritorna `null` o `'authenticated'`, il webhook stesso viene bloccato dal trigger immutable. Se questo test fallisce, **non mergiare**.
5. **Webhook idempotency** (richiede Stripe CLI): `stripe listen --forward-to <webhook-url>` + `stripe trigger payment_intent.succeeded` × 2 sullo stesso PI → seconda chiamata no-op (mark_booking_paid ritorna la riga esistente, no errore, no doppia mutazione).
6. **Happy cash + auto_accept ON**: client prenota con "Paga in loco", barbiere ha auto_accept ON → booking compare in dashboard barbiere come `status='confirmed'` immediato. Verifica via SQL: `payment_status='pending_cash'`, `status='confirmed'`.
7. **Happy online + auto_accept ON**: client prenota con Stripe → durante PI verifica via SQL che `status='pending'` (NON ancora `confirmed`, perché payment_status è `pending_online`) → carta confermata → webhook → `payment_status='paid'` → l'effect su `[real]` re-fires su BarberDashboard → auto-accept passa il filter → `status='confirmed'`. **Verifica ordine: paid PRIMA di confirmed.** Se vedi confirmed con pending_online ancora attivo, il fix #3-bis è regredito.
8. **Happy online + auto_accept OFF**: stesso flow ma il barbiere ha auto_accept OFF → post-webhook lo stato deve essere `payment_status='paid'` + `status='pending'`. **Resta in attesa di conferma manuale del barbiere.** Chiusura del flow (confirmed via UI dashboard) è già implementata; il TTL 72h dopo cui auto-decline + refund è scope della **PR-bis**, non chiuso qui.
9. **Race due tab stesso slot** (richiede due browser): apri due sessioni dello stesso utente (o due utenti diversi), seleziona stesso slot, clicca "Paga ora" simultaneamente. Una vince e procede al PI; l'altra riceve toast "Lo slot è stato appena prenotato da qualcun altro" e torna a step `datetime`. Verifica catch su `error.code === '23505'` (NON `23P01`).
10. **Abbandono + cron cleanup** (attesa 15-20 min): avvia booking online, mounta Stripe Elements, chiudi tab senza confermare la carta. Booking resta in `payment_status='pending_online'`. Aspetta ≥15 min, verifica che la riga sia stata cancellata: `SELECT * FROM bookings WHERE id='<uuid>'` deve tornare 0 righe. Cron history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5`.

**Build pre-merge** (sanity check): `npx tsc --noEmit` ✅ già verificato + `npx vite build` ✅ già verificato.

## 4. Migration 038 — rollback plan

Le migration in questo repo sono forward-only per convenzione (vedi DEPLOYMENT.md §5). Per rollback di emergenza, applicare manualmente:

```sql
-- 1. Drop le 3 SECURITY DEFINER
DROP FUNCTION IF EXISTS public.mark_booking_paid(uuid, text);
DROP FUNCTION IF EXISTS public.mark_booking_payment_failed(uuid, text);
DROP FUNCTION IF EXISTS public.mark_booking_refunded(text);

-- 2. Rimuovi 'failed' dal CHECK (riallinea a 037)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending_cash','pending_online','paid','refunded'));

-- 3. Ripristina trigger function al body di mig. 016 (pinna solo 4 colonne)
-- Vedi supabase/migrations/016_fix_bookings_update_rls.sql per il body originale.

-- 4. Ripristina bookings_insert policy al body di mig. 026 (senza payment_status check)
-- Vedi supabase/migrations/026_barber_vacation.sql.

-- 5. Disattiva pg_cron job
SELECT cron.unschedule('cleanup-abandoned-online-bookings');

-- 6. Drop indice partial
DROP INDEX IF EXISTS bookings_stripe_payment_intent_id_idx;
```

Prima del rollback: verifica che non esistano righe in `payment_status='failed'` (le perderesti perché il nuovo CHECK le rifiuta). Se esistono, prima `UPDATE bookings SET payment_status='refunded' WHERE payment_status='failed'`.

## 5. Cose intenzionalmente NON fatte in questa PR

- **DELETE policy per client su pending_online**: aggiungere `bookings_delete` con `client_id = auth.uid() AND payment_status = 'pending_online'` permetterebbe il cleanup immediato lato client invece di aspettare pg_cron. Scope creep — non richiesto dai 6 finding. Issue follow-up consigliato.
- **Status `declined`**: BookingStatus include già `declined` (mig. 033) e useBooking.ts ha `declineBooking`. La decisione di prodotto su quando usarlo (rifiuto barbiere vs cancel cliente) è separata. Non toccato qui.
- **Scheduled edge function come fallback pg_cron**: pattern documentato in DEPLOYMENT.md §Cleanup ma implementazione lasciata come follow-up. La migration 038 ora fa `RAISE EXCEPTION feature_not_supported` con HINT se pg_cron non è abilitato (loud-fail invece del vecchio NOTICE silenzioso).
- **Auto-accept filter performance** (BarberDashboard `L188`/`L195`): il filter `real.filter(b => b.status==='pending' && payment_status IN(...))` gira su ogni re-render senza `useMemo`. Performance OK per <100 booking pending per barbiere. Future optimization se un barbiere arriva a 200+ pending simultanee (improbabile date le 72h TTL della PR-bis). **Non priority** — il rebuild UI riscriverà comunque `BarberDashboard.tsx`.
- **Rate limiting su create-payment-intent**: HCAPTCHA_SETUP.md §4 cita questo come "deferred". Non chiuso qui, è cross-cutting.
- **Stripe Apple Pay / Google Pay**: `automatic_payment_methods: { enabled: true }` lo abilita lato Stripe, ma test dedicato non incluso nei test manuali sopra.
- **Audit ortogonale segnalato**: nessuna API key di test inline trovata nel codice esistente al momento dell'audit. Solo references a env var. Nessun finding orthogonal in questa pass.
