import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDB } from '../lib/pglite'
import { setupRealtimeSync } from '../lib/sync'

export function useExpenses(userId) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load expenses from local database
  const loadExpenses = useCallback(async () => {
    if (!userId) return

    try {
      const result = await localDB.query(
        'SELECT * FROM expenses WHERE user_id = $1 ORDER BY name ASC',
        [userId]
      )

      // Convert BigInt IDs to numbers for compatibility
      const formattedExpenses = result.rows.map(expense => ({
        ...expense,
        id: Number(expense.id),
        startMonth: expense.start_month,
        endMonth: expense.end_month
      }))

      setExpenses(formattedExpenses)
      setLoading(false)
    } catch (err) {
      console.error('Error loading expenses:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [userId])

  // Setup real-time sync
  useEffect(() => {
    if (!userId) return

    loadExpenses()

    // Subscribe to real-time changes
    const unsubscribe = setupRealtimeSync(userId, loadExpenses)

    return () => {
      unsubscribe()
    }
  }, [userId, loadExpenses])

  // Add new expense
  const addExpense = async (expenseData) => {
    try {
      setError(null)
      const id = Date.now() // Simple ID generation

      const expense = {
        id: id.toString(),
        user_id: userId,
        name: expenseData.name,
        amount: expenseData.amount,
        frequency: expenseData.frequency,
        start_month: expenseData.startMonth,
        end_month: expenseData.endMonth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insert to local DB
      await localDB.exec(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          userId,
          expense.name,
          expense.amount,
          expense.frequency,
          expense.start_month,
          expense.end_month,
          expense.created_at,
          expense.updated_at
        ]
      )

      // Sync to cloud
      const { error: cloudError } = await supabase
        .from('expenses')
        .insert(expense)

      if (cloudError) throw cloudError

      // Reload expenses
      await loadExpenses()

      return id
    } catch (err) {
      console.error('Error adding expense:', err)
      setError(err.message)
      throw err
    }
  }

  // Update expense
  const updateExpense = async (id, updates) => {
    try {
      setError(null)

      // Convert field names for database
      const dbUpdates = {
        name: updates.name,
        amount: updates.amount,
        frequency: updates.frequency,
        start_month: updates.startMonth ?? updates.start_month,
        end_month: updates.endMonth ?? updates.end_month,
        updated_at: new Date().toISOString()
      }

      // Build dynamic UPDATE query
      const updateFields = Object.keys(dbUpdates)
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ')

      const values = Object.values(dbUpdates)

      // Update local DB
      await localDB.exec(
        `UPDATE expenses SET ${updateFields} WHERE id = $1`,
        [id, ...values]
      )

      // Sync to cloud
      const { error: cloudError } = await supabase
        .from('expenses')
        .update(dbUpdates)
        .eq('id', id.toString())

      if (cloudError) throw cloudError

      // Reload expenses
      await loadExpenses()
    } catch (err) {
      console.error('Error updating expense:', err)
      setError(err.message)
      throw err
    }
  }

  // Delete expense
  const deleteExpense = async (id) => {
    try {
      setError(null)

      // Delete from local DB
      await localDB.exec('DELETE FROM expenses WHERE id = $1', [id])

      // Sync to cloud
      const { error: cloudError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id.toString())

      if (cloudError) throw cloudError

      // Update local state
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Error deleting expense:', err)
      setError(err.message)
      throw err
    }
  }

  // Delete multiple expenses
  const deleteExpenses = async (ids) => {
    try {
      setError(null)

      // Delete from local DB
      for (const id of ids) {
        await localDB.exec('DELETE FROM expenses WHERE id = $1', [id])
      }

      // Sync to cloud
      const { error: cloudError } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids.map(id => id.toString()))

      if (cloudError) throw cloudError

      // Update local state
      setExpenses(prev => prev.filter(e => !ids.includes(e.id)))
    } catch (err) {
      console.error('Error deleting expenses:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteExpenses,
    refreshExpenses: loadExpenses
  }
}
