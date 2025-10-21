/**
 * Modal component for adding new expenses with validation
 */

import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import {
  MONTHS,
  FREQUENCY_LABELS,
  FREQUENCY_TYPES,
  DEFAULT_EXPENSE,
} from '../utils/constants';
import './AddExpenseModal.css';

// Set app element for accessibility (only if root exists)
if (typeof document !== 'undefined' && document.querySelector('#root')) {
  Modal.setAppElement('#root');
}

/**
 * AddExpenseModal component
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Close modal callback
 * @param {function} onAdd - Add expense callback
 */
export const AddExpenseModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: DEFAULT_EXPENSE.name,
    amount: DEFAULT_EXPENSE.amount,
    frequency: DEFAULT_EXPENSE.frequency,
    startMonth: DEFAULT_EXPENSE.startMonth,
    endMonth: DEFAULT_EXPENSE.endMonth,
  });

  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: DEFAULT_EXPENSE.name,
        amount: DEFAULT_EXPENSE.amount,
        frequency: DEFAULT_EXPENSE.frequency,
        startMonth: DEFAULT_EXPENSE.startMonth,
        endMonth: DEFAULT_EXPENSE.endMonth,
      });
      setErrors({});
    }
  }, [isOpen]);

  // Handle field changes
  const handleChange = (field, value) => {
    let newFormData = { ...formData };

    if (field === 'amount') {
      // Allow any input during typing, store as-is
      // Only validate the number when it's actually used
      const numValue = value === '' ? '' : value;
      newFormData.amount = numValue;

      // Only show error if value is invalid and not empty
      const parsedValue = parseFloat(value);
      if (value !== '' && (isNaN(parsedValue) || parsedValue < 0)) {
        setErrors({ ...errors, amount: 'Beløbet skal være mindst 0 kr.' });
      } else {
        // Remove amount error if it exists
        const newErrors = { ...errors };
        delete newErrors.amount;
        setErrors(newErrors);
      }
    } else if (field === 'startMonth' || field === 'endMonth') {
      const intValue = parseInt(value);
      newFormData[field] = intValue;

      // Validate month range
      if (field === 'startMonth' && intValue > formData.endMonth) {
        newFormData.endMonth = intValue;
      } else if (field === 'endMonth' && intValue < formData.startMonth) {
        newFormData.endMonth = formData.startMonth;
      }

      // Remove month errors if they exist
      const newErrors = { ...errors };
      delete newErrors.startMonth;
      delete newErrors.endMonth;
      setErrors(newErrors);
    } else if (field === 'name') {
      newFormData.name = value;
      if (!value.trim()) {
        setErrors({ ...errors, name: 'Udgiftsnavn er påkrævet' });
      } else {
        // Remove name error if it exists
        const newErrors = { ...errors };
        delete newErrors.name;
        setErrors(newErrors);
      }
    } else {
      newFormData[field] = value;
    }

    setFormData(newFormData);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Udgiftsnavn er påkrævet';
    }

    const amount = parseFloat(formData.amount);
    if (formData.amount === '' || isNaN(amount) || amount < 0) {
      newErrors.amount = 'Beløbet skal være mindst 0 kr.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = e => {
    e.preventDefault();

    if (validateForm()) {
      // Convert amount to number before submitting
      const submissionData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      };
      onAdd(submissionData);
      onClose();
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({
      name: DEFAULT_EXPENSE.name,
      amount: DEFAULT_EXPENSE.amount,
      frequency: DEFAULT_EXPENSE.frequency,
      startMonth: DEFAULT_EXPENSE.startMonth,
      endMonth: DEFAULT_EXPENSE.endMonth,
    });
    setErrors({});
    onClose();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleCancel}
      className="expense-modal"
      overlayClassName="expense-modal-overlay"
      closeTimeoutMS={200}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      <div className="modal-header">
        <h2>➕ Tilføj ny udgift</h2>
        <button
          className="modal-close-btn"
          onClick={handleCancel}
          aria-label="Luk modal"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="expense-name">
              Udgiftsnavn <span className="required">*</span>
            </label>
            <input
              id="expense-name"
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="F.eks. Netflix abonnement"
              autoFocus
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <span id="name-error" className="error-message" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expense-amount">
              Beløb (kr.) <span className="required">*</span>
            </label>
            <input
              id="expense-amount"
              type="number"
              value={formData.amount}
              onChange={e => handleChange('amount', e.target.value)}
              min="0"
              step="1"
              aria-required="true"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
            />
            {errors.amount && (
              <span id="amount-error" className="error-message" role="alert">
                {errors.amount}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expense-frequency">
              Frekvens <span className="required">*</span>
            </label>
            <select
              id="expense-frequency"
              value={formData.frequency}
              onChange={e => handleChange('frequency', e.target.value)}
              aria-required="true"
            >
              <option value={FREQUENCY_TYPES.MONTHLY}>
                {FREQUENCY_LABELS[FREQUENCY_TYPES.MONTHLY]}
              </option>
              <option value={FREQUENCY_TYPES.QUARTERLY}>
                {FREQUENCY_LABELS[FREQUENCY_TYPES.QUARTERLY]}
              </option>
              <option value={FREQUENCY_TYPES.YEARLY}>
                {FREQUENCY_LABELS[FREQUENCY_TYPES.YEARLY]}
              </option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expense-start-month">
                Start måned <span className="required">*</span>
              </label>
              <select
                id="expense-start-month"
                value={formData.startMonth}
                onChange={e => handleChange('startMonth', e.target.value)}
                aria-required="true"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expense-end-month">
                Slut måned <span className="required">*</span>
              </label>
              <select
                id="expense-end-month"
                value={formData.endMonth}
                onChange={e => handleChange('endMonth', e.target.value)}
                aria-required="true"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="form-hint">
            <span className="required">*</span> = Påkrævet felt
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-cancel"
            onClick={handleCancel}
          >
            Annuller
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={Object.keys(errors).length > 0}
          >
            ➕ Tilføj udgift
          </button>
        </div>
      </form>
    </Modal>
  );
};
