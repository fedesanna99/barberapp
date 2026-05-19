# Brief for Claude Code — Full UI/UX rebuild on the "CutBook · Modern Minimal" design system

> **Note on language.** This brief is in English. The **app's own copy stays Italian** — that is a content requirement of the design system, not a translation gap. Every Italian string you see below in `code font` (e.g. `Prenotato.`, `Slot occupato. Scegline un altro.`, nav labels like `Esplora`) is the **literal UI text to ship**, not to be translated.

> **Goal in one line:** replace the **entire** presentation layer of the app with the visual language of the *CutBook Modern Minimal* design system (skill `cutbook-design`), **without touching a single line of the logic/data layer**. Same app, same features, same Supabase queries, same RLS rules — new skin, built by applying the design system. The canonical kit is the **reference direction to adapt** to real data and real states, not a mockup to reproduce pixel-for-pixel.
>
> **Stack context:** React 18 + Vite + TypeScript + Supabase (Postgres + Auth + Storage + Realtime), MapLibre GL, deployed on Vercel. Mobile-first app, bottom nav. A separate brief already exists (`discover_map_brief.md`) for the Esplora map: this brief **does not replace it**, it complements it (see §7).
>
> **Design source:** the `cutbook-design` skill. The **visual source of truth** is the tokens (`colors_and_type.css`) + the hard rules + the voice. The canonical reference for *how it is applied* is `ui_kits/cutbook_app/` (hi-fi recreation, but with **demo data and illustrative compositions**: a direction to adapt, not a photograph of the final app). Anything that diverges from `colors_and_type.css` is a bug in the kit, not in the system.

---

## 0. Synthetic prompt to paste into Claude Code

> Rebuild **only the UI layer** of the barber app (React + Vite + TS + Supabase) from scratch. The target design is the **CutBook Modern Minimal** design system, available in the `cutbook-design` skill: white surfaces, near-black ink, **one coral accent `#FF5C39`** used sparingly, **Onest** font (display+body) + **JetBrains Mono** (numbers only), **Phosphor Thin** icons, **Italian** copy, sentence case, no emoji, no gradients, no backdrop-filter, radii `6/10/16/pill`, `1px` borders at 10% ink. Adopt **verbatim** `colors_and_type.css` (in its **updated version that includes the dark block**) and `ui_kits/cutbook_app/app.css` as global stylesheets. **Dark mode is in scope** (decision made, the existing app already uses it): dark tokens come from the updated design system and override the same variable names via `@media (prefers-color-scheme: dark)` — components don't change, see §9. Port the kit components (`primitives.jsx`, `sheets.jsx`, `screens.jsx`, `screens-extra.jsx`, `App.jsx`) from JSX to **typed TSX**, replacing the `DEMO_*` data with the **existing real hooks** (`useAuth`, `useFeed`, `useBarbers`, `useAvailability`, `useBooking`) and wiring the callbacks to the existing routing/state. **The kit is the reference direction, not a mockup to clone pixel-for-pixel:** it has fake data and fixed compositions — apply tokens/primitives/rules/voice/flow-structure faithfully, but **adapt** layout and states to reality (variable-length data, pagination, loading/empty/error, role variants, schema gaps) with a designer's judgment, see §1.1. **A feature that exists in the app but isn't depicted in the kit must be adapted into the same visual language — never removed, hidden, or "simplified away".** Dropped functionality is a regression, not a simplification. **Do not modify**: Supabase client, hooks, queries, generated types, RLS policies, DB schema, booking logic. Migrate icons from Tabler (`ti ti-*`) to Phosphor Thin (`ph-thin ph-*`) with the table in §3. Keep the 2-step booking flow (date/time → confirm → toast) but feed it from real `useAvailability` instead of hardcoded slots. **Before writing any code, do Phase 0 (§0.1): recon the real repo, inventory every existing feature, produce a written plan, and stop for confirmation.** Then follow sections 1–12 and the §11 checklist in detail.

---

## 0.1 Phase 0 — Recon & plan before any code (mandatory, no edits)

**Do this first. No file is touched in Phase 0 — the only output is a written plan, and you stop for human confirmation before the commit plan (§12) starts.** This phase exists to validate this brief's assumptions against the *real* repository and to lock the no-feature-loss contract before anything moves.

