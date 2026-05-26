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

### 2.0 Ordine consigliato di prima installazione

Se questo è il primo deploy in un nuovo progetto Supabase (o stai applicando per la prima volta le mig. 038-039), segui questa sequenza. I passi 3, 4, 5, 6 sono **idempotenti** (puoi rifarli senza danno); il passo 1 (db push) è una volta sola.

1. **Applica le migrations** con `supabase db push` (vedi §2.1). Se è la prima volta che usi la CLI su un progetto storicamente gestito da Dashboard SQL Editor, prima fai `supabase migration repair --status applied 001 002 ... 037 --linked` per allineare il tracking, poi push applica solo 038-039.
2. **Deploy delle Edge Functions** (vedi §2.3): `admin-create-user`, `create-payment-intent`, `stripe-webhook`, `refund-booking` (mig. 039), `auto-decline-expired` (mig. 039).
3. **Set dei secret runtime** (vedi §1 + §Stripe): `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... ALLOWED_ORIGIN=...`. Senza, le edge functions partono ma rispondono 500 alla prima invocazione.
4. **Vault secret** (mig. 039, vedi §Vault setup): aggiungi via Dashboard UI un secret `name='service_role_key'` con value=la tua service_role key. Senza, la function `auto_decline_expired_bookings()` solleva `P0001` e il cron 72h non parte.
5. **Webhook endpoint** su Stripe Dashboard (vedi §Webhook setup): l'URL deve esistere prima di pubblicare la PWA, altrimenti i pagamenti completati su Stripe non aggiornano il DB.
6. **Cron jobs** via Supabase Dashboard UI (vedi §Cron jobs setup): schedula **due job** — `cleanup-abandoned-online-bookings` (mig. 038) e `auto-decline-expired-bookings` (mig. 039). Pg_cron non è schedulable da SQL sul ruolo `postgres` di Supabase.

### 2.1 Applica le migrations

Cartella: `supabase/migrations/`. Numerate `001` → `039`, vanno applicate **in ordine**. Da Supabase SQL Editor o `supabase db push`:

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
> - indice partial su `stripe_payment_intent_id` (lookup webhook).
>
> Il cleanup delle booking abbandonate (`pending_online` > 15 min) **non** è nella migration: va schedulato a mano via Dashboard UI dopo il push. Vedi §Cron jobs setup. Motivo: il ruolo `postgres` di Supabase non ha privilegi su `cron.job`, l'unica via supportata è la UI (che opera come `supabase_admin`).

