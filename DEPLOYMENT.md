# Deployment — CutBook → Vercel + Supabase

Guida operativa per portare la build di produzione in linea. Va seguita **per intero** la prima volta; per i deploy successivi basta la sezione finale "Deploy successivi".

---

## 1. Variabili d'ambiente

### Obbligatorie (build di produzione **fallisce** senza queste)

| Nome                       | Dove prenderla                                        |
|----------------------------|-------------------------------------------------------|
| `VITE_SUPABASE_URL`        | Supabase → Project Settings → API → "Project URL"     |
| `VITE_SUPABASE_ANON_KEY`   | Supabase → Project Settings → API → "anon public" key |

> Senza `VITE_SUPABASE_URL` l'app si rifiuta di partire (guard in [src/main.tsx](src/main.tsx)). Niente più "demo mode silenzioso" in produzione.

### Opzionali (frontend, prefisso `VITE_`)

| Nome                       | Effetto se mancante                                                                                       |
|----------------------------|-----------------------------------------------------------------------------------------------------------|
| `VITE_HCAPTCHA_SITE_KEY`   | I form auth non mostrano captcha (usare solo in dev).                                                     |
| `VITE_MAPTILER_KEY`        | La mappa Discover usa OpenFreeMap (community, **non-commercial** — non adatto a produzione SaaS).         |
| `VITE_MAINTENANCE`         | Se `'true'`, l'app mostra la pagina manutenzione PRIMA di Supabase. Usare per push schema/deploy critici. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Pagamenti online disabilitati silenziosamente. BookingSheet offre solo "Paga in loco". Vedi §Stripe.  |

### Secret server-side (su Supabase Edge Functions, **NON** prefisso `VITE_`)

| Nome                       | Dove                                                                                                       |
|----------------------------|------------------------------------------------------------------------------------------------------------|
| `STRIPE_SECRET_KEY`        | `supabase secrets set STRIPE_SECRET_KEY=sk_...` — usato da create-payment-intent e stripe-webhook.        |
| `STRIPE_WEBHOOK_SECRET`    | `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...` — verifica firma HMAC dei webhook. Vedi §Webhook.  |
| `ALLOWED_ORIGIN`           | `supabase secrets set ALLOWED_ORIGIN=https://your-domain.vercel.app` — restringe CORS su create-payment-intent. Fallback `*` se omesso (accettabile in dev, sconsigliato in produzione). |

### Come impostarle su Vercel

1. Vercel dashboard → il progetto → **Settings** → **Environment Variables**.
2. Aggiungi ciascuna voce, scegliendo gli ambienti **Production**, **Preview**, **Development** in base a dove serve (di norma tutte e 3 per `VITE_SUPABASE_*`).
3. Dopo il primo deploy, **non basta** modificare le env: serve un re-deploy esplicito perché Vite le inietta in build time.

---

## 2. Configurazione Supabase

### 2.0 Ordine OBBLIGATORIO di prima installazione

Se questo è il primo deploy in un nuovo progetto Supabase (o stai applicando per la prima volta la mig. 038), segui questa sequenza **esatta**. Invertire i passi 1↔2 fa fallire la mig. 038 in modo loud (errore `feature_not_supported` su `pg_cron`); non è catastrofico, ma richiede rollback parziale del DDL già applicato dalla 038 prima di ritentare.

1. **Abilita pg_cron** da Supabase Dashboard → Database → Extensions → cerca `pg_cron` → toggle ON. Non c'è equivalente SQL: `CREATE EXTENSION pg_cron` richiede superuser, che Supabase non concede.
2. **Applica le migrations** con `supabase db push` (vedi §2.1). Verifica che mig. 038 termini senza errori; in particolare che il blocco finale `cron.schedule('cleanup-abandoned-online-bookings', ...)` non sollevi exception.
3. **Deploy delle Edge Functions** (vedi §2.3): `admin-create-user`, `create-payment-intent`, `stripe-webhook`.
4. **Set dei secret runtime** (vedi §1 + §Stripe): `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... ALLOWED_ORIGIN=...`. Senza, le edge functions partono ma rispondono 500 alla prima invocazione.
5. **Webhook endpoint** su Stripe Dashboard (vedi §Webhook setup): l'URL deve esistere prima di pubblicare la PWA, altrimenti i pagamenti completati su Stripe non aggiornano il DB.

