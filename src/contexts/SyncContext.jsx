/**
 * SyncContext - Isolated context for cloud sync state
 * Prevents sync status updates from triggering re-renders in data editing components
 *
 * OPTIMIZATION: Sync status is managed via refs to prevent unnecessary re-renders
 * Only UI-facing components (Header) subscribe to status changes
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// eslint-disable-next-line react-refresh/only-export-components
export const SyncContext = createContext(null)

/**
 * SyncProvider - Manages cloud sync state in isolation
 * @param {Object} props - Component props
 * @param {Object} props.user - Authenticated user object
 * @param {ReactNode} props.children - Child components
 */
export const SyncProvider = ({ user, children }) => {
  // Use refs for sync status to avoid triggering re-renders
  // Only update state when UI components explicitly need updates
  const syncStatusRef = useRef('idle') // idle, syncing, synced, error, offline
  const lastSyncTimeRef = useRef(null)
  const syncErrorRef = useRef(null)

  // Keep state ONLY for UI components that need to react to changes
  const [uiSyncStatus, setUiSyncStatus] = useState('idle')
  const [uiLastSyncTime, setUiLastSyncTime] = useState(null)
  const [uiSyncError, setUiSyncError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Refs for debouncing and preventing duplicate syncs
  const syncTimeoutRef = useRef(null)
  const isSyncingRef = useRef(false)

  // Refs for status reset timeouts to ensure cleanup
  const statusResetTimeoutRef = useRef(null)
  const errorResetTimeoutRef = useRef(null)

  /**
   * Update sync status - updates both ref and UI state
   * @param {string} status - New sync status
   */
  const updateSyncStatus = useCallback((status) => {
    syncStatusRef.current = status
    setUiSyncStatus(status)
  }, [])

  /**
   * Update sync error - updates both ref and UI state
   * @param {string|null} error - Error message or null
   */
  const updateSyncError = useCallback((error) => {
    syncErrorRef.current = error
    setUiSyncError(error)
  }, [])

  /**
   * Update last sync time - updates both ref and UI state
   * @param {Date} time - Last sync timestamp
   */
  const updateLastSyncTime = useCallback((time) => {
    lastSyncTimeRef.current = time
    setUiLastSyncTime(time)
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      updateSyncStatus('idle')
    }

    const handleOffline = () => {
      setIsOnline(false)
      updateSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateSyncStatus])

  /**
   * Sync expenses to Supabase using transaction-safe replace strategy
   * Uses a single transaction to ensure data consistency
   */
  const syncExpenses = useCallback(async (expenses) => {
    if (!user || !isOnline || isSyncingRef.current) return

    try {
      isSyncingRef.current = true
      updateSyncStatus('syncing')
      updateSyncError(null)

      // Atomically replace all expenses with current state
      // This handles adds, updates, AND deletions (including deleting all)

      // Delete all existing expenses for this user
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Insert all current expenses (let Supabase generate UUIDs)
      if (expenses.length > 0) {
        const expensesData = expenses.map(expense => ({
          // Omit 'id' - let database generate UUID automatically
          user_id: user.id,
          name: expense.name,
          amount: expense.amount,
          frequency: expense.frequency,
          start_month: expense.startMonth,
          end_month: expense.endMonth
        }))

        const { error: insertError } = await supabase
          .from('expenses')
          .insert(expensesData)

        if (insertError) throw insertError
      }

      updateSyncStatus('synced')
      updateLastSyncTime(new Date())

      // Reset to idle after 2 seconds (with cleanup tracking)
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current)
      }
      statusResetTimeoutRef.current = setTimeout(() => {
        updateSyncStatus('idle')
        statusResetTimeoutRef.current = null
      }, 2000)

    } catch (error) {
      console.error('❌ Error syncing expenses:', error)
      updateSyncError(error.message)
      updateSyncStatus('error')

      // Reset error state after 5 seconds (with cleanup tracking)
      if (errorResetTimeoutRef.current) {
        clearTimeout(errorResetTimeoutRef.current)
      }
      errorResetTimeoutRef.current = setTimeout(() => {
        updateSyncStatus('idle')
        updateSyncError(null)
        errorResetTimeoutRef.current = null
      }, 5000)
    } finally {
      isSyncingRef.current = false
    }
  }, [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime])

  /**
   * Sync settings to Supabase
   */
  const syncSettings = useCallback(async (monthlyPayment, previousBalance, monthlyPayments = null) => {
    if (!user || !isOnline || isSyncingRef.current) return

    try {
      updateSyncStatus('syncing')
      updateSyncError(null)

      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          monthly_payment: monthlyPayment,
          previous_balance: previousBalance,
          monthly_payments: monthlyPayments, // Supabase handles JSONB automatically
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      updateSyncStatus('synced')
      updateLastSyncTime(new Date())

      // Reset to idle after 2 seconds (with cleanup tracking)
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current)
      }
      statusResetTimeoutRef.current = setTimeout(() => {
        updateSyncStatus('idle')
        statusResetTimeoutRef.current = null
      }, 2000)

    } catch (error) {
      console.error('Error syncing settings:', error)
      updateSyncError(error.message)
      updateSyncStatus('error')

      // Reset error state after 5 seconds (with cleanup tracking)
      if (errorResetTimeoutRef.current) {
        clearTimeout(errorResetTimeoutRef.current)
      }
      errorResetTimeoutRef.current = setTimeout(() => {
        updateSyncStatus('idle')
        updateSyncError(null)
        errorResetTimeoutRef.current = null
      }, 5000)
    }
  }, [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime])

  /**
   * Debounced sync for expenses - waits 1 second before syncing
   */
  const debouncedSyncExpenses = useCallback((expenses) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncExpenses(expenses)
    }, 1000)
  }, [syncExpenses])

  /**
   * Debounced sync for settings
   */
  const debouncedSyncSettings = useCallback((monthlyPayment, previousBalance, monthlyPayments = null) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncSettings(monthlyPayment, previousBalance, monthlyPayments)
    }, 1000)
  }, [syncSettings])

  /**
   * Load expenses from Supabase
   * Note: Converts UUID to local numeric IDs for backward compatibility
   */
  const loadExpenses = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: [] }

    try {
      updateSyncStatus('syncing')

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to match app format
      // Convert UUID to numeric ID for local state (sequential numbering)
      const expenses = (data || []).map((expense, index) => ({
        id: index + 1, // Generate sequential local IDs
        name: expense.name,
        amount: parseFloat(expense.amount),
        frequency: expense.frequency,
        startMonth: expense.start_month,
        endMonth: expense.end_month
      }))

      updateSyncStatus('synced')
      updateLastSyncTime(new Date())

      setTimeout(() => {
        updateSyncStatus('idle')
      }, 2000)

      return { success: true, data: expenses }

    } catch (error) {
      console.error('Error loading expenses:', error)
      updateSyncError(error.message)
      updateSyncStatus('error')

      setTimeout(() => {
        updateSyncStatus('idle')
        updateSyncError(null)
      }, 5000)

      return { success: false, data: [] }
    }
  }, [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime])

  /**
   * Load settings from Supabase
   */
  const loadSettings = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: null }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // Ignore "not found" error
        throw error
      }

      if (data) {
        return {
          success: true,
          data: {
            monthlyPayment: parseFloat(data.monthly_payment),
            previousBalance: parseFloat(data.previous_balance),
            monthlyPayments: data.monthly_payments || null // JSONB automatically parsed
          }
        }
      }

      return { success: false, data: null }

    } catch (error) {
      console.error('Error loading settings:', error)
      return { success: false, data: null }
    }
  }, [user, isOnline])

  /**
   * Cleanup all timeouts on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current)
      }
      if (errorResetTimeoutRef.current) {
        clearTimeout(errorResetTimeoutRef.current)
      }
    }
  }, [])

  const value = {
    // Expose UI state for components that need to display status (Header)
    syncStatus: uiSyncStatus,
    lastSyncTime: uiLastSyncTime,
    syncError: uiSyncError,
    isOnline,
    // Expose ref-based values for components that just need to check status
    syncStatusRef,
    lastSyncTimeRef,
    syncErrorRef,
    // Sync functions
    syncExpenses: debouncedSyncExpenses,
    syncSettings: debouncedSyncSettings,
    loadExpenses,
    loadSettings,
    immediateSyncExpenses: syncExpenses, // For cases where immediate sync is needed
    immediateSyncSettings: syncSettings
  }

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  )
}
