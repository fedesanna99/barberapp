// MapLibre style URL picker. Uses MapTiler when VITE_MAPTILER_KEY is provided,
// otherwise falls back to OpenFreeMap so the app never goes blank without a key.
//
// Commercial note: MapTiler's free tier is for non-commercial / evaluation use.
// Before launching commercially, upgrade to a paid MapTiler plan or self-host
// tiles (Protomaps/PMTiles). Because the API stays at react-map-gl/maplibre,
// switching providers is just a URL swap — no component rewrite.

const KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

function maptiler(style: 'streets-v2' | 'streets-v2-dark'): string {
  return `https://api.maptiler.com/maps/${style}/style.json?key=${KEY}`
}

export function mapStyleFor(theme: 'light' | 'dark'): string {
  if (!KEY) {
    // OpenFreeMap pubblica solo stili light (liberty, bright, positron) —
    // niente variante dark ufficiale. Senza MapTiler key restiamo su
    // 'liberty' anche in dark mode: la mappa stona col tema scuro ma è
    // l'unico fallback che non rompe. Per un look coerente in produzione
    // serve VITE_MAPTILER_KEY (streets-v2-dark di MapTiler).
    return 'https://tiles.openfreemap.org/styles/liberty'
  }
  return theme === 'dark' ? maptiler('streets-v2-dark') : maptiler('streets-v2')
}

export const MAP_STYLE = mapStyleFor('light')
