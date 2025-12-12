/**
 * Budget Period Context - Context definition for budget period state management
 * Separated from BudgetPeriodProvider to support React Fast Refresh
 */

import { createContext } from 'react';

export const BudgetPeriodContext = createContext(null);
