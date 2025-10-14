/**
 * Tests for ErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child component</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Child component')).toBeInTheDocument()
  })

  it('catches errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️ Noget gik galt')).toBeInTheDocument()
    expect(screen.getByText('Der opstod en uventet fejl i applikationen.')).toBeInTheDocument()
  })

  it('displays error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Tekniske detaljer')).toBeInTheDocument()
    expect(screen.getByText(/Test error/)).toBeInTheDocument()
  })

  it('renders reset button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const resetButton = screen.getByRole('button', { name: /Genstart applikationen/ })
    expect(resetButton).toBeInTheDocument()
  })

  it('reloads page when reset button is clicked', async () => {
    const user = userEvent.setup()

    // Mock window.location.reload
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock }
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const resetButton = screen.getByRole('button', { name: /Genstart applikationen/ })
    await user.click(resetButton)

    expect(reloadMock).toHaveBeenCalled()
  })

  it('displays help text', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Hvis problemet fortsætter/)).toBeInTheDocument()
  })

  it('logs error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error caught by boundary:',
      expect.any(Error),
      expect.any(Object)
    )

    consoleErrorSpy.mockRestore()
  })

  it('applies correct CSS classes', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(container.querySelector('.error-boundary')).toBeInTheDocument()
    expect(container.querySelector('.error-content')).toBeInTheDocument()
    expect(container.querySelector('.error-details')).toBeInTheDocument()
    expect(container.querySelector('.error-help')).toBeInTheDocument()
  })

  it('handles multiple children', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
    expect(screen.getByText('Third child')).toBeInTheDocument()
  })

  it('catches errors from deeply nested components', () => {
    render(
      <ErrorBoundary>
        <div>
          <div>
            <div>
              <ThrowError shouldThrow={true} />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )

    expect(screen.getByText('⚠️ Noget gik galt')).toBeInTheDocument()
  })

  it('only catches errors in its children, not in siblings', () => {
    render(
      <>
        <ErrorBoundary>
          <div>Safe component</div>
        </ErrorBoundary>
        <div>Sibling component</div>
      </>
    )

    expect(screen.getByText('Safe component')).toBeInTheDocument()
    expect(screen.getByText('Sibling component')).toBeInTheDocument()
  })
})
