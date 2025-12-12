import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Dashboard from './Dashboard';
import ExpenseManager from './ExpenseManager';
import MonthlyView from './MonthlyView';
import Settings from './Settings';
import './Layout.css';

/**
 * Layout Component (Alternative Layout - NOT CURRENTLY USED)
 *
 * WARNING: This component contains a duplicate Google profile image that can cause
 * HTTP 429 (Too Many Requests) errors from Google's CDN. The main app uses Header.jsx
 * instead. If you need to use this Layout component, remove the duplicate image or
 * implement the same rate-limiting prevention strategies as Header.jsx:
 * - referrerPolicy="no-referrer"
 * - loading="lazy"
 * - onError fallback handler
 */
export default function Layout() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Oversigt', icon: '📊' },
    { id: 'expenses', label: 'Udgifter', icon: '💰' },
    { id: 'monthly', label: 'Månedsoversigt', icon: '📅' },
    { id: 'settings', label: 'Indstillinger', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'expenses':
        return <ExpenseManager />;
      case 'monthly':
        return <MonthlyView />;
      case 'settings':
        return <Settings userId={user.id} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-title">
            <h1>💰 Budget Tracker</h1>
            <p>Administrer dine faste udgifter i DKK</p>
          </div>

          <div className="header-user">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || user.email}
                className="user-avatar"
                crossOrigin="anonymous"
              />
            )}
            <div className="user-info">
              <span className="user-name">
                {user.user_metadata?.full_name || user.email}
              </span>
              <button onClick={signOut} className="btn-logout">
                Log ud
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <div className="tab-container">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="layout-content">{renderContent()}</main>
    </div>
  );
}
