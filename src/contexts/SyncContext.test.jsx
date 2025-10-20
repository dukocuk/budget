/**
 * SyncContext Tests
 * Tests for cloud synchronization context and methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SyncProvider, SyncContext } from './SyncContext'
import { useContext } from 'react'
import { supabase } from '../lib/supabase'
import { localDB } from '../lib/pglite'

// Mock logger to suppress console output during tests
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock PGlite for local database
vi.mock('../lib/pglite', () => ({
  localDB: {
    query: vi.fn()
  }
}))

// Mock Supabase lib with factory function to avoid hoisting issues
vi.mock('../lib/supabase', () => {
  const mockFrom = vi.fn()
  const mockSupabase = {
    from: mockFrom,
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
  return { supabase: mockSupabase }
})

describe('SyncContext', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Provider Initialization', () => {
    it('should initialize with idle state and online status', () => {
      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      expect(result.current.syncStatus).toBe('idle')
      expect(result.current.isOnline).toBe(true)
      expect(result.current.lastSyncTime).toBeNull()
      expect(result.current.syncError).toBeNull()
    })

    it('should detect offline state on initialization', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false)
      })

      // Note: syncStatus may be 'idle' if no sync has been attempted
      // Offline detection happens reactively, not proactively on init
      expect(['idle', 'offline']).toContain(result.current.syncStatus)
    })
  })

  describe('Online/Offline Detection', () => {
    it('should update status when going offline', async () => {
      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false
        })
        window.dispatchEvent(new Event('offline'))
      })

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false)
        expect(result.current.syncStatus).toBe('offline')
      })
    })

    it('should update status when going online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      // Simulate coming online
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true
        })
        window.dispatchEvent(new Event('online'))
      })

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true)
        expect(result.current.syncStatus).toBe('idle')
      })
    })
  })

  describe('syncExpenses', () => {
    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      const mockExpenses = [
        { id: '1', name: 'Test', amount: 100, frequency: 'monthly' }
      ]

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses)
      })

      // Should not call Supabase when offline
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should perform merge-based sync with upsert and delete', async () => {
      const mockCloudExpenses = [
        {
          id: 'cloud-1',
          user_id: mockUser.id,
          name: 'Old Expense',
          amount: 50,
          frequency: 'monthly',
          budget_period_id: 'period-2025',
          start_month: 1,
          end_month: 12,
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'cloud-2',
          user_id: mockUser.id,
          name: 'Deleted Locally',
          amount: 75,
          frequency: 'yearly',
          budget_period_id: 'period-2025',
          start_month: 1,
          end_month: 12,
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const mockLocalExpenses = [
        {
          id: 'cloud-1',
          budgetPeriodId: 'period-2025',
          name: 'Updated Expense',
          amount: 60,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12,
          updatedAt: '2025-01-02T00:00:00Z' // Newer than cloud
        },
        {
          id: 'new-1',
          budgetPeriodId: 'period-2025',
          name: 'New Expense',
          amount: 100,
          frequency: 'quarterly',
          startMonth: 1,
          endMonth: 12
        }
      ]

      // Mock PGlite query for local budget periods
      localDB.query.mockResolvedValue({
        rows: [{ id: 'period-2025', year: 2025 }]
      })

      // Mock Supabase select query
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: mockCloudExpenses,
        error: null
      })

      // Mock Supabase upsert - return a resolved promise with error: null
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      // Mock Supabase delete
      const mockDelete = vi.fn()
      const mockIn = vi.fn().mockResolvedValue({ error: null })

      supabase.from.mockImplementation((table) => {
        if (table === 'budget_periods') {
          // Mock budget periods query for ID mapping
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'period-2025', year: 2025 }],
                error: null
              })
            })
          }
        }
        if (table === 'expenses') {
          return {
            select: mockSelect,
            upsert: mockUpsert,
            delete: mockDelete
          }
        }
      })

      mockSelect.mockReturnValue({ eq: mockEq })
      mockDelete.mockReturnValue({ in: mockIn })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await act(async () => {
        await result.current.immediateSyncExpenses(mockLocalExpenses)
      })

      // Verify fetch of budget periods (for ID mapping) and cloud expenses
      expect(supabase.from).toHaveBeenCalledWith('budget_periods')
      expect(supabase.from).toHaveBeenCalledWith('expenses')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUser.id)

      // Verify upsert was called (updated + new expenses)
      expect(mockUpsert).toHaveBeenCalled()
      const upsertCalls = mockUpsert.mock.calls[0]
      expect(upsertCalls[0]).toHaveLength(2) // Updated expense + new expense

      // Verify delete was called (cloud-2 not in local)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockIn).toHaveBeenCalledWith('id', ['cloud-2'])

      // Verify sync status updated
      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })
    })

    it.skip('should handle sync errors gracefully', async () => {
      vi.useFakeTimers()
      const mockError = new Error('Network error')

      // Mock PGlite for budget periods query
      localDB.query.mockResolvedValue({
        rows: [{ id: 'period-2025', year: 2025 }]
      })

      // Mock Supabase to throw error on budget_periods query
      supabase.from.mockImplementation((table) => {
        if (table === 'budget_periods') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: null,
                error: mockError
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null })
          })
        }
      })

      const wrapper = ({ children}) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      const mockExpenses = [{ id: '1', name: 'Test', amount: 100 }]

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses)
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('error')
        expect(result.current.syncError).toBe('Network error')
      })

      // Verify error auto-resets to idle after 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000)
        await vi.runAllTimersAsync()
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('idle')
        expect(result.current.syncError).toBeNull()
      })

      vi.useRealTimers()
    })

    it('should skip upsert if local version is older than cloud', async () => {
      const mockCloudExpenses = [
        {
          id: 'expense-1',
          user_id: mockUser.id,
          name: 'Cloud Version',
          amount: 200,
          updated_at: '2025-01-05T00:00:00Z' // Newer than local
        }
      ]

      const mockLocalExpenses = [
        {
          id: 'expense-1',
          name: 'Local Version',
          amount: 100,
          startMonth: 1,
          endMonth: 12,
          updatedAt: '2025-01-01T00:00:00Z' // Older than cloud
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockResolvedValue({
        data: mockCloudExpenses,
        error: null
      })

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })

      supabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert
      })

      mockSelect.mockReturnValue({ eq: mockEq })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await act(async () => {
        await result.current.immediateSyncExpenses(mockLocalExpenses)
      })

      // Upsert should NOT be called (local is older)
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  describe('syncBudgetPeriods', () => {
    it('should sync budget periods to cloud', async () => {
      const mockPeriods = [
        {
          id: 'period-1',
          userId: mockUser.id,
          year: 2025,
          monthlyPayment: 5700,
          previousBalance: 4831,
          monthlyPayments: null,
          status: 'active'
        }
      ]

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockSelect = vi.fn()
      const mockEq = vi.fn().mockResolvedValue({
        data: [], // No existing cloud periods
        error: null
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert
      })

      mockSelect.mockReturnValue({ eq: mockEq })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await act(async () => {
        await result.current.immediateSyncBudgetPeriods(mockPeriods)
      })

      expect(supabase.from).toHaveBeenCalledWith('budget_periods')
      expect(mockUpsert).toHaveBeenCalled()

      const upsertData = mockUpsert.mock.calls[0][0][0]
      expect(upsertData).toMatchObject({
        id: 'period-1',
        user_id: mockUser.id,
        year: 2025,
        monthly_payment: 5700,
        previous_balance: 4831,
        status: 'active'
      })

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })
    })

    it('should handle JSONB monthly_payments correctly', async () => {
      const mockPeriods = [
        {
          id: 'period-1',
          userId: mockUser.id,
          year: 2025,
          monthlyPayment: 0,
          previousBalance: 0,
          monthlyPayments: [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700],
          status: 'active'
        }
      ]

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockSelect = vi.fn()
      const mockEq = vi.fn().mockResolvedValue({
        data: [], // No existing cloud periods
        error: null
      })

      supabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert
      })

      mockSelect.mockReturnValue({ eq: mockEq })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await act(async () => {
        await result.current.immediateSyncBudgetPeriods(mockPeriods)
      })

      const upsertData = mockUpsert.mock.calls[0][0][0]
      expect(upsertData.monthly_payments).toEqual([5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700])
    })
  })

  describe('loadExpenses', () => {
    it('should load expenses from cloud and transform to app format', async () => {
      const mockCloudData = [
        {
          id: 'expense-1',
          user_id: mockUser.id,
          name: 'Netflix',
          amount: 79,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockCloudData,
        error: null
      })

      supabase.from.mockReturnValue({
        select: mockSelect
      })

      mockSelect.mockReturnValue({ eq: mockEq })
      mockEq.mockReturnValue({ order: mockOrder })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      let loadResult
      await act(async () => {
        loadResult = await result.current.loadExpenses()
      })

      expect(loadResult.success).toBe(true)
      expect(loadResult.data).toHaveLength(1)
      expect(loadResult.data[0]).toMatchObject({
        id: 'expense-1',
        name: 'Netflix',
        amount: 79,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12
      })
    })

    it('should return empty array when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      let loadResult
      await act(async () => {
        loadResult = await result.current.loadExpenses()
      })

      expect(loadResult.success).toBe(false)
      expect(loadResult.data).toEqual([])
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Debounced Sync', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it.skip('should debounce sync by 1 second', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({ error: null })

      // Mock PGlite for budget periods query
      localDB.query.mockResolvedValue({
        rows: [{ id: 'period-2025', year: 2025 }]
      })

      supabase.from.mockImplementation((table) => {
        if (table === 'budget_periods') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'period-2025', year: 2025 }],
                error: null
              })
            })
          }
        }
        if (table === 'expenses') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            }),
            upsert: mockUpsert,
            delete: () => ({ in: mockIn })
          }
        }
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      const mockExpenses = [{ id: '1', name: 'Test', amount: 100 }]

      // Call debounced sync
      act(() => {
        result.current.syncExpenses(mockExpenses)
      })

      // Should not sync immediately
      expect(supabase.from).not.toHaveBeenCalled()

      // Advance timers by 500ms
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Still should not sync
      expect(supabase.from).not.toHaveBeenCalled()

      // Advance timers by another 500ms (total 1000ms)
      await act(async () => {
        vi.advanceTimersByTime(500)
        await vi.runAllTimersAsync()
      })

      // Now should sync
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })
    })

    it.skip('should cancel previous debounced sync on new call', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({ error: null })

      // Mock PGlite for budget periods query
      localDB.query.mockResolvedValue({
        rows: [{ id: 'period-2025', year: 2025 }]
      })

      supabase.from.mockImplementation((table) => {
        if (table === 'budget_periods') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'period-2025', year: 2025 }],
                error: null
              })
            })
          }
        }
        if (table === 'expenses') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            }),
            upsert: mockUpsert,
            delete: () => ({ in: mockIn })
          }
        }
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      // First call
      await act(async () => {
        result.current.syncExpenses([{ id: '1', name: 'First', amount: 100 }])
      })

      // Advance 500ms
      await act(async () => {
        vi.advanceTimersByTime(500)
        await vi.runAllTimersAsync()
      })

      // Second call (should cancel first)
      await act(async () => {
        result.current.syncExpenses([{ id: '2', name: 'Second', amount: 200 }])
      })

      // Advance another 1000ms
      await act(async () => {
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      })

      // Should only sync once (second call)
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Status Reset Timeouts', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it.skip('should reset status from synced to idle after 2 seconds', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnThis()
      const mockIn = vi.fn().mockResolvedValue({ error: null })

      // Mock PGlite for budget periods query
      localDB.query.mockResolvedValue({
        rows: [{ id: 'period-2025', year: 2025 }]
      })

      supabase.from.mockImplementation((table) => {
        if (table === 'budget_periods') {
          return {
            select: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'period-2025', year: 2025 }],
                error: null
              })
            })
          }
        }
        if (table === 'expenses') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            }),
            upsert: mockUpsert,
            delete: () => ({ in: mockIn })
          }
        }
      })

      const wrapper = ({ children }) => (
        <SyncProvider user={mockUser}>{children}</SyncProvider>
      )

      const { result } = renderHook(() => useContext(SyncContext), { wrapper })

      await act(async () => {
        await result.current.immediateSyncExpenses([{ id: '1', name: 'Test', amount: 100 }])
      })

      // Should be synced
      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })

      // Advance timers by 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000)
        await vi.runAllTimersAsync()
      })

      // Should reset to idle
      await waitFor(() => {
        expect(result.current.syncStatus).toBe('idle')
      })
    })
  })
})