> ⚠️ **Rollback se ordine invertito:** se hai fatto `supabase db push` PRIMA di abilitare pg_cron, la mig. 038 ha applicato schema/trigger/function/policy ma è abortita sul blocco cron. Il DB è in stato consistente (la transazione è atomica per blocco DO) ma il cleanup non è schedulato. Fix: abilita pg_cron dal Dashboard, poi rieseegui SOLO il blocco DO finale di `038_payment_security.sql` (l'unico non-idempotente al re-run; il resto è già `IF NOT EXISTS` / `CREATE OR REPLACE`).

### 2.1 Applica le migrations

Cartella: `supabase/migrations/`. Numerate `001` → `038`, vanno applicate **in ordine**. Da Supabase SQL Editor o `supabase db push`:

```bash
# se usi la CLI:
supabase link --project-ref <project-ref>
supabase db push
```

> ⚠️ Migration **032_booking_slots_view.sql** è obbligatoria pre-lancio: chiude un leak RLS che esponeva tutte le prenotazioni a qualunque utente autenticato. Senza, va via privacy.

> ⚠️ Migration **038_payment_security.sql** è obbligatoria se attivi i pagamenti online: chiude i finding F001/F002/F004/F007 (vedi `FIX_PAYMENT_NOTES.md`). Senza, un utente con DevTools potrebbe scrivere `payment_status='paid'` su una booking senza pagare. La migration aggiunge:
> - lo stato `'failed'` al CHECK constraint su `payment_status`;
> - 3 function `SECURITY DEFINER` (`mark_booking_paid`, `mark_booking_payment_failed`, `mark_booking_refunded`) — l'unica via per transizionare a paid/failed/refunded;
> - estensione del trigger `bookings_prevent_immutable_change` che pinna `payment_status` e `stripe_payment_intent_id` contro UPDATE da client;
> - restringimento della policy `bookings_insert` (no `payment_status='paid'` su INSERT, no `stripe_payment_intent_id` settato dal client);
> - indice partial su `stripe_payment_intent_id` (lookup webhook);
> - pg_cron job per cleanup booking abbandonate. **Richiede pg_cron abilitato PRIMA dell'apply** — vedi §2.0 punto 1. Senza, la mig. 038 fallisce loud con `feature_not_supported`.

### 2.2 OAuth — Google login (Redirect URLs allowlist)

Authentication → **URL Configuration** → **Redirect URLs**: aggiungi:

```
https://<your-domain>.vercel.app
https://<your-domain>.vercel.app/
```

Più ogni dominio custom e gli URL dei deploy preview se intendi testarli (es. `https://<branch>-<project>.vercel.app`).

Site URL (sezione superiore): impostala sul dominio di produzione.

> Senza questo, il login Google fallisce silenziosamente: dopo il callback l'utente resta sulla schermata di login.

### 2.3 Deploy delle Edge Functions

Le edge functions sono tre:

```bash
supabase functions deploy admin-create-user
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
```

| Function | Scopo | Quando è obbligatoria |
|----------|-------|-----------------------|
| `admin-create-user`     | Creazione utenti dall'AdminPanel (richiede `is_admin=true` sul chiamante). | Per AdminPanel. |
| `create-payment-intent` | Crea Stripe PaymentIntent autorizzato server-side per una booking esistente. Riceve `{bookingId}`, NON `amount`. | Per pagamenti online. |
| `stripe-webhook`        | Riceve eventi Stripe (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`). Unica fonte di verità per transizioni `paid` / `failed` / `refunded`. | Per pagamenti online. |

> ⚠️ Senza il deploy di `create-payment-intent` e `stripe-webhook`, i pagamenti online non funzionano (toast d'errore al click su "Paga ora"). Setta anche i secret runtime (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ALLOWED_ORIGIN`) — vedi §1 secret e §Stripe sotto.

> ⚠️ `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sono pre-impostati da Supabase nelle Edge Functions; non vanno settati a mano.

### Stripe setup

1. **Account Stripe** (test mode va bene per dev/staging). Dashboard → Developers → API keys:
   - copia **Publishable key** in Vercel come `VITE_STRIPE_PUBLISHABLE_KEY`;
   - copia **Secret key** su Supabase: `supabase secrets set STRIPE_SECRET_KEY=sk_test_...`.

2. **Restringi CORS** dell'edge function `create-payment-intent` al dominio di prod:
   ```bash
   supabase secrets set ALLOWED_ORIGIN=https://your-domain.vercel.app
   ```
   Se omesso, l'edge function risponde con `Access-Control-Allow-Origin: *` (OK in dev, sconsigliato in prod).

### Webhook setup

1. **Crea il webhook endpoint** su Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Eventi da sottoscrivere (almeno):
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

2. Stripe genera un **Signing secret** (`whsec_...`). Settalo su Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

3. **Test locale con Stripe CLI**:
   ```bash
   # Forward eventi al webhook locale (richiede supabase functions serve attivo)
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   # In altra shell: triggera un test
   stripe trigger payment_intent.succeeded
   ```

4. **Rotation del webhook signing secret.** Se cambi URL endpoint (es. nuovo project ref, dominio diverso) o sospetti compromissione: su Stripe Dashboard → Webhooks → endpoint → "Roll secret" → genera nuovo `whsec_...` → `supabase secrets set STRIPE_WEBHOOK_SECRET=<nuovo>`. Stripe accetta entrambi i secret per 24h durante la rotation grace window — nessun downtime se redeploy entro quel periodo.

### Cleanup pagamenti abbandonati

Una booking in `payment_status='pending_online'` occupa lo slot (perché ha `status='pending'` e il partial unique index `bookings_no_double` blocca duplicati). Se l'utente abbandona durante il pagamento, lo slot resta bloccato finché qualcosa non rimuove la riga.

**Soluzione default (mig. 038):** pg_cron job ogni 5 min:
```sql
DELETE FROM bookings
 WHERE payment_status = 'pending_online'
   AND created_at < now() - interval '15 minutes';
```
Lo slot si libera entro 15-20 min dall'abbandono.

**Se pg_cron non è disponibile** sul tuo piano Supabase (es. Free): la mig. 038 termina con `RAISE EXCEPTION feature_not_supported`. Due opzioni:
- Upgrade a un piano che include pg_cron (Pro+).
- Skip manuale del blocco cron in mig. 038 e deploy di una scheduled edge function `cleanup-abandoned-bookings` triggerata da Vercel Cron / Upstash QStash / GitHub Actions. Schema:

```bash
# Esempio: function "cleanup-abandoned-bookings" + cron Vercel/Upstash
# Implementazione lasciata come follow-up; il pattern è banale.
```

### 2.4 Storage buckets

Verifica che esistano (creati dalla migration `015_storage_policies.sql` o manualmente):

- `avatars` — pubblico in lettura, scrittura solo dall'owner.
- `posts` — pubblico in lettura, scrittura solo dal proprietario del post.

### 2.5 Realtime publication

Già configurato dalle migrations (`003`, `012`, `031`). Verifica in Database → **Publications** → `supabase_realtime` che includa:
- `bookings`
- `support_conversations`, `support_messages`
- `direct_messages`, `conversations`

> **Non aggiungere `posts`, `likes`, `comments`, `notifications`** alla publication — l'app non si abbona a quelle tabelle (refetch on demand). Aggiungerle aumenta il traffico realtime senza beneficio.

---

## 3. Deploy su Vercel

### Setup iniziale (una sola volta)

1. Connetti il repo a Vercel.
2. Framework preset: **Vite** (Vercel lo riconosce da `vite.config.ts`).
3. Build command: `npm run build` (di default).
4. Output directory: `dist` (di default).
5. Imposta tutte le env vars (sezione 1).
6. Deploy.

### Deploy successivi

```bash
git push origin main
```

Vercel rideploya automaticamente su `main`. Per un deploy manuale:

```bash
vercel --prod
```

---

## 4. Smoke test post-deploy (obbligatorio)

In incognito sul dominio di produzione, in quest'ordine:

1. **Pagina iniziale carica** (no schermo bianco, no banner DEMO).
2. **Registrazione email** → conferma email → login.
3. **Login Google** → arriva sul Feed.
4. **Booking end-to-end:**
   - Cliente: Discover → Barbiere → "Prenota" → slot → conferma.
   - Barbiere (in un'altra sessione): Bottega → notifica nella tab "Pending" → conferma → toast appare al cliente.
5. **Upload foto:**
   - Cliente: Profilo → camera → upload → la foto appare nella griglia "I miei tagli".
   - Barbiere: Feed → nuovo post → upload → appare nel feed.
6. **Like / commento / save** su un post → tutto persistente al refresh.
7. **AdminPanel** (se hai un account `is_admin=true`): crea un utente test → login dell'utente test funziona → eliminalo.
8. **Direct Messages:** apri il profilo di un altro utente → "Messaggio" → invia → l'altra parte vede in realtime.
9. **Logout** → schermata login → refresh → resti sloggato.

### DevTools — controlli da fare

- **Network tab:** nessuna chiamata 401/403 silenziosa; nessuna richiesta a `unpkg.com` o `cdn.jsdelivr.net` dopo il task #9 (Phosphor via npm).
- **Console:** nessun warning di RLS, nessun "Missing publication", nessun errore React.
- **Application → Local Storage:** la sessione Supabase è salvata (`sb-<ref>-auth-token`).

### Performance (consigliato)

- Lighthouse mobile sul Feed: target Performance ≥ 70, Accessibility ≥ 90, Best Practices ≥ 90.
- Bundle size: la build genera ~573 kB per `index.js` (149 kB gzip) + ~1054 kB per `maplibre-gl` chunk (285 kB gzip). Quest'ultimo è caricato solo entrando in Discover.

---

## 5. Rollback

In caso di problemi:

1. Vercel dashboard → Deployments → seleziona l'ultimo deploy stabile → **Promote to Production**.
2. Se il problema è una migration applicata: **non c'è rollback automatico**. Le migration sono forward-only. Pianifica una migration `033_rollback_*.sql` che ripristina lo stato precedente.
3. Per disattivare l'app senza rollback: imposta `VITE_MAINTENANCE=true` su Vercel e redeploya. Mostra la pagina manutenzione finché non rimuovi la var.

---

## 6. Hardening / sicurezza checklist

- [ ] Service Role Key **mai** esposta nel frontend (solo nelle Edge Functions e in Vercel env senza prefisso `VITE_`).
- [ ] hCaptcha attivato in produzione (`VITE_HCAPTCHA_SITE_KEY` popolato) — protezione signup.
- [ ] CSP header in [vercel.json](vercel.json) verificato dopo modifiche a script/style/font esterni.
- [ ] Migration 032 applicata (chiude leak RLS bookings).
- [ ] Edge Function `admin-create-user` deployata con la correzione `is_admin` (codice in `supabase/functions/admin-create-user/index.ts`).
- [ ] Backup Supabase pianificato (Database → Backups → automatico già attivo nel piano Pro+).

---

## 7. Troubleshooting

| Sintomo                                              | Causa probabile                                                            | Fix                                                                       |
|------------------------------------------------------|----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| Schermo rosso "Configurazione mancante"              | `VITE_SUPABASE_URL` non impostata su Vercel                                | Aggiungi env var + redeploy.                                              |
| Login Google torna alla schermata di login           | URL del dominio non in allowlist Supabase Auth                             | Sezione 2.2.                                                              |
| AdminPanel: "Forbidden" creando utenti               | Edge Function non deployata o env vars runtime mancanti                    | Sezione 2.3.                                                              |
| Map non si carica                                    | `VITE_MAPTILER_KEY` mancante e OpenFreeMap down                            | Aggiungi key MapTiler (free tier 100k loads/mo).                          |
| Slot grid non si aggiorna in realtime per altri      | Atteso post-task #2 (migration 032). L'exclusion constraint blocca insert | Documentato in [ISTRUZIONI_PRODUZIONE.md](ISTRUZIONI_PRODUZIONE.md) §3 #2.|
| Toast "Slot non più disponibile"                     | Race condition coperta dall'exclusion constraint server-side               | Comportamento atteso, è la mitigazione.                                   |
