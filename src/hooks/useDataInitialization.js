/**
 * useDataInitialization Hook
 *
 * Manages initial data loading from cloud storage when user logs in.
 * Handles parallel loading of expenses and budget periods with timeout protection.
 *
 * @param {Object} params
 * @param {Object} params.user - Current authenticated user
 * @param {Object} params.activePeriod - Active budget period
 * @param {boolean} params.isInitialized - Whether initialization has completed
 * @param {Function} params.setIsInitialized - Function to mark initialization as complete
 * @param {Function} params.loadExpenses - Function to load expenses from cloud
 * @param {Function} params.loadBudgetPeriods - Function to load budget periods from cloud
 * @param {Function} params.setAllExpenses - Function to set all expenses in state
 * @param {Function} params.fetchPeriodsFromDB - Function to fetch periods from local DB
 * @param {Function} params.immediateSyncBudgetPeriods - Function to immediately sync periods to cloud
 * @param {Function} params.showAlert - Function to show alert messages
 * @param {Object} params.isInitialLoadRef - Ref to track if initial load is in progress
 * @returns {boolean} isLoadingData - Whether data is currently loading
 */

import { useState, useEffect } from 'react';
import { startTransition } from 'react';
import { logger } from '../utils/logger';

export function useDataInitialization({
  user,
  activePeriod,
  isInitialized,
  setIsInitialized,
  loadExpenses,
  loadBudgetPeriods,
  setAllExpenses,
  fetchPeriodsFromDB,
  immediateSyncBudgetPeriods,
  showAlert,
  isInitialLoadRef,
}) {
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user && activePeriod && !isInitialized) {
      const loadData = async () => {
        logger.info('🔄 Starting data initialization...');
        setIsLoadingData(true);

        // Create timeout promise (10 seconds)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Initialization timeout after 10 seconds')),
            10000
          )
        );

        try {
          // Race between data loading and timeout
          await Promise.race([
            (async () => {
              logger.info('📊 Loading expenses and budget periods...');

              // Load expenses and budget periods in PARALLEL to reduce load time
              const [expensesResult, periodsResult] = await Promise.all([
                loadExpenses().catch(err => {
                  logger.error('Error loading expenses:', err);
                  return { success: false, data: [] };
                }),
                loadBudgetPeriods().catch(err => {
                  logger.error('Error loading budget periods:', err);
                  return { success: false, data: [] };
                }),
              ]);

              logger.info(
                `📦 Loaded ${expensesResult?.data?.length || 0} expenses, ${periodsResult?.data?.length || 0} periods`
              );

              // CRITICAL: Sync local budget periods to cloud BEFORE syncing expenses
              // This prevents foreign key constraint violations when expenses reference
              // budget_period_id that doesn't exist in cloud yet
              if (fetchPeriodsFromDB && immediateSyncBudgetPeriods) {
                try {
                  const localPeriods = await fetchPeriodsFromDB();
                  if (localPeriods && localPeriods.length > 0) {
                    logger.info(
                      `🔄 Syncing ${localPeriods.length} budget periods to cloud before expense sync...`
                    );
                    await immediateSyncBudgetPeriods(localPeriods);
                    logger.info('✅ Budget periods synced successfully');
                  }
                } catch (syncError) {
                  logger.error(
                    '❌ Error syncing budget periods during initialization:',
                    syncError
                  );
                  // Continue anyway - expense sync will handle validation
                }
              }

              // ATOMIC UPDATE: Use startTransition to batch ALL state updates into a single render
              // This prevents charts from re-rendering multiple times during initialization
              startTransition(() => {
                // Update expenses first (if available)
                if (
                  expensesResult &&
                  expensesResult.success &&
                  expensesResult.data &&
                  expensesResult.data.length > 0
                ) {
                  logger.info(
                    `✅ Setting ${expensesResult.data.length} expenses in state`
                  );
                  setAllExpenses(expensesResult.data);
                }

                // Settings are loaded from activePeriod (handled by separate useEffect)

                // Mark initial load as complete BEFORE enabling sync
                isInitialLoadRef.current = false;
                setIsLoadingData(false);
                setIsInitialized(true);
                logger.info('✅ Initialization complete!');
              });
            })(),
            timeoutPromise,
          ]);
        } catch (error) {
          logger.error('❌ Error loading initial data:', error);
          showAlert(
            `Fejl ved indlæsning: ${error.message}. Genindlæs venligst siden.`,
            'error'
          );

          // Even on error, ensure loading state is cleared
          startTransition(() => {
            isInitialLoadRef.current = false;
            setIsLoadingData(false);
            setIsInitialized(true);
          });
        } finally {
          // SAFETY NET: Always ensure loading state is cleared
          // This handles edge cases where neither success nor catch blocks execute
          setTimeout(() => {
            setIsLoadingData(false);
          }, 100);
        }
      };

      loadData();
    }
  }, [
    user,
    activePeriod,
    isInitialized,
    setIsInitialized,
    loadExpenses,
    loadBudgetPeriods,
    setAllExpenses,
    fetchPeriodsFromDB,
    immediateSyncBudgetPeriods,
    showAlert,
    isInitialLoadRef,
  ]);

  return isLoadingData;
}
