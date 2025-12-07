import React from 'react';
import './ExpenseCard.css';

/**
 * Mobile-optimized card component for displaying individual expenses
 *
 * Displays expense information in a touch-friendly card format
 * optimized for mobile screens (< 768px).
 *
 * @param {Object} props - Component props
 * @param {Object} props.expense - Expense object
 * @param {string} props.expense.id - Unique expense ID
 * @param {string} props.expense.name - Expense name
 * @param {number} props.expense.amount - Expense amount
 * @param {string} props.expense.frequency - 'monthly', 'quarterly', or 'yearly'
 * @param {number} props.expense.startMonth - Start month (1-12)
 * @param {number} props.expense.endMonth - End month (1-12)
 * @param {boolean} props.isSelected - Whether card is selected
 * @param {Function} props.onSelect - Callback when card is selected/deselected
 * @param {Function} props.onEdit - Callback when edit button is clicked
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {Function} props.onClone - Callback when clone button is clicked
 */
const ExpenseCard = ({
  expense,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onClone,
}) => {
  const { id, name, amount, frequency, startMonth, endMonth } = expense;

  // Format amount for display (Danish locale)
  const formattedAmount = new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Format frequency for display
  const frequencyLabels = {
    monthly: 'Månedlig',
    quarterly: 'Kvartalsvis',
    yearly: 'Årlig',
  };
  const frequencyLabel = frequencyLabels[frequency] || frequency;

  // Format month range
  const monthNames = [
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
  const monthRange =
    startMonth === endMonth
      ? monthNames[startMonth - 1]
      : `${monthNames[startMonth - 1]} - ${monthNames[endMonth - 1]}`;

  return (
    <div
      className={`expense-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(id)}
      role="article"
      aria-selected={isSelected}
    >
      {/* Selection indicator */}
      <div className="card-selection-indicator" aria-hidden="true">
        <div className="selection-checkbox">
          {isSelected && <span className="checkmark">✓</span>}
        </div>
      </div>

      {/* Main content */}
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{name}</h3>
          <div className="card-amount">{formattedAmount}</div>
        </div>

        <div className="card-meta">
          <span className={`card-frequency frequency-${frequency}`}>
            {frequencyLabel}
          </span>
          <span className="card-divider">•</span>
          <span className="card-months">{monthRange}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card-actions">
        <button
          className="card-action-btn btn-edit"
          onClick={e => {
            e.stopPropagation();
            onEdit(expense);
          }}
          aria-label={`Rediger ${name}`}
          title="Rediger"
        >
          <span className="btn-icon">✏️</span>
        </button>
        <button
          className="card-action-btn btn-clone"
          onClick={e => {
            e.stopPropagation();
            onClone(expense);
          }}
          aria-label={`Klon ${name}`}
          title="Klon"
        >
          <span className="btn-icon">📋</span>
        </button>
        <button
          className="card-action-btn btn-delete"
          onClick={e => {
            e.stopPropagation();
            onDelete(id);
          }}
          aria-label={`Slet ${name}`}
          title="Slet"
        >
          <span className="btn-icon">🗑️</span>
        </button>
      </div>
    </div>
  );
};

export default ExpenseCard;
