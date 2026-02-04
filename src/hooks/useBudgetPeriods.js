/**
 * Custom hook for budget period management with PGlite local database + cloud sync
 * Manages multi-year budgets with historical data retention
 */

import { useState, useEffect, useCallback } from 'react';
import { localDB, migrateToBudgetPeriods } from '../lib/pglite';
import { useSyncContext } from './useSyncContext';
import { logger } from '../utils/logger';
import { generateUUID } from '../utils/uuid';

// localStorage key for persisting active period selection
const ACTIVE_PERIOD_KEY = 'budget_active_period_id';

/**
 * Hook for managing budget periods (fiscal years)
 *
 * Features:
 * - Local-first data storage with PGlite
 * - Automatic cloud synchronization
 * - Multi-year budget management
 * - Historical data retention (archived periods)
 * - Year-end closing with balance carryover
 * - Expense copying between years
 *
 * @param {string} userId - User ID for filtering periods (from authentication)
 *
 * @returns {Object} Budget period management interface
 * @returns {Array<Object>} returns.periods - Array of budget period objects
 * @returns {Object|null} returns.activePeriod - Currently active budget period
 * @returns {boolean} returns.loading - Loading state during initial data fetch
 * @returns {string|null} returns.error - Error message if operation failed
 * @returns {Function} returns.createPeriod - Create new budget period (async)
 * @returns {Function} returns.updatePeriod - Update existing period (async)
 * @returns {Function} returns.archivePeriod - Archive period (read-only) (async)
 * @returns {Function} returns.deletePeriod - Delete period and all expenses (async)
 * @returns {Function} returns.calculateEndingBalance - Calculate year-end balance (async)
 * @returns {Function} returns.getActivePeriod - Get active period for user
 * @returns {Function} returns.reload - Manually reload periods from local database
 *
 * @example
 * const {
 *   periods,
 *   activePeriod,
 *   loading,
 *   createPeriod,
 *   calculateEndingBalance
 * } = useBudgetPeriods(user.id)
 *
 * // Calculate ending balance for 2025
 * const endingBalance = await calculateEndingBalance(period2025.id)
 *
 * // Create new year with carryover
 * await createPeriod({
 *   year: 2026,
 *   monthlyPayment: 5700,
 *   previousBalance: endingBalance,
 *   copyExpensesFrom: period2025.id
 * })
 */
