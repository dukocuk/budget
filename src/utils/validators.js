/**
 * Validation utilities for budget data
 */

/**
 * Validate and sanitize amount input
 * @param {string|number} value - Input value
 * @returns {number} Sanitized amount (minimum 0)
 */
export const validateAmount = (value) => {
  return Math.max(0, parseFloat(value) || 0)
}

/**
 * Validate and sanitize month range
 * @param {number} startMonth - Start month (1-12)
 * @param {number} endMonth - End month (1-12)
 * @returns {Object} Validated {startMonth, endMonth}
 */
export const validateMonthRange = (startMonth, endMonth) => {
  const start = Math.max(1, Math.min(12, parseInt(startMonth) || 1))
  const end = Math.max(start, Math.min(12, parseInt(endMonth) || 12))

  return { startMonth: start, endMonth: end }
}

/**
 * Validate expense object
 * @param {Object} expense - Expense object to validate
 * @returns {Object} Validation result with {valid: boolean, errors: string[]}
 */
export const validateExpense = (expense) => {
  const errors = []

  if (!expense) {
    return { valid: false, errors: ['Udgift objekt mangler'] }
  }

  if (!expense.name || typeof expense.name !== 'string') {
    errors.push('Udgiftsnavn er påkrævet')
  }

  if (typeof expense.amount !== 'number' || expense.amount < 0) {
    errors.push('Beløb skal være et positivt tal')
  }

  if (!['monthly', 'quarterly', 'yearly'].includes(expense.frequency)) {
    errors.push('Ugyldig frekvens (skal være monthly, quarterly eller yearly)')
  }

  if (typeof expense.startMonth !== 'number' || expense.startMonth < 1 || expense.startMonth > 12) {
    errors.push('Startmåned skal være mellem 1 og 12')
  }

  if (typeof expense.endMonth !== 'number' || expense.endMonth < 1 || expense.endMonth > 12) {
    errors.push('Slutmåned skal være mellem 1 og 12')
  }

  if (expense.startMonth > expense.endMonth) {
    errors.push('Startmåned kan ikke være efter slutmåned')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize expense data for storage
 * @param {Object} expense - Expense object
 * @returns {Object} Sanitized expense
 */
export const sanitizeExpense = (expense) => {
  const range = validateMonthRange(expense.startMonth, expense.endMonth)

  return {
    ...expense,
    amount: validateAmount(expense.amount),
    startMonth: range.startMonth,
    endMonth: range.endMonth
  }
}
