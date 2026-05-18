import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Maintenance, NotFound } from './screens/StatusPages'

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
