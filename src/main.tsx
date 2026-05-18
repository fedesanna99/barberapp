import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
// Phosphor Icons webfont — bundled via npm so we never load from a CDN
// (no SRI / supply-chain exposure). Only the weights we use are imported.
import '@phosphor-icons/web/thin'
import '@phosphor-icons/web/fill'
import '@phosphor-icons/web/bold'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Maintenance, NotFound } from './screens/StatusPages'

// Hardening: refuse to boot a production build without Supabase credentials.
// Without this guard the app would fall back to IS_DEMO=true (see
// lib/supabase.ts) and users would "save" data into in-memory state — losing
// everything on reload, with no visible error.
if (import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL) {
  document.body.innerHTML =
    '<div style="font:14px/1.5 system-ui,sans-serif;padding:24px;max-width:480px;margin:40px auto;color:#A0331E;border:1px solid #F5C6BE;background:#FFF6F4;border-radius:12px">' +
    '<strong>Configurazione mancante</strong><br>' +
    'La variabile d\'ambiente <code>VITE_SUPABASE_URL</code> non è impostata. ' +
    'L\'app non può partire in produzione senza credenziali Supabase. Contatta l\'amministratore.' +
    '</div>'
  throw new Error('Missing VITE_SUPABASE_URL in production build')
}

// Task 5 — maintenance and 404 are evaluated BEFORE the app mounts so they
// short-circuit Supabase init / auth callbacks / any data fetch.
const isMaintenance = import.meta.env.VITE_MAINTENANCE === 'true'

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
