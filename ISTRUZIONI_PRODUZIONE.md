# Istruzioni operative — Hardening pre-produzione CutBook

> **A chi legge (Claude):** questo è un piano di lavoro vincolante per portare l'app dal demo a un deploy reale. Esegui i task **uno alla volta**, **nell'ordine dato** (la priorità è severità decrescente: prima i CRITICAL, poi gli HIGH, poi i MEDIUM). Passa al task successivo **solo quando i criteri di "Fatto quando" sono soddisfatti**. Ciò che non puoi fare tu (SQL su Supabase remoto, env var su Vercel, deploy delle Edge Functions, scelte di prodotto) lo annoti nel registro interventi manuali in `PROGRESS.md` e lo riepiloghi alla fine.
>
> Il report di partenza è in chat: è il consolidato di 5 audit incrociati su auth/RLS, feed/DM, discover/admin, visual/UX, dead-code. Le sezioni "Falsi positivi" sotto sono state già verificate manualmente — **non riaprirle**.

---

## 0. Contesto

**Stack:** React 18 + Vite 5 + TypeScript + Supabase (Postgres + Auth + Storage + Realtime + Edge Functions). Deploy su Vercel. App mobile-first, phone-frame UI (max-width 430px, 100dvh). Design system: oggetto colori `C` in [src/lib/colors.ts](src/lib/colors.ts), icone Phosphor webfont.

**Build baseline (verificata al 2026-05-18):**
- `npx tsc --noEmit` → 0 errori
- `npx vite build` → ok, solo warning size su chunk `maplibre-gl` (1054 kB)

