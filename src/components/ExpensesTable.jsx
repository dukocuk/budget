/**
 * Expenses table component with inline editing
 */

import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react'
import { MONTHS, FREQUENCY_LABELS, FREQUENCY_TYPES } from '../utils/constants'
import { calculateAnnualAmount } from '../utils/calculations'
import { useExpenseFilters } from '../hooks/useExpenseFilters'
import './ExpensesTable.css'

/**
 * Memoized expense row component to prevent unnecessary re-renders
 * Uses local state for input values to maintain focus during typing
 */
const ExpenseRow = memo(({ expense, isSelected, onToggleSelection, onUpdate, onDelete, onClone, readOnly = false }) => {
  // Local state for controlled inputs to prevent focus loss
  // Initialize with expense values, update only when ID changes (handles undo/redo)
  const [localName, setLocalName] = useState(expense.name)
  const [localAmount, setLocalAmount] = useState(expense.amount)

  // Track previous expense ID to detect row changes
  const prevExpenseIdRef = useRef(expense.id)

  // Update local state when expense ID changes (new row from undo/redo)
  // Also update when expense data changes externally (e.g., from cloud sync)
  useEffect(() => {
    if (prevExpenseIdRef.current !== expense.id) {
      // ID changed - definitely a new row
      setLocalName(expense.name)
      setLocalAmount(expense.amount)
      prevExpenseIdRef.current = expense.id
    } else if (expense.name !== localName || expense.amount !== localAmount) {
      // Same ID but data changed externally - update local state
      setLocalName(expense.name)
      setLocalAmount(expense.amount)
    }
  }, [expense.id, expense.name, expense.amount, localName, localAmount])

  // Update handlers - just update local state
  const handleNameChange = useCallback((value) => {
    setLocalName(value)
  }, [])

  const handleAmountChange = useCallback((value) => {
    setLocalAmount(value)
  }, [])

  // Update parent on blur - only if value actually changed
  const handleNameBlur = useCallback(() => {
    if (localName !== expense.name) {
      onUpdate(expense.id, { name: localName })
    }
  }, [expense.id, expense.name, localName, onUpdate])

  const handleAmountBlur = useCallback(() => {
    if (localAmount !== expense.amount) {
      onUpdate(expense.id, { amount: localAmount })
    }
  }, [expense.id, expense.amount, localAmount, onUpdate])

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(expense.id)}
          aria-label={`Vælg ${expense.name}`}
          disabled={readOnly}
        />
      </td>
      <td>
        <input
          type="text"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          aria-label="Udgiftsnavn"
          disabled={readOnly}
        />
      </td>
      <td>
        <input
          type="number"
          value={localAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
          min="0"
          aria-label="Beløb"
          disabled={readOnly}
        />
      </td>
      <td>
        <select
          value={expense.frequency}
          onChange={(e) => onUpdate(expense.id, { frequency: e.target.value })}
          aria-label="Frekvens"
          disabled={readOnly}
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
          onChange={(e) => onUpdate(expense.id, { startMonth: parseInt(e.target.value) })}
          aria-label="Start måned"
          disabled={readOnly}
        >
          {MONTHS.map((month, index) => (
            <option key={index} value={index + 1}>{month}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          value={expense.endMonth}
          onChange={(e) => onUpdate(expense.id, { endMonth: parseInt(e.target.value) })}
          aria-label="Slut måned"
          disabled={readOnly}
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
            onClick={() => onClone(expense)}
            aria-label={`Kopier ${expense.name}`}
            title={readOnly ? "Kan ikke kopiere fra arkiveret år" : "Kopier denne udgift"}
            disabled={readOnly}
          >
            📋
          </button>
          <button
            className="btn-delete"
            onClick={() => onDelete(expense.id)}
            aria-label={`Slet ${expense.name}`}
            disabled={readOnly}
          >
            Slet
          </button>
        </div>
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if expense data or selection changed
  return (
    prevProps.expense.id === nextProps.expense.id &&
    prevProps.expense.name === nextProps.expense.name &&
    prevProps.expense.amount === nextProps.expense.amount &&
    prevProps.expense.frequency === nextProps.expense.frequency &&
    prevProps.expense.startMonth === nextProps.expense.startMonth &&
    prevProps.expense.endMonth === nextProps.expense.endMonth &&
    prevProps.isSelected === nextProps.isSelected
  )
})

export const ExpensesTable = ({
  expenses = [],
  selectedExpenses = [],
  onToggleSelection,
  onToggleSelectAll,
  onUpdate,
  onDelete,
  onAdd,
  readOnly = false
}) => {
  // Use expense filters hook
  const {
    filteredExpenses,
    searchText,
    setSearchText,
    frequencyFilter,
    setFrequencyFilter,
    monthFilter,
    setMonthFilter,
    clearFilters,
    hasActiveFilters,
    filterCount
  } = useExpenseFilters(expenses)

  const allSelected = selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0
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

  // Track newly added expense - removed to prevent unwanted animations
  // Animation only triggers when explicitly adding via inline form or modal

  // Sort expenses (use filtered expenses instead of all expenses)
  const sortedExpenses = useMemo(() => {
    if (!sortConfig.key) return filteredExpenses

    return [...filteredExpenses].sort((a, b) => {
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
  }, [filteredExpenses, sortConfig])

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
      {/* Search and Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="search-input" className="filter-label">
            🔍 Søg
          </label>
          <input
            id="search-input"
            type="text"
            className="filter-search"
            placeholder="Søg efter udgift..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Søg efter udgift"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="frequency-filter" className="filter-label">
            📊 Frekvens
          </label>
          <select
            id="frequency-filter"
            className="filter-select"
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            aria-label="Filtrer efter frekvens"
          >
            <option value="all">Alle</option>
            <option value={FREQUENCY_TYPES.MONTHLY}>Månedlig</option>
            <option value={FREQUENCY_TYPES.QUARTERLY}>Kvartalsvis</option>
            <option value={FREQUENCY_TYPES.YEARLY}>Årlig</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month-filter" className="filter-label">
            📅 Aktiv i måned
          </label>
          <select
            id="month-filter"
            className="filter-select"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filtrer efter måned"
          >
            <option value="all">Alle måneder</option>
            {MONTHS.map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className="filter-group">
            <button
              className="btn btn-secondary btn-clear-filters"
              onClick={clearFilters}
              aria-label="Ryd filtre"
              title={`Ryd filtre (${filterCount} skjult${filterCount !== 1 ? 'e' : ''})`}
            >
              ✖ Ryd filtre
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <div className="filter-status">
            Viser {filteredExpenses.length} af {expenses.length} udgifter
          </div>
        )}
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
          {sortedExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              isSelected={selectedExpenses.includes(expense.id)}
              onToggleSelection={onToggleSelection}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onClone={handleClone}
              readOnly={readOnly}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
