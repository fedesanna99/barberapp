# Migrazione V4 — Guida per Claude Code

> Guida operativa per portare V4 nel repo `fedesanna99/barberappit`.
> Pensata per essere letta da Claude Code in autonomia.

---

## 🎯 Obiettivo

Il repo `fedesanna99/barberappit` ha già implementato V1 della "Pari" design system. **L'unico delta da applicare per arrivare a V4 è il pattern map-first nello schermo Esplora** (`src/screens/Discover.tsx`).

Tutti gli altri 12 schermi sono già conformi a V4 (sono identici tra V1 e V4 — vedi `../README.md`).

---

## 📋 Cambiamenti da fare

### File da SOSTITUIRE
- ✅ **`src/screens/Discover.tsx`** → sostituire con `migration/Discover.tsx` (in questa cartella)

### File da RIMUOVERE (non più usati dalla nuova Discover)
- ❌ `src/components/MapListToggle.tsx` (il toggle mappa/lista non esiste più in V4)
- ❌ `src/components/MapSearchBar.tsx` (la search bar è inline nel nuovo Discover)
- ❌ `src/components/BarberPreviewCard.tsx` (sostituita dal nuovo `BarberCardSheet` inline)

⚠️ Prima di cancellare, **cerca usage**: `grep -r "MapListToggle\|MapSearchBar\|BarberPreviewCard" src/`. Se nessun altro file li importa, vai con la rimozione.

### File INVARIATI (V4 li riusa così come sono)
- `src/components/MapView.tsx` — viene importato lazy come prima
- `src/components/Avatar.tsx` — usato in BarberCardSheet
- `src/components/Icon.tsx` — tutte le icone necessarie esistono già
- `src/components/BarberList.tsx` — riusato per i mode mid/full
- `src/hooks/useBarbers.ts`, `useFollows.ts`, `useGeolocation.ts` — invariati
- `src/lib/colors.ts`, `demoData.ts`, `geo.ts`, `rating.ts` — invariati
- `src/index.css` — TUTTI i token Pari sono già definiti correttamente

### Props contract — invariato

```ts
interface DiscoverProps {
  onBook:        (barber: DemoBarber) => void
  onViewProfile: (barber: DemoBarber) => void
  myBarberId?:   string
  userId?:       string
}
```

Il parent (`App.tsx`) NON va toccato — il nuovo `Discover` ha la stessa identica signature.

---

## ⭐ Cosa fa il nuovo Discover

### Pattern map-first

La mappa è SEMPRE visibile, full-screen. Sopra di essa galleggiano:

1. **Search bar** (top 18px) — pill arrotondata in paper-3 con hairline
2. **Top strip** (top 76px) — flex row: agenda pill nera a sx + filter chip scrollable a dx
3. **FAB Locate** (in basso a dx, sopra il sheet)
4. **Bottom sheet** in basso con 3 stati di snap

### Sheet snap states

```ts
type SheetSnap = 'min' | 'mid' | 'full'
type SheetMode = 'browse' | 'card'
```

| Mode | Snap | Height | Contenuto |
|---|---|---|---|
| browse | min | 64px | Handle row: count + "Lista" button |
| browse | mid | 55% | `BarberList` (esistente) |
| browse | full | 94% | `BarberList` (esistente, più visibile) |
| card | — | auto | `BarberCardSheet` (nuovo componente interno) |

### Interazioni

- **Tap su un pin** → `selectBarber(b)` → mode='card', sheet diventa la card del barbiere
- **Tap handle in min** → snap='mid'
- **Tap handle in mid** → snap='full'
- **Tap handle in full** → snap='min'
- **Tap "Vedi profilo" nella card** → `onViewProfile(b)` (parent callback, invariato)
- **Tap "Prenota una sedia"** o **slot orario** → `onBook(b)` (parent callback, invariato)
- **Tap "X" nella card** → torna a mode='browse' snap='min'

### Quick filters

Top strip ha 4 chip:
- `Tutti` (default)
- `Aperti` — filtra `acceptingBookings !== false`
- `Top` — filtra `rating >= 4.8`
- `Vicini` — filtra `dist <= 1.5`

Quando un filtro non ha risultati, il sheet (in mid/full) mostra empty state con "Mostra tutti" CTA che resetta.

### Agenda pill

Per ora è hardcoded a "sab 10:00" (placeholder). **TODO**: collegarla al prossimo appuntamento reale dell'utente via un nuovo prop o hook `useNextAppointment()`.

```tsx
// Suggestion per il prossimo PR:
const { next } = useNextAppointment(userId)
// → mostrare next.dayLabel + next.time se esiste, altrimenti nascondere la pill
```

---

## 🚀 Procedura passo-passo per Claude Code

1. **Backup** del vecchio Discover (opzionale):
   ```bash
   git mv src/screens/Discover.tsx src/screens/Discover.v1.tsx
   ```

