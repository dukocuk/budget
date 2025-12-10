/**
 * Switch to Fixed Amount Modal Component
 * Allows user to manually enter desired fixed amount when switching from variable to fixed mode
 */

import { useState } from 'react';
import { parseDanishNumber } from '../utils/localeHelpers';
import './SwitchToFixedModal.css';

export const SwitchToFixedModal = ({ isOpen, onConfirm, onCancel }) => {
  const [fixedAmount, setFixedAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAmountChange = value => {
    setFixedAmount(value);

    // Validate amount
    const parsedValue = parseDanishNumber(value);
    if (value && parsedValue < 0) {
      setError('Beløbet skal være mindst 0 kr.');
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    const parsedValue = parseDanishNumber(fixedAmount);

    if (fixedAmount === '') {
      setError('Indtast venligst et beløb');
      return;
    }

    if (parsedValue < 0) {
      setError('Beløbet skal være mindst 0 kr.');
      return;
    }

    onConfirm(parsedValue);
    // Reset state
    setFixedAmount('');
    setError('');
  };

  const handleCancel = () => {
    setFixedAmount('');
    setError('');
    onCancel();
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="switch-modal-overlay" onClick={handleCancel}>
      <div
        className="modal-content switch-to-fixed-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>💰 Skift til fast beløb?</h3>
        </div>

        <div className="modal-body">
          <div className="warning-box">
            <span className="icon">⚠️</span>
            <span>Dine nuværende variable beløb vil blive nulstillet</span>
          </div>

          <div className="form-group">
            <label htmlFor="fixed-amount-input">
              Indtast fast månedligt beløb <span className="required">*</span>
            </label>
            <input
              id="fixed-amount-input"
              type="text"
              value={fixedAmount}
              onChange={e => handleAmountChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="f.eks. 500,00"
              inputMode="decimal"
              pattern="[0-9.,]+"
              autoFocus
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'amount-error' : undefined}
              className={error ? 'error' : ''}
            />
            {error && (
              <span id="amount-error" className="error-message" role="alert">
                {error}
              </span>
            )}
          </div>

          <p className="helper-text">
            Dette beløb vil gælde for alle måneder hvor udgiften er aktiv
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Annuller
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!!error || !fixedAmount}
          >
            Bekræft
          </button>
        </div>
      </div>
    </div>
  );
};
