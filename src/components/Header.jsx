/**
 * Header component with user info and connection status
 */

import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSyncContext } from '../hooks/useSyncContext'
import './Header.css'

export const Header = ({ user }) => {
  const { signOut } = useAuth()
  const [imageError, setImageError] = useState(false)

  // Get sync status from isolated context (won't trigger parent re-renders)
  const { syncStatus, isOnline } = useSyncContext()

  // Get connection status display
  const getConnectionStatus = () => {
    if (!isOnline) {
      return { icon: '📴', text: 'Offline', className: 'status-offline' }
    }

    switch (syncStatus) {
      case 'syncing':
        return { icon: '🔄', text: 'Synkroniserer', className: 'status-syncing' }
      case 'synced':
        return { icon: '✅', text: 'Synkroniseret', className: 'status-synced' }
      case 'error':
        return { icon: '❌', text: 'Fejl', className: 'status-error' }
      default:
        return { icon: '☁️', text: 'Online', className: 'status-online' }
    }
  }

  const connectionStatus = getConnectionStatus()

  // Handle image load errors (rate limiting, network issues)
  const handleImageError = () => {
    console.warn('⚠️ Failed to load profile image (possibly rate limited)')
    setImageError(true)
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>💰 Budget Tracker</h1>
          <p>Administrer dine faste udgifter i DKK</p>
        </div>

        {user && (
          <div className="header-user">
            <div className={`connection-status ${connectionStatus.className}`}>
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
                  {(user.user_metadata?.full_name || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="user-details">
                <span className="user-name">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
            </div>

            <button onClick={signOut} className="btn-logout" title="Log ud">
              ↪️ Log ud
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
