/**
 * Year Comparison Utilities
 * Functions for comparing budget data across multiple years
 */

import { calculateSummary, calculateMonthlyTotals } from './calculations';

/**
 * Compare two budget periods and calculate differences
 * @param {Object} period1 - First budget period with expenses
 * @param {Object} period2 - Second budget period with expenses
 * @returns {Object} Comparison metrics
 */
export function comparePeriods(period1, period2) {
  if (!period1 || !period2) {
    return null;
  }

  // Calculate summaries for both periods
  const summary1 = calculateSummary(
    period1.expenses,
    period1.monthlyPayments || period1.monthlyPayment,
    period1.previousBalance
  );
  const summary2 = calculateSummary(
    period2.expenses,
    period2.monthlyPayments || period2.monthlyPayment,
    period2.previousBalance
  );

  // Calculate differences
  const totalAnnualDiff = summary2.totalAnnual - summary1.totalAnnual;
  const avgMonthlyDiff = summary2.avgMonthly - summary1.avgMonthly;
  const monthlyBalanceDiff = summary2.monthlyBalance - summary1.monthlyBalance;
  const annualReserveDiff = summary2.annualReserve - summary1.annualReserve;

  // Calculate percentage changes (handle division by zero)
  const totalAnnualChange =
    summary1.totalAnnual !== 0
      ? (totalAnnualDiff / summary1.totalAnnual) * 100
      : 0;
  const avgMonthlyChange =
    summary1.avgMonthly !== 0
      ? (avgMonthlyDiff / summary1.avgMonthly) * 100
      : 0;
  const monthlyBalanceChange =
    summary1.monthlyBalance !== 0
      ? (monthlyBalanceDiff / Math.abs(summary1.monthlyBalance)) * 100
      : 0;
  const annualReserveChange =
    summary1.annualReserve !== 0
      ? (annualReserveDiff / Math.abs(summary1.annualReserve)) * 100
      : 0;

  return {
    period1: {
      year: period1.year,
      summary: summary1,
      expenseCount: period1.expenses.length,
    },
    period2: {
      year: period2.year,
      summary: summary2,
      expenseCount: period2.expenses.length,
    },
    differences: {
      totalAnnual: totalAnnualDiff,
      avgMonthly: avgMonthlyDiff,
      monthlyBalance: monthlyBalanceDiff,
      annualReserve: annualReserveDiff,
    },
    percentageChanges: {
      totalAnnual: totalAnnualChange,
      avgMonthly: avgMonthlyChange,
      monthlyBalance: monthlyBalanceChange,
      annualReserve: annualReserveChange,
    },
    expenseCountChange: period2.expenses.length - period1.expenses.length,
  };
}

/**
 * Compare monthly totals between two periods
 * @param {Array} expenses1 - Expenses from first period
 * @param {Array} expenses2 - Expenses from second period
 * @returns {Array} Monthly comparison data for all 12 months
 */
export function compareMonthlyTotals(expenses1, expenses2) {
  const monthly1 = calculateMonthlyTotals(expenses1);
  const monthly2 = calculateMonthlyTotals(expenses2);

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Maj',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Okt',
    'Nov',
    'Dec',
  ];

  return monthly1.map((amount1, index) => ({
    month: months[index],
    period1: amount1,
    period2: monthly2[index],
    difference: monthly2[index] - amount1,
    percentageChange:
      amount1 !== 0 ? ((monthly2[index] - amount1) / amount1) * 100 : 0,
  }));
}

/**
 * Find expenses that exist in one period but not the other
 * @param {Array} expenses1 - Expenses from first period
 * @param {Array} expenses2 - Expenses from second period
 * @returns {Object} Added and removed expenses
 */
export function compareExpenses(expenses1, expenses2) {
  const names1 = new Set(expenses1.map(e => e.name.toLowerCase()));
  const names2 = new Set(expenses2.map(e => e.name.toLowerCase()));

  // Find expenses added in period 2
  const added = expenses2.filter(e => !names1.has(e.name.toLowerCase()));

  // Find expenses removed from period 1
  const removed = expenses1.filter(e => !names2.has(e.name.toLowerCase()));

  // Find expenses that exist in both but with changed amounts
  const modified = expenses2
    .filter(e2 => {
      const e1 = expenses1.find(
        e => e.name.toLowerCase() === e2.name.toLowerCase()
      );
      return e1 && (e1.amount !== e2.amount || e1.frequency !== e2.frequency);
    })
    .map(e2 => {
      const e1 = expenses1.find(
        e => e.name.toLowerCase() === e2.name.toLowerCase()
      );
      return {
        name: e2.name,
        oldAmount: e1.amount,
        newAmount: e2.amount,
        oldFrequency: e1.frequency,
        newFrequency: e2.frequency,
        amountChange: e2.amount - e1.amount,
        percentageChange:
          e1.amount !== 0 ? ((e2.amount - e1.amount) / e1.amount) * 100 : 0,
      };
    });

  return {
    added,
    removed,
    modified,
    addedCount: added.length,
    removedCount: removed.length,
    modifiedCount: modified.length,
  };
}

/**
 * Compare multiple years and generate trend data
 * @param {Array} periods - Array of budget periods sorted by year (ascending)
 * @returns {Array} Trend data for visualization
 */
export function calculateYearlyTrends(periods) {
  if (!periods || periods.length === 0) {
    return [];
  }

  // Sort periods by year ascending
  const sortedPeriods = [...periods].sort((a, b) => a.year - b.year);

  return sortedPeriods.map(period => {
    const summary = calculateSummary(
      period.expenses,
      period.monthlyPayments || period.monthlyPayment,
      period.previousBalance
    );

    return {
      year: period.year,
      totalAnnual: summary.totalAnnual,
      avgMonthly: summary.avgMonthly,
      monthlyBalance: summary.monthlyBalance,
      annualReserve: summary.annualReserve,
      expenseCount: period.expenses.length,
      monthlyPayment: period.monthlyPayments
        ? period.monthlyPayments.reduce((sum, val) => sum + val, 0) / 12
        : period.monthlyPayment,
    };
  });
}

/**
 * Calculate year-over-year growth rate
 * @param {number} oldValue - Previous year value
 * @param {number} newValue - Current year value
 * @returns {number} Growth rate as percentage
 */
export function calculateGrowthRate(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Format comparison value with sign and color indication
 * @param {number} value - Value to format
 * @param {boolean} higherIsBetter - Whether higher values are positive
 * @returns {Object} Formatted value with metadata
 */
export function formatComparisonValue(value, higherIsBetter = true) {
  const isPositive = higherIsBetter ? value >= 0 : value <= 0;
  const sign = value > 0 ? '+' : '';
  const color = isPositive ? 'success' : 'error';
  const icon = isPositive ? '📈' : '📉';

  return {
    value,
    formatted: `${sign}${value.toFixed(2)}`,
    color,
    icon,
    isPositive,
  };
}

/**
 * Generate comparison summary text
 * @param {Object} comparison - Comparison object from comparePeriods
 * @returns {string} Human-readable summary
 */
export function generateComparisonSummary(comparison) {
  if (!comparison) return 'Ingen sammenligning tilgængelig';

  const { period1, period2, percentageChanges } = comparison;
  const totalChange = percentageChanges.totalAnnual;
  const direction = totalChange > 0 ? 'steget' : 'faldet';
  const absChange = Math.abs(totalChange).toFixed(1);

  return `Dine årlige udgifter er ${direction} med ${absChange}% fra ${period1.year} til ${period2.year}.`;
}
