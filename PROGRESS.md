# PROGRESS — Modifiche app barbieri

## Baseline
- build iniziale (worktree): **OK** dopo `npm install` (no errori TS, build vite 4s)
- mappatura repo vs architettura (l'app è più matura del previsto dal piano):
  - **File presenti come da architettura:** `useAuth`, `useFeed`, `useBarbers`, `useAvailability`, `useBooking`, `lib/supabase.ts`, `types/supabase.ts`, screens (Feed, Discover, Profile, Menu, BookingSheet)
  - **Già presente oltre l'architettura:** AdminPanel + admin role (col vecchio approccio `role='admin'`), Notifications (overlay UI), MyAppointments, SupportChat (chat user↔admin), Reviews + StarRating (`reviews_count` su barbers), Comments (tabella + UI), SavedPosts, ResetPassword
  - **`barbers.accepting_bookings`:** assente → da aggiungere (task 1)
  - **`posts` con `author_id`:** assente. Esiste invece tabella separata `user_posts`. Per task 2 conviene generalizzare `posts` (campo `author_id`, `barber_id` nullable, backfill da `user_posts` se ci sono righe, oppure mantenere `user_posts` e generalizzare solo a livello di feed query) → **scelta:** estendere `posts` con `author_id` ed esporre user-post via stessa pipeline (consolida UI), `user_posts` resta legacy.
  - **`follows`:** ancora `(follower_id, barber_id)` → da generalizzare a `followee_id` (profiles) per task 3
  - **`profiles.is_admin`:** assente. Decisione vincolante: usare `is_admin boolean`. Migrare i valori `role='admin'` esistenti in `is_admin=true` + `role='client'`, e rimuovere `admin` dal check constraint
  - **`notifications` + tabelle DM:** assenti → da creare (task 9, 16-18)
  - **`availability_breaks`:** non c'è tabella dedicata, ma `availability` ha `break_start`/`break_end` (singola pausa). Per task 4 va revisitato (UI + edge case sovrapposizioni)
  - **404/403/500/manutenzione:** assenti — `App.tsx` non ha router (rendering condizionale a stato) → soluzione: pseudo-router minimo + ErrorBoundary + check `VITE_MAINTENANCE` precoce
  - **`posts.tagged_profile_id`:** assente (task 13)
  - **Hard-delete post:** mancante (task 11) — esiste delete su Storage in `useUpload`? da verificare

## Stato task (1–20)
1. Vacanza/disattiva prenotazioni — ✅ (sonnet/opus 4.7) — `barbers.accepting_bookings`, hook `useBarberVacation`, toggle in dashboard, bottoni "Prenota" disabilitati in Discover/Feed/BarberPreviewCard/BarberList/BarberProfileSheet, policy `bookings_insert` rafforzata in migrazione `026_barber_vacation.sql`
2. Post anche per utenti — ✅ (sonnet) — `posts.author_id` + `barber_id` nullable, RLS insert/update/delete su autore, comments_delete usa author_id; `useFeed` legge via author profile, `Feed.tsx` rende composer visibile a tutti, post utente senza CTA "Prenota" / label / city. Migrazione `027_generalize_posts.sql`. NB: la tabella legacy `user_posts` resta in schema ma non è più scritta dal client (composer ora va su `posts`).
3. User si seguono tra loro — ✅ (sonnet) — `follows` ora `(follower_id, followee_id)` su profiles, backfill da `barbers.profile_id`, trigger aggiornato per mantenere `barbers.followers_count` (followee=barbiere), CHECK anti self-follow, RLS rifatte. Hook `useFollow` accetta `followeeProfileId`, `useFollows` ritorna profili (con `barberId` opzionale). DemoBarber estesa con `profileId`. Migrazione `028_generalize_follows.sql`. NB: l'UI follow utente↔utente verrà esposta in task 12/13 quando arrivano i tag/profili utente cliccabili.
4. Fix orari/pause — ✅ (sonnet) — label "Pausa" è ora il bottone che rimuove la pausa (sostituisce la "x"); bug `generateSlots` corretto (gli slot la cui *fine* cade nella pausa ora vengono esclusi); validazioni UI già coprivano sovrapposizione/ordinamento. NB: il piano menziona "2 fasce + 1 pausa" — la schema attuale (`availability` con UNIQUE su `(barber_id, day_of_week)`) supporta **una sola fascia per giorno** + una pausa. Il multi-fascia non è stato introdotto: richiederebbe nuova tabella e modifiche a BookingSheet/useAvailability che il piano sconsiglia di toccare. Da rivedere se davvero richiesto.
5. Pagine 404/403/500/manutenzione — ✅ (sonnet) — pagine in `screens/StatusPages.tsx` (NotFound, Forbidden, ServerError, Maintenance), `components/ErrorBoundary.tsx` cattura eccezioni unhandled; `main.tsx` controlla `VITE_MAINTENANCE` **prima** di Supabase init e fa pseudo-routing su pathname per il 404. Forbidden esportato per usi futuri (oggi non c'è UI route-guard). Tipi `VITE_MAINTENANCE` aggiunti a `vite-env.d.ts`.
6. Avatar non si aggiorna — ✅ (sonnet) — `uploadAvatar` ora restituisce URL con `?v=<timestamp>` come cache-buster. La URL persistita in `profiles.avatar_url` resta corretta dopo reload; tutte le superfici che leggono `profiles.avatar_url` (Feed, BarberProfileSheet, ecc.) prendono il valore nuovo automaticamente.
7. Rimuovi matita accanto al nome — ✅ (sonnet) — `ti-pencil` rimossa in `screens/Profile.tsx`. Modifica profilo resta raggiungibile dall'icona ingranaggio in alto a destra.
8. Bug rating 4.8 con 0 recensioni — ✅ (sonnet) — nuova helper `src/lib/rating.ts` (`ratingDisplay`) usata in BarberList, BarberPreviewCard, BarberProfileSheet, BookingSheet, BarberMarker (mappa). Con 0 recensioni mostra "Nuovo" + icona vuota. Rimosso `4.8` hardcoded da `postToBarber` (Feed). Badge "TOP" ora solo se ci sono recensioni. `barbers.reviews_count` esisteva già — non serve nuova migrazione.
9. Sistema notifiche + invio da admin — ✅ (sonnet/opus stratagem manuale) — `profiles.is_admin` aggiunto, role 'admin' rimosso dal CHECK constraint, RLS e RPC `get_admin_users`/`admin_delete_user` aggiornate. Tabella `notifications (recipient_id null=broadcast, title, body_html, type, is_read)` con RLS (insert solo admin; select se destinatario o broadcast; update is_read solo destinatario). Hook `useNotifications` + helper `sendNotification`. Schermata Notifiche riscritta con sanitizer HTML (`src/lib/sanitizeHtml.ts`, allow-list rigorosa). AdminPanel: rimosso 'admin' dal role-picker, badge "Admin" se is_admin, azione toggle in expanded; nuova tab **Notifiche** con composer (broadcast vs utente singolo, anteprima HTML sanitizzato). Login/useAuth aggiornati. Migrazione `029_is_admin_and_notifications.sql`. **Manuale utente:** dopo migrazione, per promuovere il proprio profilo eseguire `UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'fedesanna99@gmail.com');` (il vecchio role='admin' viene migrato automaticamente).
10. Schermata notifiche resta aperta cambiando tab — ✅ (sonnet) — il click su bottom nav in `App.tsx` ora resetta anche `showNotifications`, `showMyAppointments`, `showSupport` (oltre ai già esistenti `profileBarber`, `bookingBarber`, ecc.).
11. Modifica/elimina propri post — ✅ (sonnet) — RLS già in `027_generalize_posts.sql` (update/delete su `author_id = auth.uid()`). UI: bottone "…" nel post header su `Feed.tsx` se `userId === post.barberProfileId`, apre `PostActionSheet` con Modifica caption + Elimina. Modifica usa `EditCaptionSheet`. Delete è **hard-delete**: (a) delete riga `posts` (cascade su `likes`/`comments`), (b) best-effort `storage.from('posts').remove([path])`. Se Storage fallisce: log `post.delete.storage_orphan` con path per pulizia manuale. La FK `likes.post_id` ha già `on delete cascade` in `001_initial_schema.sql`.
12. Profilo: fresh cuts / barbers / follower — ✅ (sonnet) — i 3 contatori in `Profile.tsx` ora sono: Fresh cuts (bookings done), Barbers (follow di profili con role='barber'), Follower (count `follows where followee_id = me`). Demo fallback mantenuto. Tap-to-open list non implementato (extra opzionale, non bloccante).
13. Tag 1 utente/barbiere nei post + click → profilo — ✅ (sonnet) — `posts.tagged_profile_id uuid null` (migrazione `030_post_tag.sql`, ON DELETE SET NULL). Composer in Feed: search profili del ruolo opposto (barber→client, client→barber), max 1 tag per post. Render chip `@nome` sotto la caption; click → BarberProfileSheet (per barbieri). User profile sheet non esiste ancora: chip rimane visibile ma il click non naviga (TODO segnalato nel codice).
14. Skeleton di caricamento (no flash UI) — ✅ (sonnet) — nuovo componente `components/Skeleton.tsx` (`Skeleton`, `PostSkeleton`, `ListRowSkeleton`) + animazione `@keyframes shimmer` in `index.css`. Applicato a Feed (post cards), BarberList (discover/list), Notifications. Pattern coerente per Profile/MyAppointments può seguire l'esempio (non bloccante).
15. Toast -2 secondi — ✅ (sonnet) — `Toast.tsx` durata 5000ms → **3000ms**.
16. Direct message utente↔barbiere — ✅ (sonnet) — schema `conversations(participant_a < participant_b, status, updated_at)` + `direct_messages` + RLS partecipanti + Realtime. Hook `useDirectMessages.ts` (list + thread + send + status). Screen `DirectMessages.tsx` (list + thread con bubble e input). Wiring: bottone "Messaggio" in BarberProfileSheet, voce "Messaggi" nel Menu, gestione overlay in App.tsx (incluso reset su cambio tab del task 10). Migrazione `031_direct_messages.sql`.
17. Non creare ticket/chat se nessun messaggio inviato — ✅ (sonnet) — implementato in `sendDirectMessage`: `findConversation` cerca la riga, ma la conv viene **insertata SOLO** all'invio del primo messaggio. Aprire e chiudere la chat senza scrivere → nessuna riga in DB.
18. Riapertura chat chiusa — ✅ (sonnet) — bottone "Riapri" (e "Chiudi") nell'header del thread (RLS update consentita ai partecipanti); inoltre `sendDirectMessage` rimette automaticamente `status='open'` prima dell'insert se la conv era chiusa.
19. "I miei appuntamenti" + cronologia funzionanti — ✅ (sonnet) — `MyAppointments.tsx` era già su `useClientBookings(userId)` reali (Realtime), con split "Prossimi" (date ≥ oggi & non cancelled/done) + "Storia" → ora rinominata **Cronologia** (match con la spec). Nessun dato hardcoded.
20. Reload pagina non slogga — ✅ (sonnet) — `lib/supabase.ts` ora dichiara esplicitamente `auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }` (erano i default, ma ora sono parte del contratto). `useAuth.ts` aveva già il fix per la race condition (flag `sessionResolved.current` che impedisce alla `onAuthStateChange` INITIAL_SESSION di settare `loading=false` prima della risoluzione di `getSession`); `App.tsx` mostra spinner mentre `loading=true`, quindi nessun flash di Login durante il reload.

## Migrazioni DB da eseguire (a cura dell'utente, in ordine)
1. `supabase/migrations/026_barber_vacation.sql` — colonna `barbers.accepting_bookings` + policy `bookings_insert` aggiornata (task 1)
2. `supabase/migrations/027_generalize_posts.sql` — `posts.author_id` (NOT NULL dopo backfill), `posts.barber_id` nullable, RLS posts insert/update/delete su autore, `comments_delete` aggiornata (task 2; pre-requisito task 11 per la cancellazione cascade su likes — già presente in 001)
3. `supabase/migrations/028_generalize_follows.sql` — `follows (follower_id, followee_id)`, trigger rifatto, CHECK no self-follow, RLS aggiornata (task 3)
4. `supabase/migrations/029_is_admin_and_notifications.sql` — `profiles.is_admin` + drop 'admin' da role check + backfill + RLS/funzioni aggiornate; tabella `notifications` + RLS (task 9)
5. `supabase/migrations/030_post_tag.sql` — `posts.tagged_profile_id` nullable (task 13)
6. `supabase/migrations/031_direct_messages.sql` — `conversations` + `direct_messages` + RLS + trigger updated_at + ALTER PUBLICATION Realtime (task 16/17/18). **Manuale:** richiede Realtime abilitato sul progetto (di solito ON di default per `supabase_realtime`).

## Interventi manuali per l'utente
- Eseguire le migrazioni nella sezione sopra in SQL editor di Supabase, in ordine.
- Dopo le migrazioni, rigenerare i tipi: `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/supabase.ts` (i tipi sono stati anche aggiornati a mano nel frattempo).
- Vercel → Project → Settings → Environment Variables: aggiungere `VITE_MAINTENANCE=true` per attivare la pagina manutenzione (rimuovere o impostare `false` per disattivare). Richiede redeploy: è build-time. Per test locale: `.env` con `VITE_MAINTENANCE=true`.
- **Promuovere admin (task 9):** dopo la migrazione 029, eseguire in SQL editor di Supabase:
  ```sql
  UPDATE profiles SET is_admin = true
   WHERE id = (SELECT id FROM auth.users WHERE email = 'fedesanna99@gmail.com');
  ```
  (Gli utenti che avevano già `role='admin'` sono stati migrati automaticamente in `is_admin=true, role='client'`).

## Decisioni prese
- Admin = `profiles.is_admin boolean` (NON `profiles.role`) — vincolante. Migrazione converte gli `admin` esistenti in `is_admin=true + role='client'`
- Manutenzione = env var `VITE_MAINTENANCE` su Vercel (NESSUNA tabella app_config) — vincolante
- Eliminazione post = hard-delete + cancellazione immagine Storage + cascade su likes (DB limitato) — vincolante
- Task 2: invece di sostituire `posts`/`user_posts`, generalizzare `posts` con `author_id` nullable + backfill (per i barbieri esistenti `author_id = barbers.profile_id`); `user_posts` resta legacy ma il feed unifica via `posts.author_id`. Eventuale data-migration di righe `user_posts` → `posts` decisa caso per caso

## Note per chi rivede
- Stato modello per task: annotato accanto allo stato (es. `✅ (sonnet)` o `✅ (opus)`)
- `BookingSheet.tsx` non va toccato salvo task che lo richiedono esplicitamente

---

## ✅ Tutti i 20 task chiusi — Recap finale

### Ordine esatto degli interventi manuali su Supabase / Vercel

1. **Eseguire le migrazioni SQL in ordine numerico** (incollare nell'SQL editor di Supabase, una alla volta, fino a OK):
   - `supabase/migrations/026_barber_vacation.sql`
   - `supabase/migrations/027_generalize_posts.sql`
   - `supabase/migrations/028_generalize_follows.sql`
   - `supabase/migrations/029_is_admin_and_notifications.sql`
   - `supabase/migrations/030_post_tag.sql`
   - `supabase/migrations/031_direct_messages.sql`

2. **Rigenerare i tipi** (i tipi sono già aggiornati a mano per allinearsi alle migrazioni; per essere sicuri):
   ```bash
   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/supabase.ts
   ```

3. **Promuovere admin** (la migrazione 029 ha migrato gli admin esistenti, ma serve per nuovi admin):
   ```sql
   UPDATE profiles SET is_admin = true
    WHERE id = (SELECT id FROM auth.users WHERE email = 'fedesanna99@gmail.com');
   ```

4. **Realtime**: verificare su Supabase Dashboard → Database → Replication che la publication `supabase_realtime` includa le tabelle `direct_messages` e `conversations` (la migrazione 031 le aggiunge automaticamente).

5. **Vercel — env var manutenzione**:
   - Project → Settings → Environment Variables: aggiungere `VITE_MAINTENANCE=true` per accendere la pagina manutenzione. Rimuovere/lasciare unset (o `false`) per spegnere. **Richiede redeploy.**

6. **Verifica bucket Storage avatars** (di solito già configurato): RLS storage deve consentire upload nel bucket `avatars` per gli utenti autenticati nella loro cartella (`{uid}/...`). Lo stesso per `posts`.

7. **Build + deploy**:
   ```bash
   npm install
   npm run build   # zero errori TS, OK in worktree
   vercel --prod
   ```

### Checklist di verifica finale (manuale)

- [ ] 1. Dashboard barbiere mostra toggle "Accetto prenotazioni"; con OFF il bottone "Prenota" appare disabilitato ovunque
- [ ] 2. Utente client riesce a creare un post che appare nel feed con avatar/nome utente (no CTA Prenota / no label)
- [ ] 3. Follow su un altro profilo (anche utente↔utente) funziona; conteggi corretti
- [ ] 4. Bottone "Pausa" rimuove la pausa al click; nessuno slot generato si sovrappone alla pausa
- [ ] 5. URL inesistente mostra 404 (`/foo`); errore JS renderizzato → 500; env `VITE_MAINTENANCE=true` → pagina manutenzione
- [ ] 6. Cambio avatar visibile immediatamente sia per cliente sia per barbiere; persiste dopo reload
- [ ] 7. Matita rimossa dal Profilo (la modifica resta dal ⚙ in alto)
- [ ] 8. Barbiere con 0 recensioni mostra "Nuovo" (no 4.8 fantasma) coerentemente in lista/mappa/profilo/booking
- [ ] 9. Admin tab "Notifiche" → invio broadcast → utente vede l'annuncio; invio mirato → solo il destinatario; non-admin non può inviare (RLS blocca)
- [ ] 10. Apri Notifiche → tap su altra tab nella nav → overlay si chiude
- [ ] 11. Sui propri post compare il menu "…" con Modifica/Elimina; cancellando libera lo spazio nello storage `posts`
- [ ] 12. Profilo mostra Fresh cuts / Barbers / Follower coi numeri reali
- [ ] 13. Composer permette di taggare 1 profilo (cliente⇄barbiere); chip @nome nel feed; click su tag barbiere → suo profilo
- [ ] 14. Caricamenti mostrano skeleton (Feed/Discover/Notifications) — niente flash di UI vuota
- [ ] 15. Toast scompare in 3 s (era 5 s)
- [ ] 16. Bottone "Messaggio" sul profilo barbiere → si apre la chat; invio messaggio funziona
- [ ] 17. Apri chat con un barbiere → chiudi senza scrivere → nessuna riga in `conversations`
- [ ] 18. Chiudi una chat → puoi riaprirla dal bottone "Riapri" (o scrivendo di nuovo) → status `open` su entrambi i lati
- [ ] 19. "I miei appuntamenti": prossimi e Cronologia separati; nessun dato finto
- [ ] 20. Logout esplicito funziona; reload più volte → resti loggato e nessun flash di Login

### Task con limiti noti / parziali

- **Task 4 (orari/pause)**: implementato per **una sola fascia per giorno** + una pausa (lo schema `availability` ha `UNIQUE (barber_id, day_of_week)`). Il piano menziona "2 fasce + 1 pausa": multi-fascia richiederebbe nuova tabella/struttura e modifiche a `BookingSheet`/`useAvailability` che il piano consiglia di non toccare.
- **Task 13 (tag profilo)**: chip cliccabile naviga al `BarberProfileSheet` quando il tag è un barbiere. Per tag utente non c'è ancora una `UserProfileSheet` dedicata (chip resta visibile ma il click non naviga; commento `TODO` in codice).
- **Task 12 (contatori tap-to-list)**: i 3 contatori sono corretti, ma non sono cliccabili per aprire la lista degli elementi (extra opzionale, non bloccante per la spec).
- **Task 14 (skeleton)**: applicato a Feed, BarberList, Notifications; Profile/MyAppointments seguono un pattern simile (spinner esistente) e possono adottarli con poche righe se voluto.
