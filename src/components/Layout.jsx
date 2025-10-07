import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Dashboard from './Dashboard'
import ExpenseManager from './ExpenseManager'
import MonthlyView from './MonthlyView'
import Settings from './Settings'
import './Layout.css'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Oversigt', icon: '📊' },
    { id: 'expenses', label: 'Udgifter', icon: '💰' },
    { id: 'monthly', label: 'Månedsoversigt', icon: '📅' },
    { id: 'settings', label: 'Indstillinger', icon: '⚙️' }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard userId={user.id} />
      case 'expenses':
        return <ExpenseManager userId={user.id} />
      case 'monthly':
        return <MonthlyView userId={user.id} />
      case 'settings':
        return <Settings userId={user.id} />
      default:
        return <Dashboard userId={user.id} />
    }
  }

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-content">
          <div className="header-title">
            <h1>💰 Budget Tracker 2025</h1>
            <p>Administrer dine faste udgifter i DKK</p>
          </div>

          <div className="header-user">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || user.email}
                className="user-avatar"
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
      <main className="layout-content">
        {renderContent()}
      </main>
    </div>
  )
}
