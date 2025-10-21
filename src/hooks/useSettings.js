/**
 * Custom hook for settings management using budget_periods table
 *
 * NOTE: This hook now reads from budget_periods table instead of deprecated settings table
 * Settings are now year-specific (part of budget period)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { localDB } from '../lib/pglite';
import { logger } from '../utils/logger';

/**
 * Hook for managing budget period settings
 *
 * @param {string} userId - User ID for filtering settings
 * @param {string} periodId - Budget period ID for year-specific settings
 *
 * @returns {Object} Settings management interface
 * @returns {Object} returns.settings - Settings object with monthlyPayment, previousBalance, monthlyPayments
 * @returns {boolean} returns.loading - Loading state
 * @returns {string|null} returns.error - Error message if operation failed
 * @returns {Function} returns.updateSettings - Update settings for this period
 *
 * @example
 * const { settings, updateSettings } = useSettings(user.id, activePeriod.id)
 *
 * await updateSettings({
 *   monthlyPayment: 6000,
 *   previousBalance: 5000
 * })
 */
export function useSettings(userId, periodId) {
  const [settings, setSettings] = useState({
    monthlyPayment: 0,
    previousBalance: 0,
    monthlyPayments: null, // Array of 12 values or null
    useVariablePayments: false, // Toggle between fixed/variable
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load settings from budget_periods table
  const loadSettings = useCallback(async () => {
    if (!userId || !periodId) {
      setLoading(false);
      return;
    }

    try {
      const result = await localDB.query(
        'SELECT * FROM budget_periods WHERE id = $1 AND user_id = $2',
        [periodId, userId]
      );

      if (result.rows.length > 0) {
        const period = result.rows[0];

        // Parse monthly_payments if exists
        let monthlyPayments = null;
        if (period.monthly_payments) {
          try {
            monthlyPayments =
              typeof period.monthly_payments === 'string'
                ? JSON.parse(period.monthly_payments)
                : period.monthly_payments;
          } catch (e) {
            logger.error('Error parsing monthly_payments:', e);
          }
        }

        setSettings({
          monthlyPayment: period.monthly_payment || 0,
          previousBalance: period.previous_balance || 0,
          monthlyPayments: monthlyPayments,
          useVariablePayments: monthlyPayments !== null,
        });
      }

      setLoading(false);
    } catch (err) {
      logger.error('Error loading settings from budget_periods:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [userId, periodId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update settings for this budget period
  const updateSettings = async newSettings => {
    if (!userId || !periodId) return;

    try {
      setError(null);

      const updatedValues = {
        monthly_payment: newSettings.monthlyPayment ?? settings.monthlyPayment,
        previous_balance:
          newSettings.previousBalance ?? settings.previousBalance,
        monthly_payments:
          newSettings.monthlyPayments !== undefined
            ? JSON.stringify(newSettings.monthlyPayments)
            : settings.monthlyPayments
              ? JSON.stringify(settings.monthlyPayments)
              : null,
        updated_at: new Date().toISOString(),
      };

      // Update local DB (budget_periods table)
      await localDB.query(
        `UPDATE budget_periods
         SET monthly_payment = $1,
             previous_balance = $2,
             monthly_payments = $3,
             updated_at = $4
         WHERE id = $5 AND user_id = $6`,
        [
          updatedValues.monthly_payment,
          updatedValues.previous_balance,
          updatedValues.monthly_payments,
          updatedValues.updated_at,
          periodId,
          userId,
        ]
      );

      // Sync to cloud (budget_periods table in Supabase)
      const cloudUpdate = {
        monthly_payment: updatedValues.monthly_payment,
        previous_balance: updatedValues.previous_balance,
        monthly_payments:
          newSettings.monthlyPayments !== undefined
            ? newSettings.monthlyPayments
            : settings.monthlyPayments, // Send as array or null (Supabase handles JSONB)
        updated_at: updatedValues.updated_at,
      };

      const { error: cloudError } = await supabase
        .from('budget_periods')
        .update(cloudUpdate)
        .eq('id', periodId)
        .eq('user_id', userId);

      if (cloudError) throw cloudError;

      // Update local state
      setSettings({
        monthlyPayment: updatedValues.monthly_payment,
        previousBalance: updatedValues.previous_balance,
        monthlyPayments:
          newSettings.monthlyPayments !== undefined
            ? newSettings.monthlyPayments
            : settings.monthlyPayments,
        useVariablePayments:
          (newSettings.monthlyPayments !== undefined
            ? newSettings.monthlyPayments
            : settings.monthlyPayments) !== null,
      });

      logger.info('✅ Settings updated successfully for period:', periodId);
    } catch (err) {
      logger.error('Error updating settings:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    reload: loadSettings,
  };
}
