/**
 * TabView component for no-scroll navigation
 * Provides tab-based interface with dropdown menu support
 */

import { useState, memo } from 'react';
import { useViewportSize } from '../../hooks/useViewportSize';
import './TabView.css';

const TabViewComponent = ({ tabs, activeTab = 0, onTabChange }) => {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [selectedDropdownItems, setSelectedDropdownItems] = useState({});
  const { isMobile } = useViewportSize();

  const handleTabClick = (index, hasDropdown) => {
    const tab = tabs[index];

    if (hasDropdown && isMobile) {
      // Toggle dropdown on mobile (click-based)
      setDropdownOpen(dropdownOpen === index ? null : index);
    } else if (!hasDropdown) {
      // Regular tab without dropdown
      onTabChange(index);
      setDropdownOpen(null);
    } else {
      // Desktop: Just switch tab (hover handles dropdown)
      onTabChange(index);
    }

    // If tab has dropdown, select first item by default
    if (tab.dropdownItems && !selectedDropdownItems[index]) {
      setSelectedDropdownItems({
        ...selectedDropdownItems,
        [index]: 0,
      });
    }
  };

  const handleDropdownItemClick = (tabIndex, itemIndex) => {
    setSelectedDropdownItems({
      ...selectedDropdownItems,
      [tabIndex]: itemIndex,
    });
    setDropdownOpen(null);
  };

  // Desktop hover behavior (only for non-mobile)
  const handleMouseEnter = (index, hasDropdown) => {
    if (!isMobile && hasDropdown) {
      setDropdownOpen(index);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setDropdownOpen(null);
    }
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
            onMouseEnter={() => handleMouseEnter(index, tab.dropdownItems)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={() => handleTabClick(index, tab.dropdownItems)}
              aria-label={tab.label}
              aria-selected={activeTab === index}
              aria-expanded={
                tab.dropdownItems ? dropdownOpen === index : undefined
              }
              aria-haspopup={tab.dropdownItems ? 'menu' : undefined}
              role="tab"
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.dropdownItems && (
                <span className="dropdown-arrow" aria-hidden="true">
                  {dropdownOpen === index ? '▲' : '▼'}
                </span>
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

// Export memoized component with default comparison (shallow prop equality)
// This allows the component to re-render when tab content changes
export const TabView = memo(TabViewComponent);
