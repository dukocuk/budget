/**
 * Custom hook for expense management with PGlite local database + cloud sync
 * Implements optimistic UI updates to prevent focus loss during sync
 * OPTIMIZATION: Uses useLayoutEffect for history tracking to batch with render cycle
 */

import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { localDB } from '../lib/pglite';
import { useSyncContext } from './useSyncContext';
import { sanitizeExpense } from '../utils/validators';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';

/**
 * Hook for managing expenses with local-first architecture
 *
 * Features:
 * - Local-first data storage with PGlite
 * - Automatic cloud synchronization with debouncing
 * - Optimistic UI updates for instant feedback
 * - Undo/Redo functionality with history tracking
 * - Bulk operations (select/delete multiple expenses)
 * - Multi-year support with budget period filtering
 *
 * @param {string} userId - User ID for filtering expenses (from authentication)
 * @param {string} periodId - Budget period ID for year filtering (required for multi-year support)
 *
 * @returns {Object} Expense management interface
 * @returns {Array<Object>} returns.expenses - Array of expense objects
 * @returns {boolean} returns.loading - Loading state during initial data fetch
 * @returns {string|null} returns.error - Error message if operation failed
 * @returns {Array<number>} returns.selectedExpenses - Array of selected expense IDs for bulk operations
 * @returns {Function} returns.addExpense - Add new expense (async)
 * @returns {Function} returns.updateExpense - Update existing expense (async)
 * @returns {Function} returns.deleteExpense - Delete single expense (async)
 * @returns {Function} returns.deleteExpenses - Delete multiple expenses (async)
 * @returns {Function} returns.deleteSelected - Delete all selected expenses (async)
 * @returns {Function} returns.importExpenses - Replace all expenses with imported data (async)
 * @returns {Function} returns.toggleExpenseSelection - Toggle selection state for an expense
 * @returns {Function} returns.toggleSelectAll - Toggle selection for all expenses
 * @returns {Function} returns.setAllExpenses - Replace expenses array (for cloud sync)
 * @returns {Function} returns.undo - Undo last operation
 * @returns {Function} returns.redo - Redo previously undone operation
 * @returns {boolean} returns.canUndo - Whether undo is available
 * @returns {boolean} returns.canRedo - Whether redo is available
 * @returns {Function} returns.reload - Manually reload expenses from local database
 *
 * @example
 * const {
 *   expenses,
 *   loading,
 *   addExpense,
 *   updateExpense,
 *   deleteExpense,
 *   undo,
 *   canUndo
 * } = useExpenses(user.id, activePeriod.id)
 *
 * // Add new expense
 * await addExpense({
 *   name: 'Netflix',
 *   amount: 79,
 *   frequency: 'monthly',
 *   startMonth: 1,
 *   endMonth: 12
 * })
 *
 * // Update expense
 * await updateExpense(expenseId, { amount: 89 })
 *
 * // Undo if needed
 * if (canUndo) {
 *   undo()
 * }
 */

/**
 * Reducer for managing expenses with undo/redo history
 * Handles all state updates atomically to prevent race conditions
 */
const expensesReducer = (state, action) => {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        expenses: action.payload,
        history: [action.payload],
        historyIndex: 0,
        loading: false,
        error: null,
        isInitialLoad: false,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'UPDATE_EXPENSES': {
      const newExpenses = action.payload;

      // Don't add to history if expenses haven't changed
      if (JSON.stringify(state.expenses) === JSON.stringify(newExpenses)) {
        return state;
      }

      // Clear future history and add new snapshot
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        newExpenses,
      ];

      return {
        ...state,
        expenses: newExpenses,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UNDO':
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          expenses: state.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return state;

    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          expenses: state.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return state;

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    default:
      return state;
  }
};

const initialState = {
  expenses: [],
  history: [],
  historyIndex: -1,
  loading: true,
  error: null,
  isInitialLoad: true,
};

