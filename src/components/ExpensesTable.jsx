/**
 * Expenses table component with inline editing
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { MONTHS, FREQUENCY_LABELS, FREQUENCY_TYPES } from '../utils/constants'
import { calculateAnnualAmount } from '../utils/calculations'
import './ExpensesTable.css'

export const ExpensesTable = ({
  expenses,
  selectedExpenses,
  onToggleSelection,
  onToggleSelectAll,
  onUpdate,
  onDelete,
  onAdd
}) => {
  const allSelected = selectedExpenses.length === expenses.length && expenses.length > 0
  const [newlyAddedId, setNewlyAddedId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showInlineAdd, setShowInlineAdd] = useState(false)
  const [inlineData, setInlineData] = useState({
    name: '',
    amount: 100,
    frequency: FREQUENCY_TYPES.MONTHLY,
    startMonth: 1,
    endMonth: 12
  })
  const inlineRowRef = useRef(null)

  // Track newly added expense (first in array)
  useEffect(() => {
    if (expenses.length > 0) {
      const firstExpense = expenses[0]
      // Only highlight if it's actually new (different from previous first)
      setNewlyAddedId(firstExpense.id)

      // Remove highlight class after animation completes
      const timer = setTimeout(() => {
        setNewlyAddedId(null)
      }, 2000)

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses.length])

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    if (!sortConfig.key) return expenses

    return [...expenses].sort((a, b) => {
      let aVal, bVal

      if (sortConfig.key === 'annualTotal') {
        aVal = calculateAnnualAmount(a)
        bVal = calculateAnnualAmount(b)
      } else {
        aVal = a[sortConfig.key]
        bVal = b[sortConfig.key]
      }

      // Handle string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [expenses, sortConfig])

  // Handle column sort
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
  }

  // Handle inline add
  const handleInlineAdd = () => {
    setShowInlineAdd(true)
    // Auto-focus on name input after render
    setTimeout(() => {
      if (inlineRowRef.current) {
        const nameInput = inlineRowRef.current.querySelector('input[type="text"]')
        if (nameInput) nameInput.focus()
      }
    }, 50)
  }

  // Handle inline save
  const handleInlineSave = () => {
    if (!inlineData.name.trim()) return

    onAdd(inlineData)
    setShowInlineAdd(false)
    setInlineData({
      name: '',
      amount: 100,
      frequency: FREQUENCY_TYPES.MONTHLY,
      startMonth: 1,
      endMonth: 12
    })
  }

  // Handle inline cancel
  const handleInlineCancel = () => {
    setShowInlineAdd(false)
    setInlineData({
      name: '',
      amount: 100,
      frequency: FREQUENCY_TYPES.MONTHLY,
      startMonth: 1,
      endMonth: 12
    })
  }

  // Handle inline field change
  const handleInlineChange = (field, value) => {
    setInlineData(prev => ({ ...prev, [field]: value }))
  }

  // Handle inline keyboard
  const handleInlineKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInlineSave()
    } else if (e.key === 'Escape') {
      handleInlineCancel()
    }
  }

  // Handle click outside to auto-save
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showInlineAdd && inlineRowRef.current && !inlineRowRef.current.contains(event.target)) {
        // Auto-save if name is filled
        if (inlineData.name.trim()) {
          handleInlineSave()
        } else {
          handleInlineCancel()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInlineAdd, inlineData])

  // Handle clone expense
  const handleClone = (expense) => {
    setInlineData({
      name: `${expense.name} (kopi)`,
      amount: expense.amount,
      frequency: expense.frequency,
      startMonth: expense.startMonth,
      endMonth: expense.endMonth
    })
    setShowInlineAdd(true)
  }

  return (
    <div className="table-container">
      <div className="table-header-actions">
        <button
          className="btn btn-primary btn-inline-add"
          onClick={handleInlineAdd}
          disabled={showInlineAdd}
        >
          <span className="btn-icon">➕</span>
          <span>Tilføj ny udgift her</span>
        </button>
      </div>
      <table className="expenses-table">
        <thead>
          <tr>
            <th className="no-sort">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Vælg alle udgifter"
              />
            </th>
            <th className="sortable" onClick={() => handleSort('name')}>
              Udgift{getSortIndicator('name')}
            </th>
            <th className="sortable" onClick={() => handleSort('amount')}>
              Beløb (kr.){getSortIndicator('amount')}
            </th>
            <th>Frekvens</th>
            <th>Start måned</th>
            <th>Slut måned</th>
            <th className="sortable" onClick={() => handleSort('annualTotal')}>
              Årlig total{getSortIndicator('annualTotal')}
            </th>
            <th className="no-sort">Handling</th>
          </tr>
        </thead>
        <tbody>
          {showInlineAdd && (
            <tr className="inline-add-row" ref={inlineRowRef}>
              <td>
                <div className="inline-add-indicator">✨</div>
              </td>
              <td>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={inlineData.name}
                    onChange={(e) => handleInlineChange('name', e.target.value)}
                    onKeyDown={handleInlineKeyDown}
                    placeholder="F.eks. Netflix"
                    autoFocus
                    aria-label="Udgiftsnavn"
                    className={inlineData.name.trim() ? 'valid' : ''}
                  />
                  {inlineData.name.trim() && (
                    <span className="validation-check">✓</span>
                  )}
                </div>
              </td>
              <td>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={inlineData.amount}
                    onChange={(e) => handleInlineChange('amount', parseFloat(e.target.value) || 0)}
                    onKeyDown={handleInlineKeyDown}
                    min="0"
                    aria-label="Beløb"
                    className="valid"
                  />
                  <span className="validation-check">✓</span>
                </div>
              </td>
              <td>
                <select
                  value={inlineData.frequency}
                  onChange={(e) => handleInlineChange('frequency', e.target.value)}
                  onKeyDown={handleInlineKeyDown}
                  aria-label="Frekvens"
                  className="valid"
                >
                  <option value={FREQUENCY_TYPES.MONTHLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.MONTHLY]}
                  </option>
                  <option value={FREQUENCY_TYPES.QUARTERLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.QUARTERLY]}
                  </option>
                  <option value={FREQUENCY_TYPES.YEARLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.YEARLY]}
                  </option>
                </select>
              </td>
              <td>
                <select
                  value={inlineData.startMonth}
                  onChange={(e) => handleInlineChange('startMonth', parseInt(e.target.value))}
                  onKeyDown={handleInlineKeyDown}
                  aria-label="Start måned"
                  className="valid"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={inlineData.endMonth}
                  onChange={(e) => handleInlineChange('endMonth', parseInt(e.target.value))}
                  onKeyDown={handleInlineKeyDown}
                  aria-label="Slut måned"
                  className="valid"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </td>
              <td>
                <span className="inline-preview-label">Forhåndsvisning</span>
              </td>
              <td>
                <div className="inline-actions">
                  <button
                    className="btn-inline-save"
                    onClick={handleInlineSave}
                    disabled={!inlineData.name.trim()}
                    aria-label="Gem udgift"
                    title="Gem (Enter)"
                  >
                    ✓
                  </button>
                  <button
                    className="btn-inline-cancel"
                    onClick={handleInlineCancel}
                    aria-label="Annuller"
                    title="Annuller (Esc)"
                  >
                    ✗
                  </button>
                </div>
                <div className="inline-shortcuts-hint">
                  <kbd>Enter</kbd> = Gem · <kbd>Esc</kbd> = Annuller
                </div>
              </td>
            </tr>
          )}
          {sortedExpenses.map((expense, index) => (
            <tr
              key={expense.id}
              className={index === 0 && newlyAddedId === expense.id ? 'new-row' : ''}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selectedExpenses.includes(expense.id)}
                  onChange={() => onToggleSelection(expense.id)}
                  aria-label={`Vælg ${expense.name}`}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={expense.name}
                  onChange={(e) => onUpdate(expense.id, 'name', e.target.value)}
                  aria-label="Udgiftsnavn"
                />
              </td>
              <td>
                <input
                  type="number"
                  value={expense.amount}
                  onChange={(e) => onUpdate(expense.id, 'amount', e.target.value)}
                  min="0"
                  aria-label="Beløb"
                />
              </td>
              <td>
                <select
                  value={expense.frequency}
                  onChange={(e) => onUpdate(expense.id, 'frequency', e.target.value)}
                  aria-label="Frekvens"
                >
                  <option value={FREQUENCY_TYPES.MONTHLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.MONTHLY]}
                  </option>
                  <option value={FREQUENCY_TYPES.QUARTERLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.QUARTERLY]}
                  </option>
                  <option value={FREQUENCY_TYPES.YEARLY}>
                    {FREQUENCY_LABELS[FREQUENCY_TYPES.YEARLY]}
                  </option>
                </select>
              </td>
              <td>
                <select
                  value={expense.startMonth}
                  onChange={(e) => onUpdate(expense.id, 'startMonth', e.target.value)}
                  aria-label="Start måned"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={expense.endMonth}
                  onChange={(e) => onUpdate(expense.id, 'endMonth', e.target.value)}
                  aria-label="Slut måned"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </td>
              <td className="annual-total">
                {calculateAnnualAmount(expense).toLocaleString('da-DK')} kr.
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="btn-clone"
                    onClick={() => handleClone(expense)}
                    aria-label={`Kopier ${expense.name}`}
                    title="Kopier denne udgift"
                  >
                    📋
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => onDelete(expense.id)}
                    aria-label={`Slet ${expense.name}`}
                  >
                    Slet
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
