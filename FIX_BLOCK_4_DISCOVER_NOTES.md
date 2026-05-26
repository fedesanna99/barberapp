# FIX_BLOCK_4_DISCOVER_NOTES — Discover V4 map-first

Drop-in del nuovo `Discover` map-first dal pack Pari V4. Bottom sheet 3 snap
states, mappa always-on. Independente dalle 22 Q risposte design (le decisioni
visuali sono tutte già nel mock pack).

Branch worktree: `claude/discover-v4` (HEAD da `f4ee428`).

## 1. File modificati / nuovi / eliminati

| File | Tipo | Cambio |
|------|------|--------|
| `src/screens/Discover.tsx` | **OVERWRITE** | Drop-in completo da `docs/design/pack/design_handoff_barberbook_v4/migration/Discover.tsx` (667 righe). Sostituzione 1:1 invariata. |
| `src/components/Icon.tsx` | edit | Aggiunti 2 glyph mancanti per il drop-in: `caret-right` (alias di `caret`, stesso polyline chevron-right) e `caret-up` (nuovo polyline chevron-up Lucide-style). |
| `src/components/BarberMarker.tsx` | edit | Aggiunto inline span `<span className="barber-marker__halo" />` dietro il pin quando `selected=true`. Patrón clay pulse halo (Q6 decretato). |
| `src/index.css` | edit | Aggiunto `@keyframes pulse-clay` + classe utility `.barber-marker__halo` (size 56px, position absolute centrata, var(--clay) bg, animazione 1.6s var(--ease) infinite). Replica esatta di `v4PinPulse` nel pack `pari-discover.jsx:956-960`. |
| `src/components/MapListToggle.tsx` | **DELETE** | Pattern obsoleto, non più usato (verificato `grep -rn` post-drop-in: 0 referenze residue). |
| `src/components/MapSearchBar.tsx` | **DELETE** | Search inline nel nuovo Discover (overlay floating top). |
| `src/components/BarberPreviewCard.tsx` | **DELETE** | Card inline nel nuovo Discover (rendering nel bottom sheet quando `mode='card'`). |
| `src/components/MapView.tsx` | **VERIFY** (no change) | Signature già compatibile (`barbers/userCoords/fallback/selectedId/onSelect/followedProfileIds?/centerOnUserRequest?/onMapLoad?/onError?`). Drop-in passa tutti i props esistenti + `onError`. |
| `FIX_BLOCK_4_DISCOVER_NOTES.md` | **NEW** | Questo file. |

**Totale: 4 modifiche + 3 delete + 1 new = 8 file toccati.**

## 2. Decisioni prese durante il lavoro

- **MapView NON modificato**: signature già compatibile con drop-in. Zero change al component mappa. Step 3 del brief → nessun adattamento richiesto.
- **2 icon nuovi nel set Icon.tsx**:
  - `caret-right` = stesso SVG di `caret` (`<polyline points="9 18 15 12 9 6" />` — chevron-right). Aggiunto come alias separato per match con `name="caret-right"` usato dal drop-in (linee 279 e 644 del Discover.tsx).
  - `caret-up` = nuovo glyph Lucide-style (`<polyline points="6 15 12 9 18 15" />`). Usato dal drop-in linea 377 nel handle del bottom sheet ("Lista" + caret-up).
- **Pin pulse halo come inline span (NON pseudo-element CSS)**:
  - Pack `pari-discover.jsx:201-214` usa inline `<span>` con animazione. README migration suggerisce pattern alternative `::before` con className.
  - Scelto inline span per coerenza con il pattern del pack (`v4PinPulse` keyframes copiate) e per minimo cambio a `BarberMarker.tsx` (1 riga aggiunta). Classe `.barber-marker__halo` definita in index.css.
  - Keyframes name = `pulse-clay` (non `v4PinPulse`), per coerenza naming Pari V4 (sage/rust/clay schema).
- **DiscoverProps interface invariata**: il drop-in mantiene la stessa interfaccia `{ onBook: (barber: DemoBarber) => void }` — nessun cambio richiesto in `App.tsx` o altri caller.

## 3. Step 1 — gate pre-drop-in (tutti i 4 PASS)

| Verifica | Risultato |
|---|---|
| (a) Pack in `docs/design/pack/` | OK — `migration/Discover.tsx` (667 righe) + `v4_pari_mappa/` |
| (b) Hook + component esistenti | TUTTI presenti, signature cite: `useBarbers:28`, `SortMode:23`, `useFollows:14`, `useGeolocation:12`, `geo.haversineKm:6`, `geo.formatKm:18`, `useFeed.accentFromId:39`, `useFeed.initialsFromName:45`, `rating.ratingDisplay:20`, Avatar/BarberList/Icon/MapView |
| (c) Import drop-in | Zero gap |
| (d) Icon set | 6 OK (`refresh`, `search`, `close`, `calendar`, `pin`, `star`) + 2 MISSING (`caret-right`, `caret-up`) → aggiunti in Step 4 |
| MapView signature (Step 3) | Già compatibile, no change |
| Componenti da DELETE (Step 6) | Verificato 0 referenze residue fuori da Discover.tsx |

