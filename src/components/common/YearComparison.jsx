/**
 * Year Comparison Component
 * Comprehensive multi-year budget comparison with charts and insights
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { YearComparisonCharts } from '../charts/YearComparisonCharts';
import {
  comparePeriods,
  compareExpenses,
  calculateYearlyTrends,
  generateComparisonSummary,
  formatComparisonValue,
} from '../../utils/yearComparison';
import { logger } from '../../utils/logger';
import './YearComparison.css';

export default function YearComparison({
  periods,
  activePeriod,
  getExpensesForPeriod,
}) {
  const [selectedYear1, setSelectedYear1] = useState('');
  const [selectedYear2, setSelectedYear2] = useState('');
  const [period1Data, setPeriod1Data] = useState(null);
  const [period2Data, setPeriod2Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasAutoSelected = useRef(false);

  // Sort periods by year descending for dropdown
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => b.year - a.year);
  }, [periods]);

  // Auto-select the two most recent years (only once, prevents circular dependency)
  useEffect(() => {
    if (hasAutoSelected.current) return;

    if (sortedPeriods.length >= 2) {
      setSelectedYear1(sortedPeriods[0].id); // Most recent
      setSelectedYear2(sortedPeriods[1].id); // Second most recent
      hasAutoSelected.current = true;
    } else if (sortedPeriods.length === 1) {
      setSelectedYear1(sortedPeriods[0].id);
      hasAutoSelected.current = true;
    }
  }, [sortedPeriods]);

  // Load expenses for selected periods
  useEffect(() => {
    const loadPeriodData = async () => {
      if (!selectedYear1 && !selectedYear2) return;

      setLoading(true);
      try {
        const data1 = selectedYear1
          ? await getExpensesForPeriod(selectedYear1)
          : null;
        const data2 = selectedYear2
          ? await getExpensesForPeriod(selectedYear2)
          : null;

        setPeriod1Data(data1);
        setPeriod2Data(data2);
      } catch (error) {
        logger.error('Error loading period data:', error);
      }
      setLoading(false);
    };

    loadPeriodData();
  }, [selectedYear1, selectedYear2, getExpensesForPeriod]);

  // Calculate comparison data
  const comparison = useMemo(() => {
    if (!period1Data || !period2Data) return null;
    return comparePeriods(period1Data, period2Data);
  }, [period1Data, period2Data]);

  const expenseComparison = useMemo(() => {
    if (!period1Data || !period2Data) return null;
    return compareExpenses(period1Data.expenses, period2Data.expenses);
  }, [period1Data, period2Data]);

  // Reserved for future trend visualization
  const _TrendData = useMemo(() => {
    const periodsWithExpenses = periods.map(p => ({
      ...p,
      expenses: [], // Will be populated by parent if needed
    }));
    return calculateYearlyTrends(periodsWithExpenses);
  }, [periods]);

  // Handle period selection changes
  const handleYear1Change = e => {
    setSelectedYear1(e.target.value);
  };

  const handleYear2Change = e => {
    setSelectedYear2(e.target.value);
  };

  // Swap years
  const handleSwapYears = () => {
    const temp = selectedYear1;
    setSelectedYear1(selectedYear2);
    setSelectedYear2(temp);
  };

  if (periods.length === 0) {
    return (
      <div className="year-comparison-empty">
        <div className="empty-icon">📊</div>
        <h3>Ingen budgetår at sammenligne</h3>
        <p>Opret flere budgetår for at se sammenligninger.</p>
      </div>
    );
  }

  if (periods.length === 1) {
    return (
      <div className="year-comparison-empty">
        <div className="empty-icon">📊</div>
        <h3>Mindst to år kræves for sammenligning</h3>
        <p>Du har kun ét budgetår. Opret flere år for at se sammenligninger.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="year-comparison-loading">
        <div className="spinner"></div>
        <p>Indlæser sammenligningsdata...</p>
      </div>
    );
  }

  return (
    <div className="year-comparison">
      <div className="year-comparison-header">
        <h2>📊 År-til-år sammenligning</h2>
        <p className="year-comparison-description">
          Sammenlign budgetår for at se trends og ændringer i dine udgifter over
          tid.
        </p>
      </div>

      {/* Year Selection */}
      <div className="year-selector-container">
        <div className="year-selector-group">
          <label htmlFor="year1Select">År 1:</label>
          <select
            id="year1Select"
            value={selectedYear1}
            onChange={handleYear1Change}
            className="year-select"
          >
            <option value="">-- Vælg år --</option>
            {sortedPeriods.map(period => (
              <option key={period.id} value={period.id}>
                {period.year}{' '}
                {period.status === 'archived'
                  ? '(Arkiveret)'
                  : activePeriod?.id === period.id
                    ? '(Aktiv)'
                    : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-swap-years"
          onClick={handleSwapYears}
          disabled={!selectedYear1 || !selectedYear2}
          title="Byt år"
          aria-label="Byt år 1 og år 2"
        >
          ⇄
        </button>

        <div className="year-selector-group">
          <label htmlFor="year2Select">År 2:</label>
          <select
            id="year2Select"
            value={selectedYear2}
            onChange={handleYear2Change}
            className="year-select"
          >
            <option value="">-- Vælg år --</option>
            {sortedPeriods.map(period => (
              <option key={period.id} value={period.id}>
                {period.year}{' '}
                {period.status === 'archived'
                  ? '(Arkiveret)'
                  : activePeriod?.id === period.id
                    ? '(Aktiv)'
                    : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Content */}
      {comparison && (
        <>
          {/* Summary Banner */}
          <div className="comparison-summary-banner">
            <div className="summary-icon">📈</div>
            <div className="summary-text">
              <strong>{generateComparisonSummary(comparison)}</strong>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="comparison-metrics-grid">
            <MetricCard
              title="Årlige udgifter"
              value1={comparison.period1.summary.totalAnnual}
              value2={comparison.period2.summary.totalAnnual}
              difference={comparison.differences.totalAnnual}
              percentage={comparison.percentageChanges.totalAnnual}
              format="currency"
              higherIsBetter={false}
            />
            <MetricCard
              title="Gns. månedlig udgift"
              value1={comparison.period1.summary.avgMonthly}
              value2={comparison.period2.summary.avgMonthly}
              difference={comparison.differences.avgMonthly}
              percentage={comparison.percentageChanges.avgMonthly}
              format="currency"
              higherIsBetter={false}
            />
            <MetricCard
              title="Månedlig balance"
              value1={comparison.period1.summary.monthlyBalance}
              value2={comparison.period2.summary.monthlyBalance}
              difference={comparison.differences.monthlyBalance}
              percentage={comparison.percentageChanges.monthlyBalance}
              format="currency"
              higherIsBetter={true}
            />
            <MetricCard
              title="Årlig reserve"
              value1={comparison.period1.summary.annualReserve}
              value2={comparison.period2.summary.annualReserve}
              difference={comparison.differences.annualReserve}
              percentage={comparison.percentageChanges.annualReserve}
              format="currency"
              higherIsBetter={true}
            />
          </div>

          {/* Charts Section */}
          {period1Data && period2Data && (
            <YearComparisonCharts
              period1={period1Data}
              period2={period2Data}
              comparison={comparison}
            />
          )}

          {/* Expense Changes Section */}
          {expenseComparison && (
            <div className="expense-changes-section">
              <h3>📋 Udgiftsændringer</h3>

              <div className="expense-changes-grid">
                {/* Added Expenses */}
                {expenseComparison.addedCount > 0 && (
                  <div className="expense-change-card added">
                    <div className="change-header">
                      <span className="change-icon">➕</span>
                      <h4>Tilføjet ({expenseComparison.addedCount})</h4>
                    </div>
                    <ul className="expense-list">
                      {expenseComparison.added
                        .slice(0, 5)
                        .map((expense, index) => (
                          <li key={index}>
                            <span className="expense-name">{expense.name}</span>
                            <span className="expense-amount">
                              {expense.amount.toLocaleString('da-DK')} kr. (
                              {expense.frequency})
                            </span>
                          </li>
                        ))}
                      {expenseComparison.addedCount > 5 && (
                        <li className="more-items">
                          +{expenseComparison.addedCount - 5} mere
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Removed Expenses */}
                {expenseComparison.removedCount > 0 && (
                  <div className="expense-change-card removed">
                    <div className="change-header">
                      <span className="change-icon">➖</span>
                      <h4>Fjernet ({expenseComparison.removedCount})</h4>
                    </div>
                    <ul className="expense-list">
                      {expenseComparison.removed
                        .slice(0, 5)
                        .map((expense, index) => (
                          <li key={index}>
                            <span className="expense-name">{expense.name}</span>
                            <span className="expense-amount">
                              {expense.amount.toLocaleString('da-DK')} kr. (
                              {expense.frequency})
                            </span>
                          </li>
                        ))}
                      {expenseComparison.removedCount > 5 && (
                        <li className="more-items">
                          +{expenseComparison.removedCount - 5} mere
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Modified Expenses */}
                {expenseComparison.modifiedCount > 0 && (
                  <div className="expense-change-card modified">
                    <div className="change-header">
                      <span className="change-icon">✏️</span>
                      <h4>Ændret ({expenseComparison.modifiedCount})</h4>
                    </div>
                    <ul className="expense-list">
                      {expenseComparison.modified
                        .slice(0, 5)
                        .map((expense, index) => {
                          const changeFormatted = formatComparisonValue(
                            expense.percentageChange,
                            false
                          );
                          return (
                            <li key={index}>
                              <span className="expense-name">
                                {expense.name}
                              </span>
                              <span
                                className={`expense-change ${changeFormatted.color}`}
                              >
                                {changeFormatted.icon}{' '}
                                {changeFormatted.formatted}%
                              </span>
                            </li>
                          );
                        })}
                      {expenseComparison.modifiedCount > 5 && (
                        <li className="more-items">
                          +{expenseComparison.modifiedCount - 5} mere
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* No Changes */}
                {expenseComparison.addedCount === 0 &&
                  expenseComparison.removedCount === 0 &&
                  expenseComparison.modifiedCount === 0 && (
                    <div className="no-changes">
                      <p>✅ Ingen udgiftsændringer mellem disse år.</p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * MetricCard - Display a single comparison metric
 */
function MetricCard({
  title,
  value1,
  value2,
  difference,
  percentage,
  format,
  higherIsBetter,
}) {
  const formatValue = value => {
    if (format === 'currency') {
      return `${value.toLocaleString('da-DK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} kr.`;
    }
    return value.toLocaleString('da-DK');
  };

  const formatted = formatComparisonValue(percentage, higherIsBetter);

  return (
    <div className="metric-card">
      <h4 className="metric-title">{title}</h4>
      <div className="metric-values">
        <div className="metric-value old">{formatValue(value1)}</div>
        <div className="metric-arrow">→</div>
        <div className="metric-value new">{formatValue(value2)}</div>
      </div>
      <div className={`metric-change ${formatted.color}`}>
        <span className="change-icon">{formatted.icon}</span>
        <span className="change-text">
          {formatted.formatted}% ({difference > 0 ? '+' : ''}
          {formatValue(Math.abs(difference))})
        </span>
      </div>
    </div>
  );
}
