/**
 * Header component with user info and connection status
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSyncContext } from '../hooks/useSyncContext';
import { useViewportSize } from '../hooks/useViewportSize';
import './Header.css';

export const Header = ({ user, onOpenSettings }) => {
  const { signOut } = useAuth();
  const { isMobile } = useViewportSize();
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get sync status from isolated context (won't trigger parent re-renders)
  const { syncStatus, isOnline } = useSyncContext();

  // Get connection status display
  const getConnectionStatus = () => {
    if (!isOnline) {
      return { icon: '📴', text: 'Offline', className: 'status-offline' };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          icon: '🔄',
          text: 'Synkroniserer',
          className: 'status-syncing',
        };
      case 'synced':
        return {
          icon: '✅',
          text: 'Synkroniseret',
          className: 'status-synced',
        };
      case 'error':
        return { icon: '❌', text: 'Fejl', className: 'status-error' };
      default:
        return { icon: '☁️', text: 'Online', className: 'status-online' };
    }
  };

  const connectionStatus = getConnectionStatus();

  // Handle image load errors (rate limiting, network issues)
  const handleImageError = () => {
    console.warn('⚠️ Failed to load profile image (possibly rate limited)');
    setImageError(true);
  };

  return (
    <header
      className={`header ${isMobile ? 'mobile' : 'desktop'} ${isExpanded ? 'expanded' : 'collapsed'}`}
    >
      <div className="header-content">
        {/* Mobile: Compact header with expand toggle */}
        {isMobile ? (
          <>
            <div className="header-mobile-compact">
              <div className="header-title-compact">
                <h1>💰 Budget Tracker</h1>
              </div>

              {user && (
                <div className="header-mobile-actions">
                  <div
                    className={`connection-status-compact ${connectionStatus.className}`}
                  >
                    <span className="status-icon">{connectionStatus.icon}</span>
                  </div>

                  <button
                    className="header-expand-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Skjul header' : 'Vis header'}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: Expanded user info (collapsible) */}
            {isExpanded && user && (
              <div className="header-mobile-expanded">
                <div className="user-info">
                  {user.user_metadata?.avatar_url && !imageError ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || user.email}
                      className="user-avatar"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="user-avatar user-avatar-fallback">
                      {(user.user_metadata?.full_name || user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="user-details">
                    <span className="user-name">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </div>
                </div>

                <div
                  className={`connection-status ${connectionStatus.className}`}
                >
                  <span className="status-icon">{connectionStatus.icon}</span>
                  <span className="status-text">{connectionStatus.text}</span>
                </div>

                <div className="header-mobile-buttons">
                  <button
                    onClick={onOpenSettings}
                    className="btn-settings"
                    title="Indstillinger"
                  >
                    <span className="btn-icon">⚙️</span>
                    <span>Indstillinger</span>
                  </button>

                  <button
                    onClick={signOut}
                    className="btn-logout"
                    title="Log ud"
                  >
                    <span className="btn-icon">↪️</span>
                    <span>Log ud</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Desktop: Full header (non-collapsible) */
          <>
            <div className="header-title">
              <h1>💰 Budget Tracker</h1>
              <p>Administrer dine faste udgifter i DKK</p>
            </div>

            {user && (
              <div className="header-user">
                <div
                  className={`connection-status ${connectionStatus.className}`}
                >
                  <span className="status-icon">{connectionStatus.icon}</span>
                  <span className="status-text">{connectionStatus.text}</span>
                </div>

                <div className="user-info">
                  {user.user_metadata?.avatar_url && !imageError ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || user.email}
                      className="user-avatar"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="user-avatar user-avatar-fallback">
                      {(user.user_metadata?.full_name || user.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="user-details">
                    <span className="user-name">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onOpenSettings}
                  className="btn-settings"
                  title="Indstillinger"
                >
                  ⚙️
                </button>

                <button onClick={signOut} className="btn-logout" title="Log ud">
                  ↪️ Log ud
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
};