**Stato modalità demo:** `IS_DEMO = !import.meta.env.VITE_SUPABASE_URL` in [src/lib/supabase.ts:8](src/lib/supabase.ts:8). Quando vero, hook/mutations cadono su `demoData.ts`. **Questa è la fonte di un CRITICAL in produzione** (task #3).

---

## 1. Decisioni vincolanti (non riaprirle)

1. **Admin = `profiles.is_admin boolean`** (migration 029 già applicata). Non esiste più `role='admin'`. Dove trovi un check `role === 'admin'` o `role = 'admin'` (SQL o codice), è un bug — fixalo a `is_admin = true`.

2. **Commenti su Supabase (migration 022) — NON sono più demo-only.** Non flaggarli, non re-implementarli.

3. **Realtime per posts/likes/comments non è previsto.** Il client non subscribe a quelle tabelle; il feed si rinfresca con refetch. **Non aggiungere** `ALTER PUBLICATION supabase_realtime ADD TABLE posts` e simili.

4. **Modalità manutenzione** già gestita via `VITE_MAINTENANCE`. Vedi [src/main.tsx](src/main.tsx) / [StatusPages.tsx](src/screens/StatusPages.tsx). Non cambiare il pattern.

5. **`bookings.status` resta `(pending, confirmed, done, cancelled)`** per ora. L'aggiunta di `'declined'` è in MEDIUM (task #16) — affrontarla **solo** dopo aver chiuso tutti i CRITICAL/HIGH.

6. **Storage limit lato bucket:** la size limit l'aggiungiamo client-side (task #10). Il bucket policy SQL la modifichi solo se l'utente conferma esplicitamente che vuole anche il guard a livello DB.

---

## 2. Metodo di lavoro (vincolante)

Per ogni task:
1. Leggi obiettivo + criteri di "Fatto quando".
2. Implementa la parte di codice che puoi fare tu (TS/React/CSS/SQL).
3. Se il task tocca il DB remoto o le Edge Functions: scrivi la migrazione/file ma **NON deployare** — registra l'azione manuale richiesta in `PROGRESS.md`.
4. Verifica: `npx tsc --noEmit` pulito + test manuale del flusso specifico + nessuna regressione su login/feed/booking.
5. Aggiorna `PROGRESS.md` (sotto la sezione "Hardening prod"): `✅ fatto` / `⚠️ codice ok, serve step manuale` / `❌ bloccato (motivo)`, file toccati, eventuali interventi manuali.
6. Commit atomico con messaggio `fix: <task short title>` (in inglese, come la convenzione esistente nel repo).
7. Solo ora passa al task successivo.

**Definition of Done generica (in aggiunta ai criteri specifici):**
- `npx tsc --noEmit` → 0 errori.
- `npx vite build` → completa senza nuovi warning oltre a quelli preesistenti.
- Nessuna regressione su: login Google + email, prenotazione end-to-end, feed con like, profilo barbiere.
- Nessun nuovo `alert()`, `console.log` di debug, `TODO`/`FIXME` lasciato in.
- `PROGRESS.md` aggiornato.

**Quando usare `/compact`:** ogni 3–4 task chiusi. Prima di compattare, assicurati che `PROGRESS.md` sia aggiornato (sopravvive alla compattazione). Dopo `/compact`, rileggi questo file e prosegui dal primo task non chiuso.

---

## 3. CRITICAL — bloccano il lancio (chiudere TUTTI prima di andare avanti)

### Task #1 — Fixare Edge Function `admin-create-user`

**Problema.** [supabase/functions/admin-create-user/index.ts:34-39](supabase/functions/admin-create-user/index.ts:34) controlla `profile?.role !== 'admin'`. Migration 029 ha rimosso `'admin'` dal CHECK di `profiles.role` (ora vive su `profiles.is_admin boolean`). Ogni invocazione restituisce 403 → la creazione utente da AdminPanel è rotta in produzione.

**Cosa fare.**
1. In `index.ts`, cambia la SELECT da `'role'` a `'is_admin'`.
2. Cambia il check in `if (profile?.is_admin !== true) return json({ error: 'Forbidden' }, 403)`.
3. **Step manuale (registralo in PROGRESS.md):** dopo il merge, deploy della funzione con `supabase functions deploy admin-create-user`. L'utente deve farlo lui, tu non hai credenziali.

**Fatto quando.**
- Codice modificato e committato.
- `PROGRESS.md` contiene la riga "Deploy Edge Function `admin-create-user` (manuale, utente)".

**File:** `supabase/functions/admin-create-user/index.ts`. **Effort: S (5 min)**.

---

### Task #2 — Chiudere il leak RLS su `bookings_availability_select`

**Problema.** [supabase/migrations/007_booking_availability_select.sql:5-6](supabase/migrations/007_booking_availability_select.sql:5) ha la policy:
```sql
create policy "bookings_availability_select" on bookings
  for select using (auth.uid() is not null);
```
Espone **tutte** le righe (barber_id, client_id, date, time_slot, status, created_at) a qualunque utente autenticato. Il commento giustifica con "client_id è UUID senza PII" ma la relazione "cliente X prenota dal barbiere Y al tempo T" è metadata sensibile e regalano enumerazione completa dell'attività della piattaforma.

**Cosa fare.**
1. Crea `supabase/migrations/032_booking_slots_view.sql`:
   ```sql
   -- Espone solo (barber_id, date, time_slot) per slot occupati.
   -- Niente client_id, niente status diverso da pending/confirmed.
   create or replace view public.booking_slots
     with (security_invoker = true) as
     select barber_id, date, time_slot
     from public.bookings
     where status in ('pending','confirmed');

   grant select on public.booking_slots to authenticated;

   -- La view eredita le policy delle tabelle sottostanti, ma quelle attuali
   -- bloccano il select cross-utente sulle bookings — quindi aggiungiamo una
   -- policy mirata SOLO sulle colonne esposte dalla view.
   -- Drop della policy permissiva attuale.
   drop policy if exists "bookings_availability_select" on public.bookings;

   -- Nuova policy: select consentito a tutti gli authenticated MA solo se
   -- la query è quella della view (verifica usando una colonna check).
   -- Implementazione: la view ha security_invoker=true e le altre due policy
   -- (bookings_client_select, bookings_barber_select) coprono i casi d'uso
   -- diretti; il filtro slot/disponibilità passa SOLO dalla view.
   ```
2. In [src/hooks/useAvailability.ts](src/hooks/useAvailability.ts), cambia il `.from('bookings').select('time_slot')` in `.from('booking_slots').select('time_slot')` (il filtro `.eq('barber_id', ...).eq('date', ...)` resta uguale).
3. Verifica con type-check: la view non è nei tipi generati, quindi probabile errore TS. Aggiungi un cast `as any` con commento `// view defined in migration 032` oppure rigenera i tipi (registralo come step manuale se non puoi).
4. **Step manuale:** applicare migration 032 al DB remoto.

**Fatto quando.**
- Migration 032 esiste e droppa la policy vecchia.
- `useAvailability.ts` usa `booking_slots`.
- Smoke test in demo mode: la slot grid si popola comunque.
- `PROGRESS.md` registra "Applicare migration 032 su Supabase (manuale)".

**File:** `supabase/migrations/032_booking_slots_view.sql`, `src/hooks/useAvailability.ts`. **Effort: M (30 min + test)**.

---

### Task #3 — Fail-fast quando mancano env vars di produzione

**Problema.** [src/lib/supabase.ts:4-8](src/lib/supabase.ts:4) — se Vercel non riceve `VITE_SUPABASE_URL`, l'app parte in `IS_DEMO=true`, gli utenti "salvano" in memoria e perdono tutto al refresh. Nessun warning visibile.

**Cosa fare.**
1. In [src/main.tsx](src/main.tsx), prima del `ReactDOM.createRoot(...)`:
   ```ts
   if (import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL) {
     document.body.innerHTML = '<div style="font:14px/1.5 system-ui;padding:24px;color:#A03;">Configurazione mancante: <code>VITE_SUPABASE_URL</code> non impostato. Contatta l\'amministratore.</div>'
     throw new Error('Missing VITE_SUPABASE_URL in production build')
   }
   ```
2. In dev mode (no env): mostra un banner persistente in alto:
   - Aggiungi in `App.tsx` un piccolo banner condizionale `{IS_DEMO && <DemoBanner />}` con testo "DEMO MODE — nessun dato persistente" (sfondo `C.accentLight`, testo `C.accentDeep`, fontSize 11).
   - Tienilo dismissibile via localStorage (`cutbook_demo_banner_dismissed`).

**Fatto quando.**
- Build di produzione senza env vars → l'app NON parte e mostra il messaggio rosso.
- `npm run dev` senza env vars → banner DEMO visibile, dismissibile.
- `npm run dev` con env vars vere → nessun banner.

**File:** `src/main.tsx`, `src/App.tsx`. **Effort: S (15 min)**.

---

## 4. HIGH — fixare prima del lancio

### Task #4 — Sostituire `alert()` con Toast

**Problema.** Quattro `alert()` nativi che bloccano la UI mobile:
- [src/screens/Feed.tsx:488](src/screens/Feed.tsx:488) e [505](src/screens/Feed.tsx:505)
- [src/screens/DirectMessages.tsx:193](src/screens/DirectMessages.tsx:193) e [203](src/screens/DirectMessages.tsx:203)

**Cosa fare.**
1. **Feed.tsx:** il componente già riceve toast handling tramite il parent? Verifica passando da `App.tsx` (Feed non riceve `onToast` direttamente — c'è il toast state locale in App). Aggiungi `onToast?: (t: ToastEvent) => void` a `FeedProps`, passa `setToast` da `App.tsx`, sostituisci ogni `alert(...)` con `onToast?.({ kind: 'error', title: 'Operazione fallita', message: ... })`.
2. **DirectMessages.tsx:** stesso pattern. La sheet già è renderizzata da App; aggiungi prop `onToast` e passa `setToast`.
3. Verifica: forza un errore (es. disconnetti la rete prima di salvare un post) e vedi che appare il toast, non l'alert nativo.

**Fatto quando.** Zero `alert(` nel src/ (verificato con `Grep "alert\(" src/`).

**File:** `src/screens/Feed.tsx`, `src/screens/DirectMessages.tsx`, `src/App.tsx`. **Effort: S (20 min)**.

---

### Task #5 — Gestire errori delle write optimistic

**Problema.** Le mutation optimistic non rollbackano in caso di errore:
- `toggleLike` in [Feed.tsx:81-91](src/screens/Feed.tsx:81) — like UI persiste anche se RLS rifiuta.
- `addComment` / `removeComment` in [useComments.ts:128-139](src/hooks/useComments.ts:128) — stesso pattern.
- `useSavedPosts` — verifica simile pattern in `toggleSaved`.

**Cosa fare per ogni callsite.**
1. Wrappare la `await supabase.from(...).delete/insert(...)` in try/catch.
2. Su errore: invertire l'optimistic update e chiamare `onToast({ kind: 'error', ... })`.

Esempio per `toggleLike`:
```ts
async function toggleLike(post: FeedPost) {
  const wasLiked = feed.likedIds.has(post.id)
  feed.setLiked(post.id, !wasLiked)
  feed.updatePostLikesCount(post.id, wasLiked ? -1 : 1)
  if (IS_DEMO || !userId) return
  const { error } = wasLiked
    ? await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
    : await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
  if (error) {
    feed.setLiked(post.id, wasLiked)
    feed.updatePostLikesCount(post.id, wasLiked ? 1 : -1)
    onToast?.({ kind: 'error', title: 'Azione fallita', message: error.message })
  }
}
```

**Fatto quando.**
- I tre hook/azioni rollbackano in caso di errore.
- Smoke test forzato (es. disabilita RLS temporaneamente in dev per simulare errori): il toast appare e l'UI torna allo stato precedente.

**File:** `src/screens/Feed.tsx`, `src/hooks/useComments.ts`, `src/hooks/useSavedPosts.ts`. **Effort: M (45 min)**.

---

### Task #6 — Auto-accept booking: dedup race

**Problema.** [src/screens/BarberDashboard.tsx:172-179](src/screens/BarberDashboard.tsx:172) — l'effect fira `confirmBooking()` su ogni pending ad ogni cambio dell'array `real`. Realtime può consegnare INSERT seguito da UPDATE su `bookings`, → la stessa prenotazione viene confermata due volte (la seconda fallisce silenziosamente o produce log spurî).

**Cosa fare.**
1. Aggiungi `const processingRef = useRef(new Set<string>())` nel componente.
2. Nell'effect:
   ```ts
   useEffect(() => {
     if (!autoAccept || isDemo) return
     real.filter(b => b.status === 'pending' && !processingRef.current.has(b.id))
         .forEach(b => {
           processingRef.current.add(b.id)
           confirmBooking(b.id).then(({ error }) => {
             if (error) onToast?.({ kind: 'error', title: 'Auto-accept fallito', message: error.message })
             else refetch()
           }).finally(() => processingRef.current.delete(b.id))
         })
   }, [real, autoAccept, isDemo])
   ```
3. Verifica: simula realtime forzando due fetch consecutivi (modifica temporaneamente l'hook); la conferma deve partire una volta sola.

**Fatto quando.** Stesso `booking.id` non viene mai passato due volte a `confirmBooking`.

**File:** `src/screens/BarberDashboard.tsx`. **Effort: S (15 min)**.

---

### Task #7 — Match errore booking conflict via `error.code`

**Problema.** [src/App.tsx:103](src/App.tsx:103):
```ts
const isConflict = error.message.includes('bookings_no_double')
```
Postgres restituisce `error.code = '23P01'` per exclusion violation e `'23514'` per il trigger anti-self-book di migration 024. I messaggi cambiano per locale e versione DB.

**Cosa fare.**
1. Sostituire con:
   ```ts
   const isConflict = (error as any).code === '23P01'
   const isSelfBook = (error as any).code === '23514'
   ```
2. Aggiungere il ramo `isSelfBook` con toast "Non puoi prenotare te stesso".
3. Tenere il check sul testo come fallback (alcune SDK perdono il code).

**Fatto quando.**
- Lo schema `error.code` è privilegiato.
- Tentare di prenotare se stessi (loggati come barbiere) mostra il toast corretto invece di un errore generico.

**File:** `src/App.tsx`. **Effort: S (10 min)**.

---

### Task #8 — Documentare OAuth redirect URL per il deploy

**Problema.** [src/lib/supabase.ts:23](src/lib/supabase.ts:23) ha `detectSessionInUrl: true` e [Login.tsx](src/screens/Login.tsx) chiama `signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. In produzione l'URL Vercel va aggiunto all'allowlist su Supabase Auth → "URL Configuration" → "Redirect URLs", altrimenti il login Google fallisce silenziosamente (loop sulla schermata login dopo il callback).

**Cosa fare.**
1. Crea `DEPLOYMENT.md` nella root con:
   - Env vars Vercel **obbligatorie**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - Env vars **opzionali**: `VITE_HCAPTCHA_SITE_KEY`, `VITE_MAPTILER_KEY`, `VITE_MAINTENANCE`.
   - Allowlist Supabase: aggiungere `https://<vercel-domain>/`, `https://<vercel-domain>/auth/callback` se applicabile, e l'URL di preview se si usano deploy preview.
   - Comando deploy Edge Function: `supabase functions deploy admin-create-user`.
   - Ordine di applicazione migrations: da `001_initial_schema.sql` a `032_booking_slots_view.sql` in sequenza.
   - Smoke test post-deploy: login Google + prenotazione end-to-end + upload immagine + admin create-user.
2. Aggiorna `.env.example` con un commento esplicito "REQUIRED IN PRODUCTION" sulle prime due righe.

**Fatto quando.** `DEPLOYMENT.md` esiste, `.env.example` aggiornato.

**File:** `DEPLOYMENT.md` (nuovo), `.env.example`. **Effort: S (20 min)**.

---

### Task #9 — Sostituire CDN unpkg dei Phosphor Icons con npm

**Problema.** [index.html](index.html) carica Phosphor Icons da `unpkg.com` senza `integrity=`. Supply-chain risk: se unpkg viene compromesso, può servire JS arbitrario eseguito nel contesto della app.

**Cosa fare.**
1. `npm install @phosphor-icons/web` (verifica versione compatibile col CSS attualmente caricato).
2. In `src/main.tsx` (o `index.css`) importa i fogli CSS dei pesi usati:
   ```ts
   import '@phosphor-icons/web/thin'
   import '@phosphor-icons/web/fill'
   ```
   (Verifica quali pesi sono usati con `Grep "ph-(thin|fill|light|bold|duotone|regular)" src/` — il recente commit `f4a5883` ha già fatto questa migrazione parziale, controlla cosa manca.)
3. Rimuovi il `<link>` o `<script>` da `index.html`.
4. Verifica visivamente: ogni icona deve ancora apparire (Feed, Discover, Profile, BookingSheet, BarberDashboard, AdminPanel).

**Fatto quando.** Nessuna richiesta a `unpkg.com` o `cdn.jsdelivr.net` in Network tab.

**File:** `index.html`, `src/main.tsx`, `package.json`. **Effort: M (30 min)**.

---

### Task #10 — Limite client-side sulle upload immagini

**Problema.** [src/hooks/useUpload.ts](src/hooks/useUpload.ts) — compressione avviene ma file da 50 MB vengono accettati e compressi (CPU + memoria mobile pesanti, rischio crash su device low-end). Nessun limite nelle storage policies di migration 015.

**Cosa fare.**
1. In `useUpload.ts`, all'inizio di ogni funzione di upload (`uploadAvatar`, `uploadPostPhoto`, `uploadUserPostPhoto`):
   ```ts
   const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
   if (file.size > MAX_FILE_SIZE) {
     return { url: null, error: new Error(`Immagine troppo grande (max 10 MB, ricevuti ${(file.size / 1024 / 1024).toFixed(1)} MB)`) }
   }
   ```
2. Verifica che i callsite consumino già l'errore (la maggior parte fa `if (error) onToast(...)`; se non lo fanno, sistemali).

**Fatto quando.** Upload di un file >10 MB → toast d'errore, nessuna chiamata a Supabase Storage.

**File:** `src/hooks/useUpload.ts`. **Effort: S (15 min)**.

---

## 5. MEDIUM — chiudere se c'è tempo prima del lancio

Per ciascuno: stesso metodo (verifica → fix → DoD → commit → PROGRESS.md).

### Task #11 — Tap target slot orari in BookingSheet

[src/screens/BookingSheet.tsx:155](src/screens/BookingSheet.tsx:155) — i pulsanti slot hanno `padding: '12px 0'` con `fontSize: 13` → altezza ~37px (sotto i 44px Apple HIG / WCAG). **Fix:** `padding: '14px 0'` + `minHeight: 44`.

### Task #12 — Tap target dei pulsanti `×` delle sheet

Diverse sheet (`EditProfileSheet`, `EditBarberInfoSheet`, `LocationSettingsSheet`, `BookingSheet`, `MapSearchBar`) hanno close/clear button con `padding: 4` → ~28px. **Fix:** standardizzare a `minWidth: 44, minHeight: 44, padding: 8` o aggiungere un componente `IconButton` riutilizzabile in `src/components/`.

### Task #13 — Filtrare appuntamenti passati in "Prossimi"

[src/screens/MyAppointments.tsx:47-48](src/screens/MyAppointments.tsx:47) filtra solo per `date >= TODAY`. Un appuntamento alle 08:00 di oggi resta in "Prossimi" fino a mezzanotte. **Fix:** comparare `${b.date}T${b.time_slot}` con `new Date()`; spostare in "Passati" se già trascorso.

### Task #14 — Error handling RPC `get_admin_users()`

[src/hooks/useAdminUsers.ts:35-39](src/hooks/useAdminUsers.ts:35) — nessun try/catch. Se migration 029 non è ancora applicata sul DB, l'RPC non esiste → AdminPanel crash silenzioso. **Fix:** `try { ... } catch (e) { onToast?.({ kind: 'error', title: 'Admin DB non inizializzato', message: 'Applica le migration più recenti.' }) }`.

### Task #15 — `maxLength={4000}` su textarea DM

[src/screens/DirectMessages.tsx](src/screens/DirectMessages.tsx) textarea — DB ha CHECK `<= 4000` ma il client non ha `maxLength`. **Fix:** aggiungere `maxLength={4000}` + contatore caratteri quando >3800.

### Task #16 — Status `declined` per booking (decisione: opzionale)

Bookings hanno status `(pending, confirmed, done, cancelled)`. Rifiuto-barbiere e annulla-cliente collassano entrambi in `cancelled` → impossibile distinguerli in analytics/log.

**Decisione richiesta all'utente prima di procedere** (annota in PROGRESS.md, **non implementare in autonomia**):
- A) Aggiungere `'declined'` al CHECK + bottone Decline in BarberDashboard.
- B) Lasciare così, accettare la perdita di info.

### Task #17 — Validazione telefono in EditBarberInfoSheet

[src/components/EditBarberInfoSheet.tsx](src/components/EditBarberInfoSheet.tsx) — phone field accetta qualunque stringa, rompe `tel:` link. **Fix:** `type="tel"` + regex `^[+]?[\d\s()-]{7,}$` prima del save; mostra hint inline se invalida.

### Task #18 — Aria labels su form AdminPanel

[src/screens/AdminPanel.tsx](src/screens/AdminPanel.tsx) — input solo con `placeholder`, nessun `<label>` o `aria-label`. Wrappare in `<label>` o aggiungere `aria-label="Nome utente"`, ecc.

### Task #19 — Cleanup blob orfani in Storage on delete post

(BACKLOG.md MISSING #12) — eliminare un post lascia l'immagine nel bucket. **Fix:** in `Feed.tsx` delete handler, dopo il `supabase.from('posts').delete()` riuscito, estrai il `photo` path e fai `supabase.storage.from('posts').remove([path])`. Ignorare errori di remove (logga via `writeLog`).

### Task #20 — Empty state nella lista Discover

[src/screens/Discover.tsx:90](src/screens/Discover.tsx:90) — quando la ricerca non trova nulla, la lista è vuota senza messaggio (la mappa invece mostra "Nessun barbiere in zona"). **Fix:** card "Nessun risultato per «{query}»" con icona `ph-magnifying-glass-minus`.

---

## 6. Polish (LOW) — opzionali, raggruppali in un singolo commit "polish"

- **Cache-bust su uploadPostPhoto / uploadUserPostPhoto** ([useUpload.ts:81](src/hooks/useUpload.ts:81)) — aggiungere `?v=${Date.now()}` come già fatto per gli avatar.
- **`initialsFromName` con emoji** ([useFeed.ts:42](src/hooks/useFeed.ts:42)) — usare `Array.from(name)` invece di `name[0]`/`name[1]` per supportare grapheme cluster.
- **Token mancanti in `colors.ts`**: `#1A1A1A` in [Avatar.tsx:25](src/components/Avatar.tsx:25), `rgba(255,255,255,0.65)` in [Toast.tsx:60](src/components/Toast.tsx:60). Aggiungere `C.imagePlaceholder` e `C.textInvertedMuted`.
- **Anonimizzare demo emails** in [demoData.ts:144-147](src/lib/demoData.ts:144) (rimuovere `fedesanna99@cutbook.it` ecc., usare `client1@example.com`).
- **Code-split Discover** — wrap in `React.lazy(() => import('./screens/Discover'))` per non bloccare il first paint del Feed con il chunk maplibre (1054 kB).

---

## 7. Falsi positivi (verificati — NON riaprire)

Per evitare di ripetere lavoro già fatto:

1. **"Posts non in realtime publication"** — verificato: nessun client subscriba a `posts` via `postgres_changes`. Feed si aggiorna con refetch on mount/focus. Non aggiungere `ALTER PUBLICATION ... ADD TABLE posts`.
2. **"Bug condizione break disponibilità"** — [useAvailability.ts:78](src/hooks/useAvailability.ts:78) usa `slotEndMin <= breakStartMin` (corretto). Uno slot che termina esattamente quando inizia la pausa È valido.
3. **"Migration 029 incompleta su policy `role='admin'`"** — la 029 droppa e ricrea TUTTE le policy interessate (app_logs, profiles update, support, get_admin_users, admin_delete_user). L'unico residuo è la Edge Function (task #1).
4. **"Admin RPC signature change crasha AdminPanel"** — `useAdminUsers` legge per nome colonna, non per indice; l'aggiunta di `is_admin` non rompe nulla.
5. **"Comments demo-only"** — fixato in migration 022 / `useComments.ts`.

---

## 8. Pre-deploy checklist (da seguire SOLO quando tutti i CRITICAL+HIGH sono `✅` in PROGRESS.md)

L'utente deve eseguire manualmente:

- [ ] Configurare env vars su Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ opzionali).
- [ ] Su Supabase Auth → URL Configuration → aggiungere il dominio Vercel alle Redirect URLs.
- [ ] Applicare in sequenza le migrations 001 → 032 sul DB di produzione (`supabase db push` o copia-incolla in SQL editor).
- [ ] Deploy delle Edge Functions: `supabase functions deploy admin-create-user`.
- [ ] Smoke test post-deploy in incognito:
  1. Login email + Google.
  2. Booking end-to-end (cliente → barbiere → notifica → conferma).
  3. Upload foto post (cliente e barbiere).
  4. AdminPanel: creare un utente test.
  5. Direct message tra due utenti.
  6. Logout + login → sessione persistente.
- [ ] Verifica DevTools Network: nessuna 401/403 silenziosa, nessuna richiesta a `unpkg.com`.
- [ ] Verifica Lighthouse mobile: Performance > 70, Accessibility > 90.

---

## 9. Aggiornare `PROGRESS.md`

Aggiungi in fondo a `PROGRESS.md` una sezione:

```markdown
## Hardening pre-produzione (ISTRUZIONI_PRODUZIONE.md)

| # | Task | Stato | Note |
|---|---|---|---|
| 1 | Edge Function admin-create-user | ⏳ | |
| 2 | RLS booking_slots view | ⏳ | |
| 3 | Fail-fast env vars | ⏳ | |
| 4 | Sostituire alert() | ⏳ | |
| 5 | Optimistic rollback | ⏳ | |
| 6 | Auto-accept dedup | ⏳ | |
| 7 | error.code match | ⏳ | |
| 8 | DEPLOYMENT.md | ⏳ | |
| 9 | Phosphor npm | ⏳ | |
| 10 | Upload size limit | ⏳ | |
| 11–20 | MEDIUM | ⏳ | |
| Polish | LOW | ⏳ | |

### Interventi manuali richiesti all'utente
- (popolare via via)
```

Aggiorna ad ogni task chiuso. Allo stop, riepiloga in chat:
1. Task `✅` chiusi.
2. Task `⚠️` con step manuale (es. deploy Edge Function).
3. Task `❌` bloccati con motivo.
4. Suggerimento del prossimo blocco da affrontare.
