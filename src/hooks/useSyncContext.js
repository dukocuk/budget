/**
 * Hook to access SyncContext
 * Separated from SyncContext.jsx to avoid fast-refresh issues
 */

import { useContext } from 'react'
import { SyncContext } from '../contexts/SyncContext'

/**
 * Hook to access sync context
 * @returns {Object} Sync state and methods
 */
export const useSyncContext = () => {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider')
  }
  return context
}