export const useExpenses = (userId, periodId) => {
  const [state, dispatch] = useReducer(expensesReducer, initialState);
  const { expenses, history, historyIndex, loading, error } = state;

  // Get sync functions from context
  const { syncExpenses } = useSyncContext();

  // Track if we need to sync after local changes
  const needsSyncRef = useRef(false);
  const syncTimeoutRef = useRef(null);

  /**
   * Load expenses from local PGlite database
   */
  const loadExpenses = useCallback(async () => {
    if (!userId || !periodId) {
      dispatch({ type: 'LOAD_ERROR', payload: null });
      return;
    }

    try {
      dispatch({ type: 'LOAD_START' });

      const result = await localDB.query(
        'SELECT * FROM expenses WHERE user_id = $1 AND budget_period_id = $2 ORDER BY id DESC',
        [userId, periodId]
      );

      const loadedExpenses = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        amount: row.amount,
        frequency: row.frequency,
        startMonth: row.start_month,
        endMonth: row.end_month,
        budgetPeriodId: row.budget_period_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      dispatch({ type: 'LOAD_SUCCESS', payload: loadedExpenses });
    } catch (err) {
      logger.error('❌ Error loading expenses from local DB:', err);
      dispatch({ type: 'LOAD_ERROR', payload: err.message });
    }
  }, [userId, periodId]);

  /**
   * Debounced cloud sync - only sync after user stops making changes
   * CRITICAL FIX: Now syncs ALL expenses across all periods
   */
  const debouncedCloudSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (needsSyncRef.current && userId) {
        // Get ALL expenses for this user (across all periods) for complete sync
        localDB
          .query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC', [
            userId,
          ])
          .then(result => {
            const expensesToSync = result.rows.map(row => ({
              id: row.id,
              name: row.name,
              amount: row.amount,
              frequency: row.frequency,
              startMonth: row.start_month,
              endMonth: row.end_month,
              budgetPeriodId: row.budget_period_id,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }));
            // SyncContext will fetch complete periods/settings automatically
            syncExpenses(expensesToSync);
            needsSyncRef.current = false;
          })
          .catch(err => {
            logger.error('❌ Error syncing to cloud:', err);
          });
      }
    }, 1000); // Sync 1 second after last change
  }, [userId, syncExpenses]);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Add new expense (optimistic update with UUID)
   */
  const addExpense = useCallback(
    async expenseData => {
      if (!userId || !periodId) return;

      try {
        dispatch({ type: 'SET_ERROR', payload: null });

        // Generate UUID for new expense
        const newId = generateUUID();

        // Sanitize input
        const sanitized = sanitizeExpense({
          name: expenseData.name || 'Ny udgift',
          amount: expenseData.amount || 100,
          frequency: expenseData.frequency || 'monthly',
          startMonth: expenseData.startMonth || 1,
          endMonth: expenseData.endMonth || 12,
        });

        const now = new Date().toISOString();

        // Insert into local database with client-generated UUID
        await localDB.query(
          `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newId,
            userId,
            sanitized.name,
            sanitized.amount,
            sanitized.frequency,
            sanitized.startMonth,
            sanitized.endMonth,
            periodId,
            now,
            now,
          ]
        );

        const newExpense = {
          id: newId,
          name: sanitized.name,
          amount: sanitized.amount,
          frequency: sanitized.frequency,
          startMonth: sanitized.startMonth,
          endMonth: sanitized.endMonth,
          budgetPeriodId: periodId,
          createdAt: now,
          updatedAt: now,
        };

        // Optimistic UI update - add to local state immediately with history tracking
        dispatch({
          type: 'UPDATE_EXPENSES',
          payload: [newExpense, ...expenses],
        });

        // Queue cloud sync
        needsSyncRef.current = true;
        debouncedCloudSync();

        return newExpense;
      } catch (err) {
        logger.error('❌ Error adding expense:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
        throw err;
      }
    },
    [userId, periodId, expenses, debouncedCloudSync]
  );

  /**
   * Update expense (optimistic update)
   */
  const updateExpense = useCallback(
    async (id, updates) => {
      if (!userId) return;

      try {
        dispatch({ type: 'SET_ERROR', payload: null });

        // Build update query dynamically based on provided fields
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
          updateFields.push(`name = $${paramIndex++}`);
          values.push(updates.name);
        }
        if (updates.amount !== undefined) {
          updateFields.push(`amount = $${paramIndex++}`);
          values.push(Math.max(0, parseFloat(updates.amount) || 0));
        }
        if (updates.frequency !== undefined) {
          updateFields.push(`frequency = $${paramIndex++}`);
          values.push(updates.frequency);
        }
        if (updates.startMonth !== undefined) {
          updateFields.push(`start_month = $${paramIndex++}`);
          values.push(parseInt(updates.startMonth));
        }
        if (updates.endMonth !== undefined) {
          updateFields.push(`end_month = $${paramIndex++}`);
          values.push(parseInt(updates.endMonth));
        }

        updateFields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());

        // Add WHERE conditions
        values.push(id);
        values.push(userId);
        values.push(periodId);

        // Execute update
        await localDB.query(
          `UPDATE expenses
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} AND budget_period_id = $${paramIndex}`,
          values
        );

        // Optimistic UI update - update local state immediately with history tracking
        const updatedExpenses = expenses.map(expense => {
          if (expense.id === id) {
            const updated = { ...expense, ...updates };
            // Handle month field name conversion
            if (updates.startMonth !== undefined)
              updated.startMonth = updates.startMonth;
            if (updates.endMonth !== undefined)
              updated.endMonth = updates.endMonth;
            return sanitizeExpense(updated);
          }
          return expense;
        });

        dispatch({ type: 'UPDATE_EXPENSES', payload: updatedExpenses });

        // Queue cloud sync
        needsSyncRef.current = true;
        debouncedCloudSync();
      } catch (err) {
        logger.error('❌ Error updating expense:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
        throw err;
      }
    },
    [userId, periodId, expenses, debouncedCloudSync]
  );

  /**
   * Delete single expense (optimistic update)
   */
  const deleteExpense = useCallback(
    async id => {
      if (!userId) return;

      try {
        dispatch({ type: 'SET_ERROR', payload: null });

        // Delete from local database
        await localDB.query(
          'DELETE FROM expenses WHERE id = $1 AND user_id = $2 AND budget_period_id = $3',
          [id, userId, periodId]
        );

        // Optimistic UI update - remove from local state immediately with history tracking
        dispatch({
          type: 'UPDATE_EXPENSES',
          payload: expenses.filter(expense => expense.id !== id),
        });

        // Queue cloud sync
        needsSyncRef.current = true;
        debouncedCloudSync();
      } catch (err) {
        logger.error('❌ Error deleting expense:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
        throw err;
      }
    },
    [userId, periodId, expenses, debouncedCloudSync]
  );

  /**
   * Delete multiple expenses (optimistic update)
   */
  const deleteExpenses = useCallback(
    async ids => {
      if (!userId || !ids || ids.length === 0) return;

      try {
        dispatch({ type: 'SET_ERROR', payload: null });

        // Delete from local database
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        await localDB.query(
          `DELETE FROM expenses WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1} AND budget_period_id = $${ids.length + 2}`,
          [...ids, userId, periodId]
        );

        // Optimistic UI update - remove from local state immediately with history tracking
        dispatch({
          type: 'UPDATE_EXPENSES',
          payload: expenses.filter(expense => !ids.includes(expense.id)),
        });

        // Queue cloud sync
        needsSyncRef.current = true;
        debouncedCloudSync();
      } catch (err) {
        logger.error('❌ Error deleting expenses:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
        throw err;
      }
    },
    [userId, periodId, expenses, debouncedCloudSync]
  );

  /**
   * Import expenses (replace all with UUID generation)
   */
  const importExpenses = useCallback(
    async newExpenses => {
      if (!userId || !periodId) return;

      try {
        dispatch({ type: 'SET_ERROR', payload: null });

        // Delete all existing expenses for this period
        await localDB.query(
          'DELETE FROM expenses WHERE user_id = $1 AND budget_period_id = $2',
          [userId, periodId]
        );

        const now = new Date().toISOString();
        const importedExpenses = [];

        // Insert new expenses with generated UUIDs
        for (const expense of newExpenses) {
          const sanitized = sanitizeExpense(expense);
          const newId = generateUUID();

          await localDB.query(
            `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              newId,
              userId,
              sanitized.name,
              sanitized.amount,
              sanitized.frequency,
              sanitized.startMonth,
              sanitized.endMonth,
              periodId,
              now,
              now,
            ]
          );

          importedExpenses.push({
            id: newId,
            name: sanitized.name,
            amount: sanitized.amount,
            frequency: sanitized.frequency,
            startMonth: sanitized.startMonth,
            endMonth: sanitized.endMonth,
            budgetPeriodId: periodId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Update state with imported expenses (adds to history)
        dispatch({ type: 'UPDATE_EXPENSES', payload: importedExpenses });

        // Queue cloud sync
        needsSyncRef.current = true;
        debouncedCloudSync();
      } catch (err) {
        logger.error('❌ Error importing expenses:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
        throw err;
      }
    },
    [userId, periodId, debouncedCloudSync]
  );

  // Selection state for bulk operations
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  /**
   * Toggle expense selection
   */
  const toggleExpenseSelection = useCallback(id => {
    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expId => expId !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  /**
   * Toggle select all expenses
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenses.map(e => e.id));
    }
  }, [selectedExpenses.length, expenses]);

  /**
   * Delete selected expenses
   */
  const deleteSelected = useCallback(async () => {
    if (selectedExpenses.length === 0) {
      return { success: false, message: 'No expenses selected' };
    }

    try {
      await deleteExpenses(selectedExpenses);
      setSelectedExpenses([]);
      return { success: true, count: selectedExpenses.length };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [selectedExpenses, deleteExpenses]);

  /**
   * Set all expenses (for cloud sync)
   */
  const setAllExpenses = useCallback(newExpenses => {
    dispatch({ type: 'UPDATE_EXPENSES', payload: newExpenses });
  }, []);

  // Undo/Redo functionality (managed by reducer)
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      dispatch({ type: 'UNDO' });
      needsSyncRef.current = true;
      debouncedCloudSync();
      return true;
    }
    return false;
  }, [canUndo, debouncedCloudSync]);

  const redo = useCallback(() => {
    if (canRedo) {
      dispatch({ type: 'REDO' });
      needsSyncRef.current = true;
      debouncedCloudSync();
      return true;
    }
    return false;
  }, [canRedo, debouncedCloudSync]);

  return {
    expenses,
    loading,
    error,
    selectedExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    deleteSelected,
    importExpenses,
    toggleExpenseSelection,
    toggleSelectAll,
    setAllExpenses,
    undo,
    redo,
    canUndo,
    canRedo,
    reload: loadExpenses,
  };
};
