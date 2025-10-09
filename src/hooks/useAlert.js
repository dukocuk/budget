/**
 * Custom hook for alert notifications
 */

import { useState, useCallback } from 'react'
import { ALERT_TYPES, ALERT_DURATION } from '../utils/constants'

/**
 * Hook for managing alert notifications
 * @returns {Object} Alert state and showAlert method
 */
export const useAlert = () => {
  const [alert, setAlert] = useState(null)

  const showAlert = useCallback((message, type = ALERT_TYPES.INFO) => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), ALERT_DURATION)
  }, [])

  const hideAlert = useCallback(() => {
    setAlert(null)
  }, [])

  return {
    alert,
    showAlert,
    hideAlert
  }
}
