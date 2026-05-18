# Istruzioni operative — Modifiche app barbieri

> **A chi legge (Claude):** questo è un piano di lavoro vincolante. Esegui i task **uno alla volta**, nell'ordine dato. Passa al task successivo **solo quando sei davvero sicuro di aver risolto** quello in corso (criteri di "Fatto" definiti per ciascuno). Fai tutto ciò che puoi in autonomia; ciò che non puoi fare tu (SQL su Supabase, env var su Vercel, deploy, scelte di prodotto) lo annoti nel registro interventi manuali e lo spieghi alla fine.

---

## Decisioni di prodotto già prese (VINCOLANTI — non riaprirle)

Queste tre scelte sono **definitive**. Non proporre alternative, non chiedere conferma: implementa così.

1. **Admin (task 9):** usa un campo **`profiles.is_admin boolean not null default false`**, ortogonale a `profiles.role`. **Non** aggiungere `admin` a `profiles.role` e **non** toccare la logica esistente basata su `role = 'client' | 'barber'`. Un admin può essere anche un client/barbiere normale.

2. **Modalità manutenzione (task 5):** usa l'env var **`VITE_MAINTENANCE`** (su Vercel → Project → Settings → Environment Variables). Se `VITE_MAINTENANCE === 'true'` l'app mostra la pagina Manutenzione **prima** di qualsiasi chiamata a Supabase. **Non** creare la tabella `app_config` (rimuovere quella voce dalle migrazioni).

3. **Eliminazione post (task 11) — DB limitato, va liberato spazio reale:** **hard-delete** definitivo, **niente `deleted_at`**. L'operazione di delete deve, atomicamente per quanto possibile: (a) eliminare la riga in `posts`; (b) eliminare l'immagine associata dal bucket Supabase Storage (la parte che occupa spazio davvero — se manca la cancellazione dello Storage la decisione è incompleta); (c) i record collegati in `likes` vengono rimossi via `ON DELETE CASCADE` sulla FK `likes.post_id`. Nessun'altra tabella referenzia `posts.id`, quindi non servono altri cleanup. Se l'eliminazione Storage fallisce, logga l'errore ma non lasciare la riga orfana: registra il path immagine per una pulizia manuale e segnalalo nel recap.

---

## 0. Contesto e regola d'oro

**Stack:** React + Vite + TypeScript + Supabase, deploy su Vercel. App mobile-first, bottom nav a 4 tab (Feed, Discover, Profile, Menu) + flusso prenotazione (`BookingSheet`).

