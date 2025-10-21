/**
 * Monthly overview table component
 */

import { useState, useMemo } from 'react';
import { MONTHS } from '../utils/constants';
import { getMonthlyAmount, calculateAnnualAmount } from '../utils/calculations';
import './MonthlyOverview.css';

export const MonthlyOverview = ({ expenses, totalAnnual }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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

  return (
    <section className="monthly-view">
      <h2>📅 Månedlig oversigt</h2>
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
            {sortedExpenses.map(expense => {
              let total = 0;
              return (
                <tr key={expense.id}>
                  <td className="expense-name">{expense.name}</td>
                  {MONTHS.map((_, index) => {
                    const amount = getMonthlyAmount(expense, index + 1);
                    total += amount;
                    return (
                      <td key={index}>
                        {amount > 0 ? amount.toLocaleString('da-DK') : '-'}
                      </td>
                    );
                  })}
                  <td className="total-cell">
                    {total.toLocaleString('da-DK')}
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td className="expense-name">TOTAL</td>
              {MONTHS.map((_, index) => {
                let monthTotal = 0;
                expenses.forEach(expense => {
                  monthTotal += getMonthlyAmount(expense, index + 1);
                });
                return (
                  <td key={index}>{monthTotal.toLocaleString('da-DK')}</td>
                );
              })}
              <td className="total-cell">
                {totalAnnual.toLocaleString('da-DK')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
