/**
 * Tests for useExpenses hook
 * Tests expense CRUD operations, undo/redo, selection, and cloud sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExpenses } from './useExpenses'

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
      const { result } = renderHook(() => useExpenses(userId))

      expect(result.current.loading).toBe(true)
      expect(result.current.expenses).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should load expenses from local database on mount', async () => {
      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC',
          [userId]
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

      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.expenses).toHaveLength(2)
      expect(result.current.expenses[0].name).toBe('Netflix')
      expect(result.current.expenses[1].name).toBe('Spotify')
    })

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Database error')
      })
    })

    it('should not load if userId is null', async () => {
      const { result } = renderHook(() => useExpenses(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('addExpense', () => {
    it('should add expense to local database', async () => {
      const { result } = renderHook(() => useExpenses(userId))

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
          expect.arrayContaining(['uuid-1', userId, 'Netflix', 79, 'monthly', 1, 12])
        )
      })
    })

    it('should update local state immediately (optimistic)', async () => {
      const { result } = renderHook(() => useExpenses(userId))

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
      const { result } = renderHook(() => useExpenses(userId))

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
      const { result } = renderHook(() => useExpenses(userId))

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
      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.deleteExpense('exp-1')
      })

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
          ['exp-1', userId]
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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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
          ['exp-1', 'exp-2', userId]
        )
      })

      expect(result.current.expenses).toHaveLength(0)
    })

    it('should handle empty array', async () => {
      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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

      const { result } = renderHook(() => useExpenses(userId))

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
      const { result } = renderHook(() => useExpenses(userId))

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
      const { result } = renderHook(() => useExpenses(userId))

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
          'DELETE FROM expenses WHERE user_id = $1',
          [userId]
        )
        // Should insert new ones
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO expenses'),
          expect.arrayContaining(['uuid-1', userId, 'Netflix', 79, 'monthly', 1, 12])
        )
      })
    })
  })

  describe('Undo/Redo', () => {
    it('should have canUndo false and canRedo true after initial load', async () => {
      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // After initial load, history will have one entry (the loaded expenses)
      // So canUndo should be false (no previous state), canRedo should be true
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('should return false when undoing with no history', async () => {
      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let undoResult
      act(() => {
        undoResult = result.current.undo()
      })

      expect(undoResult).toBe(false)
    })

    it('should return true when redoing after initial load', async () => {
      const { result } = renderHook(() => useExpenses(userId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // After initial load, history has entries, so redo should work
      let redoResult
      act(() => {
        redoResult = result.current.redo()
      })

      expect(redoResult).toBe(true)
    })
  })

  describe('Return Values', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useExpenses(userId))

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
})
