// stripe-webhook — Edge Function
//
// Unica fonte di verità per le transizioni di stato del pagamento sul DB.
// Chiude F004 (Sess 1) e completa il pattern dell'ordering nuovo:
// client → INSERT booking 'pending_online' → PaymentIntent → Stripe charges →
// → webhook → mark_booking_paid (o _payment_failed o _refunded).
//
// Eventi gestiti:
//   - payment_intent.succeeded     → mark_booking_paid(booking_id, pi.id)
//   - payment_intent.payment_failed→ mark_booking_payment_failed(booking_id, pi.id)
//   - charge.refunded              → mark_booking_refunded(pi.id)
//
// Idempotenza: Stripe può ritrasmettere lo stesso evento (specie su retry).
// Le tre function SECURITY DEFINER in migration 038 sono idempotenti per design.
//
// Sicurezza:
//   - Verifica firma con stripe.webhooks.constructEventAsync (usa Web Crypto in Deno).
//     Senza STRIPE_WEBHOOK_SECRET corretto, ogni request fallisce con 400.
//   - Niente CORS: i webhook non sono mai chiamati da browser.
//   - Niente JWT auth: l'autenticazione è la firma HMAC.
//
// Ritorni:
//   - 200 → l'evento è stato registrato (o ignorato come idempotente).
//   - 400 → firma invalida o body malformato → Stripe non ritenta.
//   - 500 → errore DB → Stripe ritenta con backoff esponenziale.

import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  if (!WEBHOOK_SECRET) {
    // Configurazione mancante: meglio fallire forte che processare senza firma.
    return json({ error: 'STRIPE_WEBHOOK_SECRET non configurato' }, 500)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return json({ error: 'Missing stripe-signature header' }, 400)
  }

  // Raw body necessario per la verifica HMAC. NON usare req.json().
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    // Async variant: in Deno/Edge la crypto è asincrona (Web Crypto API).
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'signature verification failed'
    return json({ error: `Webhook signature verification failed: ${message}` }, 400)
  }

  // Service role client: le tre mark_booking_* sono REVOKE PUBLIC, GRANT service_role.
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.booking_id
        if (!bookingId) {
          // PI senza metadata booking_id: log e ignora (potrebbe essere stato
          // creato da altro flow, non da noi).
          console.warn(`payment_intent.succeeded ${pi.id} senza booking_id in metadata`)
          return json({ received: true, ignored: 'no booking_id in metadata' })
        }
        const { error } = await admin.rpc('mark_booking_paid', {
          p_booking_id: bookingId,
          p_payment_intent_id: pi.id,
        })
        if (error) {
          console.error(`mark_booking_paid failed for ${bookingId}:`, error.message)
          return json({ error: error.message }, 500)
        }
        return json({ received: true, action: 'paid', bookingId })
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const bookingId = pi.metadata?.booking_id
        if (!bookingId) {
          return json({ received: true, ignored: 'no booking_id in metadata' })
        }
        const { error } = await admin.rpc('mark_booking_payment_failed', {
          p_booking_id: bookingId,
          p_payment_intent_id: pi.id,
        })
        if (error) {
          console.error(`mark_booking_payment_failed for ${bookingId}:`, error.message)
          return json({ error: error.message }, 500)
        }
        return json({ received: true, action: 'failed', bookingId })
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        // charge.payment_intent può essere string | PaymentIntent | null.
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id
        if (!piId) {
          return json({ received: true, ignored: 'no payment_intent on charge' })
        }
        const { error } = await admin.rpc('mark_booking_refunded', {
          p_payment_intent_id: piId,
        })
        if (error) {
          console.error(`mark_booking_refunded for ${piId}:`, error.message)
          return json({ error: error.message }, 500)
        }
        return json({ received: true, action: 'refunded', paymentIntentId: piId })
      }

      default:
        // Eventi non sottoscritti ma ricevuti per qualche ragione: ack senza fare nulla.
        return json({ received: true, ignored: event.type })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('webhook handler error:', message)
    return json({ error: message }, 500)
  }
})
