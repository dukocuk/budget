/**
 * Error boundary component for graceful error handling
 */

import React from 'react'
import './ErrorBoundary.css'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>⚠️ Noget gik galt</h1>
            <p>Der opstod en uventet fejl i applikationen.</p>

            {this.state.error && (
              <details className="error-details">
                <summary>Tekniske detaljer</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}

            <button className="btn-reset" onClick={this.handleReset}>
              🔄 Genstart applikationen
            </button>

            <p className="error-help">
              Hvis problemet fortsætter, prøv at rydde browserens cache og genindlæs siden.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
