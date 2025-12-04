/**
 * SyncContext - Cloud sync with Google Drive
 * MIGRATION: Replaced Supabase with Google Drive API
 *
 * Features:
 * - Single JSON file storage in Google Drive
 * - Auto-sync with debouncing (1 second delay)
 * - Polling for multi-device updates (30 seconds)
 * - Last-write-wins conflict resolution
 * - Offline-first architecture (PGlite primary storage)
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  downloadBudgetData,
  uploadBudgetData,
  checkForUpdates,
} from '../lib/googleDrive';
import { logger } from '../utils/logger';

// eslint-disable-next-line react-refresh/only-export-components
export const SyncContext = createContext(null);

const SYNC_DEBOUNCE_DELAY = 1000; // 1 second
const POLLING_INTERVAL = 30000; // 30 seconds

/**
 * SyncProvider - Manages Google Drive sync state
 * @param {Object} props - Component props
 * @param {Object} props.user - Authenticated user object
 * @param {ReactNode} props.children - Child components
 */
export const SyncProvider = ({ user, children }) => {
  // Sync status (idle, syncing, synced, error, offline)
  const syncStatusRef = useRef('idle');
  const lastSyncTimeRef = useRef(null);
  const syncErrorRef = useRef(null);

  // UI state (only updates when needed)
  const [uiSyncStatus, setUiSyncStatus] = useState('idle');
  const [uiLastSyncTime, setUiLastSyncTime] = useState(null);
  const [uiSyncError, setUiSyncError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Debouncing and sync control
  const syncTimeoutRef = useRef(null);
  const isSyncingRef = useRef(false);
  const pollingIntervalRef = useRef(null);

  // Track last synced timestamp for conflict detection
  const lastRemoteModifiedRef = useRef(null);

  /**
   * Update sync status - updates both ref and UI state
   */
  const updateSyncStatus = useCallback(status => {
    syncStatusRef.current = status;
    setUiSyncStatus(status);
  }, []);

  const updateSyncError = useCallback(error => {
    syncErrorRef.current = error;
    setUiSyncError(error);
  }, []);

  const updateLastSyncTime = useCallback(time => {
    lastSyncTimeRef.current = time;
    setUiLastSyncTime(time);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateSyncStatus('idle');
      logger.log('🌐 Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateSyncStatus('offline');
      logger.log('📴 Offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSyncStatus]);

  /**
   * Unified sync function - uploads all data to Google Drive
   * @param {Array} expenses - Expense array
   * @param {Array} budgetPeriods - Budget periods array
   * @param {Object} settings - Settings object (optional, for backward compatibility)
   */
  const syncToCloud = useCallback(
    async (expenses, budgetPeriods, settings = {}) => {
      if (!user || !isOnline || isSyncingRef.current) {
        logger.log('⚠️ Sync skipped:', {
          hasUser: !!user,
          isOnline,
          isSyncing: isSyncingRef.current,
        });
        return;
      }

      try {
        isSyncingRef.current = true;
        updateSyncStatus('syncing');
        updateSyncError(null);

        logger.log('☁️ Starting Google Drive sync...');

        // Prepare data with timestamp
        const dataToUpload = {
          expenses: expenses || [],
          budgetPeriods: budgetPeriods || [],
          settings: settings || {},
        };

        // Upload to Google Drive
        const result = await uploadBudgetData(dataToUpload);

        if (result.success) {
          lastRemoteModifiedRef.current = result.lastModified;
          updateLastSyncTime(new Date());
          updateSyncStatus('synced');
          logger.log('✅ Sync successful:', {
            expenses: dataToUpload.expenses.length,
            periods: dataToUpload.budgetPeriods.length,
            lastModified: result.lastModified,
          });

          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (syncStatusRef.current === 'synced') {
              updateSyncStatus('idle');
            }
          }, 2000);
        }
      } catch (error) {
        logger.error('❌ Sync error:', error);
        updateSyncError(error.message);
        updateSyncStatus('error');

        // Clear error after 5 seconds
        setTimeout(() => {
          if (syncStatusRef.current === 'error') {
            updateSyncError(null);
            updateSyncStatus('idle');
          }
        }, 5000);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]
  );

  /**
   * Load data from Google Drive
   * @returns {Promise<{expenses: Array, budgetPeriods: Array, settings: Object}>}
   */
  const loadFromCloud = useCallback(async () => {
    if (!user || !isOnline) {
      logger.log('⚠️ Load skipped: no user or offline');
      return { expenses: [], budgetPeriods: [], settings: {} };
    }

    try {
      logger.log('📥 Loading data from Google Drive...');

      const data = await downloadBudgetData();

      if (data) {
        lastRemoteModifiedRef.current = data.lastModified;
        logger.log('✅ Data loaded:', {
          expenses: data.expenses?.length || 0,
          periods: data.budgetPeriods?.length || 0,
          lastModified: data.lastModified,
        });

        return {
          expenses: data.expenses || [],
          budgetPeriods: data.budgetPeriods || [],
          settings: data.settings || {},
        };
      }

      logger.log('ℹ️ No existing data in Google Drive');
      return { expenses: [], budgetPeriods: [], settings: {} };
    } catch (error) {
      logger.error('❌ Load error:', error);
      updateSyncError(error.message);
      return { expenses: [], budgetPeriods: [], settings: {} };
    }
  }, [user, isOnline, updateSyncError]);

  /**
   * Check for updates and download if newer
   * Used by polling mechanism for multi-device sync
   */
  const checkAndDownloadUpdates = useCallback(async () => {
    if (!user || !isOnline || isSyncingRef.current) return null;

    try {
      const hasUpdates = await checkForUpdates(lastRemoteModifiedRef.current);

      if (hasUpdates) {
        logger.log('🔄 Remote updates detected, downloading...');
        const data = await downloadBudgetData();

        if (data) {
          lastRemoteModifiedRef.current = data.lastModified;
          logger.log('✅ Updates downloaded:', {
            expenses: data.expenses?.length || 0,
            periods: data.budgetPeriods?.length || 0,
          });
          return data;
        }
      }

      return null;
    } catch (error) {
      logger.error('❌ Update check error:', error);
      return null;
    }
  }, [user, isOnline]);

  /**
   * Start polling for remote updates (multi-device sync)
   */
  useEffect(() => {
    if (!user || !isOnline) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        logger.log('⏸️ Polling stopped');
      }
      return;
    }

    // Start polling
    logger.log('▶️ Starting polling for remote updates (30s interval)');
    pollingIntervalRef.current = setInterval(
      checkAndDownloadUpdates,
      POLLING_INTERVAL
    );

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        logger.log('⏹️ Polling stopped');
      }
    };
  }, [user, isOnline, checkAndDownloadUpdates]);

  /**
   * Debounced sync for expenses
   */
  const syncExpenses = useCallback(
    expenses => {
      if (!user || !isOnline) return;

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce sync
      syncTimeoutRef.current = setTimeout(() => {
        // Note: We need periods and settings for complete sync
        // These will be loaded from PGlite when we implement full sync
        syncToCloud(expenses, [], {});
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud]
  );

  /**
   * Debounced sync for budget periods
   */
  const syncBudgetPeriods = useCallback(
    periods => {
      if (!user || !isOnline) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud([], periods, {});
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud]
  );

  /**
   * Debounced sync for settings
   */
  const syncSettings = useCallback(
    (monthlyPayment, previousBalance, monthlyPayments) => {
      if (!user || !isOnline) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        const settings = {
          monthlyPayment,
          previousBalance,
          monthlyPayments,
        };
        syncToCloud([], [], settings);
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud]
  );

  /**
   * Load expenses from Google Drive
   */
  const loadExpenses = useCallback(async () => {
    const data = await loadFromCloud();
    return {
      success: true,
      data: data.expenses || [],
    };
  }, [loadFromCloud]);

  /**
   * Load budget periods from Google Drive
   */
  const loadBudgetPeriods = useCallback(async () => {
    const data = await loadFromCloud();
    return {
      success: true,
      data: data.budgetPeriods || [],
    };
  }, [loadFromCloud]);

  /**
   * Load settings from Google Drive (deprecated - kept for compatibility)
   */
  const loadSettings = useCallback(async () => {
    const data = await loadFromCloud();
    return {
      success: true,
      data: data.settings || {},
    };
  }, [loadFromCloud]);

  /**
   * Immediate sync (bypasses debounce) - for critical operations
   */
  const immediateSyncExpenses = useCallback(
    async expenses => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      await syncToCloud(expenses, [], {});
    },
    [syncToCloud]
  );

  const immediateSyncBudgetPeriods = useCallback(
    async periods => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      await syncToCloud([], periods, {});
    },
    [syncToCloud]
  );

  const immediateSyncSettings = useCallback(
    async (monthlyPayment, previousBalance, monthlyPayments) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      const settings = { monthlyPayment, previousBalance, monthlyPayments };
      await syncToCloud([], [], settings);
    },
    [syncToCloud]
  );

  // Context value
  const value = {
    // Sync status (for UI components)
    syncStatus: uiSyncStatus,
    lastSyncTime: uiLastSyncTime,
    syncError: uiSyncError,
    isOnline,

    // Sync methods (debounced)
    syncExpenses,
    syncBudgetPeriods,
    syncSettings,

    // Load methods
    loadExpenses,
    loadBudgetPeriods,
    loadSettings,

    // Immediate sync (no debounce)
    immediateSyncExpenses,
    immediateSyncBudgetPeriods,
    immediateSyncSettings,

    // Utility
    checkAndDownloadUpdates,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
