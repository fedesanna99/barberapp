# FIX_BLOCK_4_5_NEXT_SLOTS — RPC next_available_slots + cablaggio agenda pill + quick slots

Blocco 4.5 chiude i due placeholder transitional del Discover V4 (Blocco 4
chiuso commit `0074a66`): agenda pill `"sab 10:00"` hardcoded + quick slots
`QUICK_SLOTS`/`TAKEN_QUICK` hardcoded.

Branch worktree: `claude/next-slots` (HEAD da `0074a66`).

## 1. File modificati / nuovi

| File | Tipo | Cambio |
|------|------|--------|
| `supabase/migrations/041_next_available_slots.sql` | **NEW** | RPC `public.next_available_slots(p_barber_id uuid, p_count int=6, p_from timestamptz=now())` LANGUAGE plpgsql STABLE SECURITY INVOKER. Lookout 14gg constant, slot interval `COALESCE(barbers.default_slot_minutes, 30)`, vacation-aware (return 0 righe se `accepting_bookings=false`), mix available+taken cronologico LIMIT N, taken via `NOT EXISTS booking_slots` (mig 032), filtra slot passati + break window. GRANT EXECUTE a anon+authenticated. **Nessun nuovo indice** (riusa `bookings_no_double` partial unique di mig 008/009 per il lookup). |
| `src/hooks/useNextSlots.ts` | **NEW** | Wrap React della RPC. Shape `NextSlot { slot_date, slot_time, slot_available }`. Stale-check via `alive` flag, refetch su cambio `barberId`/`count`. |
| `src/hooks/useNextAppointment.ts` | **NEW** | Query bookings per il prossimo appt futuro del cliente. Filtro OR (`date > today` OR `date = today AND time_slot > now`). `.limit(1).maybeSingle()`. JOIN barbers→profile per `display_name` (utile future, oggi solo per agenda pill basic). |
| `src/lib/format.ts` | edit | Aggiunto `formatNextAppointmentPill(date, time) → "sab 10:00"` (DAYS_IT_SHORT + HH:MM). |
| `src/screens/Discover.tsx` | edit | 5 modifiche: (a) imports useNextAppointment/useNextSlots/formatNextAppointmentPill; (b) call `useNextAppointment(userId)` dentro Discover; (c) agenda pill conditional null-hidden con `pillText.split(' ')` per separare day/time mono; (d) call `useNextSlots(barber.id)` dentro BarberCardSheet con `null` se `isSelf` o `acceptingBookings=false`; (e) render quick slots cablato + cleanup constants `QUICK_SLOTS`/`TAKEN_QUICK`. Section nascosto se `nextSlots.length === 0`. Eyebrow "Slot di oggi" → "Prossimi slot" (più accurato — può essere domani/dopodomani). |
| `src/types/supabase.ts` | edit | Aggiunto `next_available_slots` in `Database['public']['Functions']` con Args + Returns shape. |
| `DEPLOYMENT.md` | edit | Aggiunta nota mig 041 in §2.0 (dopo nota 040). Include warning sul plan post-deploy (verifica `EXPLAIN ANALYZE` con `bookings_no_double` index scan) + nota bug overlap. |
| `FIX_BLOCK_4_5_NEXT_SLOTS_NOTES.md` | **NEW** | Questo file. |

**Totale: 4 modifiche + 4 new = 8 file.**

## 2. Decisioni Step 2 confermate

- **Lookout window**: 14 giorni constant `c_lookout_days int := 14` dentro la funzione
- **Slot interval**: `COALESCE(barbers.default_slot_minutes, 30)` minuti
- **Vacation gate**: se `barbers.accepting_bookings = false` → `RETURN` early (0 righe)
- **Taken logic**: scenario (A) — `NOT EXISTS booking_slots WHERE date=slot.date AND time_slot=slot.time` (match esatto, no overlap durata)
- **Include taken**: SÌ, mix available+taken cronologico, `LIMIT 6` ordered by `(slot_date, slot_time)` ASC
- **Index**: nessun nuovo — riusa `bookings_no_double` partial unique (mig 008/009)
- **Naming**: plurale `next_available_slots` confermato
- **Security**: INVOKER (booking_slots view è già row-safe via mig 032)
- **Grant**: `anon, authenticated` (pre-login pubblico potrebbe servire in future, no harm)

## 3. Decisioni operative durante implementazione

