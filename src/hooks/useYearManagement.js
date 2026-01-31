/**
 * useYearManagement Hook
 *
 * Provides year management operations for budget periods:
 * - Creating new budget years (from scratch or template)
 * - Selecting budget periods with UI feedback
 *
 * @param {Object} params
 * @param {Function} params.createPeriod - Function to create new period
 * @param {Function} params.createFromTemplate - Function to create from template
 * @param {Function} params.closeCreateYearModal - Function to close modal
 * @param {Function} params.showAlert - Function to show alerts
 * @returns {Object} { handleCreateYear, handleSelectPeriod }
 */

import { logger } from '../utils/logger';

export function useYearManagement({
  createPeriod,
  createFromTemplate,
  closeCreateYearModal,
  showAlert,
  setActivePeriod,
}) {
  // Create new budget year (from scratch or template)
  const handleCreateYear = async yearData => {
    try {
      // Check if creating from template
      if (yearData.templateId) {
        // Create period from template
        await createFromTemplate({
          templateId: yearData.templateId,
          year: yearData.year,
          previousBalance: yearData.previousBalance,
        });
        showAlert(
          `✅ Budget for år ${yearData.year} oprettet fra skabelon!`,
          'success'
        );
      } else {
        // Create regular period (with optional expense copying)
        await createPeriod(yearData);
        showAlert(`✅ Budget for år ${yearData.year} oprettet!`, 'success');
      }
      closeCreateYearModal();
    } catch (error) {
      logger.error('Create year error:', error);
      showAlert(`❌ Kunne ikke oprette år: ${error.message}`, 'error');
    }
  };

  // Select budget period with UI feedback
  const handleSelectPeriod = period => {
    // Update the active period state
    setActivePeriod(period);

    // Show UI feedback
    const status = period.status === 'archived' ? '📦 Arkiveret' : '';
    showAlert(`Skiftet til budget ${period.year} ${status}`, 'info');
  };

  return {
    handleCreateYear,
    handleSelectPeriod,
  };
}
