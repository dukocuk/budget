/**
 * SettingsCard Component
 *
 * Reusable card wrapper for settings sections with consistent styling,
 * optional collapsible functionality, and visual states (highlight, required, error).
 *
 * Features:
 * - Material Design elevation with hover states
 * - Progressive disclosure (collapsible)
 * - Visual states: highlight, required, interactive
 * - Icon support with emoji rendering
 * - Accessible ARIA labels and keyboard navigation
 * - Dark mode support
 * - Mobile-optimized touch targets
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import './SettingsCard.css';

export const SettingsCard = ({
  title,
  icon,
  description,
  children,
  highlight = false,
  required = false,
  collapsible = false,
  defaultExpanded = true,
  interactive = false,
  status,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleKeyDown = e => {
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleToggle();
    }
  };

  const cardClasses = [
    'settings-card',
    highlight && 'settings-card--highlighted',
    interactive && 'settings-card--interactive',
    status && `settings-card--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const headerClasses = [
    'settings-card-header',
    collapsible && 'settings-card-header--clickable',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      role={interactive ? 'button' : undefined}
      aria-label={ariaLabel || title}
    >
      <div
        className={headerClasses}
        onClick={collapsible ? handleToggle : undefined}
        onKeyDown={collapsible ? handleKeyDown : undefined}
        tabIndex={collapsible ? 0 : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={collapsible ? `${title}-content` : undefined}
      >
        <div className="settings-card-header-content">
          {icon && <span className="settings-card-icon">{icon}</span>}
          <div className="settings-card-title-group">
            <h3 className="settings-card-title">
              {title}
              {required && (
                <span className="settings-card-required" aria-label="required">
                  *
                </span>
              )}
            </h3>
            {description && (
              <p className="settings-card-description">{description}</p>
            )}
          </div>
        </div>
        {collapsible && (
          <span
            className={`settings-card-toggle ${isExpanded ? 'expanded' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        )}
      </div>
      {(!collapsible || isExpanded) && (
        <div
          className="settings-card-content"
          id={collapsible ? `${title}-content` : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
};

SettingsCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  highlight: PropTypes.bool,
  required: PropTypes.bool,
  collapsible: PropTypes.bool,
  defaultExpanded: PropTypes.bool,
  interactive: PropTypes.bool,
  status: PropTypes.oneOf(['success', 'info', 'warning', 'error']),
  className: PropTypes.string,
  'aria-label': PropTypes.string,
};
