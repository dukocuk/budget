import { useState, useEffect } from 'react';

/**
 * Custom hook for managing theme (light/dark mode) with localStorage persistence
 * @returns {Object} Theme state and toggle function
 */
export function useTheme() {
  // Check localStorage for saved theme preference, default to 'light'
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('budgetTheme');
      return savedTheme || 'light';
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      return 'light';
    }
  });

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      return newTheme;
    });
  };

  /**
   * Set a specific theme
   * @param {string} newTheme - 'light' or 'dark'
   */
  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
    }
  };

  /**
   * Apply theme to document root and save to localStorage
   */
  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.setAttribute('data-theme', theme);

    // Save to localStorage
    try {
      localStorage.setItem('budgetTheme', theme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  }, [theme]);

  /**
   * Check system preference on mount
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Only auto-set if user hasn't manually chosen a theme
    const savedTheme = localStorage.getItem('budgetTheme');
    if (!savedTheme && mediaQuery.matches) {
      setTheme('dark');
    }

    // Listen for system preference changes
    const handler = (e) => {
      // Only auto-update if user hasn't manually set a preference
      const currentSavedTheme = localStorage.getItem('budgetTheme');
      if (!currentSavedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return {
    theme,
    toggleTheme,
    setSpecificTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };
}
