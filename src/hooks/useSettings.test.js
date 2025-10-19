/**
 * Tests for useSettings hook
 * Tests settings management with budget_periods table
 * NOTE: Settings now stored in budget_periods, not separate settings table
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSettings } from './useSettings'

// Mock PGlite
const mockQuery = vi.fn()

vi.mock('../lib/pglite', () => ({
  localDB: {
    query: (...args) => mockQuery(...args)
  }
}))

// Mock Supabase
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (...args) => {
        mockUpdate(...args)
        return {
          eq: (...eqArgs) => {
            mockEq(...eqArgs)
            return { eq: (...args2) => { mockEq(...args2); return { error: null } } }
          }
        }
      }
    })
  }
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('useSettings', () => {
  const userId = 'user-123'
  const periodId = 'period-2025'

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: no period found
    mockQuery.mockResolvedValue({ rows: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useSettings(userId, periodId))

      expect(result.current.loading).toBe(true)
      expect(result.current.settings).toEqual({
        monthlyPayment: 0,
        previousBalance: 0,
        monthlyPayments: null,
        useVariablePayments: false
      })
      expect(result.current.error).toBe(null)
    })

    it('should load settings from budget_periods table on mount', async () => {
      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2',
          [periodId, userId]
        )
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should set default values when no settings exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.settings).toEqual({
        monthlyPayment: 0,
        previousBalance: 0,
        monthlyPayments: null,
        useVariablePayments: false
      })
    })

    it('should load existing settings from budget period', async () => {
      const mockPeriod = {
        id: periodId,
        user_id: userId,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        monthly_payments: null,
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      mockQuery.mockResolvedValue({ rows: [mockPeriod] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.settings).toEqual({
        monthlyPayment: 5700,
        previousBalance: 4831,
        monthlyPayments: null,
        useVariablePayments: false
      })
    })

    it('should parse monthly_payments JSON when present', async () => {
      const monthlyPayments = [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      const mockPeriod = {
        id: periodId,
        user_id: userId,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        monthly_payments: JSON.stringify(monthlyPayments),
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      mockQuery.mockResolvedValue({ rows: [mockPeriod] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.settings.monthlyPayments).toEqual(monthlyPayments)
      expect(result.current.settings.useVariablePayments).toBe(true)
    })

    it('should handle invalid JSON in monthly_payments gracefully', async () => {
      const mockPeriod = {
        id: periodId,
        user_id: userId,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        monthly_payments: 'invalid json',
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      mockQuery.mockResolvedValue({ rows: [mockPeriod] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.settings.monthlyPayments).toBe(null)
      expect(result.current.settings.useVariablePayments).toBe(false)
    })

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Database error')
      })
    })

    it('should not load if userId is null', async () => {
      const { result } = renderHook(() => useSettings(null, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should not load if periodId is null', async () => {
      const { result } = renderHook(() => useSettings(userId, null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('updateSettings', () => {
    it('should update budget period in local database', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayment: 6000,
          previousBalance: 5000
        })
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE budget_periods'),
        expect.arrayContaining([6000, 5000, null, expect.any(String), periodId, userId])
      )
    })

    it('should sync budget period to Supabase cloud', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayment: 6000,
          previousBalance: 5000
        })
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          monthly_payment: 6000,
          previous_balance: 5000,
          monthly_payments: null
        })
      )

      expect(mockEq).toHaveBeenCalledWith('id', periodId)
      expect(mockEq).toHaveBeenCalledWith('user_id', userId)
    })

    it('should update local state immediately', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayment: 6000,
          previousBalance: 5000
        })
      })

      expect(result.current.settings.monthlyPayment).toBe(6000)
      expect(result.current.settings.previousBalance).toBe(5000)
    })

    it('should handle partial updates', async () => {
      const mockPeriod = {
        id: periodId,
        user_id: userId,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        monthly_payments: null,
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      mockQuery.mockResolvedValue({ rows: [mockPeriod] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayment: 6000
        })
      })

      expect(result.current.settings.monthlyPayment).toBe(6000)
      expect(result.current.settings.previousBalance).toBe(4831) // Unchanged
    })

    it('should update monthly_payments array', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const monthlyPayments = [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayments
        })
      })

      expect(result.current.settings.monthlyPayments).toEqual(monthlyPayments)
      expect(result.current.settings.useVariablePayments).toBe(true)
    })

    it('should set useVariablePayments to true when monthlyPayments is set', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const monthlyPayments = [5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayments
        })
      })

      expect(result.current.settings.useVariablePayments).toBe(true)
    })

    it('should set useVariablePayments to false when monthlyPayments is null', async () => {
      const monthlyPayments = [5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      const mockPeriod = {
        id: periodId,
        user_id: userId,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        monthly_payments: JSON.stringify(monthlyPayments),
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      mockQuery.mockResolvedValue({ rows: [mockPeriod] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.settings.useVariablePayments).toBe(true)
      })

      mockQuery.mockResolvedValue({ rows: [] })

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayments: null
        })
      })

      expect(result.current.settings.monthlyPayments).toBe(null)
      expect(result.current.settings.useVariablePayments).toBe(false)
    })

    it('should stringify monthlyPayments for local database', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const monthlyPayments = [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayments
        })
      })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE budget_periods'),
        expect.arrayContaining([
          expect.any(Number), // monthly_payment
          expect.any(Number), // previous_balance
          JSON.stringify(monthlyPayments),
          expect.any(String), // updated_at
          periodId,
          userId
        ])
      )
    })

    it('should send monthlyPayments as array to Supabase', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const monthlyPayments = [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]

      await act(async () => {
        await result.current.updateSettings({
          monthlyPayments
        })
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          monthly_payments: monthlyPayments // Array, not string (Supabase handles JSONB)
        })
      )
    })

  })

  describe('Return Values', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('settings')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('updateSettings')
    })

    it('should have correct settings structure', async () => {
      const { result } = renderHook(() => useSettings(userId, periodId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.settings).toHaveProperty('monthlyPayment')
      expect(result.current.settings).toHaveProperty('previousBalance')
      expect(result.current.settings).toHaveProperty('monthlyPayments')
      expect(result.current.settings).toHaveProperty('useVariablePayments')
    })
  })
})
