/**
 * Validation utilities for budget data
 */

import { parseDanishNumber } from './localeHelpers';
import { logger } from './logger';

/**
 * Validate and sanitize amount input
 * Supports Danish locale (comma decimal separator)
 * @param {string|number} value - Input value (e.g., "100,95" or 100.95)
 * @returns {number} Sanitized amount (minimum 0)
 *
 * @example
 * validateAmount("100,95")  // → 100.95
 * validateAmount("1.234,56") // → 1234.56
 * validateAmount(-50)        // → 0 (negatives become 0)
 */
export const validateAmount = value => {
  const parsed = parseDanishNumber(value);
  return Math.max(0, parsed);
};

/**
 * Validate and sanitize month range
 * @param {number} startMonth - Start month (1-12)
 * @param {number} endMonth - End month (1-12)
 * @returns {Object} Validated {startMonth, endMonth}
 */
export const validateMonthRange = (startMonth, endMonth) => {
  const start = Math.max(1, Math.min(12, parseInt(startMonth) || 1));
  const end = Math.max(start, Math.min(12, parseInt(endMonth) || 12));

  return { startMonth: start, endMonth: end };
};

/**
 * Validate monthly amounts array
 * @param {Array<number>|null} monthlyAmounts - Array of 12 monthly amounts
 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
 */
