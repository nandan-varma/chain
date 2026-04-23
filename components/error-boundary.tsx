"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-red-500">
                Something went wrong
              </h1>
              <p className="text-slate-600">
                Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
