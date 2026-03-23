/**
 * Tests for BudgetPeriodProvider
 *
 * Tests context value provision, prop passing to useBudgetPeriods,
 * and error when used outside provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { BudgetPeriodProvider } from './BudgetPeriodProvider';
import { BudgetPeriodContext } from './BudgetPeriodContext';
import { useBudgetPeriods } from '../hooks/useBudgetPeriods';
import { useBudgetPeriodContext } from '../hooks/useBudgetPeriodContext';
import { renderHook } from '@testing-library/react';

// Mock the core hook
vi.mock('../hooks/useBudgetPeriods', () => ({
  useBudgetPeriods: vi.fn(),
}));

const mockHookReturn = {
  periods: [{ id: '1', year: 2025 }],
  activePeriod: { id: '1', year: 2025 },
  setActivePeriod: vi.fn(),
  loading: false,
  error: null,
  createPeriod: vi.fn(),
  updatePeriod: vi.fn(),
  archivePeriod: vi.fn(),
  unarchivePeriod: vi.fn(),
  deletePeriod: vi.fn(),
  calculateEndingBalance: vi.fn(),
  getActivePeriod: vi.fn(),
  getExpensesForPeriod: vi.fn(),
  createFromTemplate: vi.fn(),
  getTemplates: vi.fn(),
  saveAsTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  fetchPeriodsFromDB: vi.fn(),
  reload: vi.fn(),
};

// Test consumer component
const TestConsumer = () => {
  const ctx = useContext(BudgetPeriodContext);
  return (
    <div>
      <span data-testid="periods">{JSON.stringify(ctx.periods)}</span>
      <span data-testid="active-period">
        {JSON.stringify(ctx.activePeriod)}
      </span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="error">{String(ctx.error)}</span>
      <span data-testid="has-create">{typeof ctx.createPeriod}</span>
      <span data-testid="has-update">{typeof ctx.updatePeriod}</span>
      <span data-testid="has-archive">{typeof ctx.archivePeriod}</span>
      <span data-testid="has-unarchive">{typeof ctx.unarchivePeriod}</span>
      <span data-testid="has-delete">{typeof ctx.deletePeriod}</span>
      <span data-testid="has-templates">{typeof ctx.getTemplates}</span>
      <span data-testid="has-save-template">{typeof ctx.saveAsTemplate}</span>
      <span data-testid="has-create-template">
        {typeof ctx.createFromTemplate}
      </span>
      <span data-testid="has-delete-template">{typeof ctx.deleteTemplate}</span>
      <span data-testid="has-reload">{typeof ctx.reload}</span>
      <span data-testid="has-fetch">{typeof ctx.fetchPeriodsFromDB}</span>
    </div>
  );
};

describe('BudgetPeriodProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBudgetPeriods.mockReturnValue(mockHookReturn);
  });

  it('renders children', () => {
    render(
      <BudgetPeriodProvider userId="user1">
        <div data-testid="child">Hello</div>
      </BudgetPeriodProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('passes userId to useBudgetPeriods', () => {
    render(
      <BudgetPeriodProvider userId="test-user-123">
        <TestConsumer />
      </BudgetPeriodProvider>
    );

    expect(useBudgetPeriods).toHaveBeenCalledWith('test-user-123');
  });

  it('provides state values through context', () => {
    render(
      <BudgetPeriodProvider userId="user1">
        <TestConsumer />
      </BudgetPeriodProvider>
    );

    expect(screen.getByTestId('periods')).toHaveTextContent(
      JSON.stringify([{ id: '1', year: 2025 }])
    );
    expect(screen.getByTestId('active-period')).toHaveTextContent(
      JSON.stringify({ id: '1', year: 2025 })
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('provides CRUD action functions', () => {
    render(
      <BudgetPeriodProvider userId="user1">
        <TestConsumer />
      </BudgetPeriodProvider>
    );

    expect(screen.getByTestId('has-create')).toHaveTextContent('function');
    expect(screen.getByTestId('has-update')).toHaveTextContent('function');
    expect(screen.getByTestId('has-archive')).toHaveTextContent('function');
    expect(screen.getByTestId('has-unarchive')).toHaveTextContent('function');
    expect(screen.getByTestId('has-delete')).toHaveTextContent('function');
  });

  it('provides template action functions', () => {
    render(
      <BudgetPeriodProvider userId="user1">
        <TestConsumer />
      </BudgetPeriodProvider>
    );

    expect(screen.getByTestId('has-templates')).toHaveTextContent('function');
    expect(screen.getByTestId('has-save-template')).toHaveTextContent(
      'function'
    );
    expect(screen.getByTestId('has-create-template')).toHaveTextContent(
      'function'
    );
    expect(screen.getByTestId('has-delete-template')).toHaveTextContent(
      'function'
    );
  });

  it('provides utility functions', () => {
    render(
      <BudgetPeriodProvider userId="user1">
        <TestConsumer />
      </BudgetPeriodProvider>
    );

    expect(screen.getByTestId('has-reload')).toHaveTextContent('function');
    expect(screen.getByTestId('has-fetch')).toHaveTextContent('function');
  });

  it('throws when useBudgetPeriodContext is used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBudgetPeriodContext());
    }).toThrow(
      'useBudgetPeriodContext must be used within a BudgetPeriodProvider'
    );

    consoleSpy.mockRestore();
  });
});
