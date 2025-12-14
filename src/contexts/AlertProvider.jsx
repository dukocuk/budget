/**
 * Alert Provider - Centralized alert state management
 * Follows the same pattern as ModalProvider and ExpenseProvider
 * Provides alert state to entire app via context
 */

import { useState, useCallback } from 'react';
import { ALERT_TYPES, ALERT_DURATION } from '../utils/constants';
import { AlertContext } from './AlertContext';

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = ALERT_TYPES.INFO) => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), ALERT_DURATION);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ alert, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
}
