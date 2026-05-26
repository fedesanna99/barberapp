// refund-booking — Edge Function
//
// Cancella una booking (status='cancelled' o 'declined') e, se era stata
// pagata online, esegue il refund su Stripe.
//
// Contratto:
//   - Body: { bookingId: string, reason: 'client_cancel' | 'barber_decline' | 'auto_expire' }
//   - Header: Authorization: Bearer <JWT>      (sempre obbligatorio)
//
// Auth gating per reason:
//   - client_cancel:  JWT user + caller.id === booking.client_id +
//                     hours_until_appointment >= booking.cancellation_window_hours.
//                     Oltre la window: status='cancelled' MA niente refund
//                     (200 con `refunded: false`).
//   - barber_decline: JWT user + caller.id === (SELECT profile_id FROM barbers
//                     WHERE id = booking.barber_id).
//   - auto_expire:    JWT è la service_role key (chiamata da auto-decline-expired) +
//                     check now() > booking.created_at + 72h +
//                     status='pending' + payment_status='paid'.
//
// Idempotenza:
//   - Se payment_status già 'refunded' → 200 no-op.
//   - Se status già finalizzato in modo coerente col reason → 200 no-op.

import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary':                         'Origin',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

type Reason = 'client_cancel' | 'barber_decline' | 'auto_expire'
const VALID_REASONS: Reason[] = ['client_cancel', 'barber_decline', 'auto_expire']

