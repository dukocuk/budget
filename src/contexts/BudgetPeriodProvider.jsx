/**
 * Budget Period Provider - Centralized budget period state management
 * Wraps useBudgetPeriods hook to eliminate prop drilling
 */

import { createContext, useMemo } from 'react';
import { useBudgetPeriods } from '../hooks/useBudgetPeriods';

export const BudgetPeriodContext = createContext(null);

export function BudgetPeriodProvider({ children, userId }) {
  // Core budget period management from hook
  const {
    periods,
    activePeriod,
    loading,
    error,
    createPeriod,
    updatePeriod,
    archivePeriod,
    unarchivePeriod,
    deletePeriod,
    calculateEndingBalance,
    getActivePeriod,
    getExpensesForPeriod,
    createFromTemplate,
    getTemplates,
    saveAsTemplate,
    deleteTemplate,
    fetchPeriodsFromDB,
    reload,
  } = useBudgetPeriods(userId);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      // State
      periods,
      activePeriod,
      loading,
      error,

      // Actions
      createPeriod,
      updatePeriod,
      archivePeriod,
      unarchivePeriod,
      deletePeriod,
      calculateEndingBalance,
      getActivePeriod,
      getExpensesForPeriod,

      // Template actions
      createFromTemplate,
      getTemplates,
      saveAsTemplate,
      deleteTemplate,

      // Utilities
      fetchPeriodsFromDB,
      reload,
    }),
    [
      periods,
      activePeriod,
      loading,
      error,
      createPeriod,
      updatePeriod,
      archivePeriod,
      unarchivePeriod,
      deletePeriod,
      calculateEndingBalance,
      getActivePeriod,
      getExpensesForPeriod,
      createFromTemplate,
      getTemplates,
      saveAsTemplate,
      deleteTemplate,
      fetchPeriodsFromDB,
      reload,
    ]
  );

  return (
    <BudgetPeriodContext.Provider value={value}>
      {children}
    </BudgetPeriodContext.Provider>
  );
}
