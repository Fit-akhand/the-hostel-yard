import { Component } from 'react'
import { Button, Card } from '../components/ui'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[The Hostel Yard] render error', error, info)
  }

  reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6">
        <div className="flex min-h-[70vh] items-center justify-center">
          <Card className="w-full max-w-lg border border-line bg-card p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-8 w-8 text-brand"
                aria-hidden="true"
              >
                <path
                  d="M12 8v5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16.5h.01"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M10.3 4.7 2.9 17.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-ink-600">
              This screen failed to render. Your session is still active.
              Try again or return to the dashboard.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => window.location.assign('/dashboard')}
              >
                Go home
              </Button>

              <Button
                className="bg-brand text-white hover:bg-brand-dark"
                onClick={this.reset}
              >
                Try again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }
}