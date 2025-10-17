/**
 * Year Comparison Charts Component
 * Visual charts for comparing budget data between years
 */

import React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { compareMonthlyTotals } from '../utils/yearComparison'

export function YearComparisonCharts({ period1, period2, comparison }) {
  // Monthly comparison data
  const monthlyComparison = React.useMemo(() => {
    return compareMonthlyTotals(period1.expenses, period2.expenses)
  }, [period1.expenses, period2.expenses])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString('da-DK')} kr.
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="comparison-charts-section">
      <h3>📈 Visuelle sammenligninger</h3>

      <div className="charts-grid">
        {/* Monthly Expenses Comparison - Bar Chart */}
        <div className="chart-container">
          <h4>Månedlige udgifter sammenligning</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="period1"
                fill="#667eea"
                name={`${period1.year}`}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="period2"
                fill="#10b981"
                name={`${period2.year}`}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note">
            💡 Sammenlign månedlige udgifter mellem {period1.year} og {period2.year}
          </p>
        </div>

        {/* Monthly Difference Trend - Line Chart */}
        <div className="chart-container">
          <h4>Månedlig forskel trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="difference"
                stroke="#ef4444"
                strokeWidth={2}
                name="Forskel"
                dot={{ fill: '#ef4444', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="period1"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="5 5"
                name={`${period1.year} (reference)`}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-note">
            💡 Positiv værdi = højere udgifter i {period2.year}, negativ = lavere
          </p>
        </div>

        {/* Summary Metrics Comparison - Horizontal Bar */}
        <div className="chart-container full-width">
          <h4>Årlig oversigt sammenligning</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              layout="vertical"
              data={[
                {
                  metric: 'Årlige udgifter',
                  [period1.year]: comparison.period1.summary.totalAnnual,
                  [period2.year]: comparison.period2.summary.totalAnnual
                },
                {
                  metric: 'Gns. månedlig',
                  [period1.year]: comparison.period1.summary.avgMonthly,
                  [period2.year]: comparison.period2.summary.avgMonthly
                },
                {
                  metric: 'Månedlig balance',
                  [period1.year]: comparison.period1.summary.monthlyBalance,
                  [period2.year]: comparison.period2.summary.monthlyBalance
                }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis type="category" dataKey="metric" width={150} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey={period1.year}
                fill="#667eea"
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey={period2.year}
                fill="#10b981"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-note">
            💡 Side-by-side sammenligning af nøgletal mellem årene
          </p>
        </div>
      </div>
    </div>
  )
}
