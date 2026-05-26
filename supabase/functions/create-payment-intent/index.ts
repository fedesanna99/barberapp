// create-payment-intent — Edge Function
//
// Crea un Stripe PaymentIntent autorizzato per una booking esistente.
//
// Contratto NUOVO (post-migration 038):
//   - Body: { bookingId: string }            ← NIENTE amount dal client.
//   - Header: Authorization: Bearer <JWT>    ← obbligatorio.
//   - Pre-condizione: la booking deve esistere, appartenere all'utente del JWT,
//     ed essere in payment_status='pending_online'.
//   - L'amount è derivato server-side da services.price (con fallback su
//     barbers.default_price), MAI dal client. Chiude F002.
//   - Idempotency key = bookingId: doppio click sul "Paga" non crea 2 charge.
//   - Scrive stripe_payment_intent_id sulla booking via service_role (l'unica
//     strada permessa dal trigger esteso in migration 038).
//   - CORS: ALLOWED_ORIGIN env (fallback '*' solo se non impostata, da non
//     fare in produzione — il warning è documentato in DEPLOYMENT.md).
//
// Vecchio comportamento (chiuso): nessun auth, amount dal client, metadata
// dal client → un attacker con DevTools poteva creare un PI per 1 centesimo
// con barber_id arbitrario.

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // ── 1. Auth: estrai il JWT e verifica l'utente ──────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !caller) return json({ error: 'Unauthorized' }, 401)

    // ── 2. Parse + validazione body ─────────────────────────────────────────
    let body: { bookingId?: unknown }
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Body non valido (atteso JSON)' }, 400)
    }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId : null
    if (!bookingId) {
      return json({ error: 'bookingId mancante o non valido' }, 400)
    }
    // UUID sanity check (PostgREST tipa la colonna come uuid)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
      return json({ error: 'bookingId non è un UUID valido' }, 400)
    }

    // ── 3. Carica booking server-side col JWT del chiamante ─────────────────
    // RLS bookings_select limita la lettura a (client_id = auth.uid()) o ai
    // partecipanti. Quindi se l'utente non è il client_id, la query torna 0 righe.
    const { data: booking, error: bErr } = await callerClient
      .from('bookings')
      .select('id, client_id, barber_id, service_id, payment_status, stripe_payment_intent_id')
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) {
      // Non distinguere "not found" da "permission denied" per evitare enumeration.
      return json({ error: 'Booking non trovata' }, 404)
    }
    if (booking.client_id !== caller.id) {
      return json({ error: 'Forbidden' }, 403)
    }
    if (booking.payment_status !== 'pending_online') {
      return json({
        error: `Booking non in stato pagabile (payment_status=${booking.payment_status})`,
      }, 409)
    }

    // ── 4. Calcola amount server-side: services.price o barbers.default_price ─
    // Uso service_role per bypassare RLS qui — l'utente potrebbe non avere
    // SELECT privilege su barbers.default_price (vincolato da policy), ma
    // la lookup è autorizzata semanticamente perché l'utente possiede la booking.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let amountCents: number | null = null

    if (booking.service_id) {
      const { data: svc } = await adminClient
        .from('services')
        .select('price, is_active')
        .eq('id', booking.service_id)
        .single()
      if (svc && svc.is_active && Number(svc.price) > 0) {
        amountCents = Math.round(Number(svc.price) * 100)
      }
    }

    if (amountCents === null) {
      const { data: barberRow } = await adminClient
        .from('barbers')
        .select('default_price')
        .eq('id', booking.barber_id)
        .single()
      if (barberRow && barberRow.default_price != null && Number(barberRow.default_price) > 0) {
        amountCents = Math.round(Number(barberRow.default_price) * 100)
      }
    }

    if (amountCents === null || amountCents <= 0) {
      return json({
        error: 'Prezzo non disponibile per questo servizio/barbiere',
      }, 422)
    }

    // ── 5. Idempotency: se la booking ha già un PI, riusalo ─────────────────
    if (booking.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
        // Se il PI è in uno stato riutilizzabile, torna il clientSecret esistente.
        if (
          existing.status === 'requires_payment_method' ||
          existing.status === 'requires_confirmation' ||
          existing.status === 'requires_action' ||
          existing.status === 'processing'
        ) {
          return json({
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
            reused: true,
          })
        }
        // Se è succeeded/canceled, fall-through: crea uno nuovo (raro, gestiamo difensivamente).
      } catch {
        // PI non più recuperabile su Stripe (testkey/key change?); ricrea.
      }
    }

    // ── 6. Crea il PaymentIntent. idempotencyKey = bookingId → niente doppi charge ─
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount:   amountCents,
        currency: 'eur',
        metadata: {
          booking_id: booking.id,
          barber_id:  booking.barber_id,
          service_id: booking.service_id ?? '',
          client_id:  booking.client_id,
        },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: bookingId },
    )

    // ── 7. Salva il PI id sulla booking via service_role ────────────────────
    // Il trigger esteso in migration 038 permette la mutazione di
    // stripe_payment_intent_id solo a service_role. Qui ci passa.
    const { error: upErr } = await adminClient
      .from('bookings')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', booking.id)

    if (upErr) {
      // PaymentIntent è creato su Stripe ma non scritto sul nostro DB.
      // Best-effort: cancella il PI per evitare orfani.
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id)
      } catch { /* ignore */ }
      return json({ error: `DB write failed: ${upErr.message}` }, 500)
    }

    return json({
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore interno'
    // Non logghiamo body/headers per evitare leak di token.
    return json({ error: message }, 500)
  }
})
