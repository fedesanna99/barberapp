import { Component, type ReactNode } from 'react'
import { ServerError } from '../screens/StatusPages'

interface Props {
  children: ReactNode
}

interface State {
  err: Error | null
}

// Top-level boundary. Catches any uncaught exception in the render tree
// and shows the 500 page (with a "Riprova" action that resets state).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error, info: { componentStack?: string }) {
    // Logged to the browser console so dev/QA can grab the stack; the user
    // still sees the friendly 500 screen. No telemetry pipeline yet.
    console.error('[ErrorBoundary]', err, info.componentStack)
  }

  reset = () => this.setState({ err: null })

  render() {
    if (this.state.err) return <ServerError onRetry={this.reset} />
    return this.props.children
  }
}
