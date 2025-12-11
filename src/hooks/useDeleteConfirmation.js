/**
 * useDeleteConfirmation - Hook for managing delete confirmation workflow
 * Encapsulates the delete confirmation modal state and deletion logic
 */

import { useCallback } from 'react';
import { useModal } from './useModal';
import { useExpenseContext } from './useExpenseContext';
import { useAlert } from './useAlert';
import { logger } from '../utils/logger';

export function useDeleteConfirmation() {
  const {
    deleteConfirmation,
    openDeleteConfirmation,
    closeDeleteConfirmation,
  } = useModal();
  const {
    expenses,
    selectedExpenses,
    deleteExpense,
    deleteSelected,
    immediateSyncExpenses,
    isOnline,
  } = useExpenseContext();
  const { showAlert } = useAlert();

  /**
   * Open delete confirmation for a single expense
   */
  const confirmDeleteExpense = useCallback(
    id => {
      const expense = expenses.find(e => e.id === id);
      if (!expense) return;

      openDeleteConfirmation({
        expenseId: id,
        expenseName: expense.name,
        count: 0,
      });
    },
    [expenses, openDeleteConfirmation]
  );

  /**
   * Open delete confirmation for multiple expenses
   */
  const confirmDeleteSelected = useCallback(() => {
    if (selectedExpenses.length === 0) {
      showAlert('⚠️ Vælg venligst udgifter at slette først', 'warning');
      return;
    }

    openDeleteConfirmation({
      expenseId: null,
      expenseName: null,
      count: selectedExpenses.length,
    });
  }, [selectedExpenses, openDeleteConfirmation, showAlert]);

  /**
   * Execute the confirmed deletion
   */
  const executeDelete = useCallback(() => {
    // 1. Capture deletion context before closing modal
    const expenseId = deleteConfirmation.expenseId;
    const count = deleteConfirmation.count;
    const selectedExpensesCopy = [...selectedExpenses];

    // 2. Close modal immediately for instant UI feedback
    closeDeleteConfirmation();

    // 3. Perform deletion in background (async)
    if (count > 0) {
      // Bulk delete
      const result = deleteSelected();

      // Immediately sync to cloud (bypass debounce for critical operations)
      if (isOnline && result.success) {
        const updatedExpenses = expenses.filter(
          e => !selectedExpensesCopy.includes(e.id)
        );
        immediateSyncExpenses(updatedExpenses)
          .then(() => {
            showAlert(`✅ ${count} udgift(er) slettet`, 'success');
          })
          .catch(error => {
            showAlert('❌ Fejl ved synkronisering: ' + error.message, 'error');
          });
      } else {
        showAlert(`✅ ${count} udgift(er) slettet`, 'success');
      }
    } else {
      // Single delete
      const expense = expenses.find(e => e.id === expenseId);

      // Calculate updated expenses BEFORE deleting
      const updatedExpenses = expenses.filter(e => e.id !== expenseId);

      // Delete from local state
      deleteExpense(expenseId);

      // Immediately sync to cloud (bypass debounce for critical operations)
      if (isOnline) {
        logger.log(
          `🗑️ Immediately syncing delete: ${updatedExpenses.length} expenses remaining`
        );
        immediateSyncExpenses(updatedExpenses)
          .then(() => {
            showAlert(`✅ "${expense?.name}" blev slettet`, 'success');
          })
          .catch(error => {
            showAlert('❌ Fejl ved synkronisering: ' + error.message, 'error');
          });
      } else {
        showAlert(`✅ "${expense?.name}" blev slettet`, 'success');
      }
    }
  }, [
    deleteConfirmation,
    selectedExpenses,
    expenses,
    closeDeleteConfirmation,
    deleteSelected,
    deleteExpense,
    immediateSyncExpenses,
    isOnline,
    showAlert,
  ]);

  /**
   * Cancel the deletion
   */
  const cancelDelete = useCallback(() => {
    closeDeleteConfirmation();
  }, [closeDeleteConfirmation]);

  return {
    // State
    deleteConfirmation,

    // Actions
    confirmDeleteExpense,
    confirmDeleteSelected,
    executeDelete,
    cancelDelete,
  };
}
