/**
 * useSettingsHandlers Hook
 *
 * Provides handler functions for SettingsModal operations:
 * - Monthly payment and balance changes
 * - Variable payment mode toggling
 * - Period archiving/unarchiving
 *
 * @param {Object} params
 * @param {Object} params.activePeriod - Active budget period
 * @param {Function} params.updatePeriod - Function to update period
 * @param {Function} params.archivePeriod - Function to archive period
 * @param {Function} params.unarchivePeriod - Function to unarchive period
 * @param {Function} params.showAlert - Function to show alerts
 * @returns {Object} Handler functions for settings modal
 */

import { logger } from '../utils/logger';

export function useSettingsHandlers({
  activePeriod,
  updatePeriod,
  archivePeriod,
  unarchivePeriod,
  showAlert,
}) {
  const handleMonthlyPaymentChange = value => {
    if (activePeriod) {
      updatePeriod(activePeriod.id, { monthlyPayment: value });
    }
  };

  const handlePreviousBalanceChange = value => {
    if (activePeriod) {
      updatePeriod(activePeriod.id, { previousBalance: value });
    }
  };

  const handleMonthlyPaymentsChange = paymentsArray => {
    if (activePeriod) {
      updatePeriod(activePeriod.id, { monthlyPayments: paymentsArray });
    }
  };

  const handleTogglePaymentMode = useVariable => {
    if (activePeriod) {
      updatePeriod(activePeriod.id, {
        monthlyPayments: useVariable
          ? activePeriod.monthlyPayments ||
            Array(12).fill(activePeriod.monthlyPayment)
          : null,
      });
    }
  };

  const handleArchivePeriod = async periodId => {
    try {
      await archivePeriod(periodId);
      showAlert(`✅ År ${activePeriod.year} er nu arkiveret`, 'success');
    } catch (error) {
      logger.error('Archive period error:', error);
      showAlert(`❌ Kunne ikke arkivere år: ${error.message}`, 'error');
    }
  };

  const handleUnarchivePeriod = async periodId => {
    try {
      await unarchivePeriod(periodId);
      showAlert(
        `✅ År ${activePeriod.year} er nu genaktiveret og kan redigeres`,
        'success'
      );
    } catch (error) {
      logger.error('Unarchive period error:', error);
      showAlert(`❌ Kunne ikke genaktivere år: ${error.message}`, 'error');
    }
  };

  return {
    handleMonthlyPaymentChange,
    handlePreviousBalanceChange,
    handleMonthlyPaymentsChange,
    handleTogglePaymentMode,
    handleArchivePeriod,
    handleUnarchivePeriod,
  };
}
