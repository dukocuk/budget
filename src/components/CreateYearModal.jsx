/**
 * CreateYearModal Component
 * Modal for creating new budget year/period
 * Supports copying expenses from previous year and automatic balance carryover
 */

import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useBudgetPeriods } from '../hooks/useBudgetPeriods';
import { useAuth } from '../hooks/useAuth';
import './CreateYearModal.css';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onCreate - Callback when year is created (year, options)
 * @param {Array<Object>} props.periods - Existing budget periods
 * @param {Function} props.calculateEndingBalance - Function to calculate ending balance for a period
 */
export default function CreateYearModal({
  isOpen,
  onClose,
  onCreate,
  periods = [],
  calculateEndingBalance,
}) {
  const { user } = useAuth();
  const { getTemplates } = useBudgetPeriods(user?.id);

  const [year, setYear] = useState('');
  const [sourceType, setSourceType] = useState('period'); // 'period' or 'template'
  const [copyExpensesFrom, setCopyExpensesFrom] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [shouldCopyExpenses, setShouldCopyExpenses] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(5700);
  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);

  // Calculate suggested next year based on existing periods
  const suggestedNextYear =
    periods.length > 0
      ? Math.max(...periods.map(p => p.year)) + 1
      : new Date().getFullYear();

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && getTemplates) {
      getTemplates().then(loadedTemplates => {
        setTemplates(loadedTemplates);
      });
    }
  }, [isOpen, getTemplates]);

  // Auto-fill year on open
  useEffect(() => {
    if (isOpen && !year) {
      setYear(String(suggestedNextYear));
    }
  }, [isOpen, suggestedNextYear, year]);

  // Auto-calculate balance when source period changes
  useEffect(() => {
    if (copyExpensesFrom && calculateEndingBalance) {
      setIsCalculating(true);
      calculateEndingBalance(copyExpensesFrom)
        .then(balance => {
          setCalculatedBalance(balance);
          setIsCalculating(false);
        })
        .catch(err => {
          console.error('Error calculating balance:', err);
          setCalculatedBalance(0);
          setIsCalculating(false);
        });
    } else {
      setCalculatedBalance(0);
    }
  }, [copyExpensesFrom, calculateEndingBalance]);

  // Auto-select most recent period for copying
  useEffect(() => {
    if (isOpen && periods.length > 0 && !copyExpensesFrom) {
      const mostRecentPeriod = periods.sort((a, b) => b.year - a.year)[0];
      setCopyExpensesFrom(mostRecentPeriod.id);
      setMonthlyPayment(mostRecentPeriod.monthlyPayment || 5700);
    }
  }, [isOpen, periods, copyExpensesFrom]);

  const handleSubmit = e => {
    e.preventDefault();
    setError('');

    // Validation
    const yearNum = parseInt(year);
    if (!year || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setError('Indtast et gyldigt år mellem 2000 og 2100');
      return;
    }

    if (periods.some(p => p.year === yearNum)) {
      setError(`Budget for år ${yearNum} findes allerede`);
      return;
    }

    if (monthlyPayment < 0) {
      setError('Månedlig indbetaling skal være positiv');
      return;
    }

    // Create year with options
    const yearData = {
      year: yearNum,
      monthlyPayment: parseFloat(monthlyPayment),
      previousBalance: calculatedBalance,
    };

    // Add source based on type
    if (sourceType === 'template' && selectedTemplate) {
      yearData.templateId = selectedTemplate;
    } else if (
      sourceType === 'period' &&
      shouldCopyExpenses &&
      copyExpensesFrom
    ) {
      yearData.copyExpensesFrom = copyExpensesFrom;
    }

    onCreate(yearData);

    // Reset form
    handleClose();
  };

  const handleClose = () => {
    setYear('');
    setSourceType('period');
    setCopyExpensesFrom('');
    setSelectedTemplate('');
    setShouldCopyExpenses(false);
    setMonthlyPayment(5700);
    setCalculatedBalance(0);
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      className="create-year-modal"
      overlayClassName="create-year-modal-overlay"
      closeTimeoutMS={200}
      ariaHideApp={false}
    >
      <div className="create-year-modal-header">
        <h2 className="create-year-modal-title">Opret nyt budgetår</h2>
        <button
          className="create-year-modal-close"
          onClick={handleClose}
          aria-label="Luk"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="create-year-modal-form">
        {/* Year input */}
        <div className="form-group">
          <label htmlFor="year" className="form-label">
            År <span className="required">*</span>
          </label>
          <input
            type="number"
            id="year"
            className="form-input"
            value={year}
            onChange={e => setYear(e.target.value)}
            min="2000"
            max="2100"
            required
            placeholder={`f.eks. ${suggestedNextYear}`}
            autoFocus
          />
        </div>

        {/* Monthly payment */}
        <div className="form-group">
          <label htmlFor="monthlyPayment" className="form-label">
            Månedlig indbetaling (kr.)
          </label>
          <input
            type="number"
            id="monthlyPayment"
            className="form-input"
            value={monthlyPayment}
            onChange={e => setMonthlyPayment(e.target.value)}
            min="0"
            step="0.01"
            required
          />
          <p className="form-hint">
            Fast beløb der indbetales hver måned til budgetkontoen
          </p>
        </div>

        {/* Source Type Selection */}
        {(periods.length > 0 || templates.length > 0) && (
          <div className="form-group">
            <label className="form-label">Kopier fra</label>
            <div className="source-type-tabs">
              <button
                type="button"
                className={`source-tab ${sourceType === 'period' ? 'active' : ''}`}
                onClick={() => {
                  setSourceType('period');
                  setSelectedTemplate('');
                }}
                disabled={periods.length === 0}
              >
                📅 Tidligere år
              </button>
              <button
                type="button"
                className={`source-tab ${sourceType === 'template' ? 'active' : ''}`}
                onClick={() => {
                  setSourceType('template');
                  setCopyExpensesFrom('');
                  setShouldCopyExpenses(false);
                }}
                disabled={templates.length === 0}
              >
                📋 Skabelon
              </button>
            </div>
          </div>
        )}

        {/* Copy from previous year */}
        {sourceType === 'period' && periods.length > 0 && (
          <div className="form-group">
            <label className="form-label">Kopier fra tidligere år</label>
            <select
              className="form-input"
              value={copyExpensesFrom}
              onChange={e => setCopyExpensesFrom(e.target.value)}
            >
              {periods
                .sort((a, b) => b.year - a.year)
                .map(period => (
                  <option key={period.id} value={period.id}>
                    {period.year} (
                    {period.status === 'active' ? 'Aktiv' : 'Arkiveret'})
                  </option>
                ))}
            </select>
            <p className="form-hint">
              Vælg hvilket år du vil kopiere udgifter og indstillinger fra
            </p>
          </div>
        )}

        {/* Checkbox to copy expenses */}
        {sourceType === 'period' && periods.length > 0 && (
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={shouldCopyExpenses}
                onChange={e => setShouldCopyExpenses(e.target.checked)}
              />
              <span className="form-checkbox-label">
                Kopier udgifter fra valgt år
              </span>
            </label>
            <p className="form-hint">
              Alle udgifter fra det valgte år kopieres til det nye år
            </p>
          </div>
        )}

        {/* Template Selection */}
        {sourceType === 'template' && templates.length > 0 && (
          <div className="form-group">
            <label htmlFor="templateSelect" className="form-label">
              Vælg skabelon
            </label>
            <select
              id="templateSelect"
              className="form-input"
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
            >
              <option value="">-- Vælg en skabelon --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.templateName}
                  {template.templateDescription &&
                    ` - ${template.templateDescription.substring(0, 40)}`}
                </option>
              ))}
            </select>
            <p className="form-hint">
              📋 Udgifter og indstillinger fra skabelonen kopieres automatisk
            </p>
          </div>
        )}

        {/* Calculated starting balance */}
        {copyExpensesFrom && (
          <div className="form-group calculated-balance">
            <label className="form-label">Beregnet startsaldo</label>
            <div className="balance-display">
              {isCalculating ? (
                <span className="balance-loading">Beregner...</span>
              ) : (
                <span
                  className={`balance-amount ${calculatedBalance < 0 ? 'negative' : 'positive'}`}
                >
                  {calculatedBalance.toLocaleString('da-DK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  kr.
                </span>
              )}
            </div>
            <p className="form-hint">
              Automatisk beregnet ud fra valgt års slutsaldo
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="create-year-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
          >
            Annuller
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isCalculating}
          >
            Opret budgetår
          </button>
        </div>
      </form>
    </Modal>
  );
}
