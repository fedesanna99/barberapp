import { C } from '../lib/colors'

// Shared layout for full-screen status pages (404 / 403 / 500 / Maintenance).
// Uses the same phone-frame chrome as the rest of the app so it slots into
// the main shell without visual drift, and respects the dark-mode CSS vars.
function Frame({ icon, title, message, action, accent }: {
  icon: string
  title: string
  message: string
  action?: { label: string; onClick: () => void }
  accent?: string
}) {
  const color = accent ?? C.accent
  return (
    <div style={{
      width: '100%', maxWidth: 430, height: '100dvh',
      background: C.bg, display: 'flex', flexDirection: 'column',
      position: 'relative', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.08)',
    }}>
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0 }} />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', textAlign: 'center', gap: 14,
      }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          background: color + '18', color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 40 }} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{title}</div>
        <div style={{ fontSize: 14, color: C.muted, maxWidth: 320, lineHeight: 1.45 }}>{message}</div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 8,
              padding: '11px 22px', borderRadius: 12,
              background: C.text, color: C.bg,
              border: 'none', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />
    </div>
  )
}

export function NotFound() {
  return <Frame
    icon="ti-route-off"
    title="Pagina non trovata"
    message="L'indirizzo che hai inserito non esiste o è stato spostato."
    action={{ label: 'Torna alla home', onClick: () => { window.location.href = '/' } }}
  />
}

export function Forbidden({ onBack }: { onBack?: () => void }) {
  return <Frame
    icon="ti-lock"
    title="Accesso negato"
    message="Non hai i permessi per visualizzare questa pagina. Se pensi sia un errore, prova a uscire e rientrare."
    action={onBack
      ? { label: 'Indietro', onClick: onBack }
      : { label: 'Torna alla home', onClick: () => { window.location.href = '/' } }}
    accent="#E0935E"
  />
}

export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return <Frame
    icon="ti-alert-triangle"
    title="Qualcosa è andato storto"
    message="Si è verificato un errore inatteso. Riprova: se persiste, contatta il supporto."
    action={onRetry
      ? { label: 'Riprova', onClick: onRetry }
      : { label: 'Ricarica', onClick: () => window.location.reload() }}
    accent="#E26464"
  />
}

export function Maintenance() {
  return <Frame
    icon="ti-tools"
    title="Lavori in corso"
    message="Stiamo effettuando una manutenzione programmata. Torneremo online a brevissimo — grazie per la pazienza."
    accent="#5DCAA5"
  />
}