export const useBudgetPeriods = userId => {
  const [periods, setPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get sync functions from context
  const { syncBudgetPeriods } = useSyncContext();

  /**
   * Helper: Load periods from database and return them
   * Used internally for sync operations
   */
  const fetchPeriodsFromDB = useCallback(async () => {
    if (!userId) return [];

    const result = await localDB.query(
      'SELECT * FROM budget_periods WHERE user_id = $1 AND is_template = 0 ORDER BY year DESC',
      [userId]
    );

    return result.rows.map(row => ({
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
  }, [userId]);

  /**
   * Load budget periods from local PGlite database
   */
  const loadPeriods = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Run migration if needed (one-time, idempotent)
      await migrateToBudgetPeriods(userId);

      // Load all periods for user (excluding templates)
      const loadedPeriods = await fetchPeriodsFromDB();

      setPeriods(loadedPeriods);

      // Try to restore previously selected period from localStorage
      const savedPeriodId = localStorage.getItem(ACTIVE_PERIOD_KEY);
      let active = null;

      if (savedPeriodId) {
        // First: Try to find the saved period
        active = loadedPeriods.find(p => p.id === savedPeriodId);
      }

      if (!active) {
        // Fallback: Find first active period or first period
        active =
          loadedPeriods.find(p => p.status === 'active') ||
          loadedPeriods[0] ||
          null;
      }

      // FALLBACK: If no periods exist, create default 2025 period
      if (!active && loadedPeriods.length === 0) {
        logger.info(
          '⚠️ No budget periods found, creating default 2025 period...'
        );
        try {
          const currentYear = new Date().getFullYear();
          const defaultYear = currentYear >= 2025 ? currentYear : 2025;

          const newId = generateUUID();
          const now = new Date().toISOString();

          await localDB.query(
            `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [newId, userId, defaultYear, 5700, 0, 'active', now, now]
          );

          logger.info(
            `✅ Created default budget period for year ${defaultYear}`
          );

          // Reload periods to include the new one
          const reloadedPeriods = await fetchPeriodsFromDB();
          setPeriods(reloadedPeriods);
          active = reloadedPeriods[0] || null;
        } catch (err) {
          logger.error('❌ Error creating default budget period:', err);
          // Continue without active period - app will handle this gracefully
        }
      }

      setActivePeriod(active);

      setLoading(false);
    } catch (err) {
      logger.error('❌ Error loading budget periods from local DB:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, fetchPeriodsFromDB]);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  /**
   * Create new budget period
   * @param {Object} periodData - Period configuration
   * @param {number} periodData.year - Fiscal year (e.g., 2026)
   * @param {number} periodData.monthlyPayment - Fixed monthly deposit
   * @param {number} periodData.previousBalance - Starting balance (carryover)
   * @param {Array<number>|null} periodData.monthlyPayments - Variable monthly payments (optional)
   * @param {string} periodData.status - 'active' or 'archived' (default: 'active')
   * @param {string|null} periodData.copyExpensesFrom - Period ID to copy expenses from (optional)
   */
  const createPeriod = useCallback(
    async periodData => {
      if (!userId) return;

      try {
        setError(null);

        // Generate UUID for new period
        const newId = generateUUID();

        const {
          year,
          monthlyPayment = 5700,
          previousBalance = 0,
          monthlyPayments = null,
          status = 'active',
          copyExpensesFrom = null,
        } = periodData;

        // Validate year
        if (!year || year < 2000 || year > 2100) {
          throw new Error('År skal være mellem 2000 og 2100');
        }

        // Check for duplicate year
        const existing = await localDB.query(
          'SELECT id FROM budget_periods WHERE user_id = $1 AND year = $2',
          [userId, year]
        );

        if (existing.rows.length > 0) {
          throw new Error(`Budget for år ${year} findes allerede`);
        }

        const now = new Date().toISOString();

        // Insert new period
        await localDB.query(
          `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newId,
            userId,
            year,
            monthlyPayment,
            previousBalance,
            monthlyPayments ? JSON.stringify(monthlyPayments) : null,
            status,
            now,
            now,
          ]
        );

        // Copy expenses from another period if requested
        if (copyExpensesFrom) {
          await copyExpensesBetweenPeriods(userId, copyExpensesFrom, newId);
        }

        // Reload periods
        await loadPeriods();

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }

        logger.info(`✅ Created budget period for year ${year}`);

        return { id: newId, year, status };
      } catch (err) {
        logger.error('❌ Error creating budget period:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, loadPeriods, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Update existing budget period
   */
  const updatePeriod = useCallback(
    async (id, updates) => {
      if (!userId) return;

      try {
        setError(null);

        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.monthlyPayment !== undefined) {
          updateFields.push(`monthly_payment = $${paramIndex++}`);
          values.push(Math.max(0, parseFloat(updates.monthlyPayment) || 0));
        }
        if (updates.previousBalance !== undefined) {
          updateFields.push(`previous_balance = $${paramIndex++}`);
          values.push(parseFloat(updates.previousBalance) || 0);
        }
        if (updates.monthlyPayments !== undefined) {
          updateFields.push(`monthly_payments = $${paramIndex++}`);
          values.push(
            updates.monthlyPayments
              ? JSON.stringify(updates.monthlyPayments)
              : null
          );
        }
        if (updates.status !== undefined) {
          updateFields.push(`status = $${paramIndex++}`);
          values.push(updates.status);
        }

        updateFields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());

        // Add WHERE conditions
        values.push(id);
        values.push(userId);

        // Execute update
        await localDB.query(
          `UPDATE budget_periods
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
          values
        );

        // Reload periods
        await loadPeriods();

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }
      } catch (err) {
        logger.error('❌ Error updating budget period:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, loadPeriods, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Archive budget period (make read-only)
   * Clears localStorage if archiving the currently active period
   */
  const archivePeriod = useCallback(
    async id => {
      await updatePeriod(id, { status: 'archived' });

      // If we archived the active period, clear localStorage and switch to first active
      if (id === activePeriod?.id) {
        localStorage.removeItem(ACTIVE_PERIOD_KEY);

        // Find first active period after archiving
        const updatedPeriods = await fetchPeriodsFromDB();
        const newActive =
          updatedPeriods.find(p => p.status === 'active') || updatedPeriods[0];

        if (newActive) {
          setActivePeriod(newActive);
          localStorage.setItem(ACTIVE_PERIOD_KEY, newActive.id);
        }
      }
    },
    [updatePeriod, activePeriod, fetchPeriodsFromDB]
  );

  /**
   * Unarchive a budget period (restore to 'active' status)
   * Makes the period editable again
   * @param {string} id - Period ID to unarchive
   */
  const unarchivePeriod = useCallback(
    async id => {
      return updatePeriod(id, { status: 'active' });
    },
    [updatePeriod]
  );

  /**
   * Delete budget period and all associated expenses
   * Clears localStorage if deleting the currently active period
   */
  const deletePeriod = useCallback(
    async id => {
      if (!userId) return;

      try {
        setError(null);

        // Check if deleting the active period
        const isDeletingActive = id === activePeriod?.id;

        // Delete period (CASCADE will delete all expenses)
        await localDB.query(
          'DELETE FROM budget_periods WHERE id = $1 AND user_id = $2',
          [id, userId]
        );

        // Clear localStorage if we deleted the active period
        if (isDeletingActive) {
          localStorage.removeItem(ACTIVE_PERIOD_KEY);
        }

        // Reload periods
        await loadPeriods();

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }
      } catch (err) {
        logger.error('❌ Error deleting budget period:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, activePeriod, loadPeriods, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Calculate ending balance for a budget period
   * Formula: previous_balance + total_income - total_expenses
   */
  const calculateEndingBalance = useCallback(
    async periodId => {
      if (!userId) return 0;

      try {
        // Get period settings
        const periodResult = await localDB.query(
          'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2',
          [periodId, userId]
        );

        if (periodResult.rows.length === 0) {
          throw new Error('Budget periode ikke fundet');
        }

        const period = periodResult.rows[0];

        // Calculate total income (12 months)
        let totalIncome = 0;
        if (period.monthly_payments) {
          const payments = JSON.parse(period.monthly_payments);
          totalIncome = payments.reduce((sum, payment) => sum + payment, 0);
        } else {
          totalIncome = period.monthly_payment * 12;
        }

        // Calculate total expenses
        const expensesResult = await localDB.query(
          'SELECT amount, frequency, start_month, end_month FROM expenses WHERE budget_period_id = $1',
          [periodId]
        );

        let totalExpenses = 0;
        for (const expense of expensesResult.rows) {
          const amount = expense.amount;
          const startMonth = expense.start_month;
          const endMonth = expense.end_month;

          if (expense.frequency === 'yearly') {
            totalExpenses += amount;
          } else if (expense.frequency === 'quarterly') {
            // Count quarters (Jan, Apr, Jul, Oct) within range
            const quarters = [1, 4, 7, 10];
            const activeQuarters = quarters.filter(
              month => month >= startMonth && month <= endMonth
            );
            totalExpenses += amount * activeQuarters.length;
          } else if (expense.frequency === 'monthly') {
            const monthsActive = endMonth - startMonth + 1;
            totalExpenses += amount * monthsActive;
          }
        }

        // Calculate ending balance
        const endingBalance =
          period.previous_balance + totalIncome - totalExpenses;

        return endingBalance;
      } catch (err) {
        logger.error('❌ Error calculating ending balance:', err);
        throw err;
      }
    },
    [userId]
  );

  /**
   * Get active budget period
   */
  const getActivePeriod = useCallback(() => {
    return periods.find(p => p.status === 'active') || periods[0] || null;
  }, [periods]);

  /**
   * Get all templates for user
   */
  const getTemplates = useCallback(async () => {
    if (!userId) return [];

    try {
      const result = await localDB.query(
        'SELECT * FROM budget_periods WHERE user_id = $1 AND is_template = 1 ORDER BY template_name',
        [userId]
      );

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        templateName: row.template_name,
        templateDescription: row.template_description,
        monthlyPayment: row.monthly_payment,
        monthlyPayments: row.monthly_payments
          ? JSON.parse(row.monthly_payments)
          : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      logger.error('❌ Error loading templates:', err);
      return [];
    }
  }, [userId]);

  /**
   * Save current budget period as a template
   * @param {string} periodId - Period to save as template
   * @param {string} templateName - Name for the template
   * @param {string} templateDescription - Optional description
   */
  const saveAsTemplate = useCallback(
    async (periodId, templateName, templateDescription = '') => {
      if (!userId) return;

      try {
        setError(null);

        // Validate template name
        if (!templateName || templateName.trim() === '') {
          throw new Error('Skabelon navn er påkrævet');
        }

        // Get the source period
        const periodResult = await localDB.query(
          'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2',
          [periodId, userId]
        );

        if (periodResult.rows.length === 0) {
          throw new Error('Budget periode ikke fundet');
        }

        const period = periodResult.rows[0];

        // Generate new ID for template
        const templateId = generateUUID();
        const now = new Date().toISOString();

        // Create template (year set to 0 to indicate it's a template, not a real year)
        await localDB.query(
          `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, is_template, template_name, template_description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            templateId,
            userId,
            0, // Year 0 indicates template
            period.monthly_payment,
            0, // Templates always start with 0 balance
            period.monthly_payments,
            'active',
            1, // is_template = true
            templateName.trim(),
            templateDescription.trim() || null,
            now,
            now,
          ]
        );

        // Copy expenses from period to template
        await copyExpensesBetweenPeriods(userId, periodId, templateId);

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }

        logger.info(`✅ Saved template: ${templateName}`);

        return { id: templateId, templateName };
      } catch (err) {
        logger.error('❌ Error saving template:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Delete a template
   * @param {string} templateId - Template ID to delete
   */
  const deleteTemplate = useCallback(
    async templateId => {
      if (!userId) return;

      try {
        setError(null);

        // Delete template (CASCADE will delete all expenses)
        await localDB.query(
          'DELETE FROM budget_periods WHERE id = $1 AND user_id = $2 AND is_template = 1',
          [templateId, userId]
        );

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }

        logger.info('✅ Template deleted');
      } catch (err) {
        logger.error('❌ Error deleting template:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Create a new budget period from a template
   * @param {Object} templateData - Template configuration
   * @param {string} templateData.templateId - Template ID to use
   * @param {number} templateData.year - Year for new period
   * @param {number} templateData.previousBalance - Starting balance
   * @param {Array<string>} templateData.selectedExpenseIds - Optional: specific expenses to copy
   */
  const createFromTemplate = useCallback(
    async templateData => {
      if (!userId) return;

      try {
        setError(null);

        const {
          templateId,
          year,
          previousBalance = 0,
          selectedExpenseIds = null, // If null, copy all expenses
        } = templateData;

        // Get template
        const templateResult = await localDB.query(
          'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2 AND is_template = 1',
          [templateId, userId]
        );

        if (templateResult.rows.length === 0) {
          throw new Error('Skabelon ikke fundet');
        }

        const template = templateResult.rows[0];

        // Check if year already exists
        const existing = await localDB.query(
          'SELECT id FROM budget_periods WHERE user_id = $1 AND year = $2 AND is_template = 0',
          [userId, year]
        );

        if (existing.rows.length > 0) {
          throw new Error(`Budget for år ${year} findes allerede`);
        }

        // Create new period
        const newId = generateUUID();
        const now = new Date().toISOString();

        await localDB.query(
          `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status, is_template, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newId,
            userId,
            year,
            template.monthly_payment,
            previousBalance,
            template.monthly_payments,
            'active',
            0, // Not a template
            now,
            now,
          ]
        );

        // Copy expenses (all or selected)
        if (selectedExpenseIds && selectedExpenseIds.length > 0) {
          // Copy only selected expenses
          await copySelectedExpenses(
            userId,
            templateId,
            newId,
            selectedExpenseIds
          );
        } else {
          // Copy all expenses
          await copyExpensesBetweenPeriods(userId, templateId, newId);
        }

        // Reload periods
        await loadPeriods();

        // Get updated periods and sync to cloud
        const updatedPeriods = await fetchPeriodsFromDB();
        if (syncBudgetPeriods && updatedPeriods.length > 0) {
          syncBudgetPeriods(updatedPeriods);
        }

        logger.info(`✅ Created budget period for year ${year} from template`);

        return { id: newId, year, status: 'active' };
      } catch (err) {
        logger.error('❌ Error creating from template:', err);
        setError(err.message);
        throw err;
      }
    },
    [userId, loadPeriods, fetchPeriodsFromDB, syncBudgetPeriods]
  );

  /**
   * Get expenses for a specific period (for comparison view)
   * @param {string} periodId - Period ID
   * @returns {Object} Period with expenses array
   */
  const getExpensesForPeriod = useCallback(
    async periodId => {
      if (!userId) return null;

      try {
        // Get period
        const periodResult = await localDB.query(
          'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2',
          [periodId, userId]
        );

        if (periodResult.rows.length === 0) {
          throw new Error('Period not found');
        }

        const period = periodResult.rows[0];

        // Get expenses for period
        const expensesResult = await localDB.query(
          'SELECT * FROM expenses WHERE budget_period_id = $1 ORDER BY name',
          [periodId]
        );

        return {
          id: period.id,
          year: period.year,
          monthlyPayment: period.monthly_payment,
          previousBalance: period.previous_balance,
          monthlyPayments: period.monthly_payments
            ? JSON.parse(period.monthly_payments)
            : null,
          status: period.status,
          expenses: expensesResult.rows.map(row => ({
            id: row.id,
            name: row.name,
            amount: row.amount,
            frequency: row.frequency,
            startMonth: row.start_month,
            endMonth: row.end_month,
          })),
        };
      } catch (err) {
        logger.error('❌ Error loading expenses for period:', err);
        throw err;
      }
    },
    [userId]
  );

  return {
    periods,
    activePeriod,
    setActivePeriod, // NEW: Expose setter for year selection
    loading,
    error,
    createPeriod,
    updatePeriod,
    archivePeriod,
    unarchivePeriod, // NEW: Unarchive functionality
    deletePeriod,
    calculateEndingBalance,
    getActivePeriod,
    getExpensesForPeriod, // NEW: For year comparison
    // Template functions
    getTemplates,
    saveAsTemplate,
    deleteTemplate,
    createFromTemplate,
    fetchPeriodsFromDB, // NEW: Export helper for sync order fix
    reload: loadPeriods,
  };
};

/**
 * Helper function to copy expenses from one period to another
 * Used when creating a new year from a template
 */
async function copyExpensesBetweenPeriods(userId, fromPeriodId, toPeriodId) {
  try {
    // Get all expenses from source period
    const result = await localDB.query(
      'SELECT * FROM expenses WHERE budget_period_id = $1 AND user_id = $2',
      [fromPeriodId, userId]
    );

    const now = new Date().toISOString();

    // Copy each expense with new ID
    for (const expense of result.rows) {
      const newId = generateUUID();

      await localDB.query(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newId,
          userId,
          expense.name,
          expense.amount,
          expense.frequency,
          expense.start_month,
          expense.end_month,
          toPeriodId,
          now,
          now,
        ]
      );
    }

    logger.info(`✅ Copied ${result.rows.length} expenses to new period`);
  } catch (err) {
    logger.error('❌ Error copying expenses between periods:', err);
    throw err;
  }
}

/**
 * Helper function to copy selected expenses from one period to another
 * Used when creating from template with selective copying
 */
async function copySelectedExpenses(
  userId,
  fromPeriodId,
  toPeriodId,
  expenseIds
) {
  try {
    if (!expenseIds || expenseIds.length === 0) return;

    // Get selected expenses from source period
    const placeholders = expenseIds
      .map((_, index) => `$${index + 3}`)
      .join(', ');
    const result = await localDB.query(
      `SELECT * FROM expenses WHERE budget_period_id = $1 AND user_id = $2 AND id IN (${placeholders})`,
      [fromPeriodId, userId, ...expenseIds]
    );

    const now = new Date().toISOString();

    // Copy each expense with new ID
    for (const expense of result.rows) {
      const newId = generateUUID();

      await localDB.query(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, budget_period_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newId,
          userId,
          expense.name,
          expense.amount,
          expense.frequency,
          expense.start_month,
          expense.end_month,
          toPeriodId,
          now,
          now,
        ]
      );
    }

    logger.info(
      `✅ Copied ${result.rows.length} selected expenses to new period`
    );
  } catch (err) {
    logger.error('❌ Error copying selected expenses:', err);
    throw err;
  }
}
