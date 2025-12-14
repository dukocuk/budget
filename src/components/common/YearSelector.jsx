/**
 * YearSelector Component
 * Dropdown for switching between budget periods (years)
 * Shows active year first, then archived years
 */

import { useState, useRef, useEffect } from 'react';
import './YearSelector.css';

/**
 * @param {Object} props
 * @param {Array<Object>} props.periods - Array of budget periods
 * @param {Object} props.activePeriod - Currently selected budget period
 * @param {Function} props.onSelectPeriod - Callback when period is selected
 * @param {Function} props.onCreateYear - Callback to open create year modal
 * @param {boolean} props.disabled - Disable selector (e.g., during loading)
 */
export default function YearSelector({
  periods = [],
  activePeriod,
  onSelectPeriod,
  onCreateYear,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelectPeriod = period => {
    onSelectPeriod(period);
    setIsOpen(false);
  };

  const handleCreateYear = () => {
    onCreateYear();
    setIsOpen(false);
  };

  // Group periods by status
  const activePeriods = periods.filter(p => p.status === 'active');
  const archivedPeriods = periods.filter(p => p.status === 'archived');

  return (
    <div className="year-selector" ref={dropdownRef}>
      <button
        className="year-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="year-selector-label">
          {activePeriod ? (
            <>
              Budget {activePeriod.year}
              {activePeriod.status === 'archived' && (
                <span className="year-badge archived">Arkiveret</span>
              )}
            </>
          ) : (
            'Vælg år'
          )}
        </span>
        <svg
          className={`year-selector-icon ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="year-selector-dropdown">
          {/* Active periods */}
          {activePeriods.length > 0 && (
            <div className="year-selector-section">
              <div className="year-selector-section-title">Aktive</div>
              {activePeriods.map(period => (
                <button
                  key={period.id}
                  className={`year-selector-option ${
                    activePeriod?.id === period.id ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectPeriod(period)}
                >
                  <span className="year-option-label">
                    {period.year}
                    <span className="year-badge active">Aktiv</span>
                  </span>
                  {activePeriod?.id === period.id && (
                    <svg
                      className="year-option-check"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M3 8L6 11L13 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Archived periods */}
          {archivedPeriods.length > 0 && (
            <div className="year-selector-section">
              <div className="year-selector-section-title">Arkiverede</div>
              {archivedPeriods.map(period => (
                <button
                  key={period.id}
                  className={`year-selector-option ${
                    activePeriod?.id === period.id ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectPeriod(period)}
                >
                  <span className="year-option-label">
                    {period.year}
                    <span className="year-badge archived">📦 Arkiveret</span>
                  </span>
                  {activePeriod?.id === period.id && (
                    <svg
                      className="year-option-check"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M3 8L6 11L13 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          {periods.length > 0 && <div className="year-selector-divider" />}

          {/* Create new year button */}
          <button
            className="year-selector-option create-year"
            onClick={handleCreateYear}
          >
            <svg
              className="year-option-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>Opret nyt år</span>
          </button>
        </div>
      )}
    </div>
  );
}
