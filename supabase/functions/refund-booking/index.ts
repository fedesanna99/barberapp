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
    // Per identificarlo, proviamo prima a vedere se il bearer matcha la
    // service_role key esatta (atteso solo per chiamate interne da
    // auto-decline-expired). In tutti gli altri casi usiamo il JWT user.
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    const isServiceRoleCaller = bearer === serviceRoleKey

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
    let refundId: string | null = null
    const shouldRefund =
      booking.payment_status === 'paid'
      && booking.stripe_payment_intent_id
      && withinWindow

    if (shouldRefund) {
      try {
        const refund = await stripe.refunds.create(
          { payment_intent: booking.stripe_payment_intent_id! },
          { idempotencyKey: `refund_${booking.id}` },  // doppia chiamata = stesso refund
        )
        refundId = refund.id
      } catch (err) {
        // Refund Stripe fallito: NON aggiorniamo il DB. Riportiamo 500.
        // L'utente o il cron ritenteranno.
        const msg = err instanceof Error ? err.message : 'Stripe refund failed'
        return json({ error: `Refund Stripe fallito: ${msg}` }, 500)
      }
    }

    // ── 7. DB update (service_role bypassa trigger pinning su payment_status) ─
    const updatePayload: Record<string, string> = { status: targetStatus }
    if (refundId) {
      updatePayload.payment_status = 'refunded'
    } else if (booking.payment_status === 'paid' && !withinWindow) {
      // Cliente fuori window: status=cancelled MA payment_status resta 'paid'
      // (cliente perde i soldi). Non c'è uno stato "kept" — restiamo su 'paid'
      // ma con status='cancelled', che indica chiaramente il caso "cliente ha
      // cancellato fuori window e non ha avuto refund".
    }

    const { error: upErr } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)

    if (upErr) {
      // Stripe ha rimborsato ma DB UPDATE fallisce → inconsistenza nota.
      // Stripe non si "unrefunda"; logghiamo e ritorniamo 500 per ritentare.
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
      withinWindow,
      booking: {
        id: booking.id,
        status: targetStatus,
        payment_status: refundId ? 'refunded' : booking.payment_status,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore interno'
    return json({ error: message }, 500)
  }
})
