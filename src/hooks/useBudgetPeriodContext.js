/**
 * useBudgetPeriodContext - Consumer hook for Budget Period Context
 * Provides access to centralized budget period state and actions
 */

import { useContext } from 'react';
import { BudgetPeriodContext } from '../contexts/BudgetPeriodProvider';

export function useBudgetPeriodContext() {
  const context = useContext(BudgetPeriodContext);

  if (!context) {
    throw new Error(
      'useBudgetPeriodContext must be used within a BudgetPeriodProvider'
    );
  }

  return context;
}
