/**
 * Custom hook for automatic Supabase cloud synchronization
 * DEPRECATED: This hook is now a compatibility wrapper for SyncContext
 * Use useSyncContext() directly in new code
 *
 * @deprecated Use useSyncContext from '../contexts/SyncContext' instead
 */

import { useSyncContext } from './useSyncContext'

/**
 * Hook for managing automatic cloud sync with Supabase
 * @deprecated Use useSyncContext directly instead
 * @returns {Object} Sync state and methods
 */
export const useSupabaseSync = () => {
  // Simply delegate to the new SyncContext
  // The user is already provided to SyncProvider at the App level
  return useSyncContext()
}
