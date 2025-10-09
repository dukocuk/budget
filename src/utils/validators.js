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
 * @returns {boolean} True if valid
 */
export const validateExpense = (expense) => {
  if (!expense) return false
  if (!expense.name || typeof expense.name !== 'string') return false
  if (typeof expense.amount !== 'number' || expense.amount < 0) return false
  if (!['monthly', 'quarterly', 'yearly'].includes(expense.frequency)) return false
  if (typeof expense.startMonth !== 'number' || expense.startMonth < 1 || expense.startMonth > 12) return false
  if (typeof expense.endMonth !== 'number' || expense.endMonth < 1 || expense.endMonth > 12) return false
  if (expense.startMonth > expense.endMonth) return false

  return true
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
