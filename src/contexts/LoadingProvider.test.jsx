/**
 * Tests for LoadingProvider
 *
 * Tests each loading stage sets correct message + progress %,
 * invalid stage defaults, and context values work correctly.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { LoadingProvider } from './LoadingProvider';
import { LoadingContext } from './LoadingContext';

// Test consumer component
const TestConsumer = () => {
  const { isLoading, stage, message, progress, setLoadingStage } =
    useContext(LoadingContext);
  return (
    <div>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="stage">{stage}</span>
      <span data-testid="message">{message}</span>
      <span data-testid="progress">{progress}</span>
      <button onClick={() => setLoadingStage('auth')}>Set Auth</button>
      <button onClick={() => setLoadingStage('budget')}>Set Budget</button>
      <button onClick={() => setLoadingStage('data')}>Set Data</button>
      <button onClick={() => setLoadingStage('complete')}>Set Complete</button>
      <button onClick={() => setLoadingStage('invalid')}>Set Invalid</button>
    </div>
  );
};

describe('LoadingProvider', () => {
  it('provides default complete state', () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    expect(screen.getByTestId('isLoading').textContent).toBe('false');
    expect(screen.getByTestId('stage').textContent).toBe('complete');
    expect(screen.getByTestId('message').textContent).toBe('');
    expect(screen.getByTestId('progress').textContent).toBe('100');
  });

  it('sets auth stage correctly', async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    await act(async () => {
      screen.getByText('Set Auth').click();
    });

    expect(screen.getByTestId('isLoading').textContent).toBe('true');
    expect(screen.getByTestId('stage').textContent).toBe('auth');
    expect(screen.getByTestId('message').textContent).toBe('Indlæser...');
    expect(screen.getByTestId('progress').textContent).toBe('30');
  });

  it('sets budget stage correctly', async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    await act(async () => {
      screen.getByText('Set Budget').click();
    });

    expect(screen.getByTestId('isLoading').textContent).toBe('true');
    expect(screen.getByTestId('stage').textContent).toBe('budget');
    expect(screen.getByTestId('message').textContent).toBe(
      'Indlæser budget...'
    );
    expect(screen.getByTestId('progress').textContent).toBe('50');
  });

  it('sets data stage correctly', async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    await act(async () => {
      screen.getByText('Set Data').click();
    });

    expect(screen.getByTestId('isLoading').textContent).toBe('true');
    expect(screen.getByTestId('stage').textContent).toBe('data');
    expect(screen.getByTestId('message').textContent).toBe(
      'Henter dine data...'
    );
    expect(screen.getByTestId('progress').textContent).toBe('80');
  });

  it('sets complete stage correctly', async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    // First set to loading
    await act(async () => {
      screen.getByText('Set Auth').click();
    });
    expect(screen.getByTestId('isLoading').textContent).toBe('true');

    // Then set to complete
    await act(async () => {
      screen.getByText('Set Complete').click();
    });

    expect(screen.getByTestId('isLoading').textContent).toBe('false');
    expect(screen.getByTestId('stage').textContent).toBe('complete');
    expect(screen.getByTestId('message').textContent).toBe('');
    expect(screen.getByTestId('progress').textContent).toBe('100');
  });

  it('defaults to complete for invalid stage', async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    await act(async () => {
      screen.getByText('Set Invalid').click();
    });

    expect(screen.getByTestId('isLoading').textContent).toBe('false');
    expect(screen.getByTestId('stage').textContent).toBe('complete');
    expect(screen.getByTestId('progress').textContent).toBe('100');
  });
});
