/**
 * FormField Component
 *
 * Enhanced input field with label, hint, error states, prefix/suffix support,
 * and validation feedback. Supports Danish locale number formatting.
 *
 * Features:
 * - Label with optional required indicator
 * - Optional icon prefix
 * - Suffix support (e.g., "kr./måned")
 * - Hint text for guidance
 * - Error state with message
 * - Focus state styling
 * - Accessible ARIA labels and error messaging
 * - Dark mode support
 * - Mobile-optimized touch targets (44px+)
 */

import PropTypes from 'prop-types';
import './FormField.css';

export const FormField = ({
  id,
  label,
  icon,
  value,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  placeholder,
  suffix,
  hint,
  error,
  required = false,
  disabled = false,
  readOnly = false,
  inputMode,
  pattern,
  className = '',
  inputRef,
  'aria-describedby': ariaDescribedby,
  'aria-label': ariaLabel,
}) => {
  const fieldClasses = [
    'form-field',
    error && 'form-field--error',
    disabled && 'form-field--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inputWrapperClasses = [
    'form-field-input-wrapper',
    icon && 'form-field-input-wrapper--with-icon',
    suffix && 'form-field-input-wrapper--with-suffix',
  ]
    .filter(Boolean)
    .join(' ');

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [ariaDescribedby, hintId, errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fieldClasses}>
      {label && (
        <label htmlFor={id} className="form-field-label">
          {label}
          {required && (
            <span className="form-field-required" aria-label="obligatorisk">
              *
            </span>
          )}
        </label>
      )}

      <div className={inputWrapperClasses}>
        {icon && (
          <span className="form-field-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          inputMode={inputMode}
          pattern={pattern}
          className="form-field-input"
          aria-label={ariaLabel || label}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? 'true' : 'false'}
        />
        {suffix && (
          <span className="form-field-suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="form-field-hint">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="form-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

FormField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  icon: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  suffix: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  inputMode: PropTypes.string,
  pattern: PropTypes.string,
  className: PropTypes.string,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
  'aria-describedby': PropTypes.string,
  'aria-label': PropTypes.string,
};
