/**
 * Alert Context Consumer Hook
 * Use this hook to access alert functionality from any component
 * Follows the same pattern as useModal() and useExpenseContext()
 */

import { useContext } from 'react';
import { AlertContext } from '../contexts/AlertContext';

export function useAlertContext() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlertContext must be used within AlertProvider');
  }
  return context;
}
