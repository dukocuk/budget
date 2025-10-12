/**
 * ExpenseDistribution component - Stacked bar chart showing monthly expense breakdown
 * Uses Recharts to visualize monthly/quarterly/yearly expense distribution across the year
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculateMonthlyBreakdownByFrequency, groupExpensesByFrequency } from '../utils/calculations'
import './ExpenseDistribution.css'

const COLORS = {
  monthly: '#667eea',
  quarterly: '#10b981',
  yearly: '#f59e0b'
}

const LABELS = {
  monthly: 'Månedlig',
  quarterly: 'Kvartalsvis',
  yearly: 'Årlig'
}

export const ExpenseDistribution = ({ expenses }) => {
  const monthlyBreakdown = calculateMonthlyBreakdownByFrequency(expenses)
  const totalDistribution = groupExpensesByFrequency(expenses)

  // Debug logging
  console.log('🥧 ExpenseDistribution - Input:', {
    expenseCount: expenses.length,
    sampleExpense: expenses[0]
  })
  console.log('🥧 ExpenseDistribution - Monthly breakdown:', monthlyBreakdown.slice(0, 3))

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, item) => sum + (item.value || 0), 0)

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.reverse().map((entry, index) => (
            entry.value > 0 && (
              <p key={index} style={{ color: entry.fill }}>
                {LABELS[entry.dataKey]}: {entry.value.toLocaleString('da-DK')} kr.
              </p>
            )
          ))}
          <p className="tooltip-total">
            <strong>Total: {total.toLocaleString('da-DK')} kr.</strong>
          </p>
        </div>
      )
    }
    return null
  }

  if (expenses.length === 0) {
    return (
      <div className="expense-distribution-container">
        <h3 className="chart-title">📊 Månedlig udgiftsfordeling</h3>
        <p className="no-data-message">Ingen udgifter at vise</p>
      </div>
    )
  }

  return (
    <div className="expense-distribution-container">
      <h3 className="chart-title">📊 Månedlig udgiftsfordeling efter frekvens</h3>
      <p className="chart-description">
        Viser hvordan dine udgifter fordeler sig over året opdelt på betalingsfrekvens
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={monthlyBreakdown}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            stroke="#6b7280"
            style={{ fontSize: '14px', fontWeight: '500' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '14px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="rect"
            formatter={(value) => LABELS[value] || value}
          />

          <Bar
            dataKey="yearly"
            stackId="a"
            fill={COLORS.yearly}
            name="yearly"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="quarterly"
            stackId="a"
            fill={COLORS.quarterly}
            name="quarterly"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="monthly"
            stackId="a"
            fill={COLORS.monthly}
            name="monthly"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="distribution-summary">
        <h4 className="summary-title">Årlig total fordeling</h4>
        {totalDistribution.map((item) => {
          const total = totalDistribution.reduce((sum, i) => sum + i.value, 0)
          const percentage = ((item.value / total) * 100).toFixed(1)
          const colorKey = item.name === 'Månedlig' ? 'monthly' : item.name === 'Kvartalsvis' ? 'quarterly' : 'yearly'

          return (
            <div key={item.name} className="summary-item">
              <div className="summary-header">
                <span
                  className="summary-dot"
                  style={{ backgroundColor: COLORS[colorKey] }}
                ></span>
                <span className="summary-name">{item.name}</span>
              </div>
              <div className="summary-details">
                <span className="summary-amount">
                  {item.value.toLocaleString('da-DK')} kr.
                </span>
                <span className="summary-percentage">({percentage}%)</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="chart-insights">
        <p className="insight-text">
          💡 <strong>Tip:</strong> Hover over søjlerne for at se detaljeret udgiftsfordeling for hver måned
        </p>
      </div>
    </div>
  )
}
