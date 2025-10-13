import { useState, useRef, useCallback, useEffect } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { calculateAnnualAmount } from '../utils/calculations'
import { DeleteConfirmation } from './DeleteConfirmation'
import { Alert } from './Alert'
import { useAlert } from '../hooks/useAlert'
import './ExpenseManager.css'

const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export default function ExpenseManager({ userId }) {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, deleteExpenses } = useExpenses(userId)
  const [selectedIds, setSelectedIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const { alert, showAlert } = useAlert()

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    expenseId: null,
    expenseName: null,
    count: 0
  })

  // Local input state to prevent focus loss during sync
  const [localValues, setLocalValues] = useState({})
  const updateTimeouts = useRef({})

  // Initialize local values when expenses load
  useEffect(() => {
    const initialValues = {}
    expenses.forEach(expense => {
      initialValues[`${expense.id}_name`] = expense.name
      initialValues[`${expense.id}_amount`] = expense.amount
    })
    setLocalValues(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length]) // Only reset when expenses list changes length (intentionally not including expenses)

  /**
   * Debounced update handler - updates local state immediately, database after 300ms
   */
  const handleDebouncedUpdate = useCallback((id, field, value) => {
    const key = `${id}_${field}`

    // Update local state immediately (prevents focus loss)
    setLocalValues(prev => ({ ...prev, [key]: value }))

    // Clear existing timeout for this field
    if (updateTimeouts.current[key]) {
      clearTimeout(updateTimeouts.current[key])
    }

    // Set new timeout to update database
    updateTimeouts.current[key] = setTimeout(async () => {
      try {
        const updates = { [field]: value }
        await updateExpense(id, updates)
      } catch (error) {
        showAlert('❌ Fejl ved opdatering: ' + error.message, 'error')
        // Revert local value on error
        const expense = expenses.find(e => e.id === id)
        if (expense) {
          setLocalValues(prev => ({ ...prev, [key]: expense[field] }))
        }
      }
      delete updateTimeouts.current[key]
    }, 300) // 300ms debounce
  }, [updateExpense, expenses, showAlert])

  /**
   * Immediate update handler for select fields (no debounce needed)
   */
  const handleImmediateUpdate = useCallback(async (id, field, value) => {
    try {
      const updates = { [field]: value }
      await updateExpense(id, updates)
    } catch (error) {
      showAlert('❌ Fejl ved opdatering: ' + error.message, 'error')
    }
  }, [updateExpense, showAlert])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(updateTimeouts.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Early return after all hooks
  if (loading) {
    return <div className="loading">Indlæser udgifter...</div>
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = async () => {
    try {
      await addExpense({
        name: "Ny udgift",
        amount: 100,
        frequency: "monthly",
        startMonth: 1,
        endMonth: 12
      })
      showAlert('✅ Ny udgift tilføjet', 'success')
    } catch (error) {
      showAlert('❌ Fejl ved tilføjelse: ' + error.message, 'error')
    }
  }

  // Open delete confirmation modal for single expense
  const handleDelete = (id, name) => {
    setDeleteConfirmation({
      isOpen: true,
      expenseId: id,
      expenseName: name,
      count: 0
    })
  }

  // Open delete confirmation modal for multiple expenses
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showAlert('⚠️ Vælg venligst udgifter at slette', 'warning')
      return
    }

    setDeleteConfirmation({
      isOpen: true,
      expenseId: null,
      expenseName: null,
      count: selectedIds.length
    })
  }

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      if (deleteConfirmation.count > 0) {
        // Bulk delete
        await deleteExpenses(selectedIds)
        setSelectedIds([])
        showAlert(`✅ ${deleteConfirmation.count} udgift(er) slettet`, 'success')
      } else {
        // Single delete
        await deleteExpense(deleteConfirmation.expenseId)
        showAlert('✅ Udgift slettet', 'success')
      }
      setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
    } catch (error) {
      showAlert('❌ Fejl ved sletning: ' + error.message, 'error')
      setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
    }
  }

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
  }

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === filteredExpenses.length ? [] : filteredExpenses.map(e => e.id)
    )
  }

  return (
    <div className="expense-manager">
      {alert && <Alert message={alert.message} type={alert.type} />}

      <DeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        expenseName={deleteConfirmation.expenseName}
        count={deleteConfirmation.count}
      />

      <div className="manager-header">
        <h2>💰 Dine udgifter</h2>
        <div className="manager-actions">
          <input
            type="text"
            placeholder="Søg udgifter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={handleAddNew} className="btn btn-primary">
            ➕ Tilføj ny udgift
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Udgift</th>
              <th>Beløb (kr.)</th>
              <th>Frekvens</th>
              <th>Start måned</th>
              <th>Slut måned</th>
              <th>Årlig total</th>
              <th>Handling</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(expense => (
              <tr key={expense.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(expense.id)}
                    onChange={() => toggleSelection(expense.id)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={localValues[`${expense.id}_name`] ?? expense.name}
                    onChange={(e) => handleDebouncedUpdate(expense.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={localValues[`${expense.id}_amount`] ?? expense.amount}
                    onChange={(e) => handleDebouncedUpdate(expense.id, 'amount', parseInt(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <select
                    value={expense.frequency}
                    onChange={(e) => handleImmediateUpdate(expense.id, 'frequency', e.target.value)}
                  >
                    <option value="monthly">Månedlig</option>
                    <option value="quarterly">Kvartalsvis</option>
                    <option value="yearly">Årlig</option>
                  </select>
                </td>
                <td>
                  <select
                    value={expense.startMonth}
                    onChange={(e) => handleImmediateUpdate(expense.id, 'startMonth', parseInt(e.target.value))}
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={expense.endMonth}
                    onChange={(e) => handleImmediateUpdate(expense.id, 'endMonth', parseInt(e.target.value))}
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </td>
                <td className="annual-total">
                  {calculateAnnualAmount(expense).toLocaleString('da-DK')} kr.
                </td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(expense.id, expense.name)}
                  >
                    Slet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <button className="btn btn-danger" onClick={handleDeleteSelected}>
          🗑️ Slet {selectedIds.length} valgte
        </button>
      )}

      {filteredExpenses.length === 0 && searchTerm && (
        <div className="empty-state">
          <p>Ingen udgifter matcher "{searchTerm}"</p>
        </div>
      )}

      {expenses.length === 0 && !searchTerm && (
        <div className="empty-state">
          <p>Ingen udgifter endnu. Klik "Tilføj ny udgift" for at komme i gang!</p>
        </div>
      )}
    </div>
  )
}
