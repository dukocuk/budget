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

export const STORAGE_KEY = 'budgetData2025'

export const INITIAL_EXPENSES = [
  {id: 1, name: "Sats Danmark", amount: 360, frequency: "monthly", startMonth: 1, endMonth: 12},
  {id: 2, name: "3 Danmark", amount: 160, frequency: "monthly", startMonth: 5, endMonth: 12},
  {id: 3, name: "IDA Fagforening", amount: 3460, frequency: "yearly", startMonth: 2, endMonth: 2},
  {id: 4, name: "Akademikernes A-kasse", amount: 1497, frequency: "quarterly", startMonth: 1, endMonth: 12},
  {id: 5, name: "Ulykkeforsikring", amount: 1395, frequency: "yearly", startMonth: 5, endMonth: 5},
  {id: 6, name: "Sygeforsikring Danmark", amount: 1676, frequency: "yearly", startMonth: 1, endMonth: 1},
  {id: 7, name: "Domea Bolig", amount: 190, frequency: "yearly", startMonth: 5, endMonth: 5},
  {id: 8, name: "Baba", amount: 1000, frequency: "monthly", startMonth: 1, endMonth: 12},
  {id: 9, name: "Aldersopsparing", amount: 118, frequency: "monthly", startMonth: 1, endMonth: 12},
  {id: 10, name: "Bitwarden", amount: 72, frequency: "yearly", startMonth: 7, endMonth: 7},
  {id: 11, name: "OpenAI", amount: 186, frequency: "yearly", startMonth: 1, endMonth: 1},
  {id: 12, name: "Kortgebyr", amount: 200, frequency: "yearly", startMonth: 12, endMonth: 12},
  {id: 13, name: "Gæld", amount: 1710, frequency: "monthly", startMonth: 1, endMonth: 12},
  {id: 14, name: "Rejsekort", amount: 1440, frequency: "monthly", startMonth: 5, endMonth: 12}
]
