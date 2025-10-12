import { useState, useMemo } from 'react';

/**
 * Custom hook for managing expense filtering and search
 * @param {Array} expenses - Array of expense objects to filter
 * @returns {Object} Filter state and methods
 */
export function useExpenseFilters(expenses) {
  const [searchText, setSearchText] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  /**
   * Filter expenses based on active filters
   */
  const filteredExpenses = useMemo(() => {
    // Guard against undefined/null expenses array
    if (!expenses || !Array.isArray(expenses)) {
      return [];
    }

    return expenses.filter(expense => {
      // Search text filter (case-insensitive)
      const matchesSearch = !searchText ||
        expense.name.toLowerCase().includes(searchText.toLowerCase());

      // Frequency filter
      const matchesFrequency = frequencyFilter === 'all' ||
        expense.frequency === frequencyFilter;

      // Month filter (checks if expense is active in the selected month)
      const matchesMonth = monthFilter === 'all' || (() => {
        const month = parseInt(monthFilter);
        return expense.startMonth <= month && expense.endMonth >= month;
      })();

      return matchesSearch && matchesFrequency && matchesMonth;
    });
  }, [expenses, searchText, frequencyFilter, monthFilter]);

  /**
   * Clear all active filters
   */
  const clearFilters = () => {
    setSearchText('');
    setFrequencyFilter('all');
    setMonthFilter('all');
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = searchText || frequencyFilter !== 'all' || monthFilter !== 'all';

  return {
    // Filtered data
    filteredExpenses,

    // Search
    searchText,
    setSearchText,

    // Frequency filter
    frequencyFilter,
    setFrequencyFilter,

    // Month filter
    monthFilter,
    setMonthFilter,

    // Utilities
    clearFilters,
    hasActiveFilters,
    filterCount: (expenses?.length || 0) - filteredExpenses.length,
  };
}
