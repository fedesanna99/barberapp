import { C } from '../lib/colors'

function Frame({ icon, title, message, action, tone }: {
  icon:    string
  title:   string
  message: string
  action?: { label: string; onClick: () => void }
  tone?:   'accent' | 'danger' | 'success' | 'muted'
}) {
  const styles = {
    accent:  { bg: C.accentLight, fg: C.accentDeep },
    danger:  { bg: C.redSoft,     fg: C.red },
    success: { bg: C.greenSoft,   fg: C.green },
    muted:   { bg: C.surface,     fg: C.muted },
  }[tone ?? 'accent']

  return (
    <div style={{
      width: '100%', maxWidth: 430, height: '100dvh',
      background: C.bg, display: 'flex', flexDirection: 'column',
      position: 'relative', boxShadow: '0 0 0 1px rgba(10,10,10,0.04)',
    }}>
      <div style={{ height: 'env(safe-area-inset-top, 0px)', flexShrink: 0 }} />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 28px', textAlign: 'center', gap: 14,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: styles.bg, color: styles.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <i className={icon} style={{ fontSize: 32 }} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', color: C.text }}>
          {title}
        </div>
        <div style={{ fontSize: 13.5, color: C.muted, maxWidth: 320, lineHeight: 1.55 }}>{message}</div>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              marginTop: 10,
              padding: '12px 24px', borderRadius: 'var(--r-md)',
              background: C.text, color: C.bg,
              border: `1px solid ${C.text}`, fontSize: 14, fontWeight: 500,
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
    icon="ph-thin ph-compass"
    title="Pagina non trovata"
    message="L'indirizzo che hai inserito non esiste o è stato spostato."
    action={{ label: 'Torna alla home', onClick: () => { window.location.href = '/' } }}
  />
}

export function Forbidden({ onBack }: { onBack?: () => void }) {
  return <Frame
    icon="ph-thin ph-lock"
    title="Accesso negato"
    message="Non hai i permessi per visualizzare questa pagina. Se pensi sia un errore, prova a uscire e rientrare."
    action={onBack
      ? { label: 'Indietro', onClick: onBack }
      : { label: 'Torna alla home', onClick: () => { window.location.href = '/' } }}
    tone="muted"
  />
}

export function ServerError({ onRetry }: { onRetry?: () => void }) {
  return <Frame
    icon="ph-thin ph-warning"
    title="Qualcosa è andato storto"
    message="Si è verificato un errore inatteso. Riprova. Se persiste, contatta il supporto."
    action={onRetry
      ? { label: 'Riprova', onClick: onRetry }
      : { label: 'Ricarica', onClick: () => window.location.reload() }}
    tone="danger"
  />
}

export function Maintenance() {
  return <Frame
    icon="ph-thin ph-wrench"
    title="Lavori in corso"
    message="Stiamo effettuando una manutenzione programmata. Torneremo online a brevissimo — grazie per la pazienza."
    tone="success"
  />
}
