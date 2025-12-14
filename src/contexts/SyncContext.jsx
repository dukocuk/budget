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
  createBackup,
  listBackups,
  downloadBackup,
  deleteOldBackups,
} from '../lib/googleDrive';
import { localDB } from '../lib/pglite';
import { validateCloudData, validateDownloadedData } from '../utils/validators';
import { logger } from '../utils/logger';
import { SyncCoordinator } from '../lib/syncCoordinator';

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

  // Sync coordinator (centralized sync queue management)
  const coordinatorRef = useRef(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new SyncCoordinator();
  }
  const isSyncingRef = useRef(false);
  const pollingIntervalRef = useRef(null);

  // Track last synced timestamp for conflict detection
  const lastRemoteModifiedRef = useRef(null);

  // Cache to prevent duplicate downloads during initialization
  const cloudDataCacheRef = useRef(null);
  const cloudDataPromiseRef = useRef(null);

  /**
   * Fetch complete local data from PGlite database
   * This ensures we always sync the COMPLETE dataset, not partial updates
   * @param {string} userId - User ID for filtering
   * @returns {Promise<{expenses: Array, budgetPeriods: Array}>}
   */
  const fetchCompleteLocalData = useCallback(async userId => {
    if (!userId) {
      return { expenses: [], budgetPeriods: [] };
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

      logger.log('📦 Fetched complete local data:', {
        expenses: expenses.length,
        periods: budgetPeriods.length,
      });

      return { expenses, budgetPeriods };
    } catch (error) {
      logger.error('❌ Error fetching complete local data:', error);
      return { expenses: [], budgetPeriods: [] };
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
   */
  const syncToCloud = useCallback(
    async (expenses, budgetPeriods) => {
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
   * @returns {Promise<{expenses: Array, budgetPeriods: Array}>}
   */
  const loadFromCloud = useCallback(async () => {
    if (!user || !isOnline) {
      logger.log('⚠️ Load skipped: no user or offline');
      return { expenses: [], budgetPeriods: [] };
    }

    // Return cached data if available (prevents duplicate downloads during initialization)
    if (cloudDataCacheRef.current) {
      logger.log('📦 Using cached cloud data (avoiding duplicate download)');
      return cloudDataCacheRef.current;
    }

    // Return existing promise if download already in progress
    if (cloudDataPromiseRef.current) {
      logger.log('⏳ Waiting for ongoing cloud download...');
      return cloudDataPromiseRef.current;
    }

    // Start fresh download and batch insert
    cloudDataPromiseRef.current = (async () => {
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

          // 💾 Save downloaded data to PGlite for persistence (BATCH INSERT)
          try {
            // 1. Batch save budget periods to PGlite
            if (data.budgetPeriods?.length > 0) {
              const periods = data.budgetPeriods;

              // Build VALUES clause for multi-row insert
              const valuesClauses = periods
                .map((_, idx) => {
                  const offset = idx * 12;
                  return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
                })
                .join(',');

              // Flatten all values into single array with proper defaults
              const allValues = periods.flatMap(period => [
                period.id,
                period.user_id || user.sub,
                period.year || new Date().getFullYear(),
                typeof period.monthly_payment === 'number'
                  ? period.monthly_payment
                  : 5700,
                typeof period.previous_balance === 'number'
                  ? period.previous_balance
                  : 0,
                period.monthly_payments || null,
                period.status || 'active',
                period.is_template || 0,
                period.template_name || null,
                period.template_description || null,
                period.created_at || new Date().toISOString(),
                period.updated_at || new Date().toISOString(),
              ]);

              await localDB.query(
                `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, is_template, template_name, template_description, created_at, updated_at)
               VALUES ${valuesClauses}
               ON CONFLICT (id) DO UPDATE SET
                 monthly_payment = EXCLUDED.monthly_payment,
                 previous_balance = EXCLUDED.previous_balance,
                 monthly_payments = EXCLUDED.monthly_payments,
                 status = EXCLUDED.status,
                 is_template = EXCLUDED.is_template,
                 template_name = EXCLUDED.template_name,
                 template_description = EXCLUDED.template_description,
                 updated_at = EXCLUDED.updated_at`,
                allValues
              );

              logger.log('💾 Batch saved budget periods to PGlite:', {
                count: periods.length,
              });
            }

            // 2. Batch save expenses to PGlite
            if (data.expenses?.length > 0) {
              const expenses = data.expenses;

              const valuesClauses = expenses
                .map((_, idx) => {
                  const offset = idx * 11;
                  return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
                })
                .join(',');

              const allValues = expenses.flatMap(expense => [
                expense.id,
                expense.user_id || user.sub,
                expense.name || 'Unknown Expense',
                typeof expense.amount === 'number' ? expense.amount : 0,
                expense.frequency || 'monthly',
                expense.start_month || 1,
                expense.end_month || 12,
                expense.budget_period_id,
                expense.monthly_amounts || null,
                expense.created_at || new Date().toISOString(),
                expense.updated_at || new Date().toISOString(),
              ]);

              await localDB.query(
                `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, monthly_amounts, created_at, updated_at)
               VALUES ${valuesClauses}
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 amount = EXCLUDED.amount,
                 frequency = EXCLUDED.frequency,
                 start_month = EXCLUDED.start_month,
                 end_month = EXCLUDED.end_month,
                 budget_period_id = EXCLUDED.budget_period_id,
                 monthly_amounts = EXCLUDED.monthly_amounts,
                 updated_at = EXCLUDED.updated_at`,
                allValues
              );

              logger.log('💾 Batch saved expenses to PGlite:', {
                count: expenses.length,
              });
            }
          } catch (dbError) {
            // Log error but continue - data will still be in React state for this session
            logger.error(
              '⚠️ Failed to save to PGlite (data still in memory):',
              dbError
            );
          }

          const result = {
            expenses: data.expenses || [],
            budgetPeriods: data.budgetPeriods || [],
          };

          // Cache the result for duplicate prevention
          cloudDataCacheRef.current = result;
          return result;
        }

        logger.log('ℹ️ No existing data in Google Drive');
        const emptyResult = { expenses: [], budgetPeriods: [] };
        cloudDataCacheRef.current = emptyResult;
        return emptyResult;
      } catch (error) {
        logger.error('❌ Load error:', error);
        updateSyncError(error.message);
        throw error; // Re-throw to be caught by promise wrapper
      } finally {
        cloudDataPromiseRef.current = null;
      }
    })();

    return cloudDataPromiseRef.current;
  }, [user, isOnline, updateSyncError]);

  // Clear cache when user changes or goes offline
  useEffect(() => {
    cloudDataCacheRef.current = null;
    cloudDataPromiseRef.current = null;
  }, [user, isOnline]);

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

          // 💾 Save downloaded updates to PGlite for persistence (BATCH INSERT)
          try {
            // 1. Batch save budget periods to PGlite
            if (data.budgetPeriods?.length > 0) {
              const periods = data.budgetPeriods;

              const valuesClauses = periods
                .map((_, idx) => {
                  const offset = idx * 12;
                  return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
                })
                .join(',');

              const allValues = periods.flatMap(period => [
                period.id,
                period.user_id || user.sub,
                period.year || new Date().getFullYear(),
                typeof period.monthly_payment === 'number'
                  ? period.monthly_payment
                  : 5700,
                typeof period.previous_balance === 'number'
                  ? period.previous_balance
                  : 0,
                period.monthly_payments || null,
                period.status || 'active',
                period.is_template || 0,
                period.template_name || null,
                period.template_description || null,
                period.created_at || new Date().toISOString(),
                period.updated_at || new Date().toISOString(),
              ]);

              await localDB.query(
                `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, is_template, template_name, template_description, created_at, updated_at)
                 VALUES ${valuesClauses}
                 ON CONFLICT (id) DO UPDATE SET
                   monthly_payment = EXCLUDED.monthly_payment,
                   previous_balance = EXCLUDED.previous_balance,
                   monthly_payments = EXCLUDED.monthly_payments,
                   status = EXCLUDED.status,
                   is_template = EXCLUDED.is_template,
                   template_name = EXCLUDED.template_name,
                   template_description = EXCLUDED.template_description,
                   updated_at = EXCLUDED.updated_at`,
                allValues
              );

              logger.log('💾 Polling: Batch saved budget periods to PGlite:', {
                count: periods.length,
              });
            }

            // 2. Batch save expenses to PGlite
            if (data.expenses?.length > 0) {
              const expenses = data.expenses;

              const valuesClauses = expenses
                .map((_, idx) => {
                  const offset = idx * 11;
                  return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
                })
                .join(',');

              const allValues = expenses.flatMap(expense => [
                expense.id,
                expense.user_id || user.sub,
                expense.name || 'Unknown Expense',
                typeof expense.amount === 'number' ? expense.amount : 0,
                expense.frequency || 'monthly',
                expense.start_month || 1,
                expense.end_month || 12,
                expense.budget_period_id,
                expense.monthly_amounts || null,
                expense.created_at || new Date().toISOString(),
                expense.updated_at || new Date().toISOString(),
              ]);

              await localDB.query(
                `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, monthly_amounts, created_at, updated_at)
                 VALUES ${valuesClauses}
                 ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   amount = EXCLUDED.amount,
                   frequency = EXCLUDED.frequency,
                   start_month = EXCLUDED.start_month,
                   end_month = EXCLUDED.end_month,
                   budget_period_id = EXCLUDED.budget_period_id,
                   monthly_amounts = EXCLUDED.monthly_amounts,
                   updated_at = EXCLUDED.updated_at`,
                allValues
              );

              logger.log('💾 Polling: Batch saved expenses to PGlite:', {
                count: expenses.length,
              });
            }
          } catch (dbError) {
            // Log error but continue - data will still be returned to React state
            logger.error(
              '⚠️ Polling: Failed to save to PGlite (data still in memory):',
              dbError
            );
          }

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
   * Uses SyncCoordinator for centralized queue management
   */
  const syncExpenses = useCallback(
    expenses => {
      if (!user || !isOnline) return;

      // Use coordinator for debounced sync
      coordinatorRef.current.enqueue(async () => {
        logger.log('🔄 Fetching complete local data for expense sync...');
        const localData = await fetchCompleteLocalData(user.id);

        // Use local expenses (just changed) and complete periods from DB
        await syncToCloud(expenses, localData.budgetPeriods);
      }, false); // false = debounced
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
  );

  /**
   * Debounced sync for budget periods
   * CRITICAL FIX: Now fetches complete local data before syncing
   * Uses SyncCoordinator for centralized queue management
   */
  const syncBudgetPeriods = useCallback(
    periods => {
      if (!user || !isOnline) return;

      // Use coordinator for debounced sync
      coordinatorRef.current.enqueue(async () => {
        logger.log('🔄 Fetching complete local data for period sync...');
        const localData = await fetchCompleteLocalData(user.id);

        // Use local periods (just changed) and complete expenses from DB
        await syncToCloud(localData.expenses, periods);
      }, false); // false = debounced
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
  );

  /**
   * Debounced sync for settings
   * CRITICAL FIX: Now fetches complete local data before syncing
   * Uses SyncCoordinator for centralized queue management
   */
  const syncSettings = useCallback(
    (_monthlyPayment, _previousBalance, _monthlyPayments) => {
      if (!user || !isOnline) return;

      // Use coordinator for debounced sync
      coordinatorRef.current.enqueue(async () => {
        logger.log('🔄 Fetching complete local data for settings sync...');
        const localData = await fetchCompleteLocalData(user.id);

        // Settings are now stored in budget_periods, not as separate field
        // Use complete expenses/periods from DB
        await syncToCloud(localData.expenses, localData.budgetPeriods);
      }, false); // false = debounced
    },
    [user, isOnline, syncToCloud, fetchCompleteLocalData]
  );

  /**
   * Load expenses from Google Drive
   */
  const loadExpenses = useCallback(async () => {
    try {
      const data = await loadFromCloud();
      return {
        success: true,
        data: data.expenses || [],
      };
    } catch {
      // Error already logged and tracked by loadFromCloud
      return {
        success: true,
        data: [],
      };
    }
  }, [loadFromCloud]);

  /**
   * Load budget periods from Google Drive
   */
  const loadBudgetPeriods = useCallback(async () => {
    try {
      const data = await loadFromCloud();
      return {
        success: true,
        data: data.budgetPeriods || [],
      };
    } catch {
      // Error already logged and tracked by loadFromCloud
      return {
        success: true,
        data: [],
      };
    }
  }, [loadFromCloud]);

  /**
   * Load settings from Google Drive (deprecated - kept for compatibility)
   * Settings are now stored in budget_periods, this always returns empty object
   */
  const loadSettings = useCallback(async () => {
    try {
      await loadFromCloud();
      return {
        success: true,
        data: {},
      };
    } catch {
      // Error already logged and tracked by loadFromCloud
      return {
        success: true,
        data: {},
      };
    }
  }, [loadFromCloud]);

  /**
   * Immediate sync (bypasses debounce) - for critical operations
   * CRITICAL FIX: Now fetches complete local data before syncing
   * Uses SyncCoordinator with immediate flag
   */
  const immediateSyncExpenses = useCallback(
    async expenses => {
      if (!user) return;

      // Use coordinator for immediate sync (bypasses debounce)
      return coordinatorRef.current.enqueue(async () => {
        logger.log(
          '⚡ Immediate expense sync - fetching complete local data...'
        );
        const localData = await fetchCompleteLocalData(user.id);
        await syncToCloud(expenses, localData.budgetPeriods);
      }, true); // true = immediate
    },
    [syncToCloud, fetchCompleteLocalData, user]
  );

  const immediateSyncBudgetPeriods = useCallback(
    async periods => {
      if (!user) return;

      // Use coordinator for immediate sync
      return coordinatorRef.current.enqueue(async () => {
        logger.log(
          '⚡ Immediate period sync - fetching complete local data...'
        );
        const localData = await fetchCompleteLocalData(user.id);
        await syncToCloud(localData.expenses, periods);
      }, true); // true = immediate
    },
    [syncToCloud, fetchCompleteLocalData, user]
  );

  const immediateSyncSettings = useCallback(
    async (_monthlyPayment, _previousBalance, _monthlyPayments) => {
      if (!user) return;

      // Use coordinator for immediate sync
      return coordinatorRef.current.enqueue(async () => {
        logger.log(
          '⚡ Immediate settings sync - fetching complete local data...'
        );
        const localData = await fetchCompleteLocalData(user.id);
        // Settings are now stored in budget_periods, not as separate field
        await syncToCloud(localData.expenses, localData.budgetPeriods);
      }, true); // true = immediate
    },
    [syncToCloud, fetchCompleteLocalData, user]
  );

  /**
   * Create manual backup of current data
   * Triggers auto-cleanup of old backups after creation
   *
   * @returns {Promise<{success: boolean, filename: string, error?: string}>}
   */
  const createManualBackup = useCallback(async () => {
    // Guard conditions
    if (!user || !isOnline) {
      return {
        success: false,
        error: isOnline
          ? 'Skal være logget ind'
          : 'Skal være online og logget ind',
      };
    }

    try {
      // Update sync status
      updateSyncStatus('syncing');

      // Fetch complete local data
      logger.log('📦 Creating manual backup...');
      const localData = await fetchCompleteLocalData(user.id);

      // Validate data before creating backup
      const validation = validateCloudData(localData);
      if (!validation.valid) {
        logger.error('❌ Backup validation failed:', validation.warnings);
        // Check for critical errors
        const hasCriticalError = validation.warnings.some(w =>
          w.includes('KRITISK')
        );
        if (hasCriticalError) {
          updateSyncStatus('error');
          updateSyncError('Data validation failed');
          return {
            success: false,
            error: 'Data er ikke gyldig til backup',
          };
        }
      }

      // Create backup
      const result = await createBackup(localData);

      // Auto-cleanup old backups (keep last 7)
      await deleteOldBackups(7);

      // Update sync status
      updateSyncStatus('synced');
      updateLastSyncTime(new Date());

      // Clear status after 2 seconds
      setTimeout(() => {
        if (syncStatusRef.current === 'synced') {
          updateSyncStatus('idle');
        }
      }, 2000);

      logger.log('✅ Backup created successfully:', result.filename);
      return {
        success: true,
        filename: result.filename,
      };
    } catch (error) {
      logger.error('❌ Backup creation failed:', error);
      updateSyncStatus('error');
      updateSyncError('Backup creation failed');

      // Clear error after 5 seconds
      setTimeout(() => {
        if (syncStatusRef.current === 'error') {
          updateSyncStatus('idle');
          updateSyncError(null);
        }
      }, 5000);

      return {
        success: false,
        error: error.message || 'Ukendt fejl',
      };
    }
  }, [
    user,
    isOnline,
    fetchCompleteLocalData,
    updateSyncStatus,
    updateLastSyncTime,
    updateSyncError,
  ]);

  /**
   * List available backups with formatted metadata
   * Parses timestamps and calculates size in KB
   *
   * @returns {Promise<Array<{fileId: string, filename: string, date: Date, sizeKB: number}>>}
   */
  const listAvailableBackups = useCallback(async () => {
    // Guard conditions
    if (!user || !isOnline) {
      return [];
    }

    try {
      logger.log('📋 Listing available backups...');
      const backups = await listBackups();

      // Transform for UI
      return backups.map(backup => ({
        fileId: backup.fileId,
        filename: backup.filename,
        date: new Date(backup.modifiedTime),
        sizeKB: Math.round(backup.size / 1024),
      }));
    } catch (error) {
      logger.error('❌ Failed to list backups:', error);
      return [];
    }
  }, [user, isOnline]);

  /**
   * Get preview data for a specific backup (for restore confirmation)
   * Downloads backup and extracts summary info
   *
   * @param {string} fileId - Backup file ID
   * @returns {Promise<{years: number[], expenseCount: number, periodCount: number, timestamp: string}>}
   */
  const getBackupPreview = useCallback(
    async fileId => {
      // Guard conditions
      if (!user || !isOnline) {
        throw new Error('Skal være online og logget ind');
      }

      try {
        logger.log('🔍 Getting backup preview:', fileId);
        const data = await downloadBackup(fileId);

        // Extract summary info
        const years = [...new Set(data.budgetPeriods.map(p => p.year))].sort();

        return {
          years,
          expenseCount: data.expenses.length,
          periodCount: data.budgetPeriods.length,
          timestamp: data.timestamp,
        };
      } catch (error) {
        logger.error('❌ Failed to get backup preview:', error);
        throw error;
      }
    },
    [user, isOnline]
  );

  /**
   * Restore data from backup file
   * CRITICAL: Clears local PGlite tables and replaces with backup data
   *
   * @param {string} fileId - Backup file ID to restore
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const restoreFromBackup = useCallback(
    async fileId => {
      // Guard conditions
      if (!user || !isOnline) {
        return {
          success: false,
          error: 'Skal være online og logget ind',
        };
      }

      if (isSyncingRef.current) {
        return {
          success: false,
          error: 'Vent venligst på aktuel synkronisering',
        };
      }

      try {
        // Set syncing flag
        isSyncingRef.current = true;
        updateSyncStatus('syncing');

        logger.log('🔄 Restoring from backup:', fileId);

        // Download backup
        const data = await downloadBackup(fileId);

        // Validate downloaded data
        const validation = validateDownloadedData(data);
        if (!validation.valid) {
          logger.error('❌ Backup data validation failed:', validation.errors);
          return {
            success: false,
            error: 'Backup indeholder ugyldige data',
          };
        }

        // Clear local PGlite tables (transaction-safe)
        logger.log('🗑️ Clearing local data...');
        await localDB.query('DELETE FROM expenses WHERE user_id = $1', [
          user.id,
        ]);
        await localDB.query('DELETE FROM budget_periods WHERE user_id = $1', [
          user.id,
        ]);

        // Insert budget periods first (parent records)
        if (data.budgetPeriods.length > 0) {
          logger.log('💾 Inserting budget periods...');
          const periodValuesClauses = data.budgetPeriods
            .map((_, idx) => {
              const offset = idx * 14;
              return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`;
            })
            .join(',');

          const periodValues = data.budgetPeriods.flatMap(period => [
            period.id,
            period.userId || user.sub,
            period.year,
            period.monthlyPayment || 0,
            period.previousBalance || 0,
            period.monthlyPayments
              ? JSON.stringify(period.monthlyPayments)
              : null,
            period.status || 'active',
            period.isTemplate ? 1 : 0,
            period.templateName || null,
            period.templateDescription || null,
            period.createdAt || new Date().toISOString(),
            period.updatedAt || new Date().toISOString(),
            period.monthlyPayment || 0, // For ON CONFLICT UPDATE
            period.previousBalance || 0, // For ON CONFLICT UPDATE
          ]);

          await localDB.query(
            `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, is_template, template_name, template_description, created_at, updated_at)
           VALUES ${periodValuesClauses}
           ON CONFLICT (id) DO UPDATE SET
             monthly_payment = $13,
             previous_balance = $14,
             updated_at = EXCLUDED.updated_at`,
            periodValues
          );
        }

        // Insert expenses (child records)
        if (data.expenses.length > 0) {
          logger.log('💾 Inserting expenses...');
          const expenseValuesClauses = data.expenses
            .map((_, idx) => {
              const offset = idx * 11;
              return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
            })
            .join(',');

          const expenseValues = data.expenses.flatMap(expense => [
            expense.id,
            expense.userId || user.sub,
            expense.name || 'Unknown Expense',
            typeof expense.amount === 'number' ? expense.amount : 0,
            expense.frequency || 'monthly',
            expense.startMonth || 1,
            expense.endMonth || 12,
            expense.budgetPeriodId,
            expense.monthlyAmounts
              ? JSON.stringify(expense.monthlyAmounts)
              : null,
            expense.createdAt || new Date().toISOString(),
            expense.updatedAt || new Date().toISOString(),
          ]);

          await localDB.query(
            `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, monthly_amounts, created_at, updated_at)
           VALUES ${expenseValuesClauses}
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             amount = EXCLUDED.amount,
             frequency = EXCLUDED.frequency,
             start_month = EXCLUDED.start_month,
             end_month = EXCLUDED.end_month,
             budget_period_id = EXCLUDED.budget_period_id,
             monthly_amounts = EXCLUDED.monthly_amounts,
             updated_at = EXCLUDED.updated_at`,
            expenseValues
          );
        }

        // Sync restored data to main cloud file
        logger.log('☁️ Syncing restored data to cloud...');
        await syncToCloud(data.expenses, data.budgetPeriods);

        // Update sync status
        updateSyncStatus('synced');
        updateLastSyncTime(new Date());

        logger.log('✅ Backup restored successfully');
        return { success: true };
      } catch (error) {
        logger.error('❌ Backup restore failed:', error);
        updateSyncStatus('error');
        updateSyncError('Restore failed');

        return {
          success: false,
          error: error.message || 'Ukendt fejl',
        };
      } finally {
        // Always clear syncing flag
        isSyncingRef.current = false;
      }
    },
    [
      user,
      isOnline,
      syncToCloud,
      updateSyncStatus,
      updateLastSyncTime,
      updateSyncError,
    ]
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

    // Backup management
    createManualBackup,
    listAvailableBackups,
    getBackupPreview,
    restoreFromBackup,

    // Utility
    checkAndDownloadUpdates,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
