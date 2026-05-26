// auto-decline-expired — Edge Function
//
// Invocata da pg_cron via auto_decline_expired_bookings() (mig. 039).
// Itera sulle booking pending + paid create da più di 72h, e per ognuna
// chiama refund-booking con reason='auto_expire'.
//
// Auth: bearer JWT con claim `role='service_role'`. La firma NON viene
// verificata — il bearer arriva da pg_net che lo legge dal Vault
// (admin-controlled), e l'unico danno potenziale di un JWT forgiato è
// triggerare manualmente il cron (refund-booking ha auth check separati).
// Vedi commit message per motivazione completa.
//
// Return: { processed: N, results: [{ bookingId, ok|skipped|error, ... }] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const TTL_HOURS = 72

// Decodifica il payload (parte 2) di un JWT formato HS256/ES256.
// NON verifica la firma — vedi auth check sotto per il trust model.
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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth check: bearer JWT con claim role='service_role'.
    // Versione precedente: confronto stringa con Deno.env.get('SUPABASE_SERVICE_ROLE_KEY').
    // Falliva quando Vault e Deno.env contenevano formati di chiave diversi
    // (legacy JWT vs sb_secret_*). Nuova versione: decodifica il JWT e
    // controlla solo il claim role — funziona indipendentemente dal formato.
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
    const payload = decodeJwtPayload(bearer)
    if (!payload || payload.role !== 'service_role') {
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
