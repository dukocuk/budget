/**
 * TabView component for no-scroll navigation
 * Provides tab-based interface for Overview, Expenses, and Monthly views
 */

import './TabView.css'

export const TabView = ({ tabs, activeTab = 0, onTabChange }) => {
  return (
    <div className="tab-view">
      <div className="tab-header">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === index ? 'active' : ''}`}
            onClick={() => onTabChange(index)}
            aria-label={tab.label}
            aria-selected={activeTab === index}
            role="tab"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs[activeTab]?.content}
      </div>
    </div>
  )
}
