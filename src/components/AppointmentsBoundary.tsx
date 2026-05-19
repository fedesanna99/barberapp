import { Component } from 'react'
import type { ReactNode } from 'react'
import { C } from '../lib/colors'
import { Icon } from './Icon'

interface Props {
  children:  ReactNode
  onClose:   () => void
}
interface State { hasError: boolean }

/**
 * Scoped error boundary for the MyAppointments overlay.
 * If anything inside crashes during render, shows a contained error card
 * (not the full-screen ServerError page) so the rest of the app keeps working.
 */
export class AppointmentsBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(err: Error) {
    console.error('[AppointmentsBoundary]', err)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute', inset: 0, background: C.bg, zIndex: 50,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={this.props.onClose}
              aria-label="Chiudi"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <Icon name="back" size={22} color={C.text} />
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
              I miei appuntamenti
            </span>
          </div>

          {/* error body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--rust-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="warning" size={26} color={C.red} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: C.text }}>
              Impossibile caricare
            </div>
            <div style={{ fontSize: 13, color: C.muted, maxWidth: 280, lineHeight: 1.55 }}>
              Si è verificato un errore imprevisto nel caricamento degli appuntamenti. Riprova.
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false })
              }}
              style={{ marginTop: 4, padding: '12px 28px', borderRadius: 'var(--r-md)', background: 'var(--clay)', color: 'var(--paper-3)', border: '1px solid var(--clay)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Riprova
            </button>
            <button
              onClick={this.props.onClose}
              style={{ padding: '8px 16px', borderRadius: 'var(--r-md)', background: 'transparent', color: C.muted, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
