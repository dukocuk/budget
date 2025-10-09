/**
 * Monthly overview table component
 */

import { MONTHS } from '../utils/constants'
import { getMonthlyAmount } from '../utils/calculations'
import './MonthlyOverview.css'

export const MonthlyOverview = ({ expenses, totalAnnual }) => {
  return (
    <section className="monthly-view">
      <h2>📅 Månedlig oversigt</h2>
      <div className="table-container">
        <table className="monthly-table">
          <thead>
            <tr>
              <th>Udgift</th>
              {MONTHS.map(month => (
                <th key={month}>{month}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(expense => {
              let total = 0
              return (
                <tr key={expense.id}>
                  <td className="expense-name">{expense.name}</td>
                  {MONTHS.map((_, index) => {
                    const amount = getMonthlyAmount(expense, index + 1)
                    total += amount
                    return (
                      <td key={index}>
                        {amount > 0 ? amount.toLocaleString('da-DK') : '-'}
                      </td>
                    )
                  })}
                  <td className="total-cell">
                    {total.toLocaleString('da-DK')}
                  </td>
                </tr>
              )
            })}
            <tr className="total-row">
              <td className="expense-name">TOTAL</td>
              {MONTHS.map((_, index) => {
                let monthTotal = 0
                expenses.forEach(expense => {
                  monthTotal += getMonthlyAmount(expense, index + 1)
                })
                return (
                  <td key={index}>
                    {monthTotal.toLocaleString('da-DK')}
                  </td>
                )
              })}
              <td className="total-cell">
                {totalAnnual.toLocaleString('da-DK')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
