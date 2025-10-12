/**
 * ExpenseDistribution component - Pie chart showing expense breakdown by frequency
 * Uses Recharts to visualize monthly/quarterly/yearly expense distribution
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { groupExpensesByFrequency } from '../utils/calculations'
import './ExpenseDistribution.css'

const COLORS = {
  'Månedlig': '#667eea',
  'Kvartalsvis': '#10b981',
  'Årlig': '#f59e0b'
}

export const ExpenseDistribution = ({ expenses }) => {
  const distributionData = groupExpensesByFrequency(expenses)

  // Debug logging
  console.log('🥧 ExpenseDistribution - Input:', {
    expenseCount: expenses.length,
    sampleExpense: expenses[0]
  })
  console.log('🥧 ExpenseDistribution - Calculated distribution:', distributionData)

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const total = distributionData.reduce((sum, item) => sum + item.value, 0)
      const percentage = ((data.value / total) * 100).toFixed(1)

      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p style={{ color: data.payload.fill }}>
            {data.value.toLocaleString('da-DK')} kr.
          </p>
          <p className="tooltip-percentage">{percentage}% af total</p>
        </div>
      )
    }
    return null
  }

  // Custom label for pie slices
  const renderCustomLabel = ({ percent }) => {
    return `${(percent * 100).toFixed(0)}%`
  }

  if (distributionData.length === 0) {
    return (
      <div className="expense-distribution-container">
        <h3 className="chart-title">🥧 Udgiftsfordeling</h3>
        <p className="no-data-message">Ingen udgifter at vise</p>
      </div>
    )
  }

  return (
    <div className="expense-distribution-container">
      <h3 className="chart-title">🥧 Udgiftsfordeling efter frekvens</h3>
      <p className="chart-description">
        Fordelingen af dine årlige udgifter efter betalingsfrekvens
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={distributionData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationDuration={800}
          >
            {distributionData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span style={{ color: '#374151', fontWeight: 600 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="distribution-summary">
        {distributionData.map((item) => {
          const total = distributionData.reduce((sum, i) => sum + i.value, 0)
          const percentage = ((item.value / total) * 100).toFixed(1)

          return (
            <div key={item.name} className="summary-item">
              <div className="summary-header">
                <span
                  className="summary-dot"
                  style={{ backgroundColor: COLORS[item.name] }}
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
    </div>
  )
}