export const validateMonthlyAmounts = monthlyAmounts => {
  const errors = [];

  // null is valid (indicates fixed amount)
  if (monthlyAmounts === null) {
    return { valid: true, errors };
  }

  // Must be array
  if (!Array.isArray(monthlyAmounts)) {
    errors.push('Månedlige beløb skal være en array');
    return { valid: false, errors };
  }

  // Must have exactly 12 values
  if (monthlyAmounts.length !== 12) {
    errors.push('Månedlige beløb skal have præcis 12 værdier');
  }

  // All values must be non-negative numbers
  monthlyAmounts.forEach((amount, index) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      errors.push(`Måned ${index + 1}: Beløb skal være et tal`);
    } else if (amount < 0) {
      errors.push(`Måned ${index + 1}: Beløb skal være mindst 0 kr.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate expense object
 * @param {Object} expense - Expense object to validate
 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
 */
export const validateExpense = expense => {
  const errors = [];

  if (!expense) {
    return { valid: false, errors: ['Udgift objekt mangler'] };
  }

  if (!expense.name || typeof expense.name !== 'string') {
    errors.push('Udgiftsnavn er påkrævet');
  }

  if (typeof expense.amount !== 'number' || expense.amount < 0) {
    errors.push('Beløb skal være et positivt tal');
  }

  if (!['monthly', 'quarterly', 'yearly'].includes(expense.frequency)) {
    errors.push('Ugyldig frekvens (skal være monthly, quarterly eller yearly)');
  }

  if (
    typeof expense.startMonth !== 'number' ||
    expense.startMonth < 1 ||
    expense.startMonth > 12
  ) {
    errors.push('Startmåned skal være mellem 1 og 12');
  }

  if (
    typeof expense.endMonth !== 'number' ||
    expense.endMonth < 1 ||
    expense.endMonth > 12
  ) {
    errors.push('Slutmåned skal være mellem 1 og 12');
  }

  if (expense.startMonth > expense.endMonth) {
    errors.push('Startmåned kan ikke være efter slutmåned');
  }

  // Validate monthly amounts if present
  if (expense.monthlyAmounts !== null && expense.monthlyAmounts !== undefined) {
    const amountsValidation = validateMonthlyAmounts(expense.monthlyAmounts);
    if (!amountsValidation.valid) {
      errors.push(...amountsValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize expense data for storage
 * @param {Object} expense - Expense object
 * @returns {Object} Sanitized expense
 */
export const sanitizeExpense = expense => {
  const range = validateMonthRange(expense.startMonth, expense.endMonth);

  const sanitized = {
    ...expense,
    amount: validateAmount(expense.amount),
    startMonth: range.startMonth,
    endMonth: range.endMonth,
  };

  // Validate and sanitize monthly amounts if present
  if (expense.monthlyAmounts !== undefined) {
    if (expense.monthlyAmounts === null) {
      sanitized.monthlyAmounts = null;
    } else if (Array.isArray(expense.monthlyAmounts)) {
      sanitized.monthlyAmounts = expense.monthlyAmounts.map(amount =>
        Math.max(0, parseFloat(amount) || 0)
      );
    } else {
      sanitized.monthlyAmounts = null; // Invalid format, fallback to fixed
    }
  }

  return sanitized;
};

/**
 * Validate cloud data structure before upload
 * @param {Object} data - Cloud data object
 * @param {Array} data.expenses - Expenses array
 * @param {Array} data.budgetPeriods - Budget periods array
 * @returns {Object} Validation result with {valid: boolean, warnings: string[]}
 */
export const validateCloudData = data => {
  const warnings = [];

  if (!data) {
    return { valid: false, warnings: ['Data objekt mangler'] };
  }

  // Check for empty arrays
  if (!Array.isArray(data.expenses)) {
    warnings.push('Udgifter er ikke et array');
  }

  if (!Array.isArray(data.budgetPeriods)) {
    warnings.push('Budgetperioder er ikke et array');
  } else if (data.budgetPeriods.length === 0 && data.expenses?.length > 0) {
    warnings.push(
      `⚠️ KRITISK: Forsøger at synkronisere ${data.expenses.length} udgifter uden budgetperioder - dette vil slette alle perioder i skyen!`
    );
  }

  // Validate foreign key integrity (expenses must reference valid budget periods)
  if (
    Array.isArray(data.expenses) &&
    data.expenses.length > 0 &&
    Array.isArray(data.budgetPeriods) &&
    data.budgetPeriods.length > 0
  ) {
    const validPeriodIds = new Set(data.budgetPeriods.map(p => p.id));
    const orphanedExpenses = data.expenses.filter(
      e => e.budgetPeriodId && !validPeriodIds.has(e.budgetPeriodId)
    );

    if (orphanedExpenses.length > 0) {
      warnings.push(
        `⚠️ ${orphanedExpenses.length} udgifter refererer til ugyldige budgetperioder`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
};

/**
 * Validate cloud data after download
 * Ensures downloaded data won't corrupt local database
 * @param {Object} data - Downloaded cloud data
 * @returns {Object} Validation result with {valid: boolean, errors: string[], warnings: string[]}
 */
export const validateDownloadedData = data => {
  const errors = [];
  const warnings = [];

  if (!data) {
    return {
      valid: false,
      errors: ['Ingen data modtaget fra skyen'],
      warnings,
    };
  }

  // Ensure arrays exist
  if (!Array.isArray(data.expenses)) {
    errors.push('Udgifter mangler eller er ikke et array');
  }

  if (!Array.isArray(data.budgetPeriods)) {
    errors.push('Budgetperioder mangler eller er ikke et array');
  }

  // Validate and CLEAN foreign key integrity before applying to local DB
  if (
    Array.isArray(data.expenses) &&
    data.expenses.length > 0 &&
    Array.isArray(data.budgetPeriods)
  ) {
    const validPeriodIds = new Set(data.budgetPeriods.map(p => p.id));
    const orphanedExpenses = data.expenses.filter(
      e => e.budgetPeriodId && !validPeriodIds.has(e.budgetPeriodId)
    );

    if (orphanedExpenses.length > 0) {
      // Log orphaned expenses for debugging (dev-only, detailed)
      logger.debug('🧹 Cleaning orphaned expenses (technical details):', {
        count: orphanedExpenses.length,
        orphanedIds: orphanedExpenses.map(e => e.id),
        invalidPeriodIds: [
          ...new Set(orphanedExpenses.map(e => e.budgetPeriodId)),
        ],
      });

      // Remove orphaned expenses (mutate data object)
      data.expenses = data.expenses.filter(
        e => !e.budgetPeriodId || validPeriodIds.has(e.budgetPeriodId)
      );

      warnings.push(
        `Data cleaned: ${orphanedExpenses.length} items synchronized`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
