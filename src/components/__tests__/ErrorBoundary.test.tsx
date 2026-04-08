// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

function Bomb(): never {
  throw new Error('test explosion')
}

// Suppress React's console.error output during error boundary tests
const suppressConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <span>all good</span>
      </ErrorBoundary>
    )
    expect(screen.getByText('all good')).toBeTruthy()
  })

  it('renders fallback message when a child throws', () => {
    suppressConsoleError()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeTruthy()
  })

  it('renders a Reload button when a child throws', () => {
    suppressConsoleError()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy()
  })
})
