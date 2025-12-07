import React from 'react';
import './BottomTabBar.css';

/**
 * Mobile bottom tab bar navigation (iOS/Android pattern)
 *
 * Features:
 * - Fixed bottom positioning
 * - Icon + abbreviated label
 * - Touch-friendly 56px height
 * - Safe area support (iPhone notch)
 * - Active state indicator
 *
 * @param {Object} props - Component props
 * @param {number} props.activeTab - Current active tab index (0-3)
 * @param {Function} props.onTabChange - Callback when tab is selected
 */
const BottomTabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { icon: '📊', label: 'Over', fullLabel: 'Oversigt' },
    { icon: '📝', label: 'Udgif', fullLabel: 'Udgifter' },
    { icon: '📅', label: 'Måned', fullLabel: 'Månedlig oversigt' },
    { icon: '📈', label: 'Samml', fullLabel: 'Sammenligning' },
  ];

  return (
    <nav className="bottom-tab-bar" role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={index}
          className={`tab-button ${activeTab === index ? 'active' : ''}`}
          onClick={() => onTabChange(index)}
          role="tab"
          aria-selected={activeTab === index}
          aria-label={tab.fullLabel}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomTabBar;