2. **Copia il nuovo Discover** da questo handoff:
   ```bash
   cp design_handoff_barberbook_v4/migration/Discover.tsx src/screens/Discover.tsx
   ```

3. **Verifica typecheck**:
   ```bash
   npm run typecheck   # o tsc --noEmit
   ```
   Atteso: nessun errore. Se ne emergono, sono probabilmente sui nomi delle icone — vedi sezione FAQ sotto.

4. **Rimuovi componenti non più usati** (controllando prima i grep):
   ```bash
   grep -r "MapListToggle\|MapSearchBar\|BarberPreviewCard" src/ --include="*.tsx" --include="*.ts"
   ```
   Se l'output è vuoto (o solo si autoreferenzia), procedi:
   ```bash
   rm src/components/MapListToggle.tsx
   rm src/components/MapSearchBar.tsx
   rm src/components/BarberPreviewCard.tsx
   ```

5. **Test in dev**:
   ```bash
   npm run dev
   ```
   Apri `http://localhost:5173`, vai a Esplora (tab map). Verifica:
   - Mappa fullscreen visibile
   - Strip "5 bottega vicino a te" + bottone "Lista" in basso
   - Tap su un pin → card sheet con stat strip + quick slots + Prenota
   - Tap "Lista" → sheet sale a 55%, mostra `BarberList`
   - Tap handle → cicla min → mid → full → min

6. **Test su Supabase reale** (se `IS_DEMO=false`):
   - I dati arrivano da `useBarbers()`, viene fatto `toDisplayBarber()` come prima
   - `lat`/`lng` devono essere presenti nei `barber_profiles` per i pin (già richiesto dalla mappa esistente)

7. **Commit & PR**:
   ```bash
   git add -A
   git commit -m "feat(discover): V4 map-first redesign

   - Remove map/list toggle, map is now always the canvas
   - Add 3-snap bottom sheet (min/mid/full) + card mode
   - Quick filter chips (Tutti/Aperti/Top/Vicini)
   - New BarberCardSheet replaces BarberPreviewCard
   - Agenda pill in top strip (placeholder, TODO real wiring)

   Closes #<issue>"
   ```

---

## ❓ FAQ migrazione

**Q: I nomi delle icone usate dal nuovo Discover sono tutti presenti in `Icon.tsx`?**
A: Le icone usate sono `search`, `close`, `pin`, `star`, `refresh`, `calendar`, `caret-right`, `caret-up`. Verifica con un grep nel tuo `Icon.tsx`. Se un nome non c'è, sostituiscilo con l'equivalente disponibile o aggiungilo al set.

**Q: Il `BarberCardSheet` interno dovrebbe diventare un componente separato?**
A: Sì, idealmente. Per ora è inline in `Discover.tsx` per minimizzare il numero di file modificati. Quando vuoi separarlo, estrailo in `src/components/BarberCardSheet.tsx` esportando con la stessa interfaccia.

**Q: La FAB "layers" del prototipo non c'è in questo Discover.tsx, perché?**
A: Il prototipo aveva un secondo FAB "layers" sopra il locate. Lo abbiamo omesso nel TSX di produzione perché il MapView esistente non ha (ancora) un toggle di stile mappa. Aggiungilo quando vuoi.

**Q: La pulse animation sul pin selezionato c'è?**
A: Nel prototipo sì, ma è gestita dal pin custom interno. Nel codice di produzione il pin è renderizzato dal `MapView` (Mapbox). Per portarla in produzione, modifica `MapView.tsx` o `BarberMarker.tsx` per applicare un alone `var(--clay)` con animazione CSS keyframe `pulse-clay` quando `selectedId === barber.id`. Suggerimento CSS:

```css
@keyframes pulse-clay {
  0%   { transform: scale(0.85); opacity: 0.35; }
  70%  { transform: scale(1.6);  opacity: 0;    }
  100% { transform: scale(1.6);  opacity: 0;    }
}
.barber-marker--selected::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--clay);
  animation: pulse-clay 1.6s var(--ease) infinite;
  z-index: -1;
}
```

**Q: La mappa attuale è Mapbox o un'altra libreria?**
A: Vedi `src/components/MapView.tsx` per la implementazione corrente. Il nuovo Discover non cambia la libreria mappa — usa il `MapView` esistente con la stessa interfaccia `barbers/userCoords/selectedId/onSelect/...`.

**Q: Cosa succede se il MapView crasha (mapErrored)?**
A: Nel nuovo Discover, mapErrored attiva uno snackbar e forza `snap='full'` (lista a tutto schermo). Il vecchio Discover forzava `view='list'`. Il nuovo è più graceful.

---

## 📦 File in questa cartella

```
migration/
├── README.md          ← questo file
└── Discover.tsx       ← drop-in replacement per src/screens/Discover.tsx
```

Per riferimento generale (palette, type, schermi, ecc.), vedi `../README.md`.
