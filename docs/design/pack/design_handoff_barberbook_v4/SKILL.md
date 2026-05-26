---
name: barberbook-design
description: Use this skill to generate well-branded interfaces, components, and screens for Barberbook — a warm, Italian-language barber-booking PWA built on the "Pari" design system. V4 is the definitive version, featuring a map-first Esplora screen with 3 sheet snap states. Contains essential design guidelines (colors, type, fonts, radii, shadows, motion), production-ready CSS tokens, full UI kit React/JSX components, and 13 fully-designed screens covering the entire client + barber + admin app. Use whenever building production code, hi-fi prototypes, mocks, slides, or any visual artifact that should look like Barberbook.
user-invocable: true
---

Read the **README.md** file within this skill first — it contains the complete design handoff documentation including:
- Every design token (color, type, spacing, radius, shadow, motion)
- Every screen with purpose, layout, components
- ⭐ The V4 map-first Esplora pattern (the key delta from V1)
- Interaction patterns + animations
- State management notes
- Recommended implementation order
- Pattern rules (non-negotiable)
- DB schema additions needed for V4 (lat/lng)
- Mapbox GL JS integration guidance

## Quick orientation

- **Brand name**: Barberbook (Italian PWA for booking barbers)
- **Design system**: "Pari raffinato" — warm seppia + cream + clay + warm-brown ink
- **Current version**: **V4 "Pari + Mappa"** — V1 polished with map-first Esplora
- **Visual signature**: paper #FCFAF5, ink #46413B, clay #B07F61. Geist (display + body) + Geist Mono (numbers). 1.85px stroke Lucide-style icons. Hairline 1px borders + soft shadows. Italian informal copy.
- **Logo**: "PoleMark" — three vertical 4×24 bars (ink/clay/ink), 32×32 viewbox.

## V4 highlights (vs V1)

The only thing that changed from V1 → V4 is the **Esplora screen**:
- Was: map + list with toggle
- Now: **map-first canvas with 3-state bottom sheet** (min/mid/full)
- Pins: price-pill format ("€22") with status dot (sage/clay/ink-40 for aperto/occupato/chiuso)
- Selected pin: ink-filled with clay pulse halo
- Top strip: agenda pill (left) + filter chips (right), gap 14
- Filter chip active state uses **clay** not ink (to differentiate from the ink agenda pill)
- Empty state: search icon + "Nessuna bottega" + "Mostra tutti" CTA

All 12 other screens are identical to V1.

## Core token file

`v4_pari_mappa/colors_and_type.css` is the **single source of truth** for all design tokens. Copy it into any project and use the CSS variables directly. Includes light + dark themes.

## What's in this skill

- **README.md** — complete handoff documentation (primary reference)
- **v4_pari_mappa/** — 13 hi-fi screens as React/JSX prototypes + assets
- **v1_pari/** — V1 original for reference/comparison
- **V4.html** — canvas with phone + screen switcher
- **V4 Esplora.html** — V1 vs V3 vs V4 Esplora comparison
- **V1 Pages.html** — all 13 V1 screens live, side-by-side

## When to use

If building **production code**: read README.md, copy `colors_and_type.css` as your token system, reference each screen's source JSX file, and adapt to the target codebase's patterns. For V4 Esplora, expect to integrate Mapbox GL JS with a custom Pari style.

If building **mocks / slides / throwaway prototypes**: copy assets + tokens + use the patterns in the JSX files as inspiration. Output static HTML.

If the user invokes this skill without other guidance: ask what they want to build, then act as an expert Barberbook designer.

## Hard rules (do not break)

- Only use colors from `colors_and_type.css` — never invent new hex values
- Only use Geist + Geist Mono — never Inter, never system-ui as primary
- Numbers (times, prices, distances, counters) always in Geist Mono
- Italian informal copy: "Vieni dentro", not "Accedi al sistema"
- No emoji, ever. Use SVG icons (1.85px stroke, Lucide-style)
- 4 radius values only: 8 / 12 / 18 / 9999
- Hairline 1px borders (`var(--ink-15)`), not heavy shadows
- Eyebrow labels above sections (uppercase, 0.06em letter-spacing, ink-50)
- ⭐ For Esplora: respect the V4 map-first pattern — 3 snap states, color-coded pins, agenda+chips in top strip. Don't fall back to the old V1 list-toggle pattern.
- Filter chip active = **clay**, not ink (to avoid clash with the ink agenda pill)
