/**
 * TabView component for no-scroll navigation
 * Provides tab-based interface with dropdown menu support
 */

import { useState } from 'react';
import './TabView.css';

export const TabView = ({ tabs, activeTab = 0, onTabChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [selectedDropdownItems, setSelectedDropdownItems] = useState({});

  const handleTabClick = index => {
    const tab = tabs[index];

    // If tab has dropdown, select first item by default
    if (tab.dropdownItems && !selectedDropdownItems[index]) {
      setSelectedDropdownItems({
        ...selectedDropdownItems,
        [index]: 0,
      });
    }

    onTabChange(index);
  };

  const handleDropdownItemClick = (tabIndex, itemIndex) => {
    setSelectedDropdownItems({
      ...selectedDropdownItems,
      [tabIndex]: itemIndex,
    });
    setDropdownOpen(null);
  };

  const getTabContent = (tab, tabIndex) => {
    if (!tab) return null;
    if (tab.dropdownItems) {
      const selectedItemIndex = selectedDropdownItems[tabIndex] ?? 0;
      return tab.dropdownItems[selectedItemIndex]?.content;
    }
    return tab.content;
  };

  return (
    <div className="tab-view">
      <div className="tab-header">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className="tab-wrapper"
            onMouseEnter={() => tab.dropdownItems && setDropdownOpen(index)}
            onMouseLeave={() => setDropdownOpen(null)}
          >
            <button
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={() => handleTabClick(index)}
              aria-label={tab.label}
              aria-selected={activeTab === index}
              role="tab"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.dropdownItems && (
                <span className="tab-dropdown-arrow">▼</span>
              )}
            </button>

            {tab.dropdownItems && dropdownOpen === index && (
              <div className="tab-dropdown">
                {tab.dropdownItems.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    className={`dropdown-item ${selectedDropdownItems[index] === itemIndex ? 'selected' : ''}`}
                    onClick={() => handleDropdownItemClick(index, itemIndex)}
                  >
                    <span className="dropdown-icon">{item.icon}</span>
                    <span className="dropdown-label">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="tab-content">
        {getTabContent(tabs[activeTab], activeTab)}
      </div>
    </div>
  );
};
