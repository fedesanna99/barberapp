# Discover map setup

The Discover tab is a fullscreen MapLibre map (with a Map/List toggle).
Tiles are loaded from **MapTiler Cloud** when `VITE_MAPTILER_KEY` is set —
otherwise it falls back to **OpenFreeMap** so the app never goes blank.

Stack:

- [`react-map-gl`](https://visgl.github.io/react-map-gl/) v8 (the `/maplibre` endpoint)
- [`maplibre-gl`](https://maplibre.org/) v5 — open-source WebGL renderer
- [`supercluster`](https://github.com/mapbox/supercluster) for marker clustering

## 1. Get a MapTiler key (optional but recommended)

1. Sign up at <https://www.maptiler.com/cloud/> (no card required).
2. Copy your **default API key** from the dashboard.
3. Add it to `.env`:

   ```
   VITE_MAPTILER_KEY=your-key-here
   ```

4. Add the same var to **Vercel → Project → Settings → Environment Variables**.

When the key is absent, `src/lib/mapStyle.ts` falls back to the OpenFreeMap
`liberty` style (community-run, no key, no SLA). The map still works fine in
demo mode without a key.

## 2. ⚠️ Commercial use — read before launch

MapTiler's **Free** plan (~100k map loads/month) is for **non-commercial /
evaluation** use. The moment CutBook is in commercial production:

- Either upgrade to a paid **MapTiler Flex** plan, or
- Self-host tiles (e.g. [Protomaps](https://protomaps.com/) / PMTiles on
  object storage).

The codebase abstracts the style URL in `src/lib/mapStyle.ts`, so switching
providers is a URL change — not a refactor. The same `react-map-gl/maplibre`
components also work against Mapbox tiles if you ever want the premium look.

## 3. Alternatives considered (for reference)

| Provider | Cost | Card needed | Notes |
|---|---|---|---|
| **MapTiler + MapLibre** ✅ | Free ~100k loads/month | No | Modern look, non-commercial free tier |
| OpenFreeMap + MapLibre   | Free, no key           | No | Zero-config fallback, community-run |
| Stadia Maps + MapLibre   | Free dev tier          | No | Equivalent alternative |
| Mapbox GL                | 50k loads/month then paid | Yes (past free) | Polished, but billing required |
| Google Maps              | Billing required       | Yes | Overkill + friction for an MVP |
| Leaflet + OSM raster     | Free                   | No | Simple, but dated look + no vector zoom |

## 4. Data model

The Discover map reads coordinates from `profiles.lat` / `profiles.lng`
(already in the schema). Barbers **without** coordinates don't appear on the
map but still show up in the list view.

Scale note: client-side haversine sort is fine for a few hundred barbers.
Past that, push "nearby" to a Postgres RPC (`barbers_near(lat, lng, km)`) —
the hook stays identical, only the query changes.
