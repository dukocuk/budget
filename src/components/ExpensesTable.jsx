/**
 * Expenses table component with inline editing
 */

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

  return (
    <div className="table-container">
      <table className="expenses-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Vælg alle udgifter"
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
          {expenses.map(expense => (
            <tr key={expense.id}>
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
