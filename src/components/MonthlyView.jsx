import { useExpenses } from '../hooks/useExpenses'
import { getMonthlyAmount } from '../utils/calculations'
import './MonthlyView.css'

const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export default function MonthlyView({ userId }) {
  const { expenses, loading } = useExpenses(userId)

  if (loading) {
    return <div className="loading">Indlæser månedsoversigt...</div>
  }

  // Calculate monthly totals
  const monthlyTotals = Array(12).fill(0)
  expenses.forEach(expense => {
    for (let month = 1; month <= 12; month++) {
      monthlyTotals[month - 1] += getMonthlyAmount(expense, month)
    }
  })

  return (
    <div className="monthly-view">
      <h2>📅 Månedlig oversigt</h2>

      <div className="table-container">
        <table className="monthly-table">
          <thead>
            <tr>
              <th>Udgift</th>
              {months.map(month => (
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
                  {months.map((_, index) => {
                    const amount = getMonthlyAmount(expense, index + 1)
                    total += amount
                    return (
                      <td key={index} className="amount-cell">
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
              {monthlyTotals.map((total, index) => (
                <td key={index} className="amount-cell">
                  {total.toLocaleString('da-DK')}
                </td>
              ))}
              <td className="total-cell">
                {monthlyTotals.reduce((sum, val) => sum + val, 0).toLocaleString('da-DK')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {expenses.length === 0 && (
        <div className="empty-state">
          <p>Ingen udgifter at vise. Tilføj udgifter under "Udgifter" fanen.</p>
        </div>
      )}
    </div>
  )
}
