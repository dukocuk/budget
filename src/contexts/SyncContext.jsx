/**
 * SyncContext - Isolated context for cloud sync state
 * Prevents sync status updates from triggering re-renders in data editing components
 *
 * OPTIMIZATION: Sync status is managed via refs to prevent unnecessary re-renders
 * Only UI-facing components (Header) subscribe to status changes
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// eslint-disable-next-line react-refresh/only-export-components
export const SyncContext = createContext(null);

/**
 * SyncProvider - Manages cloud sync state in isolation
 * @param {Object} props - Component props
 * @param {Object} props.user - Authenticated user object
 * @param {ReactNode} props.children - Child components
 */
export const SyncProvider = ({ user, children }) => {
  // Use refs for sync status to avoid triggering re-renders
  // Only update state when UI components explicitly need updates
  const syncStatusRef = useRef('idle'); // idle, syncing, synced, error, offline
  const lastSyncTimeRef = useRef(null);
  const syncErrorRef = useRef(null);

  // Keep state ONLY for UI components that need to react to changes
  const [uiSyncStatus, setUiSyncStatus] = useState('idle');
  const [uiLastSyncTime, setUiLastSyncTime] = useState(null);
  const [uiSyncError, setUiSyncError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs for debouncing and preventing duplicate syncs
  const syncTimeoutRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Refs for status reset timeouts to ensure cleanup
  const statusResetTimeoutRef = useRef(null);
  const errorResetTimeoutRef = useRef(null);

  /**
   * Update sync status - updates both ref and UI state
   * @param {string} status - New sync status
   */
  const updateSyncStatus = useCallback(status => {
    syncStatusRef.current = status;
    setUiSyncStatus(status);
  }, []);

  /**
   * Update sync error - updates both ref and UI state
   * @param {string|null} error - Error message or null
   */
  const updateSyncError = useCallback(error => {
    syncErrorRef.current = error;
    setUiSyncError(error);
  }, []);

  /**
   * Update last sync time - updates both ref and UI state
   * @param {Date} time - Last sync timestamp
   */
  const updateLastSyncTime = useCallback(time => {
    lastSyncTimeRef.current = time;
    setUiLastSyncTime(time);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateSyncStatus('idle');
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSyncStatus]);

  /**
   * Smart sync expenses to Supabase using merge-based strategy
   * Implements last-write-wins conflict resolution with timestamp comparison
   * Preserves UUIDs and handles concurrent edits from multiple devices
   * Translates local budget period IDs to cloud IDs to prevent foreign key violations
   */
  const syncExpenses = useCallback(
    async expenses => {
      if (!user || !isOnline || isSyncingRef.current) return;

      try {
        isSyncingRef.current = true;
        updateSyncStatus('syncing');
        updateSyncError(null);

        // Step 1: Fetch budget periods from local and cloud to build ID mapping
        // This is necessary because local and cloud may have different UUIDs for the same period (year)
        const localDB = await import('../lib/pglite').then(m => m.localDB);
        const localPeriods = await localDB.query(
          'SELECT id, year FROM budget_periods WHERE user_id = $1',
          [user.id]
        );

        const { data: cloudPeriods, error: periodFetchError } = await supabase
          .from('budget_periods')
          .select('id, year')
          .eq('user_id', user.id);

        if (periodFetchError) throw periodFetchError;

        // Build mapping: local period ID → cloud period ID (matched by year)
        const periodIdMap = new Map();
        for (const localPeriod of localPeriods.rows || []) {
          const cloudPeriod = (cloudPeriods || []).find(
            cp => cp.year === localPeriod.year
          );
          if (cloudPeriod) {
            periodIdMap.set(localPeriod.id, cloudPeriod.id);
          } else {
            logger.warn(
              `⚠️ No cloud budget period found for year ${localPeriod.year}, local ID: ${localPeriod.id}`
            );
          }
        }

        // Step 2: Fetch current cloud expenses
        const { data: cloudExpenses, error: fetchError } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Step 3: Build maps for efficient comparison
        const cloudMap = new Map((cloudExpenses || []).map(e => [e.id, e]));
        const localMap = new Map(expenses.map(e => [e.id, e]));

        // Step 4: Determine operations (upsert, delete)
        const toUpsert = [];
        const toDelete = [];

        // Check local expenses for upserts (add or update)
        for (const localExpense of expenses) {
          // Validate budget_period_id exists (prevent foreign key violation)
          if (!localExpense.budgetPeriodId) {
            logger.warn(
              `⚠️ Skipping expense "${localExpense.name}" - missing budget_period_id`
            );
            continue;
          }

          // Translate local budget period ID to cloud ID
          const cloudBudgetPeriodId = periodIdMap.get(
            localExpense.budgetPeriodId
          );
          if (!cloudBudgetPeriodId) {
            logger.warn(
              `⚠️ Skipping expense "${localExpense.name}" - budget period not found in cloud (local ID: ${localExpense.budgetPeriodId})`
            );
            continue;
          }

          const cloudExpense = cloudMap.get(localExpense.id);

          if (!cloudExpense) {
            // New expense - insert with client-provided UUID and cloud budget period ID
            toUpsert.push({
              id: localExpense.id,
              user_id: user.id,
              name: localExpense.name,
              amount: localExpense.amount,
              frequency: localExpense.frequency,
              start_month: localExpense.startMonth,
              end_month: localExpense.endMonth,
              budget_period_id: cloudBudgetPeriodId, // Use cloud ID to prevent foreign key violation
              updated_at: new Date().toISOString(),
            });
          } else {
            // Existing expense - check if local is newer
            const localUpdated = new Date(localExpense.updatedAt || 0);
            const cloudUpdated = new Date(cloudExpense.updated_at || 0);

            if (localUpdated >= cloudUpdated) {
              // Local version is newer or equal - update cloud with cloud budget period ID
              toUpsert.push({
                id: localExpense.id,
                user_id: user.id,
                name: localExpense.name,
                amount: localExpense.amount,
                frequency: localExpense.frequency,
                start_month: localExpense.startMonth,
                end_month: localExpense.endMonth,
                budget_period_id: cloudBudgetPeriodId, // Use cloud ID to prevent foreign key violation
                updated_at: localUpdated.toISOString(),
              });
            }
            // If cloud is newer, we skip (don't overwrite newer cloud data)
          }
        }

        // Check cloud expenses for deletions
        for (const cloudExpense of cloudExpenses || []) {
          if (!localMap.has(cloudExpense.id)) {
            // Expense exists in cloud but not local - delete from cloud
            toDelete.push(cloudExpense.id);
          }
        }

        // Step 5: Execute operations
        if (toUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('expenses')
            .upsert(toUpsert, {
              onConflict: 'id',
              ignoreDuplicates: false,
            });

          if (upsertError) throw upsertError;
          logger.log(`✅ Synced ${toUpsert.length} expenses to cloud`);
        }

        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .in('id', toDelete);

          if (deleteError) throw deleteError;
          logger.log(`🗑️ Deleted ${toDelete.length} expenses from cloud`);
        }

        updateSyncStatus('synced');
        updateLastSyncTime(new Date());

        // Reset to idle after 2 seconds (with cleanup tracking)
        if (statusResetTimeoutRef.current) {
          clearTimeout(statusResetTimeoutRef.current);
        }
        statusResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          statusResetTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        // Check if it's a foreign key constraint error for budget_period_id
        if (
          error.code === '23503' &&
          error.message?.includes('budget_period')
        ) {
          logger.error(
            '❌ Budget period not found in cloud database. Budget periods must be synced before expenses.'
          );
          updateSyncError(
            'Budget periode mangler i skyen. Genindlæs venligst appen.'
          );
        } else {
          logger.error('❌ Error syncing expenses:', error);
          updateSyncError(error.message);
        }
        updateSyncStatus('error');

        // Reset error state after 5 seconds (with cleanup tracking)
        if (errorResetTimeoutRef.current) {
          clearTimeout(errorResetTimeoutRef.current);
        }
        errorResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          updateSyncError(null);
          errorResetTimeoutRef.current = null;
        }, 5000);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]
  );

  /**
   * Sync budget periods to Supabase
   * Smart matching by (user_id, year) to prevent duplicate key violations
   * Fetches existing cloud periods first to match by year and preserve cloud IDs
   */
  const syncBudgetPeriods = useCallback(
    async periods => {
      if (!user || !isOnline || isSyncingRef.current) return;

      try {
        updateSyncStatus('syncing');
        updateSyncError(null);

        // Fetch existing cloud periods first to match by (user_id, year)
        const { data: cloudPeriods, error: fetchError } = await supabase
          .from('budget_periods')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        // Build map of cloud periods by year for fast lookup
        const cloudMap = new Map();
        if (cloudPeriods) {
          cloudPeriods.forEach(period => {
            cloudMap.set(period.year, period);
          });
        }

        // Transform periods to database format, using cloud ID if period exists
        const periodsToSync = (periods || []).map(period => {
          const cloudPeriod = cloudMap.get(period.year);

          return {
            id: cloudPeriod ? cloudPeriod.id : period.id, // Use cloud ID if exists, else local ID
            user_id: user.id,
            year: period.year,
            monthly_payment: period.monthlyPayment,
            previous_balance: period.previousBalance,
            monthly_payments: period.monthlyPayments, // Supabase handles JSONB automatically
            status: period.status || 'active',
            updated_at: new Date().toISOString(),
          };
        });

        if (periodsToSync.length > 0) {
          const { error } = await supabase
            .from('budget_periods')
            .upsert(periodsToSync, {
              onConflict: 'id', // Now safe because we use cloud ID when it exists
              ignoreDuplicates: false,
            });

          if (error) throw error;
          logger.log(
            `✅ Synced ${periodsToSync.length} budget periods to cloud`
          );
        }

        updateSyncStatus('synced');
        updateLastSyncTime(new Date());

        // Reset to idle after 2 seconds
        if (statusResetTimeoutRef.current) {
          clearTimeout(statusResetTimeoutRef.current);
        }
        statusResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          statusResetTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        logger.error('❌ Error syncing budget periods:', error);
        updateSyncError(error.message);
        updateSyncStatus('error');

        // Reset error state after 5 seconds
        if (errorResetTimeoutRef.current) {
          clearTimeout(errorResetTimeoutRef.current);
        }
        errorResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          updateSyncError(null);
          errorResetTimeoutRef.current = null;
        }, 5000);
      }
    },
    [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]
  );

  /**
   * Sync settings to Supabase (DEPRECATED - use syncBudgetPeriods instead)
   * Kept for backward compatibility during migration
   */
  const syncSettings = useCallback(
    async (monthlyPayment, previousBalance, monthlyPayments = null) => {
      if (!user || !isOnline || isSyncingRef.current) return;

      try {
        updateSyncStatus('syncing');
        updateSyncError(null);

        const { error } = await supabase.from('settings').upsert(
          {
            user_id: user.id,
            monthly_payment: monthlyPayment,
            previous_balance: previousBalance,
            monthly_payments: monthlyPayments, // Supabase handles JSONB automatically
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

        if (error) throw error;

        updateSyncStatus('synced');
        updateLastSyncTime(new Date());

        // Reset to idle after 2 seconds (with cleanup tracking)
        if (statusResetTimeoutRef.current) {
          clearTimeout(statusResetTimeoutRef.current);
        }
        statusResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          statusResetTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        logger.error('Error syncing settings:', error);
        updateSyncError(error.message);
        updateSyncStatus('error');

        // Reset error state after 5 seconds (with cleanup tracking)
        if (errorResetTimeoutRef.current) {
          clearTimeout(errorResetTimeoutRef.current);
        }
        errorResetTimeoutRef.current = setTimeout(() => {
          updateSyncStatus('idle');
          updateSyncError(null);
          errorResetTimeoutRef.current = null;
        }, 5000);
      }
    },
    [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]
  );

  /**
   * Debounced sync for expenses - waits 1 second before syncing
   */
  const debouncedSyncExpenses = useCallback(
    expenses => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncExpenses(expenses);
      }, 1000);
    },
    [syncExpenses]
  );

  /**
   * Debounced sync for budget periods
   */
  const debouncedSyncBudgetPeriods = useCallback(
    periods => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncBudgetPeriods(periods);
      }, 1000);
    },
    [syncBudgetPeriods]
  );

  /**
   * Debounced sync for settings (DEPRECATED)
   */
  const debouncedSyncSettings = useCallback(
    (monthlyPayment, previousBalance, monthlyPayments = null) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        syncSettings(monthlyPayment, previousBalance, monthlyPayments);
      }, 1000);
    },
    [syncSettings]
  );

  /**
   * Load expenses from Supabase
   * Preserves UUIDs for consistent multi-device sync
   */
  const loadExpenses = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: [] };

    try {
      updateSyncStatus('syncing');

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match app format - preserve UUIDs
      const expenses = (data || []).map(expense => ({
        id: expense.id, // Preserve UUID from cloud
        name: expense.name,
        amount: parseFloat(expense.amount),
        frequency: expense.frequency,
        startMonth: expense.start_month,
        endMonth: expense.end_month,
        budgetPeriodId: expense.budget_period_id, // Required for multi-year support
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      }));

      updateSyncStatus('synced');
      updateLastSyncTime(new Date());

      setTimeout(() => {
        updateSyncStatus('idle');
      }, 2000);

      return { success: true, data: expenses };
    } catch (error) {
      logger.error('Error loading expenses:', error);
      updateSyncError(error.message);
      updateSyncStatus('error');

      setTimeout(() => {
        updateSyncStatus('idle');
        updateSyncError(null);
      }, 5000);

      return { success: false, data: [] };
    }
  }, [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]);

  /**
   * Load budget periods from Supabase
   */
  const loadBudgetPeriods = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: [] };

    try {
      updateSyncStatus('syncing');

      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false });

      if (error) throw error;

      // Transform data to match app format
      const periods = (data || []).map(period => ({
        id: period.id,
        userId: period.user_id,
        year: period.year,
        monthlyPayment: parseFloat(period.monthly_payment),
        previousBalance: parseFloat(period.previous_balance),
        monthlyPayments: period.monthly_payments || null, // JSONB automatically parsed
        status: period.status,
        createdAt: period.created_at,
        updatedAt: period.updated_at,
      }));

      updateSyncStatus('synced');
      updateLastSyncTime(new Date());

      setTimeout(() => {
        updateSyncStatus('idle');
      }, 2000);

      return { success: true, data: periods };
    } catch (error) {
      logger.error('Error loading budget periods:', error);
      updateSyncError(error.message);
      updateSyncStatus('error');

      setTimeout(() => {
        updateSyncStatus('idle');
        updateSyncError(null);
      }, 5000);

      return { success: false, data: [] };
    }
  }, [user, isOnline, updateSyncStatus, updateSyncError, updateLastSyncTime]);

  /**
   * Load settings from Supabase (DEPRECATED - use loadBudgetPeriods instead)
   */
  const loadSettings = useCallback(async () => {
    if (!user || !isOnline) return { success: false, data: null };

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Ignore "not found" error
        throw error;
      }

      if (data) {
        return {
          success: true,
          data: {
            monthlyPayment: parseFloat(data.monthly_payment),
            previousBalance: parseFloat(data.previous_balance),
            monthlyPayments: data.monthly_payments || null, // JSONB automatically parsed
          },
        };
      }

      return { success: false, data: null };
    } catch (error) {
      logger.error('Error loading settings:', error);
      return { success: false, data: null };
    }
  }, [user, isOnline]);

  /**
   * Cleanup all timeouts on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
      }
      if (errorResetTimeoutRef.current) {
        clearTimeout(errorResetTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    // Expose UI state for components that need to display status (Header)
    syncStatus: uiSyncStatus,
    lastSyncTime: uiLastSyncTime,
    syncError: uiSyncError,
    isOnline,
    // Expose ref-based values for components that just need to check status
    syncStatusRef,
    lastSyncTimeRef,
    syncErrorRef,
    // Sync functions
    syncExpenses: debouncedSyncExpenses,
    syncBudgetPeriods: debouncedSyncBudgetPeriods,
    syncSettings: debouncedSyncSettings, // DEPRECATED
    loadExpenses,
    loadBudgetPeriods,
    loadSettings, // DEPRECATED
    immediateSyncExpenses: syncExpenses, // For cases where immediate sync is needed
    immediateSyncBudgetPeriods: syncBudgetPeriods,
    immediateSyncSettings: syncSettings, // DEPRECATED
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