> ⚠️ Migration **039_cancellation_policy.sql** — booking lifecycle (cancellation policy + TTL 72h auto-decline + refund flow). Aggiunge:
> - `barbers.cancellation_window_hours` (default 24, range 0-168);
> - `bookings.cancellation_window_hours` (snapshot all'INSERT via trigger, anti-cheat);
> - estende trigger immutable con anti-cheat su `cancellation_window_hours`;
> - function `auto_decline_expired_bookings()` (legge service_role_key da Vault, chiama edge function via pg_net).
>
> Stessa nota cron della 038: il secondo job (`auto-decline-expired-bookings`, schedule `0 * * * *`) va schedulato via Dashboard. Pre-requisito: Vault secret `service_role_key` esistente (vedi §Vault setup).

> ⚠️ Migration **040_refund_status.sql** — UI cancellation booking lifecycle (PR-tris). Aggiunge:
> - Enum `refund_status_enum` (`none` / `succeeded` / `failed_pending_manual` / `resolved_manually`);
> - colonna `bookings.refund_status` (default `none`, NOT NULL), backfill a `succeeded` per le righe storiche già `payment_status='refunded'`;
> - estende trigger immutable con pinning di `refund_status` (solo service_role può scriverlo);
> - `REVOKE UPDATE (refund_status) ON bookings FROM authenticated, anon` come defense-in-depth;
> - indice partial `idx_bookings_refund_status_failed` per la query alert sticky (`refund_status='failed_pending_manual'`).
>
> Coordinamento con edge function: `refund-booking` (re-deployare in §2.3) ora popola `refund_status='succeeded'` su Stripe success, e `'failed_pending_manual'` invece di 500 su Stripe error → la cancellazione va avanti, lo slot si libera, solo il refund resta pending. Niente nuovi cron, niente nuovi secret.

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

Le edge functions sono cinque:

```bash
supabase functions deploy admin-create-user
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy refund-booking
supabase functions deploy auto-decline-expired
```

| Function | Scopo | Quando è obbligatoria |
|----------|-------|-----------------------|
| `admin-create-user`     | Creazione utenti dall'AdminPanel (richiede `is_admin=true` sul chiamante). | Per AdminPanel. |
| `create-payment-intent` | Crea Stripe PaymentIntent autorizzato server-side per una booking esistente. Riceve `{bookingId}`, NON `amount`. | Per pagamenti online. |
| `stripe-webhook`        | Riceve eventi Stripe (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`). Unica fonte di verità per transizioni `paid` / `failed` / `refunded`. | Per pagamenti online. |
| `refund-booking`        | Cancella una booking + eventuale refund Stripe. Reason: `client_cancel` (applica window) / `barber_decline` / `auto_expire`. Chiamata da `useBooking.cancelBooking()` / `useBooking.declineBooking()` e da `auto-decline-expired`. | Per cancellation policy + refund. |
| `auto-decline-expired`  | Itera su bookings `pending+paid` create da >72h, chiama `refund-booking` con reason=`auto_expire` per ciascuna. Invocata da pg_cron via `auto_decline_expired_bookings()` (mig. 039) → pg_net → questo endpoint. Auth: service_role only. | Per TTL 72h auto-decline. |

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

### Vault setup (manuale, prerequisito per mig. 039)

La function `auto_decline_expired_bookings()` (mig. 039) legge la service_role key da Supabase Vault per fare la chiamata HTTP all'edge function `auto-decline-expired`. Senza il secret in Vault, la function solleva `P0001` e il cron `auto-decline-expired-bookings` fallisce.

1. Vai su **Supabase Dashboard → Project Settings → Vault** (oppure Database → Vault, dipende dalla versione del Dashboard).
2. Click **"Add new secret"**.
3. Configura:
   - **Name:** `service_role_key`
   - **Secret:** copia la tua service_role key da **Project Settings → API → "service_role secret"** (formato JWT ~250 char, inizia con `eyJ...`).
   - **Description:** *(opzionale)* "Used by pg_cron HTTP calls to internal edge functions"
4. Click **"Add secret"**.

**Verifica via SQL:**
```sql
SELECT name, length(decrypted_secret) AS len
  FROM vault.decrypted_secrets
 WHERE name = 'service_role_key';
```
Atteso: 1 riga con `len` tra 200 e 300 (il JWT della service_role è lungo).

> **Rotation della service_role key:** se la ruoti su Dashboard → API, devi aggiornare anche il secret in Vault. Le edge functions usano `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` che è auto-popolato da Supabase, quindi quelle si aggiornano da sole. La function `auto_decline_expired_bookings()` invece legge da Vault — se non lo aggiorni resta con la chiave vecchia e Stripe accetta il bearer scaduto (no auth failure visibile) ma il refund-booking risponde 401.

### Cron jobs setup (manuale, una volta sola)

#### Job 1: cleanup-abandoned-online-bookings (mig. 038)

Una booking in `payment_status='pending_online'` occupa lo slot (perché ha `status='pending'` e il partial unique index `bookings_no_double` blocca duplicati). Se l'utente abbandona durante il pagamento, lo slot resta bloccato finché qualcosa non rimuove la riga.

1. Vai su **Supabase Dashboard → Database → Cron Jobs** (UI sotto la voce Database nella sidebar; richiede `pg_cron` abilitato in Extensions — abilitalo prima se non lo è).
2. Click **"Add cron job"** (o "Create a new cron job").
3. Configura:
   - **Name:** `cleanup-abandoned-online-bookings`
   - **Schedule:** `*/5 * * * *` (ogni 5 minuti)
   - **SQL:**
     ```sql
     DELETE FROM bookings
      WHERE payment_status = 'pending_online'
        AND created_at < now() - interval '15 minutes';
     ```
4. Salva.

Lo slot si libera entro 15-20 min dall'abbandono.

#### Job 2: auto-decline-expired-bookings (mig. 039)

Una booking online `paid + pending` non risposta dal barbiere blocca lo slot e tiene fermi i soldi del cliente. TTL 72h: se il barbiere non conferma né declina entro 72 ore, il sistema auto-declina la booking e rimborsa Stripe.

**Pre-requisito:** Vault secret `service_role_key` esistente (vedi §Vault setup sopra).

1. Sulla stessa pagina Cron Jobs del Dashboard, click **"Add cron job"**.
2. Configura:
   - **Name:** `auto-decline-expired-bookings`
   - **Schedule:** `0 * * * *` (ogni ora, allo scoccare)
   - **SQL:**
     ```sql
     SELECT public.auto_decline_expired_bookings();
     ```
3. Salva.

La function chiama via pg_net l'edge function `auto-decline-expired`, che itera sulle booking idonee e per ognuna chiama `refund-booking` con reason=`auto_expire`. Risultato: status=`declined`, payment_status=`refunded`, Stripe refund issued.

> **Perché non in SQL/migration?** pg_cron su Supabase richiede `INSERT/UPDATE/DELETE` su `cron.job` (schema di proprietà di `supabase_admin`). Il ruolo `postgres` con cui gira `supabase db push` ha solo `SELECT`. La Dashboard UI esegue come `supabase_admin` dietro le quinte e bypassa il vincolo. Non c'è workaround SQL su Supabase managed.

**Alternativa cron Supabase-free:** scheduled edge function triggerata da Vercel Cron / Upstash QStash / GitHub Actions che POSTa direttamente a `/functions/v1/auto-decline-expired` con l'Authorization service_role header. Pattern fuori scope di questa migration.

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
