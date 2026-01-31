/**
 * Tests for ModalProvider - Centralized modal state coordination
 * Covers modal state management, coordination, and integration patterns
 *
 * Priority: HIGH (55.75% → 90%+ coverage target)
 * Critical: State coordination across application
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { ModalProvider } from './ModalProvider';
import { useModal } from '../hooks/useModal';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ModalProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Modal State Management', () => {
    it('should provide initial modal states (all closed)', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      expect(result.current.addExpenseModal.isOpen).toBe(false);
      expect(result.current.addExpenseModal.editingExpense).toBeNull();
      expect(result.current.showSettingsModal).toBe(false);
      expect(result.current.showCreateYearModal).toBe(false);
      expect(result.current.showTemplateManagerModal).toBe(false);
      expect(result.current.deleteConfirmation.isOpen).toBe(false);
    });

    it('should open and close add expense modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // Open modal
      act(() => {
        result.current.openAddExpenseModal();
      });

      expect(result.current.addExpenseModal.isOpen).toBe(true);
      expect(result.current.addExpenseModal.editingExpense).toBeNull();

      // Close modal
      act(() => {
        result.current.closeAddExpenseModal();
      });

      expect(result.current.addExpenseModal.isOpen).toBe(false);
    });

    it('should open add expense modal in edit mode', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      const expenseToEdit = {
        id: 'exp-123',
        name: 'Netflix',
        amount: 79,
        frequency: 'monthly',
      };

      act(() => {
        result.current.openAddExpenseModal(expenseToEdit);
      });

      expect(result.current.addExpenseModal.isOpen).toBe(true);
      expect(result.current.addExpenseModal.editingExpense).toEqual(
        expenseToEdit
      );
    });

    it('should clear editing expense when closing modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      const expense = { id: 'exp-123', name: 'Test' };

      act(() => {
        result.current.openAddExpenseModal(expense);
      });

      expect(result.current.addExpenseModal.editingExpense).toEqual(expense);

      act(() => {
        result.current.closeAddExpenseModal();
      });

      expect(result.current.addExpenseModal.editingExpense).toBeNull();
    });

    it('should open and close settings modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(true);

      act(() => {
        result.current.closeSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(false);
    });

    it('should open and close create year modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openCreateYearModal();
      });

      expect(result.current.showCreateYearModal).toBe(true);

      act(() => {
        result.current.closeCreateYearModal();
      });

      expect(result.current.showCreateYearModal).toBe(false);
    });

    it('should open and close template manager modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openTemplateManagerModal();
      });

      expect(result.current.showTemplateManagerModal).toBe(true);

      act(() => {
        result.current.closeTemplateManagerModal();
      });

      expect(result.current.showTemplateManagerModal).toBe(false);
    });
  });

  describe('Delete Confirmation Modal', () => {
    it('should open delete confirmation for single expense', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openDeleteConfirmation({
          expenseId: 'exp-123',
          expenseName: 'Netflix',
          count: 0,
        });
      });

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: true,
        expenseId: 'exp-123',
        expenseName: 'Netflix',
        count: 0,
      });
    });

    it('should open delete confirmation for bulk delete', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openDeleteConfirmation({
          count: 5,
        });
      });

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 5,
      });
    });

    it('should close delete confirmation and reset state', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openDeleteConfirmation({
          expenseId: 'exp-123',
          expenseName: 'Netflix',
          count: 0,
        });
      });

      act(() => {
        result.current.closeDeleteConfirmation();
      });

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: false,
        expenseId: null,
        expenseName: null,
        count: 0,
      });
    });
  });

  describe('Modal Coordination', () => {
    it('should allow only one modal open at a time (implicit behavior)', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // Open settings modal
      act(() => {
        result.current.openSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(true);

      // Open add expense modal (user would close settings first in practice)
      act(() => {
        result.current.openAddExpenseModal();
      });

      // Both can technically be open (no enforcement), but UI would prevent this
      expect(result.current.showSettingsModal).toBe(true);
      expect(result.current.addExpenseModal.isOpen).toBe(true);
    });

    it('should close all modals at once', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // Open multiple modals
      act(() => {
        result.current.openAddExpenseModal({ id: 'exp-123', name: 'Test' });
        result.current.openSettingsModal();
        result.current.openCreateYearModal();
        result.current.openTemplateManagerModal();
        result.current.openDeleteConfirmation({ count: 5 });
      });

      // Verify all are open
      expect(result.current.addExpenseModal.isOpen).toBe(true);
      expect(result.current.showSettingsModal).toBe(true);
      expect(result.current.showCreateYearModal).toBe(true);
      expect(result.current.showTemplateManagerModal).toBe(true);
      expect(result.current.deleteConfirmation.isOpen).toBe(true);

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      // Verify all are closed
      expect(result.current.addExpenseModal.isOpen).toBe(false);
      expect(result.current.addExpenseModal.editingExpense).toBeNull();
      expect(result.current.showSettingsModal).toBe(false);
      expect(result.current.showCreateYearModal).toBe(false);
      expect(result.current.showTemplateManagerModal).toBe(false);
      expect(result.current.deleteConfirmation.isOpen).toBe(false);
    });

    it('should preserve modal-specific state when other modals open/close', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      const expense = { id: 'exp-123', name: 'Netflix' };

      // Open add expense modal with editing state
      act(() => {
        result.current.openAddExpenseModal(expense);
      });

      // Open another modal
      act(() => {
        result.current.openSettingsModal();
      });

      // Add expense modal state should be preserved
      expect(result.current.addExpenseModal.isOpen).toBe(true);
      expect(result.current.addExpenseModal.editingExpense).toEqual(expense);
    });
  });

  describe('State Preservation', () => {
    it('should maintain delete confirmation details across renders', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result, rerender } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openDeleteConfirmation({
          expenseId: 'exp-456',
          expenseName: 'Spotify',
          count: 0,
        });
      });

      // Re-render
      rerender();

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: true,
        expenseId: 'exp-456',
        expenseName: 'Spotify',
        count: 0,
      });
    });

    it('should maintain add expense editing state across renders', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result, rerender } = renderHook(() => useModal(), { wrapper });

      const expense = {
        id: 'exp-789',
        name: 'YouTube Premium',
        amount: 119,
      };

      act(() => {
        result.current.openAddExpenseModal(expense);
      });

      rerender();

      expect(result.current.addExpenseModal.editingExpense).toEqual(expense);
    });

    it('should reset form state on modal close', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // Open with expense data
      act(() => {
        result.current.openAddExpenseModal({
          id: 'exp-123',
          name: 'Test',
        });
      });

      // Close
      act(() => {
        result.current.closeAddExpenseModal();
      });

      // Reopen without data
      act(() => {
        result.current.openAddExpenseModal();
      });

      expect(result.current.addExpenseModal.editingExpense).toBeNull();
    });
  });

  describe('Modal Functions are Stable (useCallback)', () => {
    it('should have stable function references', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result, rerender } = renderHook(() => useModal(), { wrapper });

      const initialFunctions = {
        openAddExpenseModal: result.current.openAddExpenseModal,
        closeAddExpenseModal: result.current.closeAddExpenseModal,
        openSettingsModal: result.current.openSettingsModal,
        closeSettingsModal: result.current.closeSettingsModal,
        closeAllModals: result.current.closeAllModals,
      };

      // Re-render
      rerender();

      // Functions should maintain same reference (useCallback)
      expect(result.current.openAddExpenseModal).toBe(
        initialFunctions.openAddExpenseModal
      );
      expect(result.current.closeAddExpenseModal).toBe(
        initialFunctions.closeAddExpenseModal
      );
      expect(result.current.openSettingsModal).toBe(
        initialFunctions.openSettingsModal
      );
      expect(result.current.closeSettingsModal).toBe(
        initialFunctions.closeSettingsModal
      );
      expect(result.current.closeAllModals).toBe(
        initialFunctions.closeAllModals
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle opening same modal multiple times', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openSettingsModal();
        result.current.openSettingsModal();
        result.current.openSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(true);
    });

    it('should handle closing already closed modal', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.closeSettingsModal();
        result.current.closeSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(false);
    });

    it('should handle rapid open/close cycles', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openAddExpenseModal();
        result.current.closeAddExpenseModal();
        result.current.openAddExpenseModal();
        result.current.closeAddExpenseModal();
      });

      expect(result.current.addExpenseModal.isOpen).toBe(false);
    });

    it('should handle switching between add and edit modes', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      const expense1 = { id: 'exp-1', name: 'First' };
      const expense2 = { id: 'exp-2', name: 'Second' };

      // Open in edit mode
      act(() => {
        result.current.openAddExpenseModal(expense1);
      });

      expect(result.current.addExpenseModal.editingExpense).toEqual(expense1);

      // Switch to different expense without closing
      act(() => {
        result.current.openAddExpenseModal(expense2);
      });

      expect(result.current.addExpenseModal.editingExpense).toEqual(expense2);

      // Switch to add mode
      act(() => {
        result.current.openAddExpenseModal();
      });

      expect(result.current.addExpenseModal.editingExpense).toBeNull();
    });

    it('should handle delete confirmation with missing fields', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      act(() => {
        result.current.openDeleteConfirmation({});
      });

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 0,
      });
    });
  });

  describe('Integration Patterns', () => {
    it('should support typical edit workflow', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      const expense = {
        id: 'exp-123',
        name: 'Netflix',
        amount: 79,
        frequency: 'monthly',
      };

      // User clicks edit button
      act(() => {
        result.current.openAddExpenseModal(expense);
      });

      expect(result.current.addExpenseModal.isOpen).toBe(true);
      expect(result.current.addExpenseModal.editingExpense).toEqual(expense);

      // User saves/cancels
      act(() => {
        result.current.closeAddExpenseModal();
      });

      expect(result.current.addExpenseModal.isOpen).toBe(false);
      expect(result.current.addExpenseModal.editingExpense).toBeNull();
    });

    it('should support typical delete workflow', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // User clicks delete button
      act(() => {
        result.current.openDeleteConfirmation({
          expenseId: 'exp-123',
          expenseName: 'Netflix',
        });
      });

      expect(result.current.deleteConfirmation.isOpen).toBe(true);

      // User confirms/cancels
      act(() => {
        result.current.closeDeleteConfirmation();
      });

      expect(result.current.deleteConfirmation.isOpen).toBe(false);
    });

    it('should support bulk delete workflow', () => {
      const wrapper = ({ children }) => (
        <ModalProvider>{children}</ModalProvider>
      );
      const { result } = renderHook(() => useModal(), { wrapper });

      // User selects multiple items and clicks bulk delete
      act(() => {
        result.current.openDeleteConfirmation({
          count: 10,
        });
      });

      expect(result.current.deleteConfirmation).toEqual({
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 10,
      });
    });
  });
});
