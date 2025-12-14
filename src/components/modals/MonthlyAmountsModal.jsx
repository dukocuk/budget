import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { MONTHS } from '../../utils/constants';
import {
  parseDanishNumber,
  formatDanishNumber,
} from '../../utils/localeHelpers';
import { SwitchToFixedModal } from './SwitchToFixedModal';
import './MonthlyAmountsModal.css';

/**
 * MonthlyAmountsModal - Edit variable monthly amounts for an expense
 *
 * Displays 12 input fields (one per month) for entering variable amounts
 * Supports Danish locale number format (comma as decimal separator)
 *
 * @param {boolean} isOpen - Modal visibility
 * @param {Object} expense - Expense object with monthlyAmounts array
 * @param {Function} onClose - Close callback
 * @param {Function} onSave - Save callback (receives array of 12 numbers)
 */
export const MonthlyAmountsModal = ({ isOpen, expense, onClose, onSave }) => {
  // Initialize local state with expense's monthly amounts or default to expense.amount
  const [amounts, setAmounts] = useState(
    expense?.monthlyAmounts || Array(12).fill(expense?.amount || 0)
  );

  const [errors, setErrors] = useState({});
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // Reset when expense changes
  useEffect(() => {
    if (expense) {
      setAmounts(expense.monthlyAmounts || Array(12).fill(expense.amount || 0));
      setErrors({});
    }
  }, [expense]);

  // Handle amount change for a specific month
  const handleAmountChange = (monthIndex, value) => {
    const newAmounts = [...amounts];
    newAmounts[monthIndex] = value; // Store as string during editing
    setAmounts(newAmounts);

    // Validate
    const parsed = parseDanishNumber(value);
    if (parsed < 0) {
      setErrors({ ...errors, [monthIndex]: 'Beløbet skal være mindst 0 kr.' });
    } else {
      const newErrors = { ...errors };
      delete newErrors[monthIndex];
      setErrors(newErrors);
    }
  };

  // Apply amount to all months
  const handleApplyToAll = () => {
    const firstAmount = amounts[0];
    setAmounts(Array(12).fill(firstAmount));
    setErrors({});
  };

  // Reset all amounts to 0
  const handleResetAll = () => {
    setAmounts(Array(12).fill(0));
    setErrors({});
  };

  // Validate all amounts
  const validateAll = () => {
    const newErrors = {};
    amounts.forEach((amount, index) => {
      const parsed = parseDanishNumber(amount);
      if (parsed < 0) {
        newErrors[index] = 'Mindst 0 kr.';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validateAll()) {
      // Convert all amounts to numbers
      const numericAmounts = amounts.map(
        amount => parseDanishNumber(amount) || 0
      );
      onSave(numericAmounts);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setAmounts(expense?.monthlyAmounts || Array(12).fill(expense?.amount || 0));
    setErrors({});
    onClose();
  };

  // Switch to fixed amount
  const handleSwitchToFixed = () => {
    setShowSwitchModal(true);
  };

  // Handle confirmation from switch modal
  const handleConfirmSwitch = fixedAmount => {
    onSave({ type: 'switch-to-fixed', amount: fixedAmount });
    setShowSwitchModal(false);
  };

  // Handle cancel from switch modal
  const handleCancelSwitch = () => {
    setShowSwitchModal(false);
  };

  // Calculate total
  const total = amounts.reduce((sum, amt) => sum + parseDanishNumber(amt), 0);

  const formContent = (
    <div className="monthly-amounts-form">
      <div className="modal-body">
        <div className="modal-stats">
          <div className="stat stat-centered">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{formatDanishNumber(total)} kr.</span>
          </div>
        </div>

        <p className="form-hint">
          Indtast beløb for hver måned. Frekvens og datointerval vil stadig
          gælde.
        </p>

        <div className="amounts-grid">
          {MONTHS.map((month, index) => (
            <div key={index} className="amount-field">
              <label htmlFor={`amount-${index}`}>{month}</label>
              <input
                id={`amount-${index}`}
                type="text"
                value={amounts[index]}
                onChange={e => handleAmountChange(index, e.target.value)}
                inputMode="decimal"
                pattern="[0-9.,]+"
                className={errors[index] ? 'error' : ''}
              />
              {errors[index] && (
                <span className="error-message">{errors[index]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="utility-buttons">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleApplyToAll}
          >
            📋 Anvend januar-beløb til alle måneder
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetAll}
          >
            🔄 Nulstil alle beløb
          </button>
          <button
            type="button"
            className="btn btn-secondary destructive"
            onClick={handleSwitchToFixed}
          >
            💰 Skift til fast beløb
          </button>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-cancel" onClick={handleCancel}>
          Annuller
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={Object.keys(errors).length > 0}
        >
          ✅ Gem månedlige beløb
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleCancel}
        className="monthly-amounts-modal"
        overlayClassName="expense-modal-overlay"
        closeTimeoutMS={200}
      >
        <div className="modal-header">
          <h2>📊 Månedlige beløb: {expense?.name}</h2>
          <button
            className="modal-close-btn"
            onClick={handleCancel}
            aria-label="Luk modal"
          >
            ✕
          </button>
        </div>

        {formContent}
      </Modal>

      <SwitchToFixedModal
        isOpen={showSwitchModal}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />
    </>
  );
};