## 4. Build status

- `npx tsc --noEmit` → **0 errori**
- `npx vite build` → **success** in 4.20s
  - dist/index.html ~1 KB
  - dist/assets/index-*.css ~79 KB (gzip 12.85 KB)
  - dist/assets/MapView-*.js ~40 KB (gzip 14 KB) — code-split mantenuto
  - dist/assets/index-*.js ~365 KB (gzip 105 KB)
  - dist/assets/maplibre-gl-*.js ~1054 KB (gzip 285 KB) — warning preesistente, NON causato da Blocco 4
- PWA v1.3.0 → 13 entries precache (1.5 MB)
- Lint: non eseguito (no `npm run lint` configurato — tsc copre i type check, vite copre i syntax check)

## 5. Smoke test (Step 8) — DA ESEGUIRE LATO UTENTE

Avvia dev server dal worktree:

```bash
cd C:\Users\fedes\Desktop\repository\barberapp\.claude\worktrees\discover-v4
npm run dev -- --host
```

Apri http://localhost:5173 (o IP LAN dal telefono).

Checklist smoke (10-15 min):

```
SETUP login cliente con almeno 3 barbieri demo (o seed reali) visibili
[ ] Navigazione → Esplora apre la nuova screen
[ ] Mappa è full-screen, NON c'e toggle Mappa/Lista
[ ] Top strip mostra: search bar + filter chips (Tutti/Aperti/Top/Vicini) + agenda pill "sab 10:00" (placeholder)
[ ] Search funziona (filtra barbieri per nome)
[ ] Filter chip tap → filtra (es. "Aperti" mostra solo barbieri con accepting_bookings=true)
[ ] Bottom sheet snap minimo (handle row visibile in fondo, ~64px)
[ ] Drag/tap handle → snap mid (~55% altezza, lista barbieri visibile)
[ ] Drag/tap up ancora → snap full (~94% altezza)
[ ] Tap su un pin sulla mappa → bottom sheet diventa Barber Preview Card con stat strip, tags, slot rapidi
[ ] Card mostra avatar, nome, citta, rating, distanza, followers, tag
[ ] Tap "Prenota" sul card → apre BookingSheet con quel barbiere
[ ] Tap fuori dal card o "X" → torna a browse mode (snap min)
[ ] Pin selezionato ha pulse animation visibile (alone clay 1.6s loop)
[ ] Filter chip "Vicini" funziona solo se geolocation è attiva
[ ] Dark mode (toggle se esiste) → tutta la screen renderizza in dark coerente
[ ] Performance: scrolling lista barber smooth, no lag
[ ] Agenda pill placeholder "sab 10:00" visibile (è transitional, verrà sostituito Blocco 4.5)
```

Se ≥3 fail critici → STOP e segnala in questo file. Altrimenti → autorizza Step 9 commit.

## 6. TODO out-of-scope (NON fatto in questo blocco)

- **Agenda pill cablata** → Blocco 4.5. Lasciato placeholder `"sab 10:00"` come da brief (riga 278 del nuovo Discover). Verrà sostituito da hook `useNextSlot` + RPC `next_available_slot`.
- **`next_available_slot` RPC** → Blocco 4.5. Nuova migration + edge function/RPC + hook.
- **Drift cromatico/tipografico named entities Discover** → Blocco 6. Audit ha segnalato 4 occorrenze (`Discover.tsx:33-34` barber.profile.display_name come named entity in Geist sans, da convertire in Instrument Serif italic).
- **Instrument Serif sweep generale** → Blocco 5.
- **`<Mono>` component** → Blocco 5.
- **Refactor MapView per cluster pin pulse**: il halo è applicato solo a `BarberMarker`, non al `ClusterMarker`. Se cluster pin "expanded" view dovesse mostrare un selected highlight, da gestire separatamente. Non in scope per Blocco 4.

## 7. Conferma placeholder agenda pill

Riga 278 del nuovo `Discover.tsx`:
```tsx
<span>sab <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>10:00</span></span>
```

**Status**: transitional. Da sostituire in Blocco 4.5 con valore reale da hook `useNextSlot`. Il drop-in NON è stato modificato — placeholder mantenuto invariato.
