/**
 * SectionHeader Component
 *
 * Consistent section headers with icon, title, optional badge, and subtitle.
 * Used to separate major sections in Settings and other complex forms.
 *
 * Features:
 * - Icon + title + badge layout
 * - Optional subtitle for context
 * - Semantic HTML structure
 * - Dark mode support
 * - Accessible ARIA labels
 */

import PropTypes from 'prop-types';
import './SectionHeader.css';

export const SectionHeader = ({
  icon,
  title,
  badge,
  badgeVariant = 'primary',
  subtitle,
  className = '',
  'aria-level': ariaLevel = 2,
}) => {
  const headerClasses = ['section-header', className].filter(Boolean).join(' ');

  const badgeClasses = [
    'section-header-badge',
    `section-header-badge--${badgeVariant}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headerClasses}>
      <div className="section-header-main">
        {icon && <span className="section-header-icon">{icon}</span>}
        <h2
          className="section-header-title"
          role="heading"
          aria-level={ariaLevel}
        >
          {title}
        </h2>
        {badge && <span className={badgeClasses}>{badge}</span>}
      </div>
      {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
    </header>
  );
};

SectionHeader.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  badgeVariant: PropTypes.oneOf([
    'primary',
    'success',
    'info',
    'warning',
    'error',
  ]),
  subtitle: PropTypes.string,
  className: PropTypes.string,
  'aria-level': PropTypes.number,
};
