import { Component } from 'react'

// A render error anywhere below this must never blank the whole page —
// your notes are still safely in localStorage even if a component crashes.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Study Hall render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash-screen">
          <h1>Something went wrong in the UI</h1>
          <p>
            Your data is safe — it lives in this browser's storage, not in
            the screen that crashed. Reloading usually fixes it.
          </p>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
