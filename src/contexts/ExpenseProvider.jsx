/**
 * Expense Provider - Centralized expense state management
 * Wraps useExpenses hook to eliminate prop drilling
 */

import { useMemo } from 'react';
import { useExpenses } from '../hooks/useExpenses';
import { useSyncContext } from '../hooks/useSyncContext';
import { ExpenseContext } from './ExpenseContext';

export function ExpenseProvider({ children, userId, periodId }) {
  // Core expense management from hook
  const {
    expenses,
    selectedExpenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteSelected,
    toggleExpenseSelection,
    toggleSelectAll,
    setAllExpenses,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useExpenses(userId, periodId);

  // Sync context for immediate operations
  const { immediateSyncExpenses, isOnline } = useSyncContext();

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      // State
      expenses,
      selectedExpenses,
      loading,
      canUndo,
      canRedo,

      // Actions
      addExpense,
      updateExpense,
      deleteExpense,
      deleteSelected,
      toggleExpenseSelection,
      toggleSelectAll,
      setAllExpenses,
      undo,
      redo,

      // Sync utilities
      immediateSyncExpenses,
      isOnline,
    }),
    [
      expenses,
      selectedExpenses,
      loading,
      canUndo,
      canRedo,
      addExpense,
      updateExpense,
      deleteExpense,
      deleteSelected,
      toggleExpenseSelection,
      toggleSelectAll,
      setAllExpenses,
      undo,
      redo,
      immediateSyncExpenses,
      isOnline,
    ]
  );

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}
