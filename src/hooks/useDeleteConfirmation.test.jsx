/**
 * Tests for useDeleteConfirmation hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeleteConfirmation } from './useDeleteConfirmation';
import * as useModalModule from './useModal';
import * as useExpenseContextModule from './useExpenseContext';
import * as useAlertModule from './useAlert';

// Mock the dependencies
vi.mock('./useModal');
vi.mock('./useExpenseContext');
vi.mock('./useAlert');

describe('useDeleteConfirmation', () => {
  let mockUseModal;
  let mockUseExpenseContext;
  let mockUseAlert;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseModal = {
      deleteConfirmation: {
        isOpen: false,
        expenseId: null,
        expenseName: null,
        count: 0,
      },
      openDeleteConfirmation: vi.fn(),
      closeDeleteConfirmation: vi.fn(),
    };

    mockUseExpenseContext = {
      expenses: [
        { id: 1, name: 'Netflix', amount: 79 },
        { id: 2, name: 'Spotify', amount: 99 },
        { id: 3, name: 'Insurance', amount: 500 },
      ],
      selectedExpenses: [],
      deleteExpense: vi.fn(),
      deleteSelected: vi.fn(() => ({ success: true })),
      immediateSyncExpenses: vi.fn(() => Promise.resolve()),
      isOnline: true,
    };

    mockUseAlert = {
      showAlert: vi.fn(),
    };

    // Apply mocks
    vi.spyOn(useModalModule, 'useModal').mockReturnValue(mockUseModal);
    vi.spyOn(useExpenseContextModule, 'useExpenseContext').mockReturnValue(
      mockUseExpenseContext
    );
    vi.spyOn(useAlertModule, 'useAlert').mockReturnValue(mockUseAlert);
  });

  describe('confirmDeleteExpense', () => {
    it('opens delete confirmation for single expense', () => {
      const { result } = renderHook(() => useDeleteConfirmation());

      act(() => {
        result.current.confirmDeleteExpense(1);
      });

      expect(mockUseModal.openDeleteConfirmation).toHaveBeenCalledWith({
        expenseId: 1,
        expenseName: 'Netflix',
        count: 0,
      });
    });

    it('does nothing if expense not found', () => {
      const { result } = renderHook(() => useDeleteConfirmation());

      act(() => {
        result.current.confirmDeleteExpense(999);
      });

      expect(mockUseModal.openDeleteConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('confirmDeleteSelected', () => {
    it('opens delete confirmation for multiple expenses', () => {
      mockUseExpenseContext.selectedExpenses = [1, 2];
      const { result } = renderHook(() => useDeleteConfirmation());

      act(() => {
        result.current.confirmDeleteSelected();
      });

      expect(mockUseModal.openDeleteConfirmation).toHaveBeenCalledWith({
        expenseId: null,
        expenseName: null,
        count: 2,
      });
    });

    it('shows warning if no expenses selected', () => {
      mockUseExpenseContext.selectedExpenses = [];
      const { result } = renderHook(() => useDeleteConfirmation());

      act(() => {
        result.current.confirmDeleteSelected();
      });

      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '⚠️ Vælg venligst udgifter at slette først',
        'warning'
      );
      expect(mockUseModal.openDeleteConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('executeDelete', () => {
    it('deletes single expense and syncs when online', async () => {
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: 1,
        expenseName: 'Netflix',
        count: 0,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        // Wait for promises to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseModal.closeDeleteConfirmation).toHaveBeenCalled();
      expect(mockUseExpenseContext.deleteExpense).toHaveBeenCalledWith(1);
      expect(mockUseExpenseContext.immediateSyncExpenses).toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '✅ "Netflix" blev slettet',
        'success'
      );
    });

    it('deletes single expense without sync when offline', async () => {
      mockUseExpenseContext.isOnline = false;
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: 1,
        expenseName: 'Netflix',
        count: 0,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseExpenseContext.deleteExpense).toHaveBeenCalledWith(1);
      expect(
        mockUseExpenseContext.immediateSyncExpenses
      ).not.toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '✅ "Netflix" blev slettet',
        'success'
      );
    });

    it('deletes multiple expenses and syncs when online', async () => {
      mockUseExpenseContext.selectedExpenses = [1, 2];
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 2,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseModal.closeDeleteConfirmation).toHaveBeenCalled();
      expect(mockUseExpenseContext.deleteSelected).toHaveBeenCalled();
      expect(mockUseExpenseContext.immediateSyncExpenses).toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '✅ 2 udgift(er) slettet',
        'success'
      );
    });

    it('deletes multiple expenses without sync when offline', async () => {
      mockUseExpenseContext.isOnline = false;
      mockUseExpenseContext.selectedExpenses = [1, 2];
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 2,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseExpenseContext.deleteSelected).toHaveBeenCalled();
      expect(
        mockUseExpenseContext.immediateSyncExpenses
      ).not.toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '✅ 2 udgift(er) slettet',
        'success'
      );
    });

    it('handles sync error gracefully', async () => {
      mockUseExpenseContext.immediateSyncExpenses = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: 1,
        expenseName: 'Netflix',
        count: 0,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseExpenseContext.deleteExpense).toHaveBeenCalledWith(1);
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '❌ Fejl ved synkronisering: Network error',
        'error'
      );
    });

    it('handles bulk delete sync error gracefully', async () => {
      mockUseExpenseContext.immediateSyncExpenses = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      mockUseExpenseContext.selectedExpenses = [1, 2];
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 2,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseExpenseContext.deleteSelected).toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '❌ Fejl ved synkronisering: Network error',
        'error'
      );
    });

    it('handles bulk delete when deleteSelected fails', async () => {
      mockUseExpenseContext.deleteSelected = vi.fn(() => ({ success: false }));
      mockUseExpenseContext.selectedExpenses = [1, 2];
      mockUseModal.deleteConfirmation = {
        isOpen: true,
        expenseId: null,
        expenseName: null,
        count: 2,
      };

      const { result } = renderHook(() => useDeleteConfirmation());

      await act(async () => {
        result.current.executeDelete();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockUseExpenseContext.deleteSelected).toHaveBeenCalled();
      expect(
        mockUseExpenseContext.immediateSyncExpenses
      ).not.toHaveBeenCalled();
      expect(mockUseAlert.showAlert).toHaveBeenCalledWith(
        '✅ 2 udgift(er) slettet',
        'success'
      );
    });
  });

  describe('cancelDelete', () => {
    it('closes delete confirmation', () => {
      const { result } = renderHook(() => useDeleteConfirmation());

      act(() => {
        result.current.cancelDelete();
      });

      expect(mockUseModal.closeDeleteConfirmation).toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns all expected properties and methods', () => {
      const { result } = renderHook(() => useDeleteConfirmation());

      expect(result.current.deleteConfirmation).toBeDefined();
      expect(result.current.confirmDeleteExpense).toBeDefined();
      expect(result.current.confirmDeleteSelected).toBeDefined();
      expect(result.current.executeDelete).toBeDefined();
      expect(result.current.cancelDelete).toBeDefined();

      expect(typeof result.current.confirmDeleteExpense).toBe('function');
      expect(typeof result.current.confirmDeleteSelected).toBe('function');
      expect(typeof result.current.executeDelete).toBe('function');
      expect(typeof result.current.cancelDelete).toBe('function');
    });
  });
});
