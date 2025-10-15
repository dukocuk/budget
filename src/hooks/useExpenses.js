/**
 * Custom hook for expense management with PGlite local database + cloud sync
 * Implements optimistic UI updates to prevent focus loss during sync
 * OPTIMIZATION: Uses useLayoutEffect for history tracking to batch with render cycle
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { localDB } from '../lib/pglite'
import { useSyncContext } from './useSyncContext'
import { sanitizeExpense } from '../utils/validators'
import { logger } from '../utils/logger'

/**
 * Hook for managing expenses with local-first architecture
 *
 * Features:
 * - Local-first data storage with PGlite
 * - Automatic cloud synchronization with debouncing
 * - Optimistic UI updates for instant feedback
 * - Undo/Redo functionality with history tracking
 * - Bulk operations (select/delete multiple expenses)
 *
 * @param {string} userId - User ID for filtering expenses (from authentication)
 *
 * @returns {Object} Expense management interface
 * @returns {Array<Object>} returns.expenses - Array of expense objects
 * @returns {boolean} returns.loading - Loading state during initial data fetch
 * @returns {string|null} returns.error - Error message if operation failed
 * @returns {Array<number>} returns.selectedExpenses - Array of selected expense IDs for bulk operations
 * @returns {Function} returns.addExpense - Add new expense (async)
 * @returns {Function} returns.updateExpense - Update existing expense (async)
 * @returns {Function} returns.deleteExpense - Delete single expense (async)
 * @returns {Function} returns.deleteExpenses - Delete multiple expenses (async)
 * @returns {Function} returns.deleteSelected - Delete all selected expenses (async)
 * @returns {Function} returns.importExpenses - Replace all expenses with imported data (async)
 * @returns {Function} returns.toggleExpenseSelection - Toggle selection state for an expense
 * @returns {Function} returns.toggleSelectAll - Toggle selection for all expenses
 * @returns {Function} returns.setAllExpenses - Replace expenses array (for cloud sync)
 * @returns {Function} returns.undo - Undo last operation
 * @returns {Function} returns.redo - Redo previously undone operation
 * @returns {boolean} returns.canUndo - Whether undo is available
 * @returns {boolean} returns.canRedo - Whether redo is available
 * @returns {Function} returns.reload - Manually reload expenses from local database
 *
 * @example
 * const {
 *   expenses,
 *   loading,
 *   addExpense,
 *   updateExpense,
 *   deleteExpense,
 *   undo,
 *   canUndo
 * } = useExpenses(user.id)
 *
 * // Add new expense
 * await addExpense({
 *   name: 'Netflix',
 *   amount: 79,
 *   frequency: 'monthly',
 *   startMonth: 1,
 *   endMonth: 12
 * })
 *
 * // Update expense
 * await updateExpense(expenseId, { amount: 89 })
 *
 * // Undo if needed
 * if (canUndo) {
 *   undo()
 * }
 */
