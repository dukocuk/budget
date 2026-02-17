/**
 * Tests for AlertProvider
 *
 * Tests showAlert displays message, auto-dismiss after duration,
 * hideAlert clears immediately, multiple alerts override.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AlertProvider } from './AlertProvider';
import { AlertContext } from './AlertContext';

// Test consumer component
const TestConsumer = () => {
  const { alert, showAlert, hideAlert } = useContext(AlertContext);
  return (
    <div>
      {alert && (
        <div data-testid="alert">
          <span data-testid="alert-message">{alert.message}</span>
          <span data-testid="alert-type">{alert.type}</span>
        </div>
      )}
      <button onClick={() => showAlert('Test message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showAlert('Error occurred', 'error')}>
        Show Error
      </button>
      <button onClick={() => showAlert('Info message')}>Show Info</button>
      <button onClick={hideAlert}>Hide Alert</button>
    </div>
  );
};

describe('AlertProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no alert', () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('shows alert with message and type', async () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    await act(async () => {
      screen.getByText('Show Success').click();
    });

    expect(screen.getByTestId('alert-message').textContent).toBe(
      'Test message'
    );
    expect(screen.getByTestId('alert-type').textContent).toBe('success');
  });

  it('defaults type to info when not specified', async () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    await act(async () => {
      screen.getByText('Show Info').click();
    });

    expect(screen.getByTestId('alert-type').textContent).toBe('info');
  });

  it('auto-dismisses after ALERT_DURATION', async () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    await act(async () => {
      screen.getByText('Show Success').click();
    });

    expect(screen.getByTestId('alert')).toBeInTheDocument();

    // Advance past ALERT_DURATION (3000ms)
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('clears alert immediately with hideAlert', async () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    await act(async () => {
      screen.getByText('Show Success').click();
    });

    expect(screen.getByTestId('alert')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('Hide Alert').click();
    });

    expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
  });

  it('overrides previous alert with new one', async () => {
    render(
      <AlertProvider>
        <TestConsumer />
      </AlertProvider>
    );

    await act(async () => {
      screen.getByText('Show Success').click();
    });

    expect(screen.getByTestId('alert-message').textContent).toBe(
      'Test message'
    );

    await act(async () => {
      screen.getByText('Show Error').click();
    });

    expect(screen.getByTestId('alert-message').textContent).toBe(
      'Error occurred'
    );
    expect(screen.getByTestId('alert-type').textContent).toBe('error');
  });
});
