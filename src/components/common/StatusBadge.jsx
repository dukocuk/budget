/**
 * StatusBadge Component
 *
 * Semantic status indicator with variants (success, info, warning, error, syncing).
 * Includes animation support for active states like syncing.
 *
 * Features:
 * - Semantic color-coded status variants
 * - Rotating animation for "syncing" status
 * - Icon + text layout
 * - Gradient backgrounds
 * - Accessible ARIA live region for status changes
 * - Dark mode support
 */

import PropTypes from 'prop-types';
import './StatusBadge.css';

const STATUS_CONFIG = {
  synced: {
    icon: '✅',
    text: 'Synkroniseret',
    className: 'status-badge--synced',
    ariaLive: 'polite',
  },
  syncing: {
    icon: '🔄',
    text: 'Synkroniserer...',
    className: 'status-badge--syncing',
    ariaLive: 'polite',
  },
  error: {
    icon: '❌',
    text: 'Fejl',
    className: 'status-badge--error',
    ariaLive: 'assertive',
  },
  offline: {
    icon: '📴',
    text: 'Offline',
    className: 'status-badge--offline',
    ariaLive: 'polite',
  },
  idle: {
    icon: '⏸️',
    text: 'Klar',
    className: 'status-badge--idle',
    ariaLive: 'polite',
  },
};

export const StatusBadge = ({
  status,
  customText,
  customIcon,
  size = 'medium',
  animated = true,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const displayText = customText || config.text;
  const displayIcon = customIcon || config.icon;

  const badgeClasses = [
    'status-badge',
    config.className,
    `status-badge--${size}`,
    animated && status === 'syncing' && 'status-badge--animated',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={badgeClasses}
      role="status"
      aria-live={config.ariaLive}
      aria-atomic="true"
    >
      <span className="status-badge-icon" aria-hidden="true">
        {displayIcon}
      </span>
      <span className="status-badge-text">{displayText}</span>
    </div>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['synced', 'syncing', 'error', 'offline', 'idle'])
    .isRequired,
  customText: PropTypes.string,
  customIcon: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  animated: PropTypes.bool,
  className: PropTypes.string,
};
