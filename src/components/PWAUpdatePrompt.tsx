/**
 * PWA update prompt.
 *
 * vite-plugin-pwa is configured with registerType: 'autoUpdate' (see
 * vite.config.ts). That means: every page load the service worker
 * checks for a new sw.js; if one exists, it's installed in the
 * background and sits in "waiting" state until all app windows close.
 *
 * Without a visible hint the user never knows there's a pending update
 * — and on installed PWAs people rarely close all instances, so they
 * stay on stale code for days. This component listens to the
 * useRegisterSW hook from virtual:pwa-register/react and shows a small
 * toast at the bottom of the screen the moment a new SW is ready.
 * Tapping "Aggiorna" calls updateServiceWorker(true), which skipWaiting
 * + clientsClaim + window.location.reload() in one shot.
 *
 * We also poll for updates every 60 minutes while the app is open, so
 * long-lived sessions (someone leaving the PWA in background all day)
 * still get the prompt without waiting for a fresh launch.
 */
import { useRegisterSW } from 'virtual:pwa-register/react'

const POLL_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Periodic check so a long-running session still notices updates.
      setInterval(() => {
        registration.update().catch(() => {
          /* offline or transient — ignore, next tick will retry */
        })
      }, POLL_INTERVAL_MS)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`,
        zIndex: 9999,
        margin: '0 auto',
        maxWidth: 496,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--ink)',
        color: 'var(--linen)',
        borderRadius: 12,
        boxShadow: '0 14px 36px -14px rgba(43,39,35,0.22)',
        fontFamily: 'var(--font-body)',
        animation: 'toastIn 360ms cubic-bezier(.34, 1.4, .64, 1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
          Nuova versione disponibile
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
          Aggiorna per applicare le ultime modifiche.
        </div>
      </div>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        style={{
          background: 'transparent',
          color: 'inherit',
          opacity: 0.6,
          border: 'none',
          padding: '6px 8px',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Dopo
      </button>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'var(--clay)',
          color: 'white',
          border: 'none',
          padding: '8px 14px',
          borderRadius: 9999,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Aggiorna
      </button>
    </div>
  )
}
