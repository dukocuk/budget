import React, { useState, useEffect } from 'react';
import { useViewportSize } from '../hooks/useViewportSize';
import {
  calculateSummary,
  calculateMonthlyTotals,
  calculateBalanceProjection,
  groupExpensesByFrequency,
} from '../utils/calculations';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CHART_COLORS, MONTHS } from '../utils/constants';
import './Dashboard.css';

function Dashboard({
  userId,
  periodId,
  monthlyPayment,
  previousBalance,
  monthlyPayments,
  expenses = [],
}) {
  // Expenses passed as prop from App.jsx - no async loading needed
  const expensesLoading = false;
  const { width } = useViewportSize();
  const isMobile = width < 768;

  // Use props directly instead of loading from database
  const settings = {
    monthlyPayment,
    previousBalance,
    monthlyPayments,
  };
  const settingsLoading = false; // No async loading needed

  // Use monthlyPayments array if available, otherwise fallback to single monthlyPayment
  const paymentValue = settings.monthlyPayments || settings.monthlyPayment;

  // Collapsible sections state with localStorage persistence
  const [expandedSections, setExpandedSections] = useState(() => {
    const saved = localStorage.getItem('dashboardChartVisibility');
    return saved
      ? JSON.parse(saved)
      : {
          summary: true, // Summary cards - visible by default
          pieChart: false, // Udgiftsfordeling - collapsed by default
          barChart: false, // Månedlig sammenligning - collapsed by default
          lineChart: false, // Balance udvikling - collapsed by default
          quickStats: false, // Udgiftsoversigt - collapsed by default
        };
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(
      'dashboardChartVisibility',
      JSON.stringify(expandedSections)
    );
  }, [expandedSections]);

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Memoize expensive calculations
  const summary = React.useMemo(
    () => calculateSummary(expenses, paymentValue, settings.previousBalance),
    [expenses, paymentValue, settings.previousBalance]
  );

  const monthlyTotals = React.useMemo(
    () => calculateMonthlyTotals(expenses),
    [expenses]
  );

  const balanceProjection = React.useMemo(
    () =>
      calculateBalanceProjection(
        expenses,
        paymentValue,
        settings.previousBalance
      ),
    [expenses, paymentValue, settings.previousBalance]
  );

  const expensesByFrequency = React.useMemo(
    () => groupExpensesByFrequency(expenses),
    [expenses]
  );

  // Prepare data for charts (memoized)
  // Handle variable monthly payments: use array if available, otherwise use fixed value
  const monthlyData = React.useMemo(() => {
    const payments = Array.isArray(paymentValue)
      ? paymentValue
      : Array(12).fill(paymentValue);

    return MONTHS.map((month, index) => ({
      name: month,
      udgifter: monthlyTotals[index],
      indbetaling: payments[index] || 0,
    }));
  }, [monthlyTotals, paymentValue]);

  const balanceData = React.useMemo(
    () =>
      balanceProjection.map(item => ({
        name: MONTHS[item.month - 1],
        balance: item.balance,
      })),
    [balanceProjection]
  );

  if (expensesLoading || settingsLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Indlæser oversigt...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Summary Cards - Collapsible on Mobile */}
      {isMobile && (
        <button
          className="chart-toggle"
          onClick={() => toggleSection('summary')}
        >
          {expandedSections.summary ? '🔽' : '▶️'} Oversigt
        </button>
      )}
      {(!isMobile || expandedSections.summary) && (
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Årlige udgifter</h3>
            <div className="value">
              {summary.totalAnnual.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Gennemsnitlig månedlig udgift</h3>
            <div className="value">
              {summary.avgMonthly.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Månedlig balance</h3>
            <div
              className={`value ${summary.monthlyBalance >= 0 ? 'positive' : 'negative'}`}
            >
              {summary.monthlyBalance >= 0 ? '+' : ''}
              {summary.monthlyBalance.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Årlig reserve</h3>
            <div
              className={`value ${summary.annualReserve >= 0 ? 'positive' : 'negative'}`}
            >
              {summary.annualReserve.toLocaleString('da-DK')} kr.
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats - Collapsible on Mobile */}
      {isMobile && (
        <button
          className="chart-toggle"
          onClick={() => toggleSection('quickStats')}
        >
          {expandedSections.quickStats ? '🔽' : '▶️'} Statistik
        </button>
      )}
      {(!isMobile || expandedSections.quickStats) && (
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
      )}

      {/* Charts */}
      <div className="charts-grid">
        {/* Expense Distribution Pie Chart - Collapsible on Mobile */}
        {expensesByFrequency.length > 0 && (
          <>
            {isMobile && (
              <button
                className="chart-toggle"
                onClick={() => toggleSection('pieChart')}
              >
                {expandedSections.pieChart ? '🔽' : '▶️'} Udgiftsfordeling
              </button>
            )}
            {(!isMobile || expandedSections.pieChart) && (
              <div className="chart-card">
                <h3>Udgifter efter frekvens</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByFrequency}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByFrequency.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={value =>
                        `${value.toLocaleString('da-DK')} kr.`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Monthly Spending Bar Chart - Collapsible on Mobile */}
        {isMobile && (
          <button
            className="chart-toggle"
            onClick={() => toggleSection('barChart')}
          >
            {expandedSections.barChart ? '🔽' : '▶️'} Månedlig sammenligning
          </button>
        )}
        {(!isMobile || expandedSections.barChart) && (
          <div className="chart-card">
            <h3>Månedlige udgifter vs. indbetaling</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={value => `${value.toLocaleString('da-DK')} kr.`}
                />
                <Legend />
                <Bar dataKey="udgifter" fill="#ef4444" name="Udgifter" />
                <Bar dataKey="indbetaling" fill="#10b981" name="Indbetaling" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Balance Projection Line Chart - Collapsible on Mobile */}
        {isMobile && (
          <button
            className="chart-toggle"
            onClick={() => toggleSection('lineChart')}
          >
            {expandedSections.lineChart ? '🔽' : '▶️'} Balance udvikling
          </button>
        )}
        {(!isMobile || expandedSections.lineChart) && (
          <div className="chart-card chart-full-width">
            <h3>Balance prognose over året</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={value => `${value.toLocaleString('da-DK')} kr.`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#667eea"
                  strokeWidth={2}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize Dashboard to prevent re-renders when props haven't changed
// This significantly reduces chart re-renders on mobile orientation changes
export default React.memo(Dashboard, (prevProps, nextProps) => {
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.periodId === nextProps.periodId &&
    prevProps.monthlyPayment === nextProps.monthlyPayment &&
    prevProps.previousBalance === nextProps.previousBalance &&
    prevProps.expenses === nextProps.expenses &&
    JSON.stringify(prevProps.monthlyPayments) ===
      JSON.stringify(nextProps.monthlyPayments)
  );
});
