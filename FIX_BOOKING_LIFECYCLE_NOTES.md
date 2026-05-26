# FIX_BOOKING_LIFECYCLE_NOTES — PR-bis Booking lifecycle (mig. 039)

## 1. File modificati / creati

| File | Cambio |
|------|--------|
| `supabase/migrations/039_cancellation_policy.sql` | **NEW** — `cancellation_window_hours` su barbers + bookings, snapshot trigger BEFORE INSERT, trigger immutable esteso (anti-cheat), function `auto_decline_expired_bookings()` (Vault + pg_net). |
| `supabase/functions/refund-booking/index.ts` | **NEW** — endpoint riusabile per cancel/decline/auto_expire con refund Stripe condizionale. Auth gating per reason. |
| `supabase/functions/auto-decline-expired/index.ts` | **NEW** — invocata dal pg_cron via pg_net. Itera booking pending+paid >72h e chiama refund-booking. service_role only. |
| `src/hooks/useBooking.ts` | `cancelBooking()` e `declineBooking()` ora invocano `refund-booking` edge function (return shape `RefundResp`). `confirmBooking()` / `markDone()` invariate. |
| `src/hooks/useBarberDefaults.ts` | Aggiunto `cancellationWindowHours: number` al return (default 24). |
| `src/hooks/useBarberInfo.ts` | Aggiunto `cancellation_window_hours: string` al form + save (clamp 0-168). |
| `src/lib/format.ts` | Helper `formatCancellationWindow(hours)` con stringhe IT human-readable. |
| `src/types/supabase.ts` | `cancellation_window_hours: number` su `barbers` Row/Insert/Update e su `bookings` Row/Insert (Update intenzionalmente NON include il campo — trigger lo blocca). |
| `DEPLOYMENT.md` | §2.0 ordine update (5→6 step). §2.1 bump 038→039. §2.3 inventario 5 edge functions. Nuove §Vault setup + §Cron jobs setup §Job 2. |

## 2. Decisioni prese (dove il brief lasciava scelta)

- **Cron mechanism**: pg_cron chiama edge function via pg_net (opzione A del brief). Vault per service_role_key.
- **Trigger immutable per cancellation_window_hours**: con bypass service_role (come payment_status). Anti-cheat è anti-client/barber, non anti-admin.
- **Refund-booking signature**: unified endpoint con `reason` field. Service_role usa `auto_expire` only; gli altri due reason sono user-iniziated (caller.id match).
- **Cliente cancella oltre window (paid)**: `status='cancelled'` MA `payment_status` resta `'paid'` (cliente perde soldi). Niente stato `'forfeited'` o simile — discriminabile da `(status='cancelled' AND payment_status='paid')`.
- **Refund partial**: NON implementato. `stripe.refunds.create({payment_intent: ...})` senza amount = full refund. Future feature: refund partial (es. "perdi 20% se cancelli last-minute").
- **Idempotency refund**: `idempotencyKey = "refund_" + bookingId`. Doppio refund della stessa booking ritorna lo stesso refund Stripe.
- **Auto-decline batch limit**: 100 booking per esecuzione cron (`limit(100)`). Se ci sono mai più di 100 pending+paid >72h simultanee, il batch successivo (1h dopo) prende i restanti.
- **Reason cliente in `'pending_online'`**: refund-booking decide `shouldRefund = payment_status='paid' && within_window`. `pending_online` (PI creato, webhook non arrivato) → `shouldRefund=false` → status='cancelled' senza Stripe call. Edge case discussed: se il webhook arriva DOPO il cancel, `mark_booking_paid` flippa `payment_status='paid'` su una booking `status='cancelled'`. Cliente paga senza ricevere il servizio. **Fix non in questa PR** — richiede modifica stripe-webhook per skippare se status='cancelled'. Documentato come follow-up.

## 3. Test manuali pre-merge (4 nuovi BLOCKER + repeat PR payment)

| # | Test | Atteso |
|---|------|--------|
| **5** | Cliente cancella entro window (booking paid) | `status='cancelled'`, `payment_status='refunded'`, `refundId` ritornato, PI Dashboard mostra refund. |
| **6** | Cliente cancella oltre window (booking paid) | `status='cancelled'`, `payment_status='paid'` (invariato), `refunded:false`, niente Stripe call. Verifica via SELECT. |
| **7** | Anti-cheat: barbiere cambia `barbers.cancellation_window_hours` a 0 dopo che cliente ha prenotato | `bookings.cancellation_window_hours` della booking esistente **invariato**. UPDATE diretto via PostgREST sul campo bookings fallisce con `42501 cancellation_window_hours is immutable after booking`. |
| **8** | Cron 72h auto-decline | Manipola `bookings.created_at = now() - interval '73 hours'` via SQL service_role. Aspetta o invoca manuale `SELECT auto_decline_expired_bookings();`. Verifica: status=`declined`, payment_status=`refunded`, PI Dashboard mostra refund. |

Plus i 4 PR payment già verificati PASS (test 1/2/4 + test 3 con Stripe key reale).

## 4. Migration 039 — rollback plan

```sql
-- 1. Rimuovi snapshot trigger
DROP TRIGGER IF EXISTS bookings_snapshot_window ON public.bookings;
DROP FUNCTION IF EXISTS public.snapshot_cancellation_window();
-- 2. Rimuovi auto-decline function
DROP FUNCTION IF EXISTS public.auto_decline_expired_bookings();
-- 3. Ripristina trigger immutable al body di mig. 038 (senza cancellation_window_hours check)
-- Vedi 038_payment_security.sql sezione 2.
-- 4. Drop colonne
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_window_check;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancellation_window_hours;
ALTER TABLE public.barbers DROP COLUMN IF EXISTS cancellation_window_hours;
-- 5. Disattiva cron job auto-decline-expired-bookings da Dashboard UI (manuale).
```

Prima del rollback: verifica se ci sono booking con `status IN ('cancelled','declined')` con `payment_status='refunded'` recenti. Quelle sono già refunded su Stripe — il rollback DB non le rimette in paid.

## 5. Cose NON fatte in questa PR

- **UI changes**: nessuna. Rebuild UI integrerà `useBooking.cancelBooking()`/`declineBooking()` con i nuovi return shape, mostrerà `formatCancellationWindow()` in BookingSheet/EditBarberInfoSheet/MyAppointments, aggiungerà input per `cancellation_window_hours` in EditBarberInfoSheet.
- **stripe-webhook idempotency su cancelled booking**: se webhook arriva dopo che cliente ha cancellato una `pending_online`, `mark_booking_paid` flippa comunque. Follow-up: aggiungere check `IF existing.status='cancelled' THEN return existing` in `mark_booking_paid` (mig. 040 future).
- **Refund partial / cancellation fee**: full refund only. Future feature.
- **Email/notifica refund**: cliente non viene notificato. Stripe Dashboard manda email automatica del refund, OK come MVP.
- **Notifica barbiere su auto-decline**: barbiere non sa che una sua booking è stata auto-declinata (notification system esiste — useNotifications — ma integrazione fuori scope).
- **Tests automatici**: solo manual testing su staging dev. Future: integration test suite.