- **`onBook(barber)` signature invariato**: il tap su quick slot apre BookingSheet con il barbiere selezionato, **MA** non pre-popola data/ora. Estendere la signature richiederebbe modifiche a `App.tsx` + `BookingSheet.tsx` (prefillDate/prefillTime). Scope creep evitato — annotato come TODO Blocco 6 (vedi §6).
- **Eyebrow "Slot di oggi" → "Prossimi slot"**: la copy hardcoded del drop-in diceva "Slot di oggi" ma la RPC ritorna slot dei prossimi 14 giorni, non solo oggi. Correzione minima per accuratezza UX.
- **Section nascosto se `nextSlots.length === 0`**: gestione graceful di stati edge (barbiere vacanza, demo mode con id non valido per RPC, calendario tutto pieno).
- **Status pill "Aperto · prossimo: 11:30"** (BarberCardSheet linea 517): hardcoded "11:30" NON toccato. È un terzo placeholder transitional NON menzionato nel brief Step 7. Annotato come TODO Blocco 6.
- **`useNextAppointment` realtime**: non subscribed a `bookings` channel — refetch al mount, accettabile per agenda pill (cambio raro). Se diventa fastidioso, aggiungere realtime in PR successivo.
- **`useNextSlots` realtime**: non subscribed — slot grid cambia raramente fuori dal proprio booking flow. Aggiunge complexity, scope-out.

## 4. Build status

- `npx tsc --noEmit` → **0 errori**
- `npx vite build` → **success** in 6.17s
- PWA precache 13 entries (1503.66 KiB) — invariato vs Blocco 4
- Solo warning preesistente sul chunk maplibre-gl (>500 kB) — NON causato da Blocco 4.5
- Lint: non eseguito (no script npm)

## 5. Smoke test (Step 9) — DA ESEGUIRE LATO UTENTE

Avvia dev server dal worktree:
```bash
cd C:\Users\fedes\Desktop\repository\barberapp\.claude\worktrees\next-slots
npm run dev -- --host
```

Setup:
1. Login cliente test (es. prova999@gmail.com)
2. Verifica/crea almeno 1 booking futuro pending o confirmed
3. Apri Esplora

Checklist:
```
[ ] Agenda pill in top strip mostra "<giorno> HH:MM" reale del prossimo appt
[ ] Verifica via DB che il giorno+ora coincida col booking del cliente
[ ] Manipola DB: DELETE bookings futuri del cliente (o status='cancelled')
[ ] Refresh Esplora → agenda pill SCOMPARE completamente (NO placeholder)
[ ] Crea un nuovo booking futuro
[ ] Refresh Esplora → agenda pill RIAPPARE con nuovo orario
[ ] Tap su un pin barbiere → bottom sheet diventa preview card
[ ] Quick slots in card mostra 6 slot orari reali (NON piu 10:00/10:30/11:00/...)
[ ] Slot occupati hanno strikethrough (verifica via DB con un booking nel slot)
[ ] Tap su slot disponibile → apre BookingSheet (senza pre-fill — Blocco 6)
[ ] Slot occupati non sono cliccabili (disabled, cursor not-allowed)
[ ] Barbiere con accepting_bookings=false → quick slots section nascosto (gia gestito)
[ ] Barbiere senza availability (no rows in availability table) → quick slots nascosto
[ ] Dark mode coerente
[ ] Performance: cambio pin selezionato → quick slots si aggiornano <1s
```

## 6. TODO out-of-scope

- **`onBook` prefill slot**: il tap su quick slot apre BookingSheet senza pre-popolare data/ora. Estendere signature a `(barber, prefillDate?, prefillTime?)` + propagare a App.tsx + BookingSheet.tsx → Blocco 6 BookingSheet refactor.
- **Status pill "Aperto · prossimo: HH:MM"** (`Discover.tsx:517`): hardcoded "11:30". Da cablare a `nextSlots[0]` (first available di oggi) → Blocco 6.
- **`useNextAppointment` realtime**: subscription a bookings channel per refresh live agenda pill quando cliente cancella/aggiunge appt mentre vede Esplora. Costo medio, beneficio basso. Non urgente.
- **`useNextSlots` realtime**: stesso pattern, lo slot grid cambia raramente fuori dal proprio booking flow.
- **BarberProfileSheet quick slots**: il pack mostra anche quick slots nel BarberProfileSheet (`pari-barberprofile.jsx`). Cablare al `useNextSlots` esistente → Blocco 6.

## 7. Bug overlap durata service — scope ESTERNO a Blocco 4.5