export const useExpenses = (userId) => {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get sync functions from context
  const { syncExpenses } = useSyncContext()

  // Track if we need to sync after local changes
  const needsSyncRef = useRef(false)
  const syncTimeoutRef = useRef(null)

  /**
   * Load expenses from local PGlite database
   */
  const loadExpenses = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await localDB.query(
        'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC',
        [userId]
      )

      const loadedExpenses = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        amount: row.amount,
        frequency: row.frequency,
        startMonth: row.start_month,
        endMonth: row.end_month,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      setExpenses(loadedExpenses)
      setLoading(false)
    } catch (err) {
      logger.error('❌ Error loading expenses from local DB:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [userId])

  /**
   * Debounced cloud sync - only sync after user stops making changes
   */
  const debouncedCloudSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (needsSyncRef.current) {
        // Get current expenses and sync to cloud
        localDB.query(
          'SELECT * FROM expenses WHERE user_id = $1',
          [userId]
        ).then(result => {
          const expensesToSync = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            amount: row.amount,
            frequency: row.frequency,
            startMonth: row.start_month,
            endMonth: row.end_month
          }))
          syncExpenses(expensesToSync)
          needsSyncRef.current = false
        }).catch(err => {
          logger.error('❌ Error syncing to cloud:', err)
        })
      }
    }, 1000) // Sync 1 second after last change
  }, [userId, syncExpenses])

  /**
   * Initial load on mount
   */
  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Add new expense (optimistic update)
   */
  const addExpense = useCallback(async (expenseData) => {
    if (!userId) return

    try {
      setError(null)

      // Sanitize input
      const sanitized = sanitizeExpense({
        name: expenseData.name || 'Ny udgift',
        amount: expenseData.amount || 100,
        frequency: expenseData.frequency || 'monthly',
        startMonth: expenseData.startMonth || 1,
        endMonth: expenseData.endMonth || 12
      })

      // Insert into local database
      const result = await localDB.query(
        `INSERT INTO expenses (user_id, name, amount, frequency, start_month, end_month)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          sanitized.name,
          sanitized.amount,
          sanitized.frequency,
          sanitized.startMonth,
          sanitized.endMonth
        ]
      )

      const newExpense = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        amount: result.rows[0].amount,
        frequency: result.rows[0].frequency,
        startMonth: result.rows[0].start_month,
        endMonth: result.rows[0].end_month,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }

      // Optimistic UI update - add to local state immediately
      setExpenses(prev => [newExpense, ...prev])

      // Queue cloud sync
      needsSyncRef.current = true
      debouncedCloudSync()

      return newExpense
    } catch (err) {
      logger.error('❌ Error adding expense:', err)
      setError(err.message)
      throw err
    }
  }, [userId, debouncedCloudSync])

  /**
   * Update expense (optimistic update)
   */
  const updateExpense = useCallback(async (id, updates) => {
    if (!userId) return

    try {
      setError(null)

      // Build update query dynamically based on provided fields
      const updateFields = []
      const values = []
      let paramIndex = 1

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`)
        values.push(updates.name)
      }
      if (updates.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`)
        values.push(Math.max(0, parseFloat(updates.amount) || 0))
      }
      if (updates.frequency !== undefined) {
        updateFields.push(`frequency = $${paramIndex++}`)
        values.push(updates.frequency)
      }
      if (updates.startMonth !== undefined) {
        updateFields.push(`start_month = $${paramIndex++}`)
        values.push(parseInt(updates.startMonth))
      }
      if (updates.endMonth !== undefined) {
        updateFields.push(`end_month = $${paramIndex++}`)
        values.push(parseInt(updates.endMonth))
      }

      updateFields.push(`updated_at = $${paramIndex++}`)
      values.push(new Date().toISOString())

      // Add WHERE conditions
      values.push(id)
      values.push(userId)

      // Execute update
      await localDB.query(
        `UPDATE expenses
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
        values
      )

      // Optimistic UI update - update local state immediately
      setExpenses(prev => prev.map(expense => {
        if (expense.id === id) {
          const updated = { ...expense, ...updates }
          // Handle month field name conversion
          if (updates.startMonth !== undefined) updated.startMonth = updates.startMonth
          if (updates.endMonth !== undefined) updated.endMonth = updates.endMonth
          return sanitizeExpense(updated)
        }
        return expense
      }))

      // Queue cloud sync
      needsSyncRef.current = true
      debouncedCloudSync()

    } catch (err) {
      logger.error('❌ Error updating expense:', err)
      setError(err.message)
      throw err
    }
  }, [userId, debouncedCloudSync])

  /**
   * Delete single expense (optimistic update)
   */
  const deleteExpense = useCallback(async (id) => {
    if (!userId) return

    try {
      setError(null)

      // Delete from local database
      await localDB.query(
        'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
        [id, userId]
      )

      // Optimistic UI update - remove from local state immediately
      setExpenses(prev => prev.filter(expense => expense.id !== id))

      // Queue cloud sync
      needsSyncRef.current = true
      debouncedCloudSync()

    } catch (err) {
      logger.error('❌ Error deleting expense:', err)
      setError(err.message)
      throw err
    }
  }, [userId, debouncedCloudSync])

  /**
   * Delete multiple expenses (optimistic update)
   */
  const deleteExpenses = useCallback(async (ids) => {
    if (!userId || !ids || ids.length === 0) return

    try {
      setError(null)

      // Delete from local database
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
      await localDB.query(
        `DELETE FROM expenses WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
        [...ids, userId]
      )

      // Optimistic UI update - remove from local state immediately
      setExpenses(prev => prev.filter(expense => !ids.includes(expense.id)))

      // Queue cloud sync
      needsSyncRef.current = true
      debouncedCloudSync()

    } catch (err) {
      logger.error('❌ Error deleting expenses:', err)
      setError(err.message)
      throw err
    }
  }, [userId, debouncedCloudSync])

  /**
   * Import expenses (replace all)
   */
  const importExpenses = useCallback(async (newExpenses) => {
    if (!userId) return

    try {
      setError(null)

      // Delete all existing expenses
      await localDB.query(
        'DELETE FROM expenses WHERE user_id = $1',
        [userId]
      )

      // Insert new expenses
      for (const expense of newExpenses) {
        const sanitized = sanitizeExpense(expense)
        await localDB.query(
          `INSERT INTO expenses (user_id, name, amount, frequency, start_month, end_month)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            sanitized.name,
            sanitized.amount,
            sanitized.frequency,
            sanitized.startMonth,
            sanitized.endMonth
          ]
        )
      }

      // Reload from database
      await loadExpenses()

      // Queue cloud sync
      needsSyncRef.current = true
      debouncedCloudSync()

    } catch (err) {
      logger.error('❌ Error importing expenses:', err)
      setError(err.message)
      throw err
    }
  }, [userId, loadExpenses, debouncedCloudSync])

  // Selection state for bulk operations
  const [selectedExpenses, setSelectedExpenses] = useState([])

  /**
   * Toggle expense selection
   */
  const toggleExpenseSelection = useCallback((id) => {
    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expId => expId !== id)
      } else {
        return [...prev, id]
      }
    })
  }, [])

  /**
   * Toggle select all expenses
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([])
    } else {
      setSelectedExpenses(expenses.map(e => e.id))
    }
  }, [selectedExpenses.length, expenses])

  /**
   * Delete selected expenses
   */
  const deleteSelected = useCallback(async () => {
    if (selectedExpenses.length === 0) {
      return { success: false, message: 'No expenses selected' }
    }

    try {
      await deleteExpenses(selectedExpenses)
      setSelectedExpenses([])
      return { success: true, count: selectedExpenses.length }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }, [selectedExpenses, deleteExpenses])

  /**
   * Set all expenses (for cloud sync)
   */
  const setAllExpenses = useCallback((newExpenses) => {
    setExpenses(newExpenses)
  }, [])

  // Undo/Redo functionality (simplified - no local DB for history)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1)
      setExpenses(history[historyIndex - 1])
      needsSyncRef.current = true
      debouncedCloudSync()
      return true
    }
    return false
  }, [canUndo, history, historyIndex, debouncedCloudSync])

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1)
      setExpenses(history[historyIndex + 1])
      needsSyncRef.current = true
      debouncedCloudSync()
      return true
    }
    return false
  }, [canRedo, history, historyIndex, debouncedCloudSync])

  // Mark initial load as complete after first expenses load
  useEffect(() => {
    if (isInitialLoad && !loading && expenses.length >= 0) {
      setIsInitialLoad(false)
    }
  }, [isInitialLoad, loading, expenses.length])

  // Track changes for undo/redo (ONLY after initial load)
  // OPTIMIZATION: Use useLayoutEffect to batch history updates with render cycle
  // This prevents additional re-renders and improves performance
  const historyUpdatedRef = useRef(false)

  useLayoutEffect(() => {
    // Skip history tracking during initial load to prevent unnecessary re-renders
    if (isInitialLoad || loading) {
      return
    }

    // Reset the update flag
    historyUpdatedRef.current = false

    // Update history only if expenses changed (shallow equality check first)
    setHistory(prev => {
      const lastSnapshot = prev[prev.length - 1]

      // Fast path: check length first (most common change)
      if (!lastSnapshot || lastSnapshot.length !== expenses.length) {
        historyUpdatedRef.current = true
        return [...prev, expenses]
      }

      // Slower path: deep equality check only if lengths match
      const expensesChanged = JSON.stringify(lastSnapshot) !== JSON.stringify(expenses)

      if (expensesChanged) {
        historyUpdatedRef.current = true
        return [...prev, expenses]
      }
      return prev
    })

    // Update index only if history was actually updated
    if (historyUpdatedRef.current) {
      setHistoryIndex(prev => prev + 1)
    }
  }, [expenses, isInitialLoad, loading])

  return {
    expenses,
    loading,
    error,
    selectedExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    deleteSelected,
    importExpenses,
    toggleExpenseSelection,
    toggleSelectAll,
    setAllExpenses,
    undo,
    redo,
    canUndo,
    canRedo,
    reload: loadExpenses
  }
}
