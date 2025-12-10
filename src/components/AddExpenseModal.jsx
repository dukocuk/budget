/**
 * Modal component for adding new expenses with validation
 */

import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import BottomSheet from './BottomSheet';
import { useViewportSize } from '../hooks/useViewportSize';
import {
  MONTHS,
  FREQUENCY_LABELS,
  FREQUENCY_TYPES,
  DEFAULT_EXPENSE,
} from '../utils/constants';
import { parseDanishNumber } from '../utils/localeHelpers';
import { MonthlyAmountsModal } from './MonthlyAmountsModal';
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
 * @param {object} editingExpense - Expense being edited (null for new expense)
 */
export const AddExpenseModal = ({ isOpen, onClose, onAdd, editingExpense }) => {
  const { isMobile } = useViewportSize();

  const [formData, setFormData] = useState({
    name: DEFAULT_EXPENSE.name,
    amount: DEFAULT_EXPENSE.amount,
    frequency: DEFAULT_EXPENSE.frequency,
    startMonth: DEFAULT_EXPENSE.startMonth,
    endMonth: DEFAULT_EXPENSE.endMonth,
  });

  const [errors, setErrors] = useState({});

  // Payment mode state
  const [paymentMode, setPaymentMode] = useState('fixed'); // 'fixed' or 'variable'
  const [monthlyAmounts, setMonthlyAmounts] = useState(
    Array(12).fill(DEFAULT_EXPENSE.amount)
  );
  const [showMonthlyEditor, setShowMonthlyEditor] = useState(false);

  // Modal title state (to prevent flicker during close animation)
  const [modalTitle, setModalTitle] = useState('');
  const [buttonText, setButtonText] = useState('');

  // Reset form when modal opens or editingExpense changes
  useEffect(() => {
    if (isOpen) {
      // Set modal title and button text based on mode (prevents flicker during close)
      setModalTitle(
        editingExpense ? '✏️ Rediger udgift' : '➕ Tilføj ny udgift'
      );
      setButtonText(editingExpense ? '💾 Gem ændringer' : '➕ Tilføj udgift');

      if (editingExpense) {
        // Editing mode - pre-fill with expense data
        setFormData({
          name: editingExpense.name,
          amount: editingExpense.amount,
          frequency: editingExpense.frequency,
          startMonth: editingExpense.startMonth,
          endMonth: editingExpense.endMonth,
        });

        // Detect payment mode based on monthlyAmounts
        if (
          editingExpense.monthlyAmounts &&
          editingExpense.monthlyAmounts.length === 12
        ) {
          setPaymentMode('variable');
          setMonthlyAmounts(editingExpense.monthlyAmounts);
        } else {
          setPaymentMode('fixed');
          setMonthlyAmounts(Array(12).fill(0));
        }
      } else {
        // Add mode - reset to defaults
        setFormData({
          name: DEFAULT_EXPENSE.name,
          amount: DEFAULT_EXPENSE.amount,
          frequency: DEFAULT_EXPENSE.frequency,
          startMonth: DEFAULT_EXPENSE.startMonth,
          endMonth: DEFAULT_EXPENSE.endMonth,
        });
        setPaymentMode('fixed');
        setMonthlyAmounts(Array(12).fill(0));
      }
      setErrors({});
      setShowMonthlyEditor(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Handle field changes
  const handleChange = (field, value) => {
    let newFormData = { ...formData };

    if (field === 'amount') {
      // Allow any input during typing, store as-is
      // Support Danish locale (comma decimal separator)
      const numValue = value === '' ? '' : value;
      newFormData.amount = numValue;

      // Only show error if value is invalid and not empty
      const parsedValue = parseDanishNumber(value);
      if (value !== '' && parsedValue < 0) {
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

    const amount = parseDanishNumber(formData.amount);
    if (formData.amount === '' || amount < 0) {
      newErrors.amount = 'Beløbet skal være mindst 0 kr.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = e => {
    e.preventDefault();

    if (validateForm()) {
      // Convert amount to number before submitting (supports Danish locale)
      const submissionData = {
        ...formData,
        amount:
          paymentMode === 'fixed' ? parseDanishNumber(formData.amount) || 0 : 0,
        monthlyAmounts: paymentMode === 'variable' ? monthlyAmounts : null,
      };

      // Include ID if editing
      if (editingExpense) {
        submissionData.id = editingExpense.id;
      }

      onAdd(submissionData);
      onClose();
    }
  };

  // Handle cancel
  const handleCancel = () => {
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

  // Shared form content for both modal types
  const formContent = (
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

        {/* Only show these fields in Fixed mode */}
        {paymentMode === 'fixed' && (
          <>
            <div className="form-group">
              <label htmlFor="expense-amount">
                Beløb (kr.) <span className="required">*</span>
              </label>
              <input
                id="expense-amount"
                type="text"
                value={formData.amount}
                onChange={e => handleChange('amount', e.target.value)}
                placeholder="f.eks. 100,95"
                inputMode="decimal"
                pattern="[0-9.,]+"
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
          </>
        )}

        <div className="form-group">
          <label>Vælg beløbstype</label>
          <div className="payment-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${paymentMode === 'fixed' ? 'active' : ''}`}
              onClick={() => setPaymentMode('fixed')}
            >
              💰 Fast beløb
            </button>
            <button
              type="button"
              className={`mode-btn ${paymentMode === 'variable' ? 'active' : ''}`}
              onClick={() => setPaymentMode('variable')}
            >
              📊 Variabelt beløb
            </button>
          </div>
          <p className="payment-mode-helper">
            {paymentMode === 'fixed'
              ? 'Samme beløb hver måned'
              : 'Forskellige beløb per måned'}
          </p>
        </div>

        {paymentMode === 'variable' && (
          <div className="form-group">
            <button
              type="button"
              className="btn btn-secondary edit-monthly-btn"
              onClick={() => setShowMonthlyEditor(true)}
            >
              📊 Rediger månedlige beløb
            </button>
          </div>
        )}

        {paymentMode === 'fixed' && (
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
        )}

        {/* Show helper text in Variable mode */}
        {paymentMode === 'variable' && (
          <div className="variable-mode-hint">
            💡 Brug 'Rediger månedlige beløb' for at angive beløb for hver måned
          </div>
        )}

        {!editingExpense && (
          <p className="form-hint">
            <span className="required">*</span> = Påkrævet felt
          </p>
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-cancel" onClick={handleCancel}>
          Annuller
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={Object.keys(errors).length > 0}
        >
          {buttonText}
        </button>
      </div>
    </form>
  );

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <>
        <BottomSheet
          isOpen={isOpen}
          onClose={handleCancel}
          title={modalTitle}
          size="md"
        >
          {formContent}
        </BottomSheet>

        {showMonthlyEditor && (
          <MonthlyAmountsModal
            isOpen={showMonthlyEditor}
            expense={{
              name: formData.name,
              amount: DEFAULT_EXPENSE.amount,
              monthlyAmounts: monthlyAmounts,
            }}
            onClose={() => setShowMonthlyEditor(false)}
            onSave={amounts => {
              if (amounts?.type === 'switch-to-fixed') {
                // Switching to fixed mode with new amount
                setPaymentMode('fixed');
                setMonthlyAmounts(Array(12).fill(0));
                handleChange('amount', amounts.amount.toString());
              } else if (amounts === null) {
                // Legacy: switching back to fixed (shouldn't happen now)
                setPaymentMode('fixed');
                setMonthlyAmounts(Array(12).fill(0));
              } else {
                // Saving monthly amounts
                setMonthlyAmounts(amounts);
              }
              setShowMonthlyEditor(false);
            }}
          />
        )}
      </>
    );
  }

  // Desktop: Use traditional Modal
  return (
    <>
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
          <h2>{modalTitle}</h2>
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

      {showMonthlyEditor && (
        <MonthlyAmountsModal
          isOpen={showMonthlyEditor}
          expense={{
            name: formData.name,
            amount: DEFAULT_EXPENSE.amount,
            monthlyAmounts: monthlyAmounts,
          }}
          onClose={() => setShowMonthlyEditor(false)}
          onSave={amounts => {
            if (amounts?.type === 'switch-to-fixed') {
              // Switching to fixed mode with new amount
              setPaymentMode('fixed');
              setMonthlyAmounts(Array(12).fill(0));
              handleChange('amount', amounts.amount.toString());
            } else if (amounts === null) {
              // Legacy: switching back to fixed (shouldn't happen now)
              setPaymentMode('fixed');
              setMonthlyAmounts(Array(12).fill(0));
            } else {
              // Saving monthly amounts
              setMonthlyAmounts(amounts);
            }
            setShowMonthlyEditor(false);
          }}
        />
      )}
    </>
  );
};
