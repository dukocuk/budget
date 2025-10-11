/**
 * Custom hook for automatic Supabase cloud synchronization
 * Provides real-time sync with offline-first architecture
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for managing automatic cloud sync with Supabase
 * @param {Object} user - Authenticated user object
 * @returns {Object} Sync state and methods
 */
export const useSupabaseSync = (user) => {
  const [syncStatus, setSyncStatus] = useState('idle') // idle, syncing, synced, error, offline
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Refs for debouncing and preventing duplicate syncs
  const syncTimeoutRef = useRef(null)
  const channelRef = useRef(null)
  const isSyncingRef = useRef(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('idle')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Sync expenses to Supabase
   * Note: We omit 'id' to let Supabase generate UUIDs automatically
   */
  const syncExpenses = useCallback(async (expenses) => {
    if (!user || !isOnline || isSyncingRef.current) return

    try {
      isSyncingRef.current = true
      setSyncStatus('syncing')
      setSyncError(null)

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

      setSyncStatus('synced')
      setLastSyncTime(new Date())

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus('idle')
      }, 2000)

    } catch (error) {
      console.error('Error syncing expenses:', error)
      setSyncError(error.message)
      setSyncStatus('error')

      // Reset error state after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle')
        setSyncError(null)
      }, 5000)
    } finally {
      isSyncingRef.current = false
    }
  }, [user, isOnline])

  /**
   * Sync settings to Supabase
   */
  const syncSettings = useCallback(async (monthlyPayment, previousBalance) => {
    if (!user || !isOnline || isSyncingRef.current) return

    try {
      setSyncStatus('syncing')
      setSyncError(null)

      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          monthly_payment: monthlyPayment,
          previous_balance: previousBalance,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      setSyncStatus('synced')
      setLastSyncTime(new Date())

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus('idle')
      }, 2000)

    } catch (error) {
      console.error('Error syncing settings:', error)
      setSyncError(error.message)
      setSyncStatus('error')

      // Reset error state after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle')
        setSyncError(null)
      }, 5000)
    }
  }, [user, isOnline])

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
  const debouncedSyncSettings = useCallback((monthlyPayment, previousBalance) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncSettings(monthlyPayment, previousBalance)
    }, 1000)
  }, [syncSettings])

  /**
   * Load expenses from Supabase
   * Note: Converts UUID to local numeric IDs for backward compatibility
   */
  const loadExpenses = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: [] }

    try {
      setSyncStatus('syncing')

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

      setSyncStatus('synced')
      setLastSyncTime(new Date())

      setTimeout(() => {
        setSyncStatus('idle')
      }, 2000)

      return { success: true, data: expenses }

    } catch (error) {
      console.error('Error loading expenses:', error)
      setSyncError(error.message)
      setSyncStatus('error')

      setTimeout(() => {
        setSyncStatus('idle')
        setSyncError(null)
      }, 5000)

      return { success: false, data: [] }
    }
  }, [user, isOnline])

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
            previousBalance: parseFloat(data.previous_balance)
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
   * Setup real-time subscriptions for multi-device sync
   */
  useEffect(() => {
    if (!user || !isOnline) return

    // Create realtime channel
    const channel = supabase
      .channel('budget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Expense change detected from another device:', payload.eventType)
          // Trigger a callback to parent component to reload data
          if (window.onRealtimeExpenseChange) {
            window.onRealtimeExpenseChange()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📡 Settings change detected from another device:', payload.eventType)
          // Trigger a callback to parent component to reload data
          if (window.onRealtimeSettingsChange) {
            window.onRealtimeSettingsChange()
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        console.log('🔌 Realtime subscriptions unsubscribed')
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [user, isOnline])

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    isOnline,
    syncExpenses: debouncedSyncExpenses,
    syncSettings: debouncedSyncSettings,
    loadExpenses,
    loadSettings,
    immediateSyncExpenses: syncExpenses, // For cases where immediate sync is needed
    immediateSyncSettings: syncSettings
  }
}
