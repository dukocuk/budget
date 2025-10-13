import React from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useSettings } from '../hooks/useSettings'
import { calculateSummary, calculateMonthlyTotals, calculateBalanceProjection, groupExpensesByFrequency } from '../utils/calculations'
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import './Dashboard.css'

const COLORS = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export default function Dashboard({ userId }) {
  const { expenses, loading: expensesLoading } = useExpenses(userId)
  const { settings, loading: settingsLoading } = useSettings(userId)

  // Use monthlyPayments array if available, otherwise fallback to single monthlyPayment
  const paymentValue = settings.monthlyPayments || settings.monthlyPayment

  // Memoize expensive calculations
  const summary = React.useMemo(
    () => calculateSummary(expenses, paymentValue, settings.previousBalance),
    [expenses, paymentValue, settings.previousBalance]
  )

  const monthlyTotals = React.useMemo(
    () => calculateMonthlyTotals(expenses),
    [expenses]
  )

  const balanceProjection = React.useMemo(
    () => calculateBalanceProjection(expenses, paymentValue, settings.previousBalance),
    [expenses, paymentValue, settings.previousBalance]
  )

  const expensesByFrequency = React.useMemo(
    () => groupExpensesByFrequency(expenses),
    [expenses]
  )

  // Prepare data for charts (memoized)
  // Handle variable monthly payments: use array if available, otherwise use fixed value
  const monthlyData = React.useMemo(
    () => {
      const payments = Array.isArray(paymentValue)
        ? paymentValue
        : Array(12).fill(paymentValue)

      return months.map((month, index) => ({
        name: month,
        udgifter: monthlyTotals[index],
        indbetaling: payments[index] || 0
      }))
    },
    [monthlyTotals, paymentValue]
  )

  const balanceData = React.useMemo(
    () => balanceProjection.map(item => ({
      name: months[item.month - 1],
      balance: item.balance
    })),
    [balanceProjection]
  )

  if (expensesLoading || settingsLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Indlæser oversigt...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Årlige udgifter</h3>
          <div className="value">{summary.totalAnnual.toLocaleString('da-DK')} kr.</div>
        </div>
        <div className="summary-card">
          <h3>Gennemsnitlig månedlig udgift</h3>
          <div className="value">{summary.avgMonthly.toLocaleString('da-DK')} kr.</div>
        </div>
        <div className="summary-card">
          <h3>Månedlig balance</h3>
          <div className={`value ${summary.monthlyBalance >= 0 ? 'positive' : 'negative'}`}>
            {summary.monthlyBalance >= 0 ? '+' : ''}
            {summary.monthlyBalance.toLocaleString('da-DK')} kr.
          </div>
        </div>
        <div className="summary-card">
          <h3>Årlig reserve</h3>
          <div className={`value ${summary.annualReserve >= 0 ? 'positive' : 'negative'}`}>
            {summary.annualReserve.toLocaleString('da-DK')} kr.
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Expense Distribution Pie Chart */}
        {expensesByFrequency.length > 0 && (
          <div className="chart-card">
            <h3>Udgifter efter frekvens</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByFrequency}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByFrequency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString('da-DK')} kr.`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Spending Bar Chart */}
        <div className="chart-card">
          <h3>Månedlige udgifter vs. indbetaling</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString('da-DK')} kr.`} />
              <Legend />
              <Bar dataKey="udgifter" fill="#ef4444" name="Udgifter" />
              <Bar dataKey="indbetaling" fill="#10b981" name="Indbetaling" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Balance Projection Line Chart */}
        <div className="chart-card chart-full-width">
          <h3>Balance prognose over året</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString('da-DK')} kr.`} />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#667eea" strokeWidth={2} name="Balance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h3>Hurtig statistik</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Antal udgifter</span>
            <span className="stat-value">{expenses.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Månedlige udgifter</span>
            <span className="stat-value">
              {expenses.filter(e => e.frequency === 'monthly').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Kvartalsvise udgifter</span>
            <span className="stat-value">
              {expenses.filter(e => e.frequency === 'quarterly').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Årlige udgifter</span>
            <span className="stat-value">
              {expenses.filter(e => e.frequency === 'yearly').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
