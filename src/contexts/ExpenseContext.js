/**
 * Expense Context - Context definition for expense state management
 * Separated from ExpenseProvider to support React Fast Refresh
 */

import { createContext } from 'react';

export const ExpenseContext = createContext(null);
