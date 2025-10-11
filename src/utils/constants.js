/**
 * Application constants and configuration
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export const FREQUENCY_TYPES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
}

export const FREQUENCY_LABELS = {
  [FREQUENCY_TYPES.MONTHLY]: 'Månedlig',
  [FREQUENCY_TYPES.QUARTERLY]: 'Kvartalsvis',
  [FREQUENCY_TYPES.YEARLY]: 'Årlig'
}

export const QUARTER_MONTHS = [1, 4, 7, 10]

export const DEFAULT_EXPENSE = {
  name: "Ny udgift",
  amount: 100,
  frequency: FREQUENCY_TYPES.MONTHLY,
  startMonth: 1,
  endMonth: 12
}

export const DEFAULT_SETTINGS = {
  monthlyPayment: 5700,
  previousBalance: 4831
}

export const ALERT_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info'
}

export const ALERT_DURATION = 3000

export const STORAGE_KEY = 'budgetData'

export const INITIAL_EXPENSES = []
