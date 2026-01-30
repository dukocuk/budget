/**
 * Tests for useExpenseContext consumer hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpenseContext } from './useExpenseContext';
import { ExpenseProvider } from '../contexts/ExpenseProvider';
import { BudgetPeriodProvider } from '../contexts/BudgetPeriodProvider';
import { SyncProvider } from '../contexts/SyncContext';

describe('useExpenseContext', () => {
  it('throws error when used outside ExpenseProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useExpenseContext());
    }).toThrow('useExpenseContext must be used within an ExpenseProvider');

    consoleSpy.mockRestore();
  });

  it('returns expense context when used within ExpenseProvider', () => {
    const mockUser = { id: 'test-user', name: 'Test User' };
    const wrapper = ({ children }) => (
      <SyncProvider user={mockUser}>
        <BudgetPeriodProvider userId="test-user">
          <ExpenseProvider userId="test-user" periodId={1}>
            {children}
          </ExpenseProvider>
        </BudgetPeriodProvider>
      </SyncProvider>
    );

    const { result } = renderHook(() => useExpenseContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.expenses).toBeDefined();
    expect(result.current.addExpense).toBeDefined();
    expect(result.current.updateExpense).toBeDefined();
    expect(result.current.deleteExpense).toBeDefined();
    expect(typeof result.current.addExpense).toBe('function');
    expect(typeof result.current.updateExpense).toBe('function');
    expect(typeof result.current.deleteExpense).toBe('function');
  });

  it('provides undo/redo functionality', () => {
    const mockUser = { id: 'test-user', name: 'Test User' };
    const wrapper = ({ children }) => (
      <SyncProvider user={mockUser}>
        <BudgetPeriodProvider userId="test-user">
          <ExpenseProvider userId="test-user" periodId={1}>
            {children}
          </ExpenseProvider>
        </BudgetPeriodProvider>
      </SyncProvider>
    );

    const { result } = renderHook(() => useExpenseContext(), { wrapper });

    expect(result.current.undo).toBeDefined();
    expect(result.current.redo).toBeDefined();
    expect(result.current.canUndo).toBeDefined();
    expect(result.current.canRedo).toBeDefined();
    expect(typeof result.current.undo).toBe('function');
    expect(typeof result.current.redo).toBe('function');
  });
});