1. **Verify the logic-layer inventory (§1.2) against the real code.** Open every hook, `lib/supabase.ts`, `lib/geo.ts`, `lib/mapStyle.ts`, `types/`, and `App.tsx`. For each, record the *actual* signature / return shape and **every deviation** from §1.2 (e.g. a hook returns a different shape, `useGeolocation` doesn't exist yet, `App.tsx` mixes logic and markup). The real code wins over this brief — flag the differences, don't silently follow the brief.
2. **Read the design system in full.** `cutbook-design/README.md`, `colors_and_type.css` (**confirm the dark block is present** — if it is not, stop and request it per §2.1/§9, do not improvise), and every kit file (`primitives.jsx`, `sheets.jsx`, `screens.jsx`, `screens-extra.jsx`, `App.jsx`, `app.css`).
3. **Inventory the CURRENT UI feature by feature.** Enumerate every screen, route/tab, interactive element and state the app has today: sort/filter options, menu items, profile tabs, barber actions, like/save/follow, pagination, role gating, sheets, toasts, edge states. **This list is the baseline of the no-feature-loss rule (§1.1).**
4. **Produce the mapping.** A table: *existing feature* → *target kit component / placement* → *status* (`direct match` / `adapt — how` / `gap — proposed adaptation in the design language` / `open question`). Every entry from step 3 must appear here; nothing may be missing or marked "drop".
5. **List open questions & gaps:** schema gaps (price/duration, `open_now`, DMs, notifications), dark-block presence, anything the kit doesn't depict, anything ambiguous in the brief vs. the real code.
6. **Output `REDESIGN_PLAN.md`** (or the PR description) containing steps 1–5, then **stop and wait for human confirmation.** Do not start commit step 1 until the plan is acknowledged.

Keep Phase 0 **bounded**: it is recon plus a plan, not exploratory refactoring. No code, no edits, no "while I'm here" cleanups. If Phase 0 surfaces a contradiction between this brief and the real code, the plan flags it and asks — it does not pick a side unilaterally.

---

## 1. Guiding principle + what NOT to touch

### 1.1 The principle

This is a **view-layer-only replacement**. The app's behavior does not change: *how it looks* changes, not *what it does*. Operating rule for every file you touch:

- If it contains **logic, data, queries, types, auth, routing-state, RLS** → **do not touch it** (you *consume* it).
- If it contains **markup, style, layout, copy, icons** → **rewrite it by applying the design system** (tokens, primitives, hard rules, voice). The `cutbook-design` kit is the **canonical example** of how that system is applied — a reference to **adapt**, not a mockup to clone pixel-for-pixel.

The logic layer is the functional source of truth. The visual source of truth is the **design system** (tokens in `colors_and_type.css`, primitives, hard rules §2.3, voice §8): apply that with absolute fidelity. The **kit** (`ui_kits/cutbook_app/`) is its canonical reference application, but with **demo data and fixed compositions**: use it as direction and starting point, then adapt it to the real functional surface. Your job is to rewire one onto the other **with judgment**, not to copy-paste the mockup.

> ### The kit is a direction, not a reproduction of how the app will be
>
> This is the point not to get wrong. The `cutbook_app/` kit shows **one** composition per screen, with **fake data, fixed counts, known-length lists, one role at a time, no real loading/error states**. The real app has variable-length data, pagination, loading/empty/error states, role variants (client/barber/admin), schema gaps, and content the kit doesn't draw at all. **Claude Code must extend the same visual language to all of this**, with a designer's judgment — don't force reality into the mockup's layout, and don't get stuck if a real screen has more states than the kit shows.
>
> **No feature may disappear.** Do your best to match the design, but if the app has a function the kit doesn't depict, you **adapt** it into the same visual language — you do **not** make it vanish, hide it, or quietly drop it to make the screen match the mockup. The kit being simpler than the app is expected; the response is to design the extra capability *in*, in the same language, not to delete it. Missing functionality is a regression, full stop. If you genuinely cannot place a feature, surface it as an open question in the README — never silently remove it.
>
> What is **binding** (absolute fidelity): the tokens (colors/type/radii/spacing/shadow/motion), the primitives, the hard rules §2.3, the Italian voice/copy §8, the flow structure (e.g. 2-step booking), the logical behavior, **and the full set of existing features**.
>
> What is **reference to adapt** (not a pixel target): the exact composition of the kit screens, its demo data, fixed counts and lists, the number of elements shown, the absence of states in the mockup. Where reality diverges from the kit, **apply the design system to reality** — don't bend reality to the kit.
>
> In short: same *language*, adapted; not same *page*, cloned. And nothing the app does today gets lost on the way.

### 1.2 Inventory of the logic layer to preserve (consume, do not modify)

| Module | What it exposes (output) | What it accepts (input) |
|---|---|---|
| `lib/supabase.ts` | singleton `supabase` instance (typed client `<Database>`, env `VITE_SUPABASE_*`) | — |
| `types/supabase.ts` | generated DB types (`supabase gen types`) | — |
| `hooks/useAuth.ts` | `{ session, profile, signInWithGoogle, signOut }` — `profile` includes the `barbers(*)` join, so the **role** (`profiles.role` + `is_admin`) is derivable here | callbacks `signInWithGoogle`, `signOut` |
| `hooks/useFeed.ts` | `{ posts, loadMore }` — paginated posts from followed barbers, `barbers→profiles` join | `userId`; action `loadMore()` (pagination) |
| `hooks/useBarbers.ts` | `{ barbers, loading }` — discover list with coordinates from the profile | `sort: 'nearby'\|'popular'\|'new'\|'toprated'`, `userLat?`, `userLng?`, `search?` |
| `hooks/useAvailability.ts` | `{ slots, booked }` — client-side generated slots + set of taken times | `barberId`, `date` |
| `hooks/useBooking.ts` | `{ createBooking, cancelBooking, loading }` — `createBooking` inserts with `status:'pending'`; `cancelBooking` → `status:'cancelled'` | `{ clientId, barberId, date, timeSlot }` / `bookingId` |
| `hooks/useGeolocation.ts` | `{ coords, denied, locate, fallback }` (planned by `discover_map_brief.md`) | action `locate()` |
| `lib/geo.ts` | `haversine(profile, lat, lng)` | — |
| `lib/mapStyle.ts` | `MAP_STYLE` (MapTiler + OpenFreeMap fallback) | — |
| `App.tsx` (routing/state) | active tab, **role gating** (client/barber/admin), sheet state (`bookingBarber`, `profileBarber`, `showNotifications`, `showMessages`), toast queue | navigation and sheet-opening callbacks |
| Supabase Realtime | `bookings` table updates (barber dashboard) | — |
| Supabase Auth | Google/Apple, trigger that creates `profiles` on signup | — |

> **From `App.tsx` you may only change the *rendering* of the bottom nav and the screen/sheet mounting** (markup + classes), **not** the state machine (which states exist, who sets them, role gating). If the current `App.tsx` mixes logic and markup, first extract the logic into hooks/functions and leave it intact, then rewrite only the JSX.

---

## 2. Design system: files to adopt and hard rules

### 2.1 Files to bring into the project **verbatim**

1. **`cutbook-design/colors_and_type.css`** → copy to `src/styles/tokens.css` (or `src/index.css` if you prefer a single entrypoint). Contains all CSS variables: palette (`--carta*`, `--inchiostro*`, `--ottone*`, semantic), type (`--font-display/body/mono`, scale), radii (`--r-sm/md/lg/pill`), 4px spacing, shadows, motion. **Do not rename the variables**: the kit components use them all. **Use the updated version of the file, the one that also contains the dark block** (overrides of the same variable names under `@media (prefers-color-scheme: dark)` and possibly `[data-theme="dark"]`): copy it **in full, dark block included**. **Do not invent dark values**: the dark colors are part of the design system — if the file in the project does not yet contain the dark block, request it from the design system / stop, don't improvise a dark palette.
2. **`cutbook-design/ui_kits/cutbook_app/app.css`** → copy to `src/styles/app-shell.css`. Contains the shell: `.cb-app`, `.cb-screen`, `.cb-safe-top/bot`, `.cb-topbar` (+ `.wordmark`/`.no-dot`), `.cb-bottom-nav*`, `.cb-scrim`, `.cb-sheet*`, `.cb-toast*`, keyframes, helpers. Import both once in `main.tsx`. **Caution (for dark):** `app.css` has a few hand-wired values that *don't* go through the tokens and therefore **don't adapt on their own** to the theme: the `background: #F0F0EE` on `html, body`, the photo-placeholder gradients (`#2A2520 → #15110D`), and the raw `rgba(10,10,10,…)` of shadows/placeholders. Replace them with variable references (e.g. `var(--carta)` for the body, a photo-placeholder token, tokenized shadows) so they follow `prefers-color-scheme`. `--scrim` is already a token and is fine.
3. **Assets** from `cutbook-design/assets/`: `cutbook-wordmark.svg`, `cutbook-monogram.svg`, `favicon.svg` → into `src/assets/` (favicon also in `public/` and referenced in `index.html`).

### 2.2 Dependencies to install

```bash
npm i @phosphor-icons/web@^2.1.1
```

- **Icons:** the kit uses the `ph-thin ph-*` classes (Phosphor webfont). To stay **1:1 with the kit**, import the webfont once in `main.tsx`:
  ```ts
  import '@phosphor-icons/web/thin'
  import '@phosphor-icons/web/fill'   // needed for ph-fill ph-star / ph-heart / ph-bookmark-simple
  ```
  (Alternative `@phosphor-icons/react` only if you prefer typed components: in that case you must rewrite every `<i className="ph-thin ph-x">` into `<X weight="thin"/>` — more work, same result. Default: webfont, mechanical porting.)
- **Fonts:** `Onest` + `JetBrains Mono` arrive via the `@import` already inside `colors_and_type.css` (Google Fonts). Fine for v1. If you want to self-host for performance/offline, download the woff2 and replace the `@import` with `@font-face` — **optional, not blocking**.
- **Remove** `@tabler/icons-webfont` from the dependencies and every import of it once the icon migration (§3) is complete.

### 2.3 Hard rules (non-negotiable — apply everywhere)

These are the design system's hard rules. Treat them as a manual lint:

- **No emoji.** Anywhere: copy, toasts, bios, empty states.
- **Sentence case everywhere.** Buttons, labels, status pills, nav. Never ALL CAPS, never Title Case.
- **One accent — coral `#FF5C39`.** One or two coral things per screen, never as a primary surface. Filled primary buttons are **ink**, not coral. Coral = the dot under the followed avatar, the focused-input halo, the active-tab icon, the "Top" pill.
- **No gradients.** Depth = a single shade darker. (Tolerated exception: the kit photo placeholders use a dark gradient as an image stand-in — replace them with the **real photo** as soon as you wire up Storage; while it's a placeholder it's fine.)
- **No frosted glass, no `backdrop-filter`.** Scrim = flat ink at 46% (`var(--scrim)`).
- **Radii only `6 / 10 / 16 / pill (9999)`.** No in-between values.
- **Borders `1px` ink at 10%** (`var(--border)`). No 0.5px hairlines (the old app used them: they must go).
- **Italian copy, `tu`.** Decimal comma (`4,9`), 24-hour clock (`09:30`), price `€ 22` with a thin space, thousands with a period (`1.240`), `·` (space + middot + space) for inline metadata, `—` for asides.
- **Phosphor Thin** for all icons, sizes **only 16/20/22/24px**. Never hand-draw icon SVGs.
- **No italic in headings.** Italic is only for inline `<em>`, rare. The wordmark stays upright.
- **Surface = always tokens, never hand-wired colors.** No textures, no full-bleed images behind the UI. The page is `--carta` (light) or its dark override: it must stay *token-driven* for dark to work → see §9.

---

## 3. Icon migration: Tabler → Phosphor Thin

The old app uses Tabler (`ti ti-*`). The design uses Phosphor Thin (`ph-thin ph-*`), `ph-fill ph-*` for filled active states (heart/bookmark/star). Replace class by class. Equivalence table for the icons in use:

| Use | Tabler (old) | Phosphor (new) |
|---|---|---|
| Feed / grid | `ti ti-layout-grid` | `ph-thin ph-square-half` |
| Esplora / map | `ti ti-map-search` / `ti ti-map` | `ph-thin ph-map-trifold` |
| Profilo | `ti ti-user` | `ph-thin ph-user` |
| Menu | `ti ti-menu-2` | `ph-thin ph-list` |
| Bottega (barber) | — | `ph-thin ph-storefront` |
| Heart (off/on) | `ti ti-heart` | `ph-thin ph-heart` / `ph-fill ph-heart` |
| Comments | `ti ti-message-circle` | `ph-thin ph-chat-circle` |
| Share / send | `ti ti-send` | `ph-thin ph-paper-plane-tilt` |
| Save (off/on) | `ti ti-bookmark` | `ph-thin ph-bookmark-simple` / `ph-fill ph-bookmark-simple` |
| Rating star | `ti ti-star-filled` / `ti ti-star` | `ph-fill ph-star` |
| Notifications | `ti ti-bell` | `ph-thin ph-bell` |
| Search | `ti ti-search` | `ph-thin ph-magnifying-glass` |
| Map pin | `ti ti-map-pin` | `ph-thin ph-map-pin` |
| Chevron right | `ti ti-chevron-right` | `ph-thin ph-caret-right` |
| Chevron down | — | `ph-thin ph-caret-down` |
| Back | — | `ph-thin ph-arrow-left` |
| Close | `ti ti-x` | `ph-thin ph-x` |
| Settings | `ti ti-settings` | `ph-thin ph-gear` |
| Calendar / outcome | `ti ti-calendar` / `ti ti-calendar-check` | `ph-thin ph-calendar` |
| Scissors | `ti ti-scissors` | `ph-thin ph-scissors` |
| User location | `ti ti-current-location` | `ph-thin ph-crosshair` |
| Help / support | `ti ti-help-circle` | `ph-thin ph-question` |
| Sign out | `ti ti-logout` | `ph-thin ph-sign-out` |
| Privacy / shield | `ti ti-shield` | `ph-thin ph-shield` |
| Share (network) | `ti ti-share` | `ph-thin ph-share-network` |
| Google | — | `ph-thin ph-google-logo` |
| Wifi / battery (fake status bar) | `ti ti-wifi` / `ti ti-battery` | remove: the new shell doesn't draw the fake status bar, it uses `cb-safe-top` |

For icons not in the table: find the closest equivalent on phosphoricons.com, **thin** weight. Active states (current tab, active like, active bookmark, star) → `ph-fill` variant.

---

## 4. File structure (what to create / replace)

Align with the architecture structure already planned (`hooks/` separate from `screens/`, `components/`). Create/replace:

```
src/
├── styles/
│   ├── tokens.css            ← NEW  (copy of colors_and_type.css, §2.1)
│   └── app-shell.css         ← NEW  (copy of ui_kits/.../app.css, §2.1)
├── assets/                   ← NEW  (wordmark, monogram, favicon)
├── lib/
│   ├── supabase.ts           ← UNCHANGED
│   ├── geo.ts                ← UNCHANGED
│   ├── mapStyle.ts           ← UNCHANGED
│   └── format.ts             ← NEW  (IT localization helpers, §8)
├── hooks/                    ← ALL UNCHANGED (useAuth/useFeed/useBarbers/
│                                useAvailability/useBooking/useGeolocation)
├── types/supabase.ts         ← UNCHANGED
├── components/
│   ├── primitives/           ← NEW  (port of primitives.jsx → typed .tsx:
│   │                            Avatar, Button, IconBtn, Pill, Hairline,
│   │                            BrassRule, Stat, SectionHeader, Toast, PhotoBlock)
│   ├── BookingSheet.tsx      ← REWRITTEN on the kit, wired to real data (§5,§6)
│   ├── BarberProfileSheet.tsx← NEW (from the kit; wired to real barber)
│   └── NavBar.tsx            ← REWRITTEN (kit bottom nav, role-aware)
├── screens/
│   ├── Login.tsx             ← REWRITTEN (welcome + form from the kit)
│   ├── Onboarding.tsx        ← NEW (from the kit; wired to real signup)
│   ├── Feed.tsx              ← REWRITTEN (kit) ← useFeed
│   ├── Discover.tsx          ← REWRITTEN (kit "Esplora") ← useBarbers  (see §7)
│   ├── Profile.tsx           ← REWRITTEN (kit) ← useAuth + profile data
│   ├── Menu.tsx              ← REWRITTEN (kit) ← useAuth (role, logout)
│   ├── Bottega.tsx           ← NEW (barber dashboard; real booking data)
│   ├── Notifications.tsx     ← NEW (full-screen overlay from the kit)
│   └── Messages.tsx          ← NEW (full-screen overlay + thread from the kit)
└── App.tsx                   ← only shell/nav rendering rewritten; state/routing/role gating UNCHANGED
```

**Porting kit → project:** the kit files use JSX with `Object.assign(window, …)` and `<script type="text/babel">`. In the project **do not** replicate that pattern: convert to **ESM TSX modules** with `export`/`import` and **typed props**. Keep the inline styles as they are in the kit (they already use the CSS variables: that's consistent with the design system) — no need to extract everything into CSS modules in this pass.

---

## 5. Screen-by-screen mapping: kit component → real hook → props/callbacks

For each screen: take the kit component as the **visual-language reference and starting point**, replace demo data with the real hook, rewire the callbacks to the existing `App` state — and **adapt** the composition to real data (variable lengths, pagination, loading/empty/error states, role variants) using the same language, not forcing reality into the mockup's fixed layout. **If the real screen carries a feature the kit component doesn't show, design it in — do not drop it.** The kit callbacks **already have the right signature** — you only need to connect them to the real setters.

| Screen (kit) | Real hook/data feeding it | Props/callbacks in from `App` | Wiring notes |
|---|---|---|---|
| **`ScreenLogin`** (welcome + form) | `useAuth` | `onLogin` → no longer fake `("client")`: use the real `signInWithGoogle` / real email-password login; `onStartOnboarding` → navigate to Onboarding | **No fake role login.** The role comes from `profiles.role` after auth, not from an "enter as barber" button. Remove the demo link. Password input: the user types it, do not prefill. |
| **`ScreenOnboarding`** | Supabase Auth (signup) + `profiles` trigger | `onComplete(role)` → completes real signup; `onBack` | The "choose client/barber role" step must write `profiles.role` (or start the barber self-registration per schema: `BARBERS` created only if the user registers as a barber). |
| **`ScreenFeed`** | `useFeed(userId)` → `posts`; `useBarbers` or join for the story avatars | `onOpenBooking(barber)`, `onOpenProfile(barber)`, `onOpenNotifications`, `onOpenMessages`; `notifCount`/`dmCount` badges from real data | `DEMO_POSTS`/`DEMO_BARBERS` → real `posts`. Like/save: the kit uses local state; wire to the real `LIKES` (insert/delete on the `likes` table) **keeping the kit's UI optimism**. `useFeed`'s `loadMore()` → infinite scroll at the bottom of the list. The caption uses `b.name.split(" ")[0].toLowerCase()` as a "handle": fine as display, it's not logic. |
| **`ScreenDiscover`** ("Esplora") | `useBarbers(sort, lat, lng, search)` + `useGeolocation` | `onOpenBooking`, `onOpenProfile` | **Coordinate with §7.** The kit's List/Map toggle stays; the **List** uses the kit's `DiscoverList` markup; the **Map** is NOT the kit's stylized SVG but the real MapLibre map from `discover_map_brief.md`, *re-skinned* with the design system. The kit filter pills (`Tutti/Aperti ora/Vicino a me/Top`) map onto the real `sort` enum (see §7.2). |
| **`ScreenProfile`** | `useAuth` (`profile`) + real appointments/history/saved queries | `role` (from `profile`), `onOpenSettings` | Tabs Appuntamenti/Storico/Salvati: feed with real `bookings` (future/past) and real `likes`/saved. Stats (Tagli/Barbieri/Salvati) from real counts. The role pill from `profiles.role`. |
| **`ScreenMenu`** | `useAuth` | `role`, `onLogout` (→ real `signOut`), `onOpenMessages`, `onOpenNotifications` | **Remove the "Demo mode / Switch role" toggle**: in production the role is not changed with a toggle. The menu items stay; "Esci" calls `signOut`. Messages/notifications badges from real data. |
| **`ScreenBottega`** (barber) | barber's `bookings` via Supabase + **Realtime**; `availability` | mounted only if `role === 'barber'` | The kit has agenda/stats/week **hardcoded**: replace with the real today's agenda (query the logged-in barber's `bookings`), the pause state with a real flag, "Conferma" on a `pending` booking → update `status:'confirmed'`. Listen to Realtime to update the agenda live. |
| **`ScreenNotifications`** | real notifications table (or derived) | `onClose`, `onOpenBooking`, `onOpenProfile` | Full-screen overlay above the active tab (kit's `FullOverlay` pattern). |
| **`ScreenMessages`** + `MessagesThread` | real DMs (if in the schema) or honest stub | `onClose` | If DMs aren't in the schema yet, mount the screen but with an honest empty state ("Nessun messaggio"), **don't** fake conversations. Flag as a gap (see §10). |
| **`BookingSheet`** | `useAvailability(barberId, date)` + `useBooking` | `barber`, `onClose`, `onConfirm` | See **§6** — the most delicate point. |
| **`BarberProfileSheet`** | real barber + real `useBooking`/follow | `barber`, `onClose`, `onBook`, `onMessage` | "Follow" toggle → insert/delete on the real `follows` (the kit has a bug: both labels say "Segui" → correct: not-followed = `Segui`, followed = `Segui già` or `Smetti di seguire`). Stats (Follower/Tagli) from real data. |
| **`NavBar`** (bottom nav) | `useAuth` for the role | active tab + setter (from `App`) | Kit's `NAV_CLIENT` vs `NAV_BARBER`; add `NAV_ADMIN` (Feed · Esplora · **Admin** · Menu) per product context. Active tab = coral icon, ink label. No bounce/scale/underline. |
| **`Toast`** | real `createBooking` outcome | `{kind,title,message}`, `onClose` | Kit's IT copy: `title:"Prenotato."`, `message:"sab 24 mag · 10:00 · Marco Barba"`. On error: `kind:"danger"`, honest copy (`"Slot occupato. Scegline un altro."`). |

> **Routing/role gating:** the kit `App.jsx`'s `authStage` map (`login`/`onboarding`/`app`) and the `NAV_CLIENT|NAV_BARBER|NAV_ADMIN` choice mirror the existing logic *conceptually*, but in production the source of truth is `useAuth().profile.role` + `is_admin`, **not** local state. Align the kit's rendering to the real logic, not the other way around.

---

## 6. The booking flow wired to real data

The kit's `BookingSheet` defines the **language and structure** to keep faithful (2 steps: *date/time* → *confirm* → toast, header with the barber, service card, "next 7 days" date strip, 3-column slot grid in `JetBrains Mono`, `Continua — HH:MM` button then coral `Conferma appuntamento`). Structure and visual treatment are kept; the **contents adapt to real data**. In the kit the slots are **hardcoded**:

```js
const SLOTS = ["09:00", … ];
const TAKEN = new Set(["09:30","11:30","14:30"]);
```

**Mandatory replacement:** these two arrays go away. Their content comes from `useAvailability(barber.id, dates[selDate].date)`:

- `slots` (from `useAvailability`) → replaces the `SLOTS` array. The `HH:MM` 24h order/format is already consistent with the design.
- `booked` (set/array from `useAvailability`) → replaces `TAKEN`. A slot in `booked` renders **disabled + struck-through** exactly as the kit does (`textDecoration:"line-through"`, color `--inchiostro-40`, `cursor:not-allowed`).
- The "X free of Y" counter at the top right → `slots.length - booked.length` of `slots.length`.
- Changing date (`selDate`) **re-runs** `useAvailability` with the new `date` (the hook already has `date` as a dependency); reset `selTime` as the kit already does.
- `Conferma appuntamento` → calls `useBooking().createBooking({ clientId: profile.id, barberId: barber.id, date: dates[selDate].date, timeSlot: selTime })`. On success: close sheet + `onConfirm` → green Toast with the real summary. On error (`{ error }` non-null) → `danger` Toast with honest copy, **do not** close the step if the slot is now taken (re-fetch availability).
- The service/price/duration card: the kit uses `barber.price ?? 22`, `barber.tags?.[0]`, "30 min". Use the real values from the barber/service if present in the schema; if the schema doesn't have per-service price/duration yet, **keep it as a visible default but flagged as a gap** (§10) — don't invent a price list.
- States: while `useAvailability` loads → light skeleton of the grid (don't block the whole sheet). If `slots` is empty for that date → honest message in the kit's empty-state style ("Nessuno slot in questa data. Prova un altro giorno."), no giant icon.

**No payment data.** The flow stops at booking confirmation (status `pending`/`confirmed`); do not add card/IBAN fields.

---

## 7. Relationship with `discover_map_brief.md`

The two briefs are **complementary and not in conflict**, but must be read together for Esplora. Precedence rule:

### 7.1 Who decides what

- **Map functionality/architecture** (`react-map-gl/maplibre` + `maplibre-gl` library, `supercluster`, `useGeolocation`, fullscreen between status bar and bottom nav, clustering, rising preview card, Cagliari fallback, `VITE_MAPTILER_KEY` env, edge cases) → **stays exactly as in `discover_map_brief.md`**. This brief **does not** redefine it.
- **Visual appearance** of everything the map draws (barber pins, clusters, preview card, floating search bar, List/Map toggle, "find my location" button, empty/error states) → **must follow this brief's CutBook design system**, not a generic style. In practice: the `BarberMarker`/`ClusterMarker`/`BarberPreviewCard`/`MapSearchBar`/`MapListToggle` of `discover_map_brief.md` must be built with the `--ottone`/`--inchiostro`/`--carta` tokens, `6/10/16/pill` radii, Phosphor Thin, IT copy, exactly like the kit's equivalents (the kit's `DiscoverMap`/preview card are the aesthetic reference; the *logic* is the map brief's).
- **The List** of Esplora uses the kit's `DiscoverList` markup (barber card with `ring` avatar if rating ≥ 4,9, `Aperto`/`In pausa` pill, `ph-fill ph-star`, `X,X km` distance, hairline `Prenota` button).

### 7.2 Filter pills: reconciliation

Three label sets float across the documents — they must be unified **keeping the logical enum** of `useBarbers` (`'nearby'|'popular'|'new'|'toprated'`, which **must not be touched**) and adopting the **kit's labels** in Italian:

| UI label (from the kit, IT) | real `sort`/filter (logic unchanged) |
|---|---|
| `Tutti` | no filter (default sort, e.g. `nearby` if location available, otherwise `toprated`) |
| `Vicino a me` | `sort='nearby'` (requires `coords` from `useGeolocation`) |
| `Top` | `sort='toprated'` |
| `Aperti ora` | client filter on barber availability/status |

> **Data gap to flag:** "Aperti ora" assumes an open state. The schema has no `open_now` field; it must be **derived** from `availability` (current day's window) or from a barber pause flag. If not derivable now, **don't invent it**: either omit "Aperti ora", or compute it from `availability`. Explicit decision required (§10). The enum's "Popular/New" labels (`popular`/`new`) can appear as an extra filter or in the filter panel (`ph-thin ph-funnel`) — **don't lose existing logical capabilities just because the kit shows 4 chips** (this is the no-feature-loss rule, §1.1, applied to filters).

---

## 8. Localization & copy

Centralize formatting in `src/lib/format.ts` and use it everywhere (no scattered formatting):

- `formatRating(n)` → `4,9` (comma, 1 decimal).
- `formatKm(n)` → `1,2 km`.
- `formatPrice(n)` → `€ 22` with a **thin space** (`\u202F` or `&thinsp;`).
- `formatCount(n)` → thousands with a period: `1.240` (`toLocaleString('it-IT')`).
- `formatTime(d)` → `09:30` (24h, two digits).
- `formatDateShort(d)` → `sab 24 mag` (abbreviated IT days/months as in the kit: `lun…dom`, `gen…dic`).
- Inline metadata separator: ` · ` (space + `·` + space). Asides: ` — `.

Product voice: quiet, direct, `tu`, short sentences, no exclamation marks, no emoji, sentence case. Guiding examples (from the design system):

| Generic app | CutBook |
|---|---|
| "🎉 Booking confirmed!" | `Prenotato. Sabato 24, ore 10:00.` |
| "Sorry, that slot is taken." | `Slot occupato. Scegline un altro.` |
| "Welcome back, Marco!" | `Bentornato, Marco.` |
| "Unavailable" | `In pausa.` |

Rename the nav and titles in Italian: `Feed · Esplora · Profilo · Menu` (+ `Bottega` for barber, `Admin` for admin). "Discover" → "Esplora" everywhere (UI; technical file/route names may stay `Discover`).

---

## 9. States: loading / empty / error — and dark mode

- **Loading:** light, progressive skeletons, never block the whole UI. The map can appear and the markers arrive after (consistent with `discover_map_brief.md` §8). For lists: placeholder rows with the `--carta-3` fill, optional shimmer (`@keyframes shimmer` is already in `app.css`).
- **Empty state:** kit pattern — **small coral disc/mark, not a giant icon**, sentence-case display title, `--inchiostro-60` subtitle. Never emoji. (References: `cutbook-design/preview/components-empty-state.html`, and `DiscoverList` empty in the kit.)
- **Error:** honest copy, no stack/jargon. Map tiles fail to load → automatic fallback to List with a message ("Mappa non disponibile, mostro la lista") per `discover_map_brief.md` §9.

### DARK MODE — in scope (decision made)

Dark mode **is required and part of this pass**. The project's current prototype already uses it (the screens run on themed variables that react to `prefers-color-scheme`), and the design system has been extended with the dark instructions. So: no open decision, it gets implemented. The "dark mode" line in `discover_map_brief.md` (§3, §6.2, checklist) is **active, not superseded**.

**Source of truth for the dark colors:** the updated design system. The dark values are **not invented** and not derived by auto-inverting the light ones — they are designed. Claude Code adopts the dark block **from the updated `colors_and_type.css`** (see §2.1) and that's it. If that file doesn't yet contain the dark block, stop and request it, don't improvise.

**Mechanism (this is value-independent and must be respected as-is):**

1. Dark is expressed as **overrides of the same variable names** already used everywhere (`--carta`, `--carta-2/3`, `--inchiostro*`, `--border`, shadows, etc.), inside a `@media (prefers-color-scheme: dark) { :root { … } }` block in the token file. The coral accent `--ottone` stays the accent in the dark too (any micro luminance adjustment only if the design system specifies it — don't decide it yourself).
2. Intended consequence: **components don't change by a single line.** The whole kit already uses `var(--…)`; if the tokens flip, the entire UI flips by itself. This is exactly why §1.1 requires adopting the token file verbatim and §2.3 forbids hand-wired colors. Every hand-written `#fff`/`#0A0A0A`/`rgba(10,10,10,…)` is a bug that breaks dark: they must all be tokenized (see §2.1 point 2 for the known cases in `app.css`).
3. **Manual override (only if the design system provides for it):** if an in-app theme toggle is required beyond system detection, use a `[data-theme="dark"]` / `[data-theme="light"]` attribute on `<html>` that applies the same set of overrides; default = `prefers-color-scheme`. Don't add a toggle if the design system doesn't ask for one.
4. **Map (Esplora):** the MapTiler **`streets-v2-dark`** style must be selected when the theme is dark (as already planned by `discover_map_brief.md` §3/§6.2). `lib/mapStyle.ts` stays unchanged as logic; the light/dark style selection and the **re-render on runtime theme switch** are part of the map work, not to be reinvented here.
5. **Realtime theme switch:** changing the system theme while the app is open must not require a reload — CSS tokens do this for free; just make sure the map (point 4) and any JS-computed color react.

**Verification:** every screen must be checked in **both** themes (Feed, Esplora list+map, Profilo, Menu, Bottega, Login, Onboarding, Notifiche, Messaggi, BookingSheet, BarberProfileSheet, Toast). No low-contrast text, no invisible borders, no placeholders that stay light in the dark.

---

## 10. Edge cases and gaps to handle explicitly

- **No feature loss (cross-cutting):** any capability present in the current app and not depicted in the kit must be **re-implemented in the new language**, not dropped. Before considering a screen done, diff its old feature set against the new one — anything missing is a bug, not a simplification. Examples below (filters §7.2, menu items, profile tabs, barber actions) are instances of this same rule.
- **Real auth, not fake:** remove every "enter as client/barber" demo and the Menu role toggle. Role = `profiles.role` + `is_admin`.
- **Role that changes** (a barber who is also a client): the nav and screens follow `profile.role`; a barber can still browse Feed/Esplora and book other barbers (per product context).
- **`createBooking` race:** slot taken between sheet open and confirm → handled error, re-fetch `useAvailability`, `danger` toast, no crash.
- **Like/save/follow:** keep the kit's UI optimism, but with real writes to `likes`/`follows` and visual rollback if the mutation fails.
- **Schema gaps to flag in the README (do not invent data):**
  - per-service price/duration (the kit assumes `€ 22 / 30 min`);
  - "open now" state (derive from `availability` or omit the filter);
  - DMs/messages (if not in the schema: screen present but honest empty state);
  - notifications (if not in the schema: same treatment).
- **`VITE_MAPTILER_KEY` absent** → OpenFreeMap fallback, no blank screen (per `discover_map_brief.md`).
- **Tab change with sheet/preview open** → clean state reset (already handled by the kit/`App`).
- **No payments, no sensitive data** in forms.
- **RLS active from day one:** test every screen with RLS on; no screen should lose data due to a missing policy — but **do not write new policies** in this pass (the data layer is not touched; if a policy is missing it's a data-layer bug, to flag, not to patch here).

---

## 11. Acceptance criteria (final checklist for Claude Code)

- [ ] **Phase 0 done (§0.1):** `REDESIGN_PLAN.md` exists with the verified logic-layer inventory, the full current-feature inventory, the feature→kit mapping, and open questions; it was confirmed before any code was written.
- [ ] `tokens.css` (= `colors_and_type.css`) and `app-shell.css` (= kit `app.css`) imported once in `main.tsx`; no variable renamed.
- [ ] Phosphor Thin + Fill loaded; **zero** residual `ti ti-*` classes; `@tabler/icons-webfont` removed.
- [ ] Onest + JetBrains Mono active; numbers (ratings, slots, prices, distances, counters) are in `JetBrains Mono`.
- [ ] All screens (Login, Onboarding, Feed, Esplora, Profilo, Menu, + Bottega if barber, + Notifiche/Messaggi overlay) are **faithful to the design system** and **consistent with the kit** where the composition matches; where real data/states diverge from the mockup they are **adapted in the same language** (variable-length lists, loading/empty/error, role variants) — not a pixel clone of the kit, but no drift from the visual language.
- [ ] **No existing feature lost:** every capability the old UI had still exists in the new UI (adapted, not removed). Any feature that couldn't be placed is documented in the README as an open question, never silently dropped.
- [ ] **No** file in `hooks/`, `lib/supabase.ts`, `lib/geo.ts`, `lib/mapStyle.ts`, `types/`, nor RLS policies, nor schema, was modified. `git diff` on those paths is empty.
- [ ] `App.tsx`: only shell/nav/mount rendering changed; the state machine, role gating and setters are substantively unchanged.
- [ ] Feed reads from real `useFeed` (posts + `loadMore` pagination); like/save actually write to `likes`.
- [ ] Esplora: List with kit markup + `useBarbers`; Map = real MapLibre from `discover_map_brief.md` **re-skinned** with the design system; `sort`/`search` shared List↔Map; `sort` enum unchanged.
- [ ] `BookingSheet`: hardcoded `SLOTS`/`TAKEN` **removed**, replaced by `useAvailability`; confirm calls real `useBooking.createBooking`; IT toast on success, honest `danger` toast on error.
- [ ] Bottega (barber): agenda/stats/pause from real data + Realtime, not hardcoded.
- [ ] Copy 100% Italian, sentence case, `tu`, no emoji, IT formats (`4,9` · `€ 22` · `09:30` · `1.240`) centralized in `lib/format.ts`.
- [ ] Hard rules §2.3 respected: one coral accent, `6/10/16/pill` radii, 1px@10% borders, no gradients (except photo placeholders), no `backdrop-filter`, 46% scrim.
- [ ] Loading/empty/error states in the kit style (empty = coral disc, not a giant icon).
- [ ] **Dark mode working in both themes**: dark block of the updated `colors_and_type.css` copied verbatim; everything via variable override + `prefers-color-scheme`; **zero** residual hand-wired colors (body bg, placeholders, shadows tokenized); Esplora map uses `streets-v2-dark` in the dark and switches style at runtime on theme change; no invented dark value.
- [ ] Data gaps (price/duration, "open now", DMs, notifications) listed in the README; no invented data.
- [ ] `npm run build` clean, **zero TypeScript errors**; ported components' props are typed (no convenience `any`).
- [ ] README updated: design system adopted, icon migration done, env unchanged, **dark mode implemented (token source = design system, `prefers-color-scheme` mechanism)**, known gaps, relationship with `discover_map_brief.md`.

---

## 12. Suggested commit plan (small, verifiable steps)

0. **Phase 0 — recon & plan (§0.1):** no code. Produce `REDESIGN_PLAN.md` (logic-layer verification, full current-feature inventory, feature→kit mapping, open questions). **Stop for human confirmation before step 1.**
1. **Visual foundations:** `tokens.css` (= updated `colors_and_type.css`, **dark block included**) + `app-shell.css` with the hand-wired values tokenized for dark + assets + Phosphor + fonts; import in `main.tsx`. Green build; immediately verify the system light/dark toggle flips the tokens (even with the still-old app).
2. **Primitives:** port `primitives.jsx` → typed `components/primitives/*.tsx` (Avatar, Button, IconBtn, Pill, Hairline, BrassRule, Stat, SectionHeader, Toast, PhotoBlock).
3. **Shell + NavBar:** `.cb-app`/`.cb-screen`/`.cb-topbar` + role-aware bottom nav wired to `useAuth().profile.role`.
4. **Feed** rewritten on the kit + real `useFeed` (+ real like/save, `loadMore`).
5. **BookingSheet** on the kit, wired to `useAvailability` + `useBooking` (§6) — the critical piece, isolate it.
6. **Esplora — List** (kit markup + `useBarbers`, pill reconciliation §7.2).
7. **Esplora — Map**: apply the design system to the map components of `discover_map_brief.md` (without redoing the map logic).
8. **Profilo** + **Menu** on the kit + `useAuth`/real data (remove demo/role-switch).
9. **Bottega** (barber) + **Notifiche** + **Messaggi** on the kit + real data/honest stubs.
10. **Login** + **Onboarding** on the kit wired to real auth (remove fake role login).
11. Loading/empty/error states, edge cases §10, `lib/format.ts` everywhere.
12. Cleanup: remove Tabler and dead CSS, types, memoization where needed, **final pass verifying every screen in both themes (light + dark)**, **feature-parity diff against the old UI**, README + §11 checklist.

After each step: green `npm run build` and the touched screen **faithful to the design system and consistent with the kit's language**, adapted to real data/states, with **no feature lost**, before moving on.