Sistema-wide consistente (useAvailability.ts + booking_slots view +
bookings_no_double unique partial index TUTTI ignorano service duration).
NON fixato in questa RPC per evitare regressione di UI consistency con
BookingSheet.

Pattern repro:
- `barbers.default_slot_minutes=30`
- `services.duration_minutes=60`
- booking esistente 14:00
- slot 14:30 mostrato AVAILABLE in Discover + useAvailability +
  insertabile via `bookings_no_double` (vincola solo `time_slot` esatto)
- doppio booking 14:00–15:00 e 14:30–15:00 sovrapposti in calendario reale

Fix richiede PR dedicata multi-layer:
- migration view `booking_slots` v2 con `slot_end` calcolato (JOIN `bookings` + `services` per `duration_minutes`)
- migration check constraint overlap su `bookings` (via EXCLUDE constraint con `tstzrange` o pattern equivalente)
- `useAvailability.ts` logica overlap range (slot_end <= booking.start OR slot_start >= booking.end)
- `next_available_slots` RPC logica overlap range (stessa)
- BLOCKER test overlap su DB reale: setup 60min service @14:00 + verifica 14:30 marcato taken in tutti i layer

Item per backlog post-handoff.

## 8. Post-deploy verification — RISULTATI (eseguito 2026-05-26)

DB push completato senza errori:
```
Applying migration 041_next_available_slots.sql...
Finished supabase db push.
```

### Check 1 — Function exists
```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname='next_available_slots';
```
**Risultato**: 1 riga, `proname='next_available_slots', prosecdef=false` (SECURITY INVOKER come da design). PASS.

### Check 2 — RPC funzionale
```sql
SELECT * FROM next_available_slots('57a306c3-753c-4f6e-90bc-55187e7429c6'::uuid, 6, now());
```
**Risultato**: 6 righe ritornate, tutte `slot_available=true`:
| slot_date | slot_time | slot_available |
|---|---|---|
| 2026-05-27 | 09:00:00 | true |
| 2026-05-27 | 09:40:00 | true |
| 2026-05-27 | 10:20:00 | true |
| 2026-05-27 | 11:00:00 | true |
| 2026-05-27 | 13:00:00 | true |
| 2026-05-27 | 13:40:00 | true |

**Osservazioni**:
- Slot interval = **40 minuti** (barbiere ha `default_slot_minutes=40` settato, non default 30)
- Gap 11:40 → 13:00 = **break window** correttamente filtrato (barbiere ha break_start ~11:40, break_end ~13:00)
- Tutti available=true (nessun booking nei prossimi slot di questo barbiere). Coerente con dati reali.
- ORDER BY (date, time) ASC verificato (cronologico).
- Nessun slot passato (filtro `> p_from` funziona).

PASS.

### Check 3 — EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE SELECT * FROM next_available_slots('57a306c3-753c-4f6e-90bc-55187e7429c6'::uuid, 6, now());
```
**Risultato**:
```
Function Scan on next_available_slots  (cost=0.25..10.25 rows=1000 width=13)
  (actual time=6.361..6.363 rows=6 loops=1)
Planning Time: 0.039 ms
Execution Time: 6.423 ms
```

**Verdetto**: `Function Scan` esposto (Postgres opaque per PL/pgSQL functions — non mostra il plan interno della query CTE). Execution time **6.4 ms totali** — molto buono. Il NOT EXISTS interno verso `booking_slots` è incapsulato.

Per validare uso effettivo di `bookings_no_double` indice, eseguire query SQL replica del NOT EXISTS:
```sql
EXPLAIN ANALYZE
SELECT NOT EXISTS (
  SELECT 1 FROM booking_slots bs
   WHERE bs.barber_id = '57a306c3-753c-4f6e-90bc-55187e7429c6'::uuid
     AND bs.date = '2026-05-27'::date
     AND bs.time_slot = '09:00:00'::time
);
```
Atteso: Index Scan su `bookings_no_double` (l'indice partial UNIQUE su `(barber_id, date, time_slot)` WHERE status IN ('pending','confirmed')) — `booking_slots` view è solo proiezione di bookings filtrata, il planner risolve via l'indice.

**Performance**: 6.4 ms per chiamata RPC è eccellente. Se in futuro il volume bookings cresce, monitorare. Acceptable per produzione MVP.

PASS performance.

### Verdetto overall post-deploy
✅ Mig 041 applicata senza errori, RPC funzionale, performance ottima. Pronta per smoke test UI lato utente (Step 9).
