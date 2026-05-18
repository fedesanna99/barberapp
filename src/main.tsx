import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Maintenance, NotFound } from './screens/StatusPages'

// Task 5 — maintenance and 404 are evaluated BEFORE the app mounts so they
// short-circuit Supabase init / auth callbacks / any data fetch.
//
// Precedence (highest first):
//   1. URL query   ?maintenance=on|1|true forces ON for this load
//                  ?maintenance=off|0|false forces OFF and clears any sticky override
//   2. localStorage 'cutbook:maintenance' = '1' (sticky ON from a prior ?maintenance=1)
//   3. build-time   VITE_MAINTENANCE env var
//
// IMPORTANT: '?maintenance=0' does NOT persist as a sticky "off" — it just removes
// any local override and falls back to env. Otherwise a stale '0' in localStorage
// would defeat the server's decision to flip maintenance ON.
const TRUTHY = new Set(['1', 'true', 'on', 'yes'])
const FALSY  = new Set(['0', 'false', 'off', 'no'])
const norm   = (v: unknown) => String(v ?? '').trim().toLowerCase()
const LS_KEY = 'cutbook:maintenance'

function readMaintenanceFlag(): { active: boolean; source: 'query' | 'localStorage' | 'env' | 'default'; env: string } {
  const env = norm(import.meta.env.VITE_MAINTENANCE)
  const qp  = new URLSearchParams(window.location.search).get('maintenance')
  if (qp != null) {
    const v = norm(qp)
    // ?maintenance=1 → hard ON + sticky in localStorage so it persists past the URL change.
    if (TRUTHY.has(v)) { try { localStorage.setItem(LS_KEY, '1') } catch {} ; return { active: true,  source: 'query', env } }
    // ?maintenance=0 → hard OFF for this load (admin bypass) AND clears any sticky override
    // so subsequent loads return to whatever env says.
    if (FALSY.has(v))  { try { localStorage.removeItem(LS_KEY)   } catch {} ; return { active: false, source: 'query', env } }
  }
  try {
    if (TRUTHY.has(norm(localStorage.getItem(LS_KEY)))) return { active: true, source: 'localStorage', env }
  } catch {}
  if (TRUTHY.has(env)) return { active: true,  source: 'env',     env }
  return                      { active: false, source: 'default', env }
}

const m = readMaintenanceFlag()
const isMaintenance = m.active
// Always log: helps debug "I set VITE_MAINTENANCE=true but it doesn't work" issues.
// eslint-disable-next-line no-console
console.info(`[CutBook] Maintenance: ${m.active ? 'ON' : 'OFF'} (source=${m.source}, VITE_MAINTENANCE=${JSON.stringify(m.env)})`)

// Known top-level paths the SPA actually handles. Anything else → 404.
// We don't have a router (everything is rendered conditionally inside <App>),
// so any deep-link the user pastes that isn't recognized must show NotFound
// instead of silently rendering the home screen.
const KNOWN_PATHS = new Set(['/', '/index.html'])
const isUnknownPath = !isMaintenance
  && !KNOWN_PATHS.has(window.location.pathname)
  // Supabase auth redirects come back to `/` with a hash (#access_token=…),
  // already covered above. The exception below covers any future deep links
  // we want to whitelist quickly without touching this file.
  && !window.location.pathname.startsWith('/auth/')

function Root() {
  if (isMaintenance) return <Maintenance />
  if (isUnknownPath) return <NotFound />
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
