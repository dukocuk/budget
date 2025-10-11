/**
 * Custom hook for expense management with cloud sync
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { DEFAULT_EXPENSE, INITIAL_EXPENSES } from '../utils/constants'
import { sanitizeExpense } from '../utils/validators'

/**
 * Hook for managing expenses with undo/redo capability and optional cloud sync
 * @param {Array} initialExpenses - Initial expense list
 * @param {Function} onSyncCallback - Optional callback to sync expenses to cloud
 * @returns {Object} Expense management methods and state
 */
export const useExpenses = (initialExpenses = INITIAL_EXPENSES, onSyncCallback = null) => {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [selectedExpenses, setSelectedExpenses] = useState([])
  const [nextId, setNextId] = useState(
    Math.max(...initialExpenses.map(e => e.id), 0) + 1
  )

  // History for undo/redo
  const [history, setHistory] = useState([initialExpenses])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Save to history
  const saveToHistory = useCallback((newExpenses) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newExpenses)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Trigger cloud sync when expenses change
  useEffect(() => {
    if (onSyncCallback && expenses.length > 0) {
      onSyncCallback(expenses)
    }
  }, [expenses, onSyncCallback])

  // Add new expense
  const addExpense = useCallback((expenseData = null) => {
    const newExpense = {
      id: nextId,
      ...(expenseData || DEFAULT_EXPENSE)
    }
    // Insert at top of array instead of bottom
    const newExpenses = [newExpense, ...expenses]
    setExpenses(newExpenses)
    setNextId(nextId + 1)
    saveToHistory(newExpenses)

    return newExpense
  }, [expenses, nextId, saveToHistory])

  // Update expense
  const updateExpense = useCallback((id, field, value) => {
    const newExpenses = expenses.map(expense => {
      if (expense.id === id) {
        const updated = { ...expense }

        if (field === 'amount') {
          value = Math.max(0, parseFloat(value) || 0)
        } else if (field === 'startMonth' || field === 'endMonth') {
          value = parseInt(value)
          if (field === 'endMonth' && value < expense.startMonth) {
            value = expense.startMonth
          }
          if (field === 'startMonth' && value > expense.endMonth) {
            updated.endMonth = value
          }
        }

        updated[field] = value
        return sanitizeExpense(updated)
      }
      return expense
    })

    setExpenses(newExpenses)
    saveToHistory(newExpenses)
  }, [expenses, saveToHistory])

  // Delete expense
  const deleteExpense = useCallback((id) => {
    const newExpenses = expenses.filter(e => e.id !== id)
    setExpenses(newExpenses)
    setSelectedExpenses(selectedExpenses.filter(expId => expId !== id))
    saveToHistory(newExpenses)
    return expenses.find(e => e.id === id)
  }, [expenses, selectedExpenses, saveToHistory])

  // Delete multiple expenses
  const deleteSelected = useCallback(() => {
    if (selectedExpenses.length === 0) {
      return { success: false, count: 0 }
    }

    const newExpenses = expenses.filter(e => !selectedExpenses.includes(e.id))
    const count = selectedExpenses.length
    setExpenses(newExpenses)
    setSelectedExpenses([])
    saveToHistory(newExpenses)

    return { success: true, count }
  }, [expenses, selectedExpenses, saveToHistory])

  // Toggle expense selection
  const toggleExpenseSelection = useCallback((id) => {
    if (selectedExpenses.includes(id)) {
      setSelectedExpenses(selectedExpenses.filter(expId => expId !== id))
    } else {
      setSelectedExpenses([...selectedExpenses, id])
    }
  }, [selectedExpenses])

  // Toggle select all
  const toggleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedExpenses(expenses.map(e => e.id))
    } else {
      setSelectedExpenses([])
    }
  }, [expenses])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setExpenses(history[newIndex])
      return true
    }
    return false
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setExpenses(history[newIndex])
      return true
    }
    return false
  }, [history, historyIndex])

  // Replace all expenses (for loading from storage)
  const setAllExpenses = useCallback((newExpenses) => {
    setExpenses(newExpenses)
    setNextId(Math.max(...newExpenses.map(e => e.id), 0) + 1)
    saveToHistory(newExpenses)
  }, [saveToHistory])

  // Import expenses (merge with existing)
  const importExpenses = useCallback((newExpenses, replaceAll = false) => {
    let updatedExpenses

    if (replaceAll) {
      // Replace all existing expenses
      updatedExpenses = newExpenses
    } else {
      // Merge: add new expenses to existing ones
      updatedExpenses = [...newExpenses, ...expenses]
    }

    setExpenses(updatedExpenses)
    setNextId(Math.max(...updatedExpenses.map(e => e.id), 0) + 1)
    saveToHistory(updatedExpenses)

    return updatedExpenses
  }, [expenses, saveToHistory])

  const canUndo = useMemo(() => historyIndex > 0, [historyIndex])
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history])

  return {
    expenses,
    selectedExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteSelected,
    toggleExpenseSelection,
    toggleSelectAll,
    setAllExpenses,
    importExpenses,
    undo,
    redo,
    canUndo,
    canRedo
  }
}
