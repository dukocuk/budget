/**
 * Modal Provider - Centralized modal state management
 * Consolidates all modal states to prevent prop drilling and coordinate modal behavior
 */

import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import { ModalContext } from './ModalContext';

export function ModalProvider({ children }) {
  // Add Expense Modal (combines showAddModal + editingExpense)
  const [addExpenseModal, setAddExpenseModal] = useState({
    isOpen: false,
    editingExpense: null,
  });

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Create Year Modal
  const [showCreateYearModal, setShowCreateYearModal] = useState(false);

  // Template Manager Modal
  const [showTemplateManagerModal, setShowTemplateManagerModal] =
    useState(false);

  // Delete Confirmation Modal
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    expenseId: null,
    expenseName: null,
    count: 0,
  });

  // Open add expense modal (optionally with expense to edit)
  const openAddExpenseModal = useCallback((expense = null) => {
    logger.log(`🎨 Opening add expense modal${expense ? ' (edit mode)' : ''}`);
    setAddExpenseModal({
      isOpen: true,
      editingExpense: expense,
    });
  }, []);

  // Close add expense modal
  const closeAddExpenseModal = useCallback(() => {
    logger.log('🎨 Closing add expense modal');
    setAddExpenseModal({
      isOpen: false,
      editingExpense: null,
    });
  }, []);

  // Open settings modal
  const openSettingsModal = useCallback(() => {
    logger.log('🎨 Opening settings modal');
    setShowSettingsModal(true);
  }, []);

  // Close settings modal
  const closeSettingsModal = useCallback(() => {
    logger.log('🎨 Closing settings modal');
    setShowSettingsModal(false);
  }, []);

  // Open create year modal
  const openCreateYearModal = useCallback(() => {
    logger.log('🎨 Opening create year modal');
    setShowCreateYearModal(true);
  }, []);

  // Close create year modal
  const closeCreateYearModal = useCallback(() => {
    logger.log('🎨 Closing create year modal');
    setShowCreateYearModal(false);
  }, []);

  // Open template manager modal
  const openTemplateManagerModal = useCallback(() => {
    logger.log('🎨 Opening template manager modal');
    setShowTemplateManagerModal(true);
  }, []);

  // Close template manager modal
  const closeTemplateManagerModal = useCallback(() => {
    logger.log('🎨 Closing template manager modal');
    setShowTemplateManagerModal(false);
  }, []);

  // Open delete confirmation modal (single expense or bulk)
  const openDeleteConfirmation = useCallback(
    ({ expenseId = null, expenseName = null, count = 0 }) => {
      logger.log(
        `🎨 Opening delete confirmation${count > 0 ? ` (${count} items)` : ''}`
      );
      setDeleteConfirmation({
        isOpen: true,
        expenseId,
        expenseName,
        count,
      });
    },
    []
  );

  // Close delete confirmation modal
  const closeDeleteConfirmation = useCallback(() => {
    logger.log('🎨 Closing delete confirmation');
    setDeleteConfirmation({
      isOpen: false,
      expenseId: null,
      expenseName: null,
      count: 0,
    });
  }, []);

  // Close all modals (useful for cleanup or reset)
  const closeAllModals = useCallback(() => {
    logger.log('🎨 Closing all modals');
    setAddExpenseModal({ isOpen: false, editingExpense: null });
    setShowSettingsModal(false);
    setShowCreateYearModal(false);
    setShowTemplateManagerModal(false);
    setDeleteConfirmation({
      isOpen: false,
      expenseId: null,
      expenseName: null,
      count: 0,
    });
  }, []);

  const value = {
    // Add Expense Modal
    addExpenseModal,
    openAddExpenseModal,
    closeAddExpenseModal,

    // Settings Modal
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,

    // Create Year Modal
    showCreateYearModal,
    openCreateYearModal,
    closeCreateYearModal,

    // Template Manager Modal
    showTemplateManagerModal,
    openTemplateManagerModal,
    closeTemplateManagerModal,

    // Delete Confirmation Modal
    deleteConfirmation,
    openDeleteConfirmation,
    closeDeleteConfirmation,

    // Utility
    closeAllModals,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
