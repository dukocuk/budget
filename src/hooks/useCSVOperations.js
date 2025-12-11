/**
 * useCSVOperations Hook
 *
 * Provides CSV import/export functionality for budget data.
 *
 * @param {Object} params
 * @param {Array} params.expenses - Current expenses array
 * @param {Object} params.activePeriod - Active budget period
 * @param {Function} params.addExpense - Function to add expense
 * @param {Function} params.showAlert - Function to show alerts
 * @returns {Object} { handleExport, handleImport }
 */

import { generateCSV, downloadCSV } from '../utils/exportHelpers';
import { parseCSV } from '../utils/importHelpers';
import { logger } from '../utils/logger';

export function useCSVOperations({
  expenses,
  activePeriod,
  addExpense,
  showAlert,
}) {
  // Export expenses to CSV file
  const handleExport = () => {
    try {
      if (!activePeriod) return;

      const paymentValue =
        activePeriod.monthlyPayments || activePeriod.monthlyPayment;
      const csvContent = generateCSV(
        expenses,
        paymentValue,
        activePeriod.previousBalance
      );

      // Include year in filename if available
      const year = activePeriod?.year || new Date().getFullYear();
      const filename = `budget_${year}_${new Date().toISOString().split('T')[0]}.csv`;

      downloadCSV(csvContent, filename);
      showAlert('CSV fil downloadet!', 'success');
    } catch (error) {
      logger.error('Export error:', error);
      showAlert('Kunne ikke eksportere CSV', 'error');
    }
  };

  // Import expenses from CSV file
  const handleImport = async file => {
    try {
      const text = await file.text();
      const result = parseCSV(text);

      if (!result.success) {
        showAlert(`Import fejl: ${result.errors.join(', ')}`, 'error');
        return;
      }

      if (result.expenses.length === 0) {
        showAlert('Ingen gyldige udgifter fundet i CSV filen', 'info');
        return;
      }

      // Add imported expenses
      result.expenses.forEach(expense => {
        addExpense(expense);
      });

      showAlert(`${result.expenses.length} udgift(er) importeret!`, 'success');
    } catch (error) {
      logger.error('Import error:', error);
      showAlert('Kunne ikke importere CSV fil', 'error');
    }
  };

  return {
    handleExport,
    handleImport,
  };
}
