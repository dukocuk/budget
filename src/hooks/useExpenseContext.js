/**
 * useExpenseContext - Consumer hook for Expense Context
 * Provides access to centralized expense state and actions
 */

import { useContext } from 'react';
import { ExpenseContext } from '../contexts/ExpenseContext';

export function useExpenseContext() {
  const context = useContext(ExpenseContext);

  if (!context) {
    throw new Error('useExpenseContext must be used within an ExpenseProvider');
  }

  return context;
}