**Modello dati di partenza:** `profiles, barbers, posts, follows, likes, bookings, availability`. `profiles.role` ∈ `client | barber` (gestisce l'esperienza lato barbiere). `barbers` è estensione 1-1 di `profiles`.

**Hook previsti dall'architettura:** `useAuth, useFeed, useBarbers, useAvailability, useBooking` in `src/hooks/`. Schermate in `src/screens/`, componenti in `src/components/`, client unico in `src/lib/supabase.ts`, tipi generati in `src/types/supabase.ts`.

**Regola d'oro:** non rompere ciò che già funziona. In particolare **non toccare `BookingSheet.tsx`** salvo dove un task lo richiede esplicitamente, non rompere `useAuth`, il feed e il flusso di prenotazione. Rispetta il design system esistente: oggetto colori `C`, icone Tabler `ti ti-*`, font, **dark mode via CSS variables**.

### Prima di iniziare (task 0, obbligatorio)
1. Mappa il **repo reale** contro questo documento: elenca file/hook/schermate effettivamente presenti vs. quelli previsti dall'architettura. I file `.html` nel progetto sono prototipi/spec, non il codice di produzione: usali come riferimento di comportamento e design, non come sorgente da modificare.
2. Verifica che `npm install` e `npm run build` partano puliti **ora**, così sai da quale baseline parti.
3. Crea il file `PROGRESS.md` nella root del repo (template alla sezione 2). Da qui in poi è la **fonte di verità** dello stato: va aggiornato dopo ogni task e prima di ogni `/compact`.

---

## 1. Metodo di lavoro (vincolante)

**Un task per volta.** Per ogni task:
1. Leggi obiettivo + criteri di "Fatto".
2. Implementa la parte di codice che puoi fare tu.
3. Se il task tocca il DB: scrivi la **migrazione SQL** (`supabase/migrations/NNNN_descrizione.sql`) e le **policy RLS**; **non assumere di poterle eseguire tu** — registrale tra gli interventi manuali. Dopo modifiche di schema, rigenera i tipi (`npx supabase gen types typescript ... > src/types/supabase.ts`) o, se non puoi, scrivi i tipi a mano e annotalo.
4. Verifica (build pulita + test manuale del flusso specifico + nessuna regressione su Booking/Feed/Auth).
5. Aggiorna `PROGRESS.md`: stato `✅ fatto` / `⚠️ fatto col codice, richiede step manuale` / `❌ non risolto (motivo)`, file toccati, eventuali interventi manuali.
6. Solo ora passa al task successivo.

**Definition of Done generica (vale per ogni task, oltre ai criteri specifici):**
- `npm run build` pulito, **zero errori TypeScript**; lint ok se presente.
- Il comportamento richiesto è verificato manualmente in `npm run dev`.
- Nessuna regressione su: login/sessione, feed, flusso `BookingSheet`.
- Dark mode coerente.
- `PROGRESS.md` aggiornato.

**`/compact` — come e quando.** Ogni **2–3 task completati** (o quando il contesto diventa grande):
- Prima assicurati che `PROGRESS.md` sia **completamente aggiornato** (è ciò che sopravvive alla compattazione, perché è su disco).
- Esegui `/compact` chiedendo di **preservare**: la lista master dei 20 task con lo stato, lo stack, le decisioni di schema/RLS prese, le migrazioni in sospeso, il registro interventi manuali.
- Dopo `/compact`, **ri-leggi `PROGRESS.md` e questo documento** per ricaricare il contesto, poi prosegui dal primo task non completato.
- Non perdere mai: piano dei 20 task, stato per task, schema/migrazioni decise, interventi manuali da comunicare all'utente.

---

## 1bis. Strategia modelli (esecuzione in Claude Code)

Questo piano viene eseguito in **Claude Code**. Indicazioni operative su quale modello usare:

- **Modalità consigliata: `opusplan`.** Avviala con `/model opusplan`. In plan mode pianifica con Opus (ragionamento su schema, RLS, dipendenze tra task), in esecuzione passa da sola a Sonnet per scrivere il codice. Per ogni task: **entra in plan mode**, fai pianificare il task a Opus rileggendo `PROGRESS.md` e la sezione del task, poi esci dal plan mode per l'implementazione con Sonnet.
- **Requisito:** Opus 4.7 richiede Claude Code ≥ v2.1.111. Se la versione è più vecchia, eseguire `claude update` **prima** di iniziare (annotalo nel registro interventi manuali se non puoi farlo tu).
- **Task da eseguire con Opus anche in fase di esecuzione** (non solo in plan): forza `/model opus` su questi, sono troppo delicati per l'implementazione automatica con Sonnet, e torna a `opusplan`/`sonnet` finito il task:
  - Task 2 — refactor `posts` → autore + backfill + RLS
  - Task 3 — generalizzazione `follows` + backfill
  - Task 4 — logica sovrapposizioni orari/pause
  - Task 9 — `notifications` + `is_admin` + RLS
  - Task 16 / 17 / 18 — sistema DM con RLS e lazy-create
  - Task 20 — race condition auth/sessione al reload
- **Task tranquilli per Sonnet** (default in esecuzione `opusplan`, nessun intervento): 6, 7, 8, 10, 12, 13, 14, 15.
- **Regola anti-spreco:** non spezzare un singolo task tra due modelli. Completa il task, segna `✅` in `PROGRESS.md`, **poi** eventualmente cambia modello per il successivo. Lo stato vive in `PROGRESS.md` su disco, quindi il cambio modello e i `/compact` non perdono contesto.
- **Se un task "facile" si impantana** con Sonnet (loop, criteri "Fatto quando" non raggiunti dopo un paio di tentativi): non insistere, `/model opus`, risolvi, poi torna indietro. Registra in `PROGRESS.md` che è servito Opus (utile a chi rivede il lavoro).

Annota in `PROGRESS.md`, per ogni task completato, con quale modello è stato chiuso (`opusplan` / `opus` forzato / `sonnet`).

---

## 2. Template `PROGRESS.md` (crealo subito nella root)

```md
# PROGRESS — Modifiche app barbieri

## Baseline
- build iniziale: OK / KO (note)
- mappatura repo vs architettura: <link/sintesi>

## Stato task (1–20)
1. Vacanza/disattiva prenotazioni — ⏳ da fare
2. Post anche per utenti — ⏳ da fare
3. User si seguono tra loro — ⏳ da fare
4. Fix orari/pause — ⏳ da fare
5. Pagine 404/403/500/manutenzione — ⏳ da fare
6. Avatar non si aggiorna — ⏳ da fare
7. Rimuovi matita accanto al nome — ⏳ da fare
8. Bug rating 4.8 con 0 recensioni — ⏳ da fare
9. Sistema notifiche + invio da admin — ⏳ da fare
10. Schermata notifiche resta aperta cambiando tab — ⏳ da fare
11. Modifica/elimina propri post — ⏳ da fare
12. Profilo: fresh cuts / barbers / follower — ⏳ da fare
13. Tag 1 utente/barbiere nei post + click → profilo — ⏳ da fare
14. Skeleton di caricamento (no flash UI) — ⏳ da fare
15. Toast -2 secondi — ⏳ da fare
16. Direct message utente↔barbiere — ⏳ da fare
17. Non creare ticket/chat se nessun messaggio inviato — ⏳ da fare
18. Riapertura chat chiusa — ⏳ da fare
19. "I miei appuntamenti" + cronologia funzionanti — ⏳ da fare
20. Reload pagina non slogga — ⏳ da fare

## Migrazioni DB da eseguire (a cura dell'utente, in ordine)
- (vuoto all'inizio)

## Interventi manuali per l'utente
- (vuoto all'inizio)

## Decisioni prese
- Admin = `profiles.is_admin boolean` (NON `profiles.role`) — vincolante
- Manutenzione = env var `VITE_MAINTENANCE` su Vercel (NESSUNA tabella app_config) — vincolante
- Eliminazione post = hard-delete + cancellazione immagine Storage + cascade su likes (DB limitato) — vincolante
```

Legenda stato: `⏳ da fare` · `🔧 in corso` · `✅ fatto` · `⚠️ fatto, richiede step manuale` · `❌ bloccato (motivo)`. Accanto a ogni task chiuso annota il modello usato, es. `2. Post anche per utenti — ✅ (opus)`.

---

## 3. I 20 task

Per ogni task: **Obiettivo**, **Dove**, **DB/RLS** (se serve), **Fatto quando** (criteri specifici), **Manuale utente** (cosa resta a lui).

---

### Task 1 — Vacanza: attiva/disattiva prenotazioni dalla dashboard barbiere
- **Obiettivo:** il barbiere può sospendere globalmente le prenotazioni (es. ferie) e riattivarle.
- **Dove:** dashboard barbiere; `useBarbers`/`useBooking`; UI bottone "Book" (Feed, Discover, mappa, preview card).
- **DB/RLS:** aggiungi `barbers.accepting_bookings boolean not null default true`. Aggiorna la policy `bookings_insert` perché un insert sia rifiutato se il barbiere non accetta prenotazioni (check via subquery su `barbers.accepting_bookings`).
- **Fatto quando:** toggle in dashboard persiste su DB; con `accepting_bookings=false` il bottone "Book" mostra stato disabilitato/"Non disponibile · in pausa" ovunque e l'insert booking è bloccato anche lato DB (testato); riattivando torna tutto prenotabile.
- **Manuale utente:** eseguire la migrazione SQL + policy aggiornata in Supabase; rigenerare i tipi.

---

### Task 2 — Anche gli utenti pubblicano post pubblici nel feed
- **Obiettivo:** i post non sono più solo dei barbieri; un `client` può pubblicare post pubblici con la stessa logica, escludendo gli elementi specifici-barbiere (es. CTA "prenota da me", servizi/tariffe).
- **Dove:** `useFeed`, schermata composer post, `PostCard`, schermata Feed.
- **DB/RLS:** generalizza `posts` da `barber_id` ad **autore = profilo**. Migrazione: aggiungi `posts.author_id uuid references profiles(id)`, backfill `author_id` dal `profiles.id` del barbiere proprietario, rendi `barber_id` nullable (mantieni per retrocompatibilità/feature barbiere). RLS: `posts_select using (true)`; `posts_insert with check (author_id = auth.uid())`; update/delete solo autore (vedi task 11). Aggiorna `useFeed` per leggere i post dai profili seguiti (qualsiasi ruolo — collegato al task 3).
- **Fatto quando:** un utente `client` crea un post che appare nel feed dei suoi follower; il post barbiere continua a funzionare come prima; gli elementi solo-barbiere non compaiono per i post utente.
- **Manuale utente:** migrazione + RLS + rigenerazione tipi.

---

### Task 3 — Gli utenti possono seguirsi tra loro
- **Obiettivo:** il follow non è più solo verso barbieri; un profilo qualsiasi può seguire un altro profilo qualsiasi.
- **Dove:** `follows` (schema), bottone follow/unfollow su profili (utente e barbiere), `useFeed` (sorgente post = profili seguiti).
- **DB/RLS:** generalizza `follows` da `(follower_id, barber_id)` a `(follower_id, followee_id)` entrambi → `profiles(id)`, PK composta. Migrazione: mappa il vecchio `barber_id` al `profiles.id` corrispondente. RLS: insert/delete consentiti solo se `follower_id = auth.uid()`; select pubblico.
- **Fatto quando:** un utente può seguire/smettere di seguire un altro utente e un barbiere; il conteggio follower/seguiti è corretto; il feed include i post di tutti i profili seguiti. Niente duplicati (PK composta rispettata) e niente self-follow.
- **Manuale utente:** migrazione + RLS + rigenerazione tipi.

---

### Task 4 — Fix orari e pause
- **Obiettivo:** correggere le interferenze tra fasce orarie e pause; la **scritta "pausa" diventa un bottone** che, premuto, **rimuove la pausa** (sostituisce la "x" a destra).
- **Dove:** editor disponibilità del barbiere, `useAvailability` + logica `generateSlots`.
- **DB/RLS:** modella le pause in modo esplicito. Opzione consigliata: tabella `availability_breaks (id, barber_id fk, day_of_week int, start_time time, end_time time)`; in alternativa estendi `availability`. `generateSlots` deve **sottrarre** le pause dalla finestra di lavoro. Validazioni: la pausa deve stare dentro la finestra; niente finestre/pause sovrapposte; ordinamento per orario; gestione fine slot.
- **UI:** rimuovi la "x" a destra; rendi l'etichetta "Pausa" un `<button>` (stile coerente col design system, `aria-label` chiaro) che elimina quella pausa al click.
- **Fatto quando:** non ci sono più slot incoerenti (pause che si accavallano con orari); creando/rimuovendo una pausa gli slot generati si aggiornano correttamente; il bottone "Pausa" rimuove la pausa; nessuna fascia può sovrapporsi a un'altra (testato con almeno 2 fasce + 1 pausa).
- **Manuale utente:** migrazione (se nuova tabella) + RLS (`availability_breaks` gestibile solo dal barbiere proprietario, select pubblico) + rigenerazione tipi.

---

### Task 5 — Pagine 404 / 403 / 500 / Manutenzione collegate alla logica
- **Obiettivo:** pagine di stato create e **agganciate alla logica reale**, non solo statiche.
- **Dove:** routing dell'app + un `ErrorBoundary` globale.
- **Cosa:**
  - **404:** route catch-all (`*`) → pagina NotFound.
  - **403:** quando l'utente non ha i permessi (route protetta / errore RLS di autorizzazione) → pagina Forbidden.
  - **500:** `ErrorBoundary` che cattura eccezioni non gestite → pagina ServerError con azione "riprova".
  - **Manutenzione:** **decisione presa** — env var `VITE_MAINTENANCE`. Se `import.meta.env.VITE_MAINTENANCE === 'true'`, l'app monta la pagina Manutenzione **prima** di qualsiasi chiamata a Supabase/auth, bypassando tutte le route. Niente tabella `app_config`.
- **Fatto quando:** URL inesistente → 404; accesso negato → 403; eccezione in un componente → 500 (non schermata bianca); `VITE_MAINTENANCE=true` → pagina manutenzione su tutta l'app senza errori console. Tutte coerenti col design system e dark mode.
- **Manuale utente:** aggiungere/rimuovere `VITE_MAINTENANCE` su Vercel → Project → Settings → Environment Variables (e in `.env` locale per test); ricordare che è build-time (richiede redeploy per cambiare stato).

---

### Task 6 — Avatar non si aggiorna dopo upload (utenti e barbieri)
- **Obiettivo:** dopo il caricamento di una nuova foto profilo, l'avatar mostrato si aggiorna subito, sia per `client` sia per `barber`.
- **Dove:** flusso upload avatar (Storage), `useAuth`/profilo, componente avatar.
- **Cause tipiche:** URL identico in cache del browser; stato/profilo non rifetchato dopo l'update; `profiles.avatar_url` non aggiornato. **Fix:** dopo upload, aggiorna `profiles.avatar_url`, **rifetcha il profilo** e aggiorna lo stato globale; applica cache-busting all'URL (es. `?v=<updated_at o timestamp>`).
- **Fatto quando:** cambiando avatar la nuova immagine appare immediatamente senza refresh manuale, verificato **sia per utente sia per barbiere**, e resta corretta dopo reload.
- **Manuale utente:** verificare che il bucket Storage e le sue policy permettano l'upload (in genere già configurato).

---

### Task 7 — Rimuovi la matita accanto al nome nel profilo
- **Obiettivo:** togliere l'icona matita/modifica vicino al display name nella schermata Profilo.
- **Dove:** schermata Profilo.
- **Fatto quando:** la matita non è più visibile accanto al nome; se la modifica del nome era possibile solo da lì, resta raggiungibile altrove (es. Menu → Modifica/Impostazioni) — non rimuovere la *funzionalità* di modifica, solo l'icona richiesta.
- **Manuale utente:** nessuno.

---

### Task 8 — Bug: barbiere con 0 recensioni mostra 4.8 nel profilo (la mappa è corretta)
- **Obiettivo:** rendere il rating coerente ovunque; con **0 recensioni** non deve apparire un voto fittizio (es. 4.8).
- **Dove:** schermata profilo barbiere; confronta con la logica già corretta usata nella mappa/lista.
- **Cosa:** trova dove compare il fallback `4.8` (probabile `rating ?? 4.8` o default hardcoded nel profilo). Crea/usa **un'unica helper condivisa** per la visualizzazione rating: se nessuna recensione → mostra "Nuovo"/"Nessuna recensione" (niente numero); altrimenti il valore reale. Allinea profilo, mappa, lista e card alla stessa helper. Se le recensioni non sono modellate, basa il "0 recensioni" su `reviews_count` (aggiungi colonna o tabella `reviews` solo se necessario) — ma la priorità è eliminare il fallback finto e uniformare il display.
- **Fatto quando:** un barbiere senza recensioni mostra lo stesso stato (coerente) in profilo **e** mappa **e** lista; nessun 4.8 fantasma; un barbiere con recensioni mostra il valore reale identico ovunque.
- **Manuale utente:** se serve `reviews_count`/tabella `reviews`: migrazione + RLS + tipi.

---

### Task 9 — Sistema notifiche + invio da pannello admin
- **Obiettivo:** sistema notifiche attivo; dal pannello admin si possono inviare messaggi/comunicazioni (anche contenuto tipo "mail"/HTML) a un utente o broadcast.
- **Dove:** nuova schermata Notifiche, nuovo pannello Admin (gated da ruolo admin), `useAuth` (riconoscere admin).
- **DB/RLS:** **decisione presa** — admin = `profiles.is_admin boolean not null default false` (campo ortogonale, **non** toccare `profiles.role`). Tabella `notifications (id, recipient_id uuid null references profiles(id), title text, body_html text, type text, is_read boolean default false, created_at timestamptz default now())`; `recipient_id` null = broadcast. RLS: insert consentito solo se il chiamante ha `is_admin = true`; select se `recipient_id = auth.uid()` **o** `recipient_id is null` (broadcast); update `is_read` solo dal destinatario. Sanitizza l'HTML prima del render (no XSS).
- **Fatto quando:** un profilo con `is_admin=true` invia una notifica singola e una broadcast; compaiono nella schermata Notifiche del destinatario con contenuto HTML reso in sicurezza; segnare come letta funziona; un non-admin non può inviare (bloccato da RLS, testato).
- **Manuale utente:** migrazione (`is_admin` + tabella `notifications` + RLS) + tipi; **impostare `is_admin=true` sul proprio profilo** via SQL in Supabase (la query esatta va nel recap finale).

---

### Task 10 — La schermata Notifiche resta aperta cambiando tab
- **Obiettivo:** cambiando tab dalla bottom nav, la pagina/overlay Notifiche deve chiudersi (bug di stato di navigazione).
- **Dove:** gestione dello stato schermata/overlay + bottom nav (stesso pattern del brief: "cambio tab → chiudi card/overlay").
- **Fatto quando:** apro Notifiche, cambio tab, e la nuova tab è mostrata correttamente senza che Notifiche resti sopra/aperta; tornando indietro lo stato è pulito.
- **Manuale utente:** nessuno.

---

### Task 11 — Nel tuo feed puoi modificare o eliminare i tuoi post
- **Obiettivo:** l'autore può modificare la caption ed eliminare i propri post.
- **Dove:** `PostCard` (menu "…"), composer/edit, `useFeed`.
- **DB/RLS:** policy `posts_update`/`posts_delete` con `using (author_id = auth.uid())`. **Decisione presa — hard-delete, niente `deleted_at`** (DB limitato): l'eliminazione deve (a) eliminare la riga `posts`; (b) **eliminare l'immagine dal bucket Supabase Storage** (è la parte che occupa spazio davvero — senza questo step la decisione è incompleta); (c) i `likes` collegati spariscono via `ON DELETE CASCADE` su `likes.post_id` (aggiungi/verifica la FK con cascade nella migrazione). Se la delete Storage fallisce: log + registra il path per pulizia manuale, segnalalo nel recap, ma non lasciare riga orfana.
- **Fatto quando:** sui propri post compare il menu Modifica/Elimina; modifica aggiorna la caption in DB e in UI; elimina rimuove il post dal feed **e** rimuove l'immagine dallo Storage **e** i like collegati (verificato che lo spazio Storage venga liberato); sui post altrui le azioni **non** compaiono e sono bloccate da RLS (testato).
- **Manuale utente:** policy RLS + FK `ON DELETE CASCADE` su `likes.post_id` in Supabase; tipi.

---

### Task 12 — Profilo: sotto al nome "Fresh cuts", "Barbers", "Follower"
- **Obiettivo:** nel profilo, sotto al nome, tre contatori: **Fresh cuts** = tagli/appuntamenti conclusi dall'utente; **Barbers** = barbieri seguiti; **Follower** = chi segue l'utente.
- **Dove:** schermata Profilo (sostituisce/estende la stat-row esistente).
- **Dati:** Fresh cuts = `count(bookings where client_id = me and status = 'done')`; Barbers = follow verso profili con ruolo barbiere; Follower = `count(follows where followee_id = me)` (dipende dal task 3).
- **Fatto quando:** i 3 numeri sono reali e corretti (verificati con dati di test), aggiornati dopo cambi (nuovo follow, appuntamento concluso); idealmente tappabili per vedere la lista (se fattibile senza rompere altro).
- **Manuale utente:** nessuno se task 3 già migrato; altrimenti dipende da quelle migrazioni.

---

### Task 13 — Tag di 1 utente/barbiere nei post + click → profilo
- **Obiettivo:** un barbiere può taggare **1** utente in un post; un utente può taggare **1** barbiere. Click sul tag → profilo del taggato.
- **Dove:** composer post, `PostCard`, navigazione profilo.
- **DB/RLS:** `posts.tagged_profile_id uuid null references profiles(id)` (un solo tag per post). Update policy già coperta dall'autore.
- **Fatto quando:** in fase di creazione post si può selezionare e salvare 1 tag; nel feed il tag appare come chip cliccabile che porta al profilo corretto; massimo 1 tag per post enforced lato UI e schema.
- **Manuale utente:** migrazione (`tagged_profile_id`) + tipi.

---

### Task 14 — Skeleton di caricamento (eliminare i flash di UI)
- **Obiettivo:** mostrare skeleton/placeholder durante i caricamenti per evitare flash di UI vuota o di contenuto.
- **Dove:** Feed, Discover (lista e marker), Profilo, Notifiche, Appuntamenti, chat.
- **Fatto quando:** ogni schermata che fa fetch mostra uno skeleton coerente col design system finché i dati non arrivano; nessun "flash" percepibile passando tra tab o ricaricando; il rendering è progressivo (UI non bloccata).
- **Manuale utente:** nessuno.

---

### Task 15 — I toast durano 2 secondi in meno
- **Obiettivo:** ridurre la durata del toast di 2 secondi.
- **Dove:** componente `Toast` (nel prototipo: `setTimeout(onClose, 5000)`).
- **Fatto quando:** la durata passa da 5000ms a **3000ms** (o, se nel codice reale il valore è diverso, valore attuale − 2000ms, minimo ragionevole ~1500ms); verificato a video.
- **Manuale utente:** nessuno.

---

### Task 16 — Direct message tra barbieri e utenti
- **Obiettivo:** messaggistica diretta utente ↔ barbiere (lista chat + schermata conversazione).
- **Dove:** nuove schermate Chat/Conversazione, hook dedicato, Supabase Realtime (opzionale ma consigliato per i nuovi messaggi).
- **DB/RLS:** `conversations (id, participant_a uuid fk profiles, participant_b uuid fk profiles, status text default 'open', created_at)`; `messages (id, conversation_id fk, sender_id uuid fk profiles, body text, created_at, read_at null)`. RLS: select/insert solo per i partecipanti della conversazione; update status solo partecipanti.
- **Fatto quando:** due profili (un utente e un barbiere) si scambiano messaggi in tempo (o quasi) reale; solo i partecipanti vedono la conversazione (testato con un terzo profilo che non deve vederla).
- **Manuale utente:** migrazioni + RLS + tipi; abilitare Realtime sulle tabelle se usato.

---

### Task 17 — Non creare il ticket/chat se non si invia alcun messaggio
- **Obiettivo:** aprire la schermata chat **non** deve creare la conversazione; la conversazione si crea **solo al primo messaggio inviato** (lazy-create).
- **Dove:** apertura chat + invio primo messaggio (collegato al task 16).
- **Fatto quando:** apro una chat con qualcuno e la chiudo senza scrivere → nessuna riga in `conversations`/`messages`; scrivo e invio → la conversazione viene creata in quel momento e il messaggio salvato.
- **Manuale utente:** nessuno (logica applicativa).

---

### Task 18 — Riaprire una chat chiusa
- **Obiettivo:** utenti e barbieri possono riaprire una conversazione con stato "chiusa".
- **Dove:** schermata conversazione/lista chat (collegato a 16).
- **Cosa:** azione "Riapri chat" che riporta `conversations.status` a `open` (o l'invio di un nuovo messaggio riapre automaticamente). RLS update consentita ai partecipanti.
- **Fatto quando:** chiudo una chat, compare lo stato chiuso, posso riaprirla e tornare a scrivere; lo stato persiste su DB ed è coerente per entrambi i partecipanti.
- **Manuale utente:** dipende dalle policy/tabelle del task 16 (già coperte se fatte lì).

---

### Task 19 — "I miei appuntamenti" funzionante + cronologia
- **Obiettivo:** la schermata appuntamenti mostra dati reali, con **prossimi** e **cronologia** (passati/conclusi/cancellati) funzionanti.
- **Dove:** schermata appuntamenti, `useBooking`/query su `bookings`.
- **Cosa:** sostituisci eventuali dati hardcoded con query reali su `bookings` del profilo corrente; separa "Prossimi" (data ≥ oggi, non cancellati) da "Cronologia" (passati o `done`/`cancelled`), ordinati; collega al conteggio "Fresh cuts" del task 12.
- **Fatto quando:** gli appuntamenti reali appaiono nelle sezioni giuste; creando una prenotazione compare tra i prossimi; uno passato/concluso compare in cronologia; nessun dato finto residuo.
- **Manuale utente:** nessuno (salvo dati di test in DB per verificare).

---

### Task 20 — Il reload della pagina non slogga
- **Obiettivo:** ricaricando la pagina la sessione resta attiva (niente logout involontario).
- **Dove:** `lib/supabase.ts`, `useAuth`, route guard/redirect.
- **Cause tipiche:** client Supabase senza persistenza sessione; redirect alla login **prima** che `getSession()` si risolva (race condition). **Fix:** client con `auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }`; in `useAuth` introduci uno stato `initializing`; le route protette e i redirect devono **attendere** la fine dell'inizializzazione auth prima di decidere (mostra skeleton/splash nel frattempo).
- **Fatto quando:** login → reload (più volte, anche su route protette) → resti loggato e sulla pagina corrente; logout esplicito continua a funzionare.
- **Manuale utente:** nessuno (eventualmente verificare config provider auth su Supabase, ma di norma già a posto).

---

## 4. Riepilogo migrazioni di schema (le scriverà Claude, le esegue l'utente)

Da raccogliere in `supabase/migrations/` e da elencare nel recap finale, **in ordine di applicazione**:

1. `barbers.accepting_bookings` (task 1) + policy `bookings_insert` aggiornata.
2. `posts.author_id` + backfill + `barber_id` nullable + RLS insert/update/delete autore + **FK `likes.post_id` con `ON DELETE CASCADE`** (task 2, 11, 13).
3. `follows` → `(follower_id, followee_id)` + backfill + RLS (task 3).
4. `availability_breaks` (o estensione availability) + RLS (task 4).
5. ~~`app_config`~~ — **non serve**: manutenzione via env var `VITE_MAINTENANCE` (task 5, decisione presa).
6. `reviews`/`reviews_count` **solo se necessario** (task 8).
7. `profiles.is_admin boolean` + `notifications` + RLS (task 9, decisione presa: `is_admin`, non `role`).
8. `posts.tagged_profile_id` (task 13).
9. `conversations` + `messages` + RLS (task 16/17/18).

Dopo ogni gruppo di migrazioni: **rigenerare `src/types/supabase.ts`**. Ricorda: con RLS attivo Supabase è deny-all di default, quindi ogni nuova tabella ha bisogno di `alter table ... enable row level security;` + policy esplicite.

---

## 5. Consegna finale (obbligatoria, dopo i 20 task)

Quando tutti i task sono `✅`/`⚠️`, produci un **recap step-by-step** che includa:

1. **Per ogni task (1–20):** cosa è stato fatto, file principali toccati, stato finale, eventuali limiti.
2. **Interventi manuali per l'utente, in ordine esatto da eseguire**, con i comandi/SQL esatti:
   - Migrazioni SQL da incollare nello SQL editor di Supabase (in ordine).
   - Comando per rigenerare i tipi.
   - Env var da aggiungere su Vercel (es. `VITE_MAINTENANCE`, eventuali chiavi) e dove.
   - Assegnazione ruolo admin (query SQL esatta).
   - Eventuale abilitazione Realtime sulle tabelle.
   - Verifica bucket/policy Storage per gli avatar.
   - `npm run build` + deploy (`vercel --prod`).
3. **Checklist di verifica finale** che l'utente può spuntare task per task.
4. Eventuali **task non risolti o parziali** con motivo chiaro e cosa serve per chiuderli.

---

## 6. Promemoria finali per Claude
- Un task per volta. Avanza **solo** quando i criteri "Fatto quando" sono verificati davvero (non "dovrebbe funzionare").
- Aggiorna `PROGRESS.md` dopo ogni task; è ciò che salva il contesto attraverso i `/compact`.
- `/compact` ogni 2–3 task, dopo aver aggiornato `PROGRESS.md`, preservando: piano 20 task + stato, schema/migrazioni, interventi manuali. Dopo il compact ri-leggi `PROGRESS.md` e questo file.
- Non rompere `BookingSheet`, auth/sessione, feed.
- Rispetta design system (`C`, icone Tabler, dark mode via CSS variables).
- Tutto ciò che tocca il DB → migrazione + RLS scritte e registrate come step manuale, mai assunto come già applicato.
- Alla fine: recap step-by-step + lista interventi manuali ordinata + checklist di verifica.
