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
import { localDB } from '../lib/pglite';
import { validateCloudData } from '../utils/validators';
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
   * Fetch complete local data from PGlite database
   * This ensures we always sync the COMPLETE dataset, not partial updates
   * @param {string} userId - User ID for filtering
   * @returns {Promise<{expenses: Array, budgetPeriods: Array, settings: Object}>}
   */
  const fetchCompleteLocalData = useCallback(async userId => {
    if (!userId) {
      return { expenses: [], budgetPeriods: [], settings: {} };
    }

    try {
      // Fetch ALL expenses for this user (across all periods)
      const expensesResult = await localDB.query(
        'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC',
        [userId]
      );

      const expenses = expensesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        amount: row.amount,
        frequency: row.frequency,
        startMonth: row.start_month,
        endMonth: row.end_month,
        budgetPeriodId: row.budget_period_id,
        monthlyAmounts: row.monthly_amounts
          ? JSON.parse(row.monthly_amounts)
          : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Fetch ALL budget periods for this user
      const periodsResult = await localDB.query(
        'SELECT * FROM budget_periods WHERE user_id = $1 ORDER BY year DESC',
        [userId]
      );

      const budgetPeriods = periodsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        year: row.year,
        monthlyPayment: row.monthly_payment,
        previousBalance: row.previous_balance,
        monthlyPayments: row.monthly_payments
          ? JSON.parse(row.monthly_payments)
          : null,
        status: row.status,
        isTemplate: row.is_template === 1,
        templateName: row.template_name,
        templateDescription: row.template_description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Settings are deprecated - extract from active period if needed
      const activePeriod = budgetPeriods.find(p => p.status === 'active');
      const settings = activePeriod
        ? {
            monthlyPayment: activePeriod.monthlyPayment,
            previousBalance: activePeriod.previousBalance,
            monthlyPayments: activePeriod.monthlyPayments,
          }
        : {};

      logger.log('📦 Fetched complete local data:', {
        expenses: expenses.length,
        periods: budgetPeriods.length,
        hasSettings: !!activePeriod,
      });

      return { expenses, budgetPeriods, settings };
    } catch (error) {
      logger.error('❌ Error fetching complete local data:', error);
      return { expenses: [], budgetPeriods: [], settings: {} };
    }
  }, []);

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
   * Unified sync function - uploads COMPLETE dataset to Google Drive
   * CRITICAL FIX: Now validates and ensures complete data upload
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

        // CRITICAL: Validate data before upload to prevent data loss
        const validation = validateCloudData(dataToUpload);
        if (!validation.valid) {
          logger.error('❌ Cloud data validation failed:', validation.warnings);
          validation.warnings.forEach(warning => logger.warn(warning));

          // Reject upload if critical issues detected
          if (
            validation.warnings.some(w => w.includes('KRITISK')) ||
            (dataToUpload.budgetPeriods.length === 0 &&
              dataToUpload.expenses.length > 0)
          ) {
            throw new Error(
              'Afviser synkronisering: Data ville slette budgetperioder i skyen. Kontakt support.'
            );
          }
        }

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
   * CRITICAL FIX: Now fetches complete local data before syncing
   */
  const syncExpenses = useCallback(
    expenses => {
      if (!user || !isOnline) return;

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce sync with fetch-merge-upload pattern
      syncTimeoutRef.current = setTimeout(async () => {
        logger.log('🔄 Fetching complete local data for expense sync...');
        const localData = await fetchCompleteLocalData(user.id);

        // Use local expenses (just changed) and complete periods/settings from DB
        syncToCloud(expenses, localData.budgetPeriods, localData.settings);
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
  );

  /**
   * Debounced sync for budget periods
   * CRITICAL FIX: Now fetches complete local data before syncing
   */
  const syncBudgetPeriods = useCallback(
    periods => {
      if (!user || !isOnline) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        logger.log('🔄 Fetching complete local data for period sync...');
        const localData = await fetchCompleteLocalData(user.id);

        // Use local periods (just changed) and complete expenses/settings from DB
        syncToCloud(localData.expenses, periods, localData.settings);
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
  );

  /**
   * Debounced sync for settings
   * CRITICAL FIX: Now fetches complete local data before syncing
   */
  const syncSettings = useCallback(
    (monthlyPayment, previousBalance, monthlyPayments) => {
      if (!user || !isOnline) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        logger.log('🔄 Fetching complete local data for settings sync...');
        const localData = await fetchCompleteLocalData(user.id);

        const settings = {
          monthlyPayment,
          previousBalance,
          monthlyPayments,
        };

        // Use complete expenses/periods from DB and new settings
        syncToCloud(localData.expenses, localData.budgetPeriods, settings);
      }, SYNC_DEBOUNCE_DELAY);
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
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
   * CRITICAL FIX: Now fetches complete local data before syncing
   */
  const immediateSyncExpenses = useCallback(
    async expenses => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (!user) return;

      logger.log('⚡ Immediate expense sync - fetching complete local data...');
      const localData = await fetchCompleteLocalData(user.id);
      await syncToCloud(expenses, localData.budgetPeriods, localData.settings);
    },
    [syncToCloud, fetchCompleteLocalData, user]
  );

  const immediateSyncBudgetPeriods = useCallback(
    async periods => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (!user) return;

      logger.log('⚡ Immediate period sync - fetching complete local data...');
      const localData = await fetchCompleteLocalData(user.id);
      await syncToCloud(localData.expenses, periods, localData.settings);
    },
    [syncToCloud, fetchCompleteLocalData, user]
  );

  const immediateSyncSettings = useCallback(
    async (monthlyPayment, previousBalance, monthlyPayments) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (!user) return;

      logger.log(
        '⚡ Immediate settings sync - fetching complete local data...'
      );
      const localData = await fetchCompleteLocalData(user.id);
      const settings = { monthlyPayment, previousBalance, monthlyPayments };
      await syncToCloud(localData.expenses, localData.budgetPeriods, settings);
    },
    [syncToCloud, fetchCompleteLocalData, user]
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
