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

### Opzionali

| Nome                       | Effetto se mancante                                                                                       |
|----------------------------|-----------------------------------------------------------------------------------------------------------|
| `VITE_HCAPTCHA_SITE_KEY`   | I form auth non mostrano captcha (usare solo in dev).                                                     |
| `VITE_MAPTILER_KEY`        | La mappa Discover usa OpenFreeMap (community, **non-commercial** — non adatto a produzione SaaS).         |
| `VITE_MAINTENANCE`         | Se `'true'`, l'app mostra la pagina manutenzione PRIMA di Supabase. Usare per push schema/deploy critici. |

### Come impostarle su Vercel

1. Vercel dashboard → il progetto → **Settings** → **Environment Variables**.
2. Aggiungi ciascuna voce, scegliendo gli ambienti **Production**, **Preview**, **Development** in base a dove serve (di norma tutte e 3 per `VITE_SUPABASE_*`).
3. Dopo il primo deploy, **non basta** modificare le env: serve un re-deploy esplicito perché Vite le inietta in build time.

---

## 2. Configurazione Supabase

### 2.1 Applica le migrations

Cartella: `supabase/migrations/`. Numerate `001` → `032`, vanno applicate **in ordine**. Da Supabase SQL Editor o `supabase db push`:

```bash
# se usi la CLI:
supabase link --project-ref <project-ref>
supabase db push
```

> ⚠️ Migration **032_booking_slots_view.sql** è obbligatoria pre-lancio: chiude un leak RLS che esponeva tutte le prenotazioni a qualunque utente autenticato. Senza, va via privacy.

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

L'unica funzione è `admin-create-user` (creazione utenti dall'AdminPanel). Va deployata manualmente:

```bash
supabase functions deploy admin-create-user
```

> ⚠️ Senza questo deploy, l'AdminPanel **non** può creare nuovi utenti. La funzione usa internamente la `SERVICE_ROLE_KEY` di Supabase: assicurati che le env vars di runtime della funzione siano popolate (Supabase le imposta automaticamente: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

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
