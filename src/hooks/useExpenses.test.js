/**
 * Tests for useExpenses hook
 * Tests expense CRUD operations, undo/redo, selection, and cloud sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExpenses } from './useExpenses'
import { localDB } from '../lib/pglite'

// Mock PGlite
const mockQuery = vi.fn()

vi.mock('../lib/pglite', () => ({
  localDB: {
    query: (...args) => mockQuery(...args)
  }
}))

// Mock SyncContext
const mockSyncExpenses = vi.fn()

vi.mock('./useSyncContext', () => ({
  useSyncContext: () => ({
    syncExpenses: mockSyncExpenses
  })
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn()
  }
}))

// Mock UUID generator
let uuidCounter = 0
vi.mock('../utils/uuid', () => ({
  generateUUID: () => `uuid-${++uuidCounter}`
}))

describe('useExpenses', () => {
  const userId = 'user-123'
  const periodId = 'period-2025'

  beforeEach(() => {
    vi.clearAllMocks()
    uuidCounter = 0

    // Default mock: no expenses
    mockQuery.mockResolvedValue({ rows: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      expect(result.current.loading).toBe(true)
      expect(result.current.expenses).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should load expenses from local database on mount', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM expenses WHERE user_id = $1 AND budget_period_id = $2 ORDER BY id DESC',
          [userId, periodId]
        )
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set expenses from database', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'exp-2',
          user_id: userId,
          name: 'Spotify',
          amount: 99,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.expenses).toHaveLength(2)
      expect(result.current.expenses[0].name).toBe('Netflix')
      expect(result.current.expenses[1].name).toBe('Spotify')
    })

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Database error')
      })
    })

    it('should not load if userId is null', async () => {
      const { result } = renderHook(() => useExpenses(null, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should not load if periodId is null', async () => {
      const { result } = renderHook(() => useExpenses(userId, null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('addExpense', () => {
    it('should add expense to local database', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addExpense({
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO expenses'),
          expect.arrayContaining(['uuid-1', userId, periodId, 'Netflix', 79, 'monthly', 1, 12])
        )
      })
    })

    it('should update local state immediately (optimistic)', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addExpense({
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      expect(result.current.expenses).toHaveLength(1)
      expect(result.current.expenses[0].name).toBe('Netflix')
      expect(result.current.expenses[0].amount).toBe(79)
    })

    it('should sanitize expense data', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addExpense({
          name: 'Netflix',
          amount: -50, // Should be sanitized to 0
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      expect(result.current.expenses[0].amount).toBe(0)
      expect(result.current.expenses[0].startMonth).toBe(1)
      expect(result.current.expenses[0].endMonth).toBe(12)
    })

    it('should use default values for missing fields', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.addExpense({})
      })

      expect(result.current.expenses[0].name).toBe('Ny udgift')
      expect(result.current.expenses[0].amount).toBe(100)
      expect(result.current.expenses[0].frequency).toBe('monthly')
    })

    it('should handle add errors', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Mock the query to fail on the next call (the INSERT)
      mockQuery.mockRejectedValueOnce(new Error('Insert failed'))

      // The error should be thrown from addExpense
      await expect(async () => {
        await act(async () => {
          await result.current.addExpense({ name: 'Test' })
        })
      }).rejects.toThrow('Insert failed')
    })
  })

  describe('updateExpense', () => {
    it('should update expense in local database', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.updateExpense('exp-1', { amount: 89 })
      })

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE expenses'),
          expect.arrayContaining([89])
        )
      })
    })

    it('should update local state immediately (optimistic)', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.updateExpense('exp-1', { amount: 89 })
      })

      expect(result.current.expenses[0].amount).toBe(89)
    })

    it('should handle partial updates', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.updateExpense('exp-1', { name: 'HBO Max' })
      })

      expect(result.current.expenses[0].name).toBe('HBO Max')
      expect(result.current.expenses[0].amount).toBe(79) // Unchanged
    })

    it('should handle update errors', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockRejectedValueOnce(new Error('Update failed'))

      // The error should be thrown from updateExpense
      await expect(async () => {
        await act(async () => {
          await result.current.updateExpense('exp-1', { amount: 89 })
        })
      }).rejects.toThrow('Update failed')
    })
  })

  describe('deleteExpense', () => {
    it('should delete expense from local database', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.deleteExpense('exp-1')
      })

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM expenses WHERE id = $1 AND user_id = $2 AND budget_period_id = $3',
          ['exp-1', userId, periodId]
        )
      })
    })

    it('should update local state immediately (optimistic)', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.deleteExpense('exp-1')
      })

      expect(result.current.expenses).toHaveLength(0)
    })

    it('should handle delete errors', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockRejectedValueOnce(new Error('Delete failed'))

      // The error should be thrown from deleteExpense
      await expect(async () => {
        await act(async () => {
          await result.current.deleteExpense('exp-1')
        })
      }).rejects.toThrow('Delete failed')
    })
  })

  describe('deleteExpenses (bulk)', () => {
    it('should delete multiple expenses', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'exp-2',
          user_id: userId,
          name: 'Spotify',
          amount: 99,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.deleteExpenses(['exp-1', 'exp-2'])
      })

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM expenses WHERE id IN'),
          ['exp-1', 'exp-2', userId, periodId]
        )
      })

      expect(result.current.expenses).toHaveLength(0)
    })

    it('should handle empty array', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteExpenses([])
      })

      // Should not call database
      expect(mockQuery).toHaveBeenCalledTimes(1) // Only initial load
    })
  })

  describe('Selection', () => {
    it('should toggle expense selection', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.selectedExpenses).toEqual([])

      act(() => {
        result.current.toggleExpenseSelection('exp-1')
      })

      expect(result.current.selectedExpenses).toEqual(['exp-1'])

      act(() => {
        result.current.toggleExpenseSelection('exp-1')
      })

      expect(result.current.selectedExpenses).toEqual([])
    })

    it('should toggle select all', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'exp-2',
          user_id: userId,
          name: 'Spotify',
          amount: 99,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedExpenses).toEqual(['exp-1', 'exp-2'])

      act(() => {
        result.current.toggleSelectAll()
      })

      expect(result.current.selectedExpenses).toEqual([])
    })

    it('should delete selected expenses', async () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          user_id: userId,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'exp-2',
          user_id: userId,
          name: 'Spotify',
          amount: 99,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z'
        }
      ]

      mockQuery.mockResolvedValue({ rows: mockExpenses })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.toggleExpenseSelection('exp-1')
        result.current.toggleExpenseSelection('exp-2')
      })

      mockQuery.mockResolvedValue({ rows: [] })

      const deleteResult = await act(async () => {
        return await result.current.deleteSelected()
      })

      expect(deleteResult.success).toBe(true)
      expect(deleteResult.count).toBe(2)
      expect(result.current.selectedExpenses).toEqual([])
    })

    it('should handle delete selected with no selection', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const deleteResult = await act(async () => {
        return await result.current.deleteSelected()
      })

      expect(deleteResult.success).toBe(false)
      expect(deleteResult.message).toBe('No expenses selected')
    })
  })

  describe('importExpenses', () => {
    it('should replace all expenses with imported data', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const importedExpenses = [
        { name: 'Netflix', amount: 79, frequency: 'monthly', startMonth: 1, endMonth: 12 },
        { name: 'Spotify', amount: 99, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.importExpenses(importedExpenses)
      })

      await waitFor(() => {
        // Should delete all existing
        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM expenses WHERE user_id = $1 AND budget_period_id = $2',
          [userId, periodId]
        )
        // Should insert new ones
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO expenses'),
          expect.arrayContaining(['uuid-1', userId, periodId, 'Netflix', 79, 'monthly', 1, 12])
        )
      })
    })
  })

  describe('Undo/Redo', () => {
    it('should have canUndo false and canRedo false after initial load', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Wait for all state updates and effects to complete
      await waitFor(() => {
        // After initial load stabilizes, history has one entry at index 0
        // canUndo requires historyIndex > 0, so it should be false
        // canRedo requires historyIndex < history.length - 1, so it should be false
        expect(result.current.canUndo).toBe(false)
      })

      expect(result.current.canRedo).toBe(false)
    })

    it('should return false when undoing with no history', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let undoResult
      act(() => {
        undoResult = result.current.undo()
      })

      expect(undoResult).toBe(false)
    })

    it('should return false when redoing with no future state', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Wait for state to stabilize
      await waitFor(() => {
        expect(result.current.canRedo).toBe(false)
      })

      // After initial load with empty state, no future state exists
      let redoResult
      act(() => {
        redoResult = result.current.redo()
      })

      expect(redoResult).toBe(false)
    })
  })

  describe('Return Values', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('expenses')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('selectedExpenses')
      expect(result.current).toHaveProperty('addExpense')
      expect(result.current).toHaveProperty('updateExpense')
      expect(result.current).toHaveProperty('deleteExpense')
      expect(result.current).toHaveProperty('deleteExpenses')
      expect(result.current).toHaveProperty('deleteSelected')
      expect(result.current).toHaveProperty('importExpenses')
      expect(result.current).toHaveProperty('toggleExpenseSelection')
      expect(result.current).toHaveProperty('toggleSelectAll')
      expect(result.current).toHaveProperty('setAllExpenses')
      expect(result.current).toHaveProperty('undo')
      expect(result.current).toHaveProperty('redo')
      expect(result.current).toHaveProperty('canUndo')
      expect(result.current).toHaveProperty('canRedo')
      expect(result.current).toHaveProperty('reload')
    })
  })

  describe('Undo/Redo Workflow Integration', () => {
    it('should support add → undo → redo workflow', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCount = result.current.expenses.length

      // Add an expense
      await act(async () => {
        await result.current.addExpense({
          name: 'New Expense',
          amount: 500,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
      })

      // Undo the add
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount)
      })

      // Redo the add
      await act(async () => {
        await result.current.redo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
        expect(result.current.expenses[0].name).toBe('New Expense')
      })
    })

    it('should support update → undo → redo workflow', async () => {
      const mockExpense = {
        id: 'test-expense-1',
        name: 'Original Name',
        amount: 100,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
        budgetPeriodId: periodId
      }

      mockQuery.mockResolvedValue({
        rows: [mockExpense]
      })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Update the expense
      await act(async () => {
        await result.current.updateExpense('test-expense-1', { name: 'Updated Name' })
      })

      await waitFor(() => {
        const expense = result.current.expenses.find(e => e.id === 'test-expense-1')
        expect(expense.name).toBe('Updated Name')
      })

      // Undo the update
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        const expense = result.current.expenses.find(e => e.id === 'test-expense-1')
        expect(expense.name).toBe('Original Name')
      })

      // Redo the update
      await act(async () => {
        await result.current.redo()
      })

      await waitFor(() => {
        const expense = result.current.expenses.find(e => e.id === 'test-expense-1')
        expect(expense.name).toBe('Updated Name')
      })
    })

    it('should support delete → undo → redo workflow', async () => {
      const mockExpense = {
        id: 'test-expense-1',
        name: 'To Delete',
        amount: 100,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
        budgetPeriodId: periodId
      }

      mockQuery.mockResolvedValue({
        rows: [mockExpense]
      })

      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCount = result.current.expenses.length

      // Delete the expense
      await act(async () => {
        await result.current.deleteExpense('test-expense-1')
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount - 1)
      })

      // Undo the delete (restore)
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount)
        const restored = result.current.expenses.find(e => e.id === 'test-expense-1')
        expect(restored).toBeDefined()
        expect(restored.name).toBe('To Delete')
      })

      // Redo the delete
      await act(async () => {
        await result.current.redo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount - 1)
      })
    })

    it('should support multiple operations with undo/redo', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCount = result.current.expenses.length

      // Operation 1: Add expense
      await act(async () => {
        await result.current.addExpense({
          name: 'Expense 1',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
      })

      // Operation 2: Add another expense
      await act(async () => {
        await result.current.addExpense({
          name: 'Expense 2',
          amount: 200,
          frequency: 'yearly',
          startMonth: 1,
          endMonth: 12
        })
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 2)
      })

      // Undo operation 2
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
        expect(result.current.expenses[0].name).toBe('Expense 1')
      })

      // Undo operation 1
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount)
      })

      // Redo operation 1
      await act(async () => {
        await result.current.redo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
      })

      // Redo operation 2
      await act(async () => {
        await result.current.redo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 2)
      })
    })

    it('should clear redo history when new operation is performed', async () => {
      const { result } = renderHook(() => useExpenses(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCount = result.current.expenses.length

      // Add expense
      await act(async () => {
        await result.current.addExpense({
          name: 'Expense 1',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })

      // Undo
      await act(async () => {
        await result.current.undo()
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount)
        expect(result.current.canRedo).toBe(true)
      })

      // Perform new operation (should clear redo history)
      await act(async () => {
        await result.current.addExpense({
          name: 'Expense 2',
          amount: 200,
          frequency: 'yearly',
          startMonth: 1,
          endMonth: 12
        })
      })

      await waitFor(() => {
        expect(result.current.expenses).toHaveLength(initialCount + 1)
        // Redo should no longer be available
        expect(result.current.canRedo).toBe(false)
      })
    })
  })
})
