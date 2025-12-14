/**
 * Monthly overview table component
 */

import { useState, useMemo } from 'react';
import { MONTHS } from '../../utils/constants';
import {
  getMonthlyAmount,
  calculateAnnualAmount,
} from '../../utils/calculations';
import { useViewportSize } from '../../hooks/useViewportSize';
import MonthlyCard from '../cards/MonthlyCard';
import './MonthlyOverview.css';

export const MonthlyOverview = ({ expenses, totalAnnual }) => {
  // Viewport detection for responsive layout
  const { isMobile } = useViewportSize();

  // State management
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedMonths, setExpandedMonths] = useState({});

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    if (!sortConfig.key) return expenses;

    return [...expenses].sort((a, b) => {
      let aVal, bVal;

      if (sortConfig.key === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortConfig.key === 'total') {
        aVal = calculateAnnualAmount(a);
        bVal = calculateAnnualAmount(b);
      } else {
        return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [expenses, sortConfig]);

  // Memoize monthly amounts calculation (prevents 240+ recalculations per render)
  const monthlyAmounts = useMemo(() => {
    return sortedExpenses.map(expense => ({
      id: expense.id,
      name: expense.name,
      amounts: MONTHS.map((_, index) => getMonthlyAmount(expense, index + 1)),
      total: calculateAnnualAmount(expense),
    }));
  }, [sortedExpenses]);

  // Memoize column totals
  const columnTotals = useMemo(() => {
    return MONTHS.map((_, monthIndex) =>
      monthlyAmounts.reduce(
        (sum, expense) => sum + expense.amounts[monthIndex],
        0
      )
    );
  }, [monthlyAmounts]);

  // Handle column sort
  const handleSort = key => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    });
  };

  // Get sort indicator
  const getSortIndicator = key => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Toggle month expansion (mobile only)
  const toggleMonthExpansion = monthIndex => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthIndex]: !prev[monthIndex],
    }));
  };

  return (
    <section
      className={`monthly-view ${isMobile ? 'mobile-view' : 'desktop-view'}`}
    >
      <h2>📅 Månedlig oversigt</h2>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="monthly-cards-container">
          {MONTHS.map((month, monthIndex) => (
            <MonthlyCard
              key={month}
              month={month}
              monthIndex={monthIndex}
              expenses={expenses}
              total={columnTotals[monthIndex]}
              isExpanded={expandedMonths[monthIndex] || false}
              onToggle={() => toggleMonthExpansion(monthIndex)}
            />
          ))}
          {/* Annual total card */}
          <div className="annual-total-card">
            <div className="annual-total-label">Årlig total</div>
            <div className="annual-total-amount">
              {totalAnnual.toLocaleString('da-DK')} kr.
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Table View */
        <div className="table-container">
          <table className="monthly-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Udgift{getSortIndicator('name')}
                </th>
                {MONTHS.map(month => (
                  <th key={month}>{month}</th>
                ))}
                <th className="sortable" onClick={() => handleSort('total')}>
                  Total{getSortIndicator('total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyAmounts.map(expense => (
                <tr key={expense.id}>
                  <td className="expense-name">{expense.name}</td>
                  {expense.amounts.map((amount, index) => (
                    <td key={index}>
                      {amount > 0 ? amount.toLocaleString('da-DK') : '-'}
                    </td>
                  ))}
                  <td className="total-cell">
                    {expense.total.toLocaleString('da-DK')}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td className="expense-name">TOTAL</td>
                {columnTotals.map((monthTotal, index) => (
                  <td key={index}>{monthTotal.toLocaleString('da-DK')}</td>
                ))}
                <td className="total-cell">
                  {totalAnnual.toLocaleString('da-DK')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
