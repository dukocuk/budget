/**
 * Export utilities for CSV generation
 */

import { MONTHS } from './constants'
import { calculateAnnualAmount, getMonthlyAmount, calculateSummary } from './calculations'

/**
 * Generate CSV content from budget data
 * @param {Array} expenses - Array of expense objects
 * @param {number} monthlyPayment - Monthly payment amount
 * @param {number} previousBalance - Previous year balance
 * @returns {string} CSV content with UTF-8 BOM
 */
export const generateCSV = (expenses, monthlyPayment, previousBalance) => {
  let csv = '\ufeff' // UTF-8 BOM for Excel compatibility

  // Section 1: Expense summary
  csv += 'Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total\n'

  expenses.forEach(expense => {
    const annual = calculateAnnualAmount(expense)
    csv += `"${expense.name}",${expense.amount},"${expense.frequency}",`
    csv += `${MONTHS[expense.startMonth-1]},${MONTHS[expense.endMonth-1]},${annual}\n`
  })

  // Section 2: Monthly breakdown
  csv += '\n\nMånedlig Oversigt\n'
  csv += 'Udgift,' + MONTHS.join(',') + ',Total\n'

  expenses.forEach(expense => {
    let row = `"${expense.name}"`
    let total = 0
    for (let month = 1; month <= 12; month++) {
      const amount = getMonthlyAmount(expense, month)
      total += amount
      row += `,${amount}`
    }
    row += `,${total}`
    csv += row + '\n'
  })

  // Add totals row
  csv += 'TOTAL'
  let grandTotal = 0
  for (let month = 1; month <= 12; month++) {
    let monthTotal = 0
    expenses.forEach(expense => {
      monthTotal += getMonthlyAmount(expense, month)
    })
    grandTotal += monthTotal
    csv += `,${monthTotal}`
  }
  csv += `,${grandTotal}\n`

  // Section 3: Summary
  const summary = calculateSummary(expenses, monthlyPayment, previousBalance)
  csv += '\n\nOpsummering\n'
  csv += `Årlige udgifter,${summary.totalAnnual}\n`
  csv += `Månedlig indbetaling,${monthlyPayment}\n`
  csv += `Overført fra sidste år,${previousBalance}\n`

  return csv
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Optional filename (defaults to budget_YYYY-MM-DD.csv)
 */
export const downloadCSV = (csvContent, filename = null) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename || `budget_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
