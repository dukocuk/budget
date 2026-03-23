/**
 * Tests for UnifiedLoadingScreen component
 *
 * Tests rendering based on loading state, stage-specific icons,
 * progress bar, help text visibility, and fade-out behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { UnifiedLoadingScreen } from './UnifiedLoadingScreen';
import { useLoadingContext } from '../../hooks/useLoadingContext';

// Mock the loading context hook
vi.mock('../../hooks/useLoadingContext', () => ({
  useLoadingContext: vi.fn(),
}));

// Mock the CSS import
vi.mock('./UnifiedLoadingScreen.css', () => ({}));

describe('UnifiedLoadingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when not loading', () => {
    useLoadingContext.mockReturnValue({
      isLoading: false,
      stage: 'auth',
      message: '',
      progress: 0,
    });

    const { container } = render(<UnifiedLoadingScreen />);
    expect(container.innerHTML).toBe('');
  });

  it('renders loading container when isLoading is true', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'auth',
      message: 'Logger ind...',
      progress: 30,
    });

    render(<UnifiedLoadingScreen />);
    expect(screen.getByText('Logger ind...')).toBeInTheDocument();
  });

  it('shows gear icon for auth stage', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'auth',
      message: 'Logger ind...',
      progress: 30,
    });

    render(<UnifiedLoadingScreen />);
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('shows gear icon for budget stage', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'budget',
      message: 'Henter budget...',
      progress: 50,
    });

    render(<UnifiedLoadingScreen />);
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('shows cloud icon for data stage', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'data',
      message: 'Henter data...',
      progress: 80,
    });

    render(<UnifiedLoadingScreen />);
    expect(screen.getByText('☁️')).toBeInTheDocument();
  });

  it('displays progress bar with correct width', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'budget',
      message: 'Henter budget...',
      progress: 50,
    });

    render(<UnifiedLoadingScreen />);
    const progressFill = document.querySelector('.progress-bar-fill');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('shows help text only for data stage', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'data',
      message: 'Henter data...',
      progress: 80,
    });

    render(<UnifiedLoadingScreen />);
    const helpText = screen.getByText(/genindlæse siden/i);
    expect(helpText).toHaveClass('visible');
  });

  it('hides help text for non-data stages', () => {
    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'auth',
      message: 'Logger ind...',
      progress: 30,
    });

    render(<UnifiedLoadingScreen />);
    const helpText = screen.getByText(/genindlæse siden/i);
    expect(helpText).toHaveClass('hidden');
  });

  it('adds exiting class during fade-out', async () => {
    vi.useFakeTimers();

    useLoadingContext.mockReturnValue({
      isLoading: true,
      stage: 'auth',
      message: 'Logger ind...',
      progress: 30,
    });

    const { rerender } = render(<UnifiedLoadingScreen />);
    const container = document.querySelector('.loading-container');
    expect(container).not.toHaveClass('exiting');

    // Switch to not loading to trigger fade-out
    useLoadingContext.mockReturnValue({
      isLoading: false,
      stage: 'complete',
      message: '',
      progress: 100,
    });

    await act(async () => {
      rerender(<UnifiedLoadingScreen />);
    });

    const exitingContainer = document.querySelector('.loading-container');
    expect(exitingContainer).toHaveClass('exiting');

    vi.useRealTimers();
  });
});
