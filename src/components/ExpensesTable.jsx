/**
 * Expenses table component with inline editing
 */

import { useState, useEffect, useMemo } from 'react'
import { MONTHS, FREQUENCY_LABELS, FREQUENCY_TYPES } from '../utils/constants'
import { calculateAnnualAmount } from '../utils/calculations'
import './ExpensesTable.css'

export const ExpensesTable = ({
  expenses,
  selectedExpenses,
  onToggleSelection,
  onToggleSelectAll,
  onUpdate,
  onDelete
}) => {
  const allSelected = selectedExpenses.length === expenses.length && expenses.length > 0
  const [newlyAddedId, setNewlyAddedId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

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

  return (
    <div className="table-container">
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
                <button
                  className="btn-delete"
                  onClick={() => onDelete(expense.id)}
                  aria-label={`Slet ${expense.name}`}
                >
                  Slet
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
