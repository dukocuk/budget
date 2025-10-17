/**
 * Tests for useBudgetPeriods hook
 * Tests budget period management, especially getExpensesForPeriod for year comparison
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBudgetPeriods } from './useBudgetPeriods'
import { localDB } from '../lib/pglite'
import { useSyncContext } from './useSyncContext'

// Mock PGlite database
vi.mock('../lib/pglite', () => ({
  localDB: {
    query: vi.fn(),
    exec: vi.fn()
  },
  migrateToBudgetPeriods: vi.fn().mockResolvedValue(undefined)
}))

// Mock SyncContext
vi.mock('./useSyncContext', () => ({
  useSyncContext: vi.fn(() => ({
    syncBudgetPeriods: vi.fn()
  }))
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock UUID generator
vi.mock('../utils/uuid', () => ({
  generateUUID: vi.fn(() => 'test-uuid-123')
}))

describe('useBudgetPeriods', () => {
  const mockUserId = 'test-user-id'

  const mockPeriodsRows = [
    {
      id: 'period-2025',
      user_id: mockUserId,
      year: 2025,
      monthly_payment: 6000,
      previous_balance: 5000,
      monthly_payments: null,
      status: 'active',
      is_template: 0,
      template_name: null,
      template_description: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'period-2024',
      user_id: mockUserId,
      year: 2024,
      monthly_payment: 5700,
      previous_balance: 4831,
      monthly_payments: null,
      status: 'archived',
      is_template: 0,
      template_name: null,
      template_description: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ]

  const mockExpensesRows = [
    {
      id: 'expense-1',
      name: 'Netflix',
      amount: 120,
      frequency: 'monthly',
      start_month: 1,
      end_month: 12
    },
    {
      id: 'expense-2',
      name: 'Gym',
      amount: 300,
      frequency: 'monthly',
      start_month: 1,
      end_month: 12
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for periods query
    localDB.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
        return Promise.resolve({ rows: mockPeriodsRows })
      }
      return Promise.resolve({ rows: [] })
    })
  })

  describe('getExpensesForPeriod', () => {
    it('should load period with expenses successfully', async () => {
      localDB.query.mockImplementation((query, params) => {
        // Initial periods load
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        // getExpensesForPeriod period query
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] })
        }
        // getExpensesForPeriod expenses query
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: mockExpensesRows })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Call getExpensesForPeriod
      const periodData = await result.current.getExpensesForPeriod('period-2025')

      // Verify structure
      expect(periodData).toEqual({
        id: 'period-2025',
        year: 2025,
        monthlyPayment: 6000,
        previousBalance: 5000,
        monthlyPayments: null,
        status: 'active',
        expenses: [
          {
            id: 'expense-1',
            name: 'Netflix',
            amount: 120,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12
          },
          {
            id: 'expense-2',
            name: 'Gym',
            amount: 300,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12
          }
        ]
      })

      // Verify queries were called
      expect(localDB.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM budget_periods'),
        ['period-2025', mockUserId]
      )
      expect(localDB.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM expenses'),
        ['period-2025']
      )
    })

    it('should throw error for non-existent period', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('non-existent')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should throw error
      await expect(result.current.getExpensesForPeriod('non-existent')).rejects.toThrow('Period not found')
    })

    it('should return null for null userId', async () => {
      const { result } = renderHook(() => useBudgetPeriods(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')
      expect(periodData).toBeNull()
    })

    it('should parse monthlyPayments JSON correctly', async () => {
      const periodWithVariablePayments = {
        ...mockPeriodsRows[0],
        monthly_payments: JSON.stringify([5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000])
      }

      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [periodWithVariablePayments] })
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')

      expect(periodData.monthlyPayments).toEqual([5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000])
    })

    it('should handle null monthlyPayments', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] })
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')

      expect(periodData.monthlyPayments).toBeNull()
    })

    it('should map expense data structure correctly (snake_case to camelCase)', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] })
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: mockExpensesRows })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')

      // Check that snake_case fields are mapped to camelCase
      periodData.expenses.forEach(expense => {
        expect(expense).toHaveProperty('startMonth')
        expect(expense).toHaveProperty('endMonth')
        expect(expense).not.toHaveProperty('start_month')
        expect(expense).not.toHaveProperty('end_month')
      })
    })

    it('should return empty expenses array when period has no expenses', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] })
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')

      expect(periodData.expenses).toEqual([])
      expect(periodData.expenses).toHaveLength(0)
    })

    it('should order expenses by name', async () => {
      const unorderedExpenses = [
        { id: '1', name: 'Zzz Last', amount: 100, frequency: 'monthly', start_month: 1, end_month: 12 },
        { id: '2', name: 'Aaa First', amount: 200, frequency: 'monthly', start_month: 1, end_month: 12 },
        { id: '3', name: 'Mmm Middle', amount: 150, frequency: 'monthly', start_month: 1, end_month: 12 }
      ]

      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] })
        }
        if (query.includes('SELECT * FROM expenses') && query.includes('ORDER BY name')) {
          // Simulate database ordering
          const sorted = [...unorderedExpenses].sort((a, b) => a.name.localeCompare(b.name))
          return Promise.resolve({ rows: sorted })
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const periodData = await result.current.getExpensesForPeriod('period-2025')

      expect(periodData.expenses[0].name).toBe('Aaa First')
      expect(periodData.expenses[1].name).toBe('Mmm Middle')
      expect(periodData.expenses[2].name).toBe('Zzz Last')
    })
  })

  describe('Initial Load', () => {
    it('should load all non-template periods', async () => {
      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.periods).toHaveLength(2)
      expect(result.current.periods[0].year).toBe(2025)
      expect(result.current.periods[1].year).toBe(2024)
    })

    it('should set active period to first active status', async () => {
      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.activePeriod).not.toBeNull()
      expect(result.current.activePeriod.status).toBe('active')
      expect(result.current.activePeriod.year).toBe(2025)
    })

    it('should handle no periods gracefully', async () => {
      localDB.query.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.periods).toEqual([])
      expect(result.current.activePeriod).toBeNull()
    })

    it('should handle null userId', async () => {
      const { result } = renderHook(() => useBudgetPeriods(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.periods).toEqual([])
      expect(localDB.query).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle database query errors in getExpensesForPeriod', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (query.includes('SELECT * FROM budget_periods') && params.includes('period-2025')) {
          return Promise.reject(new Error('Database error'))
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.getExpensesForPeriod('period-2025')).rejects.toThrow('Database error')
    })

    it('should log errors to logger', async () => {
      const { logger } = await import('../utils/logger')

      localDB.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM budget_periods') && query.includes('is_template = 0')) {
          return Promise.resolve({ rows: mockPeriodsRows })
        }
        if (params && params.includes('period-2025')) {
          return Promise.reject(new Error('Database error'))
        }
        return Promise.resolve({ rows: [] })
      })

      const { result } = renderHook(() => useBudgetPeriods(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      try {
        await result.current.getExpensesForPeriod('period-2025')
      } catch (error) {
        // Expected error
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading expenses for period'),
        expect.any(Error)
      )
    })
  })
})
