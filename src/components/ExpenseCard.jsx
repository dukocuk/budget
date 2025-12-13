import React, { useState, useRef } from 'react';
import BottomSheet from './BottomSheet';
import './ExpenseCard.css';

/**
 * Mobile-optimized card component for displaying individual expenses
 *
 * Features:
 * - Swipe-to-reveal actions (iOS Mail pattern)
 * - Kebab menu for all actions (progressive disclosure)
 * - Touch-friendly 44px+ targets
 * - Full expense name visibility (no button overflow)
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSwiped, setIsSwiped] = useState(false);
  const swipeStartX = useRef(0);
  const swipeCurrentX = useRef(0);
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

  // Swipe gesture handlers
  const handleTouchStart = e => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = e => {
    swipeCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = swipeStartX.current - swipeCurrentX.current;

    // Swipe left > 50px: reveal actions
    if (swipeDistance > 50) {
      setIsSwiped(true);
    }
    // Swipe right > 50px: hide actions
    else if (swipeDistance < -50) {
      setIsSwiped(false);
    }

    swipeStartX.current = 0;
    swipeCurrentX.current = 0;
  };

  // Action handlers
  const handleMenuOpen = e => {
    e.stopPropagation();
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  const handleEdit = () => {
    setMenuOpen(false);
    setIsSwiped(false);
    onEdit(expense);
  };

  const handleClone = () => {
    setMenuOpen(false);
    setIsSwiped(false);
    onClone(expense);
  };

  const handleDelete = () => {
    setMenuOpen(false);
    setIsSwiped(false);
    onDelete(id);
  };

  return (
    <>
      <div
        className={`expense-card ${isSelected ? 'selected' : ''} ${isSwiped ? 'swiped' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="article"
        aria-selected={isSelected}
      >
        {/* Selection checkbox */}
        <input
          type="checkbox"
          className="card-checkbox"
          checked={isSelected}
          onChange={e => {
            e.stopPropagation();
            onSelect(id);
          }}
          aria-label={`Vælg ${name}`}
          onClick={e => e.stopPropagation()}
        />

        {/* Main content */}
        <div className="card-main">
          <div className="card-header">
            <span className="card-name">{name}</span>
            <span className="card-amount">{formattedAmount}</span>
          </div>

          <div className="card-meta">
            {expense.monthlyAmounts ? (
              <span
                className="variable-badge-mobile"
                title="Variabel månedligt beløb"
              >
                🏷️ Variabel
              </span>
            ) : (
              <span className={`card-frequency frequency-${frequency}`}>
                {frequencyLabel}
              </span>
            )}
            <span className="card-divider">•</span>
            <span className="card-months">{monthRange}</span>
          </div>
        </div>

        {/* Kebab menu button */}
        <button
          className="card-menu-btn"
          onClick={handleMenuOpen}
          aria-label="Handlinger"
        >
          ⋮
        </button>

        {/* Swipe reveal actions (hidden by default) */}
        <div className="card-swipe-actions">
          <button
            className="swipe-action edit"
            onClick={e => {
              e.stopPropagation();
              handleEdit();
            }}
            aria-label={`Rediger ${name}`}
          >
            ✏️
          </button>
          <button
            className="swipe-action delete"
            onClick={e => {
              e.stopPropagation();
              handleDelete();
            }}
            aria-label={`Slet ${name}`}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Bottom sheet menu */}
      <BottomSheet isOpen={menuOpen} onClose={handleMenuClose} title={name}>
        <div className="action-sheet">
          <button className="action-item" onClick={handleEdit}>
            <span className="action-icon">✏️</span>
            <span className="action-label">Rediger</span>
          </button>
          <button className="action-item" onClick={handleClone}>
            <span className="action-icon">📋</span>
            <span className="action-label">Duplikér</span>
          </button>
          <button className="action-item danger" onClick={handleDelete}>
            <span className="action-icon">🗑️</span>
            <span className="action-label">Slet</span>
          </button>
          <button className="action-item cancel" onClick={handleMenuClose}>
            <span className="action-icon">❌</span>
            <span className="action-label">Annuller</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

export default ExpenseCard;