// Decodifica il payload (parte 2) di un JWT. NON verifica la firma.
// Vedi auto-decline-expired/index.ts per trust model (admin-controlled bearer).
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── 1. Auth ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    // Determina se il caller è service_role (auto_expire) o un utente normale.
    // Decodifichiamo il JWT e guardiamo il claim `role`. Pattern coerente con
    // auto-decline-expired (vedi quel file per motivazione: Vault può
    // contenere uno tra legacy JWT e sb_secret_* formati, env può contenere
    // l'altro — strict equality non funziona).
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
    const bearerPayload = decodeJwtPayload(bearer)
    const isServiceRoleCaller = bearerPayload?.role === 'service_role'

    let callerId: string | null = null
    if (!isServiceRoleCaller) {
      const callerClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error: userErr } = await callerClient.auth.getUser()
      if (userErr || !user) return json({ error: 'Unauthorized' }, 401)
      callerId = user.id
    }

    // ── 2. Body parse + validate ────────────────────────────────────────────
    let body: { bookingId?: unknown; reason?: unknown }
    try { body = await req.json() } catch { return json({ error: 'Body non valido (JSON)' }, 400) }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : null
    const reason = typeof body.reason === 'string' ? body.reason as Reason : null
    if (!bookingId) return json({ error: 'bookingId mancante' }, 400)
    if (!reason || !VALID_REASONS.includes(reason)) {
      return json({ error: 'reason invalido (atteso client_cancel | barber_decline | auto_expire)' }, 400)
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
      return json({ error: 'bookingId non UUID' }, 400)
    }

    // Reason-vs-caller validation (early rejection)
    if (reason === 'auto_expire' && !isServiceRoleCaller) {
      return json({ error: 'auto_expire reserved to service_role' }, 403)
    }
    if (reason !== 'auto_expire' && isServiceRoleCaller) {
      // service_role NON deve usare reason='client_cancel' o 'barber_decline'.
      // L'audit trail richiede che quelle siano azioni utente-iniziate.
      return json({ error: 'service_role può solo usare reason=auto_expire' }, 403)
    }

    // ── 3. Carica booking via service_role (full access) ────────────────────
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('id, client_id, barber_id, status, payment_status, stripe_payment_intent_id, date, time_slot, created_at, cancellation_window_hours')
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) return json({ error: 'Booking non trovata' }, 404)

    // ── 4. Owner check + business rules per reason ─────────────────────────
    let targetStatus: 'cancelled' | 'declined'
    let withinWindow = false

    if (reason === 'client_cancel') {
      if (booking.client_id !== callerId) return json({ error: 'Forbidden (not client owner)' }, 403)

      // Calcola ore mancanti all'appuntamento. date+time_slot in fuso DB (UTC).
      const apptIso = `${booking.date}T${booking.time_slot}+00:00`
      const apptTime = new Date(apptIso).getTime()
      const nowTime = Date.now()
      const hoursLeft = (apptTime - nowTime) / 3_600_000
      withinWindow = hoursLeft >= (booking.cancellation_window_hours ?? 24)
      targetStatus = 'cancelled'
    } else if (reason === 'barber_decline') {
      // caller deve essere il profile_id del barbiere
      const { data: barberRow } = await admin
        .from('barbers')
        .select('profile_id')
        .eq('id', booking.barber_id)
        .single()
      if (!barberRow || barberRow.profile_id !== callerId) {
        return json({ error: 'Forbidden (not barber owner)' }, 403)
      }
      targetStatus = 'declined'
      withinWindow = true  // il barbiere decide → refund automatico se paid
    } else /* auto_expire */ {
      // Cron-driven: solo pending+paid + 72h
      const createdMs = new Date(booking.created_at).getTime()
      const age_h = (Date.now() - createdMs) / 3_600_000
      if (booking.status !== 'pending' || booking.payment_status !== 'paid') {
        return json({ skipped: true, reason: 'state changed', current: { status: booking.status, payment_status: booking.payment_status } })
      }
      if (age_h < 72) {
        return json({ skipped: true, reason: 'not yet expired', age_hours: age_h })
      }
      targetStatus = 'declined'
      withinWindow = true
    }

    // ── 5. Idempotenza ──────────────────────────────────────────────────────
    if (booking.payment_status === 'refunded') {
      return json({ idempotent: true, action: 'noop', booking: { id: booking.id, status: booking.status, payment_status: 'refunded' } })
    }
    if (booking.status === targetStatus && booking.payment_status !== 'paid') {
      // Già nello stato target e nessun pagamento da rimborsare → no-op.
      return json({ idempotent: true, action: 'noop', booking: { id: booking.id, status: targetStatus, payment_status: booking.payment_status } })
    }

    // ── 6. Stripe refund — solo se paid + (within window OR barber/auto) ───
    // Mig. 040: su Stripe error la cancellazione VA AVANTI (slot si libera) e
    // settiamo refund_status='failed_pending_manual'. Il client vede l'alert
    // sticky in MyAppointments e il supporto rimborsa manualmente.
    let refundId: string | null = null
    let refundFailed = false
    let refundFailedReason: string | null = null

    const shouldRefund =
      booking.payment_status === 'paid'
      && booking.stripe_payment_intent_id
      && withinWindow

    if (shouldRefund) {
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: booking.stripe_payment_intent_id!,
            reason: 'requested_by_customer',
          },
          { idempotencyKey: `refund_${booking.id}` },  // doppia chiamata = stesso refund
        )
        refundId = refund.id
      } catch (err) {
        // Refund Stripe fallito: NON 500. Flagghiamo refund_status e proseguiamo
        // con la cancellazione. Il supporto interviene manualmente.
        refundFailed = true
        refundFailedReason = err instanceof Error ? err.message : 'Stripe refund failed'
        console.error('Stripe refund failed:', refundFailedReason, 'booking:', booking.id)
      }
    }

    // ── 7. DB update (service_role bypassa trigger pinning su payment_status) ─
    // Tre scenari per payment_status / refund_status:
    //   (a) Refund OK     → payment_status='refunded', refund_status='succeeded'
    //   (b) Refund failed → payment_status='paid'    , refund_status='failed_pending_manual'
    //   (c) Niente refund → payment_status invariato, refund_status='none'
    //       (cash, oltre-window paid, oppure pending_online non-confermato)
    const updatePayload: Record<string, string> = { status: targetStatus }
    if (refundId) {
      updatePayload.payment_status = 'refunded'
      updatePayload.refund_status = 'succeeded'
    } else if (refundFailed) {
      // Stripe ha rifiutato — soldi ancora con Stripe, supporto manuale necessario.
      updatePayload.refund_status = 'failed_pending_manual'
    }
    // Caso (c) niente refund: NON tocchiamo payment_status (resta 'paid' o 'pending_cash'),
    // NON tocchiamo refund_status (resta 'none' di default).

    const { error: upErr } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)

    if (upErr) {
      // Refund OK su Stripe ma DB UPDATE fallisce → inconsistenza nota.
      // Stripe non si "unrefunda"; logghiamo e ritorniamo 500 per ritentare.
      // Niente refund_status='failed_pending_manual' qui — il refund è OK,
      // solo il DB write è in errore; alla retry il refund è idempotente.
      return json({
        error: `DB update failed after refund: ${upErr.message}`,
        refundId,
        warning: 'Stripe refund issued; manual DB reconciliation may be needed',
      }, 500)
    }

    return json({
      ok: true,
      action: targetStatus,
      refunded: !!refundId,
      refundId,
      refund_failed: refundFailed,
      refund_failed_reason: refundFailedReason,
      withinWindow,
      booking: {
        id: booking.id,
        status: targetStatus,
        payment_status: refundId ? 'refunded' : booking.payment_status,
        refund_status: refundId
          ? 'succeeded'
          : refundFailed
            ? 'failed_pending_manual'
            : 'none',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore interno'
    return json({ error: message }, 500)
  }
})
