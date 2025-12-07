import React from 'react';
import './MonthlyCard.css';

/**
 * Mobile-optimized card component for displaying monthly expense breakdown
 *
 * Displays monthly totals and individual expense amounts in a
 * touch-friendly card format optimized for mobile screens (< 768px).
 *
 * @param {Object} props - Component props
 * @param {string} props.month - Month name (Jan, Feb, etc.)
 * @param {number} props.monthIndex - Month index (0-11)
 * @param {Array} props.expenses - Array of expense objects
 * @param {number} props.total - Total expenses for this month
 * @param {boolean} props.isExpanded - Whether card is expanded to show details
 * @param {Function} props.onToggle - Callback when card is tapped to expand/collapse
 */
const MonthlyCard = ({
  month,
  monthIndex,
  expenses,
  total,
  isExpanded,
  onToggle,
}) => {
  // Format amount for display (Danish locale)
  const formatAmount = amount => {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter expenses that are active in this month
  const activeExpenses = expenses.filter(expense => {
    const { startMonth, endMonth, frequency } = expense;
    const month = monthIndex + 1; // Convert 0-based to 1-based

    // Check if month is within range
    if (month < startMonth || month > endMonth) {
      return false;
    }

    // Check frequency
    if (frequency === 'yearly' && month !== startMonth) {
      return false;
    }
    if (frequency === 'quarterly' && ![1, 4, 7, 10].includes(month)) {
      return false;
    }

    return true;
  });

  return (
    <div
      className={`monthly-card ${isExpanded ? 'expanded' : ''}`}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Card header */}
      <div className="monthly-card-header">
        <div className="month-info">
          <h3 className="month-name">{month}</h3>
          <span className="expense-count">
            {activeExpenses.length}{' '}
            {activeExpenses.length === 1 ? 'udgift' : 'udgifter'}
          </span>
        </div>
        <div className="month-total">{formatAmount(total)}</div>
        <div className="expand-indicator" aria-hidden="true">
          {isExpanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && activeExpenses.length > 0 && (
        <div className="monthly-card-details">
          {activeExpenses.map(expense => (
            <div key={expense.id} className="expense-detail-row">
              <span className="expense-detail-name">{expense.name}</span>
              <span className="expense-detail-amount">
                {formatAmount(expense.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when expanded */}
      {isExpanded && activeExpenses.length === 0 && (
        <div className="monthly-card-empty">
          <p>Ingen udgifter denne måned</p>
        </div>
      )}
    </div>
  );
};

export default MonthlyCard;
