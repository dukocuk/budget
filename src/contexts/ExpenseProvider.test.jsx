/**
 * Tests for ExpenseProvider
 *
 * Tests context value provision, prop passing to useExpenses,
 * sync utility integration, and error when used outside provider.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { ExpenseProvider } from './ExpenseProvider';
import { ExpenseContext } from './ExpenseContext';
import { useExpenses } from '../hooks/useExpenses';
import { useSyncContext } from '../hooks/useSyncContext';
import { useExpenseContext } from '../hooks/useExpenseContext';
import { renderHook } from '@testing-library/react';

// Mock hooks
vi.mock('../hooks/useExpenses', () => ({
  useExpenses: vi.fn(),
}));

vi.mock('../hooks/useSyncContext', () => ({
  useSyncContext: vi.fn(),
}));

const mockExpensesReturn = {
  expenses: [{ id: '1', name: 'Husleje', amount: 5000 }],
  selectedExpenses: new Set(),
  loading: false,
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  deleteSelected: vi.fn(),
  toggleExpenseSelection: vi.fn(),
  toggleSelectAll: vi.fn(),
  setAllExpenses: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
};

const mockSyncReturn = {
  immediateSyncExpenses: vi.fn(),
  isOnline: true,
};

// Test consumer component
const TestConsumer = () => {
  const ctx = useContext(ExpenseContext);
  return (
    <div>
      <span data-testid="expenses">{JSON.stringify(ctx.expenses)}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="can-undo">{String(ctx.canUndo)}</span>
      <span data-testid="can-redo">{String(ctx.canRedo)}</span>
      <span data-testid="is-online">{String(ctx.isOnline)}</span>
      <span data-testid="has-add">{typeof ctx.addExpense}</span>
      <span data-testid="has-update">{typeof ctx.updateExpense}</span>
      <span data-testid="has-delete">{typeof ctx.deleteExpense}</span>
      <span data-testid="has-delete-selected">{typeof ctx.deleteSelected}</span>
      <span data-testid="has-toggle">{typeof ctx.toggleExpenseSelection}</span>
      <span data-testid="has-toggle-all">{typeof ctx.toggleSelectAll}</span>
      <span data-testid="has-set-all">{typeof ctx.setAllExpenses}</span>
      <span data-testid="has-undo">{typeof ctx.undo}</span>
      <span data-testid="has-redo">{typeof ctx.redo}</span>
      <span data-testid="has-sync">{typeof ctx.immediateSyncExpenses}</span>
    </div>
  );
};

describe('ExpenseProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useExpenses.mockReturnValue(mockExpensesReturn);
    useSyncContext.mockReturnValue(mockSyncReturn);
  });

  it('renders children', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <div data-testid="child">Hello</div>
      </ExpenseProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('passes userId and periodId to useExpenses', () => {
    render(
      <ExpenseProvider userId="test-user" periodId="test-period">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(useExpenses).toHaveBeenCalledWith('test-user', 'test-period');
  });

  it('provides expense state through context', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(screen.getByTestId('expenses')).toHaveTextContent(
      JSON.stringify([{ id: '1', name: 'Husleje', amount: 5000 }])
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
    expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
  });

  it('provides CRUD action functions', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(screen.getByTestId('has-add')).toHaveTextContent('function');
    expect(screen.getByTestId('has-update')).toHaveTextContent('function');
    expect(screen.getByTestId('has-delete')).toHaveTextContent('function');
    expect(screen.getByTestId('has-delete-selected')).toHaveTextContent(
      'function'
    );
  });

  it('provides selection action functions', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(screen.getByTestId('has-toggle')).toHaveTextContent('function');
    expect(screen.getByTestId('has-toggle-all')).toHaveTextContent('function');
    expect(screen.getByTestId('has-set-all')).toHaveTextContent('function');
  });

  it('provides undo/redo functions', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(screen.getByTestId('has-undo')).toHaveTextContent('function');
    expect(screen.getByTestId('has-redo')).toHaveTextContent('function');
  });

  it('provides sync utilities from SyncContext', () => {
    render(
      <ExpenseProvider userId="user1" periodId="period1">
        <TestConsumer />
      </ExpenseProvider>
    );

    expect(screen.getByTestId('has-sync')).toHaveTextContent('function');
    expect(screen.getByTestId('is-online')).toHaveTextContent('true');
  });

  it('throws when useExpenseContext is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useExpenseContext());
    }).toThrow('useExpenseContext must be used within an ExpenseProvider');

    consoleSpy.mockRestore();
  });
});
