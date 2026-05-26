// auto-decline-expired — Edge Function
//
// Invocata da pg_cron via auto_decline_expired_bookings() (mig. 039).
// Itera sulle booking pending + paid create da più di 72h, e per ognuna
// chiama refund-booking con reason='auto_expire'.
//
// Auth: il chiamante deve esibire il service_role JWT (lo passa pg_cron
// leggendolo da Vault). Niente CORS (i webhook server-side non lo richiedono).
//
// Return: { processed: N, results: [{ bookingId, ok|skipped|error, ... }] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const TTL_HOURS = 72

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth check: solo service_role JWT (esatto match, no parsing).
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    if (bearer !== serviceRoleKey) {
      return json({ error: 'Unauthorized (service_role only)' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Carica candidate: pending + paid + created_at oltre TTL.
    const cutoffIso = new Date(Date.now() - TTL_HOURS * 3_600_000).toISOString()
    const { data: candidates, error: qErr } = await admin
      .from('bookings')
      .select('id, created_at')
      .eq('status', 'pending')
      .eq('payment_status', 'paid')
      .lt('created_at', cutoffIso)
      .limit(100)  // safety cap per esecuzione cron

    if (qErr) return json({ error: `DB query failed: ${qErr.message}` }, 500)
    if (!candidates || candidates.length === 0) {
      return json({ processed: 0, message: 'no expired bookings' })
    }

    // Per ognuna, chiama refund-booking. Lo facciamo via HTTP per riusare
    // tutta la logica (refund Stripe + update DB + audit response). Errori
    // di singole booking non bloccano le altre.
    const results: Array<Record<string, unknown>> = []
    for (const b of candidates) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/refund-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ bookingId: b.id, reason: 'auto_expire' }),
        })
        const text = await r.text()
        let parsed: unknown
        try { parsed = JSON.parse(text) } catch { parsed = text }
        results.push({ bookingId: b.id, status: r.status, body: parsed })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'fetch failed'
        results.push({ bookingId: b.id, status: 'EXC', error: msg })
      }
    }

    return json({ processed: candidates.length, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore interno'
    console.error('auto-decline-expired error:', message)
    return json({ error: message }, 500)
  }
})
