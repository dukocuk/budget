/**
 * CSV Import Helper Functions
 * Handles parsing and validation of CSV files for expense import
 */

import { validateExpense, sanitizeExpense } from './validators'
import { FREQUENCY_TYPES } from './constants'

/**
 * Parse CSV content and extract expense data
 * @param {string} csvContent - Raw CSV content
 * @returns {Object} Parsed data with expenses array and any errors
 */
export function parseCSV(csvContent) {
  const errors = []
  const expenses = []

  try {
    // Remove UTF-8 BOM if present
    const cleanContent = csvContent.replace(/^\ufeff/, '')

    // Split into lines
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim())

    if (lines.length < 2) {
      return {
        success: false,
        errors: ['CSV filen er tom eller ugyldig'],
        expenses: []
      }
    }

    // Find the start of the expense data (after header)
    let dataStartIndex = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      if (line.includes('udgift') || line.includes('expense')) {
        dataStartIndex = i + 1
        break
      }
    }

    if (dataStartIndex === -1 || dataStartIndex >= lines.length) {
      return {
        success: false,
        errors: ['Kunne ikke finde udgiftsdata i CSV filen'],
        expenses: []
      }
    }

    // Parse expense rows
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim()

      // Stop at empty line or summary section
      // Check if the line starts with common section headers (not expense data)
      const lineLower = line.toLowerCase()
      if (!line ||
          lineLower.startsWith('total') ||
          lineLower.startsWith('månedlig oversigt') ||
          lineLower.startsWith('opsummering') ||
          lineLower.startsWith('monthly overview') ||
          lineLower.startsWith('summary')) {
        break
      }

      try {
        const expense = parseExpenseLine(line, i + 1)
        if (expense) {
          expenses.push(expense)
        }
      } catch (error) {
        errors.push(`Linje ${i + 1}: ${error.message}`)
      }
    }

    return {
      success: errors.length === 0,
      expenses,
      errors,
      count: expenses.length
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Parse fejl: ${error.message}`],
      expenses: []
    }
  }
}

/**
 * Parse a single CSV line into an expense object
 * @param {string} line - CSV line
 * @returns {Object|null} Expense object or null
 */
function parseExpenseLine(line) {
  // Split by comma, properly handling quoted fields with commas inside
  const fields = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim().replace(/^"|"$/g, ''))
      currentField = ''
    } else {
      currentField += char
    }
  }
  // Push the last field
  fields.push(currentField.trim().replace(/^"|"$/g, ''))

  if (fields.length < 5) {
    throw new Error('Mangler påkrævede felter (mindst 5 kolonner krævet)')
  }

  const [name, amountStr, frequency, monthRange] = fields

  // Validate name
  if (!name || name.trim() === '') {
    throw new Error('Udgiftsnavn er påkrævet')
  }

  // Parse amount
  const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''))
  if (isNaN(amount) || amount < 0) {
    throw new Error('Ugyldigt beløb')
  }

  // Parse frequency
  let parsedFrequency = FREQUENCY_TYPES.MONTHLY
  const freqLower = frequency.toLowerCase()
  if (freqLower.includes('måned') || freqLower.includes('monthly')) {
    parsedFrequency = FREQUENCY_TYPES.MONTHLY
  } else if (freqLower.includes('kvartal') || freqLower.includes('quarterly')) {
    parsedFrequency = FREQUENCY_TYPES.QUARTERLY
  } else if (freqLower.includes('årlig') || freqLower.includes('yearly')) {
    parsedFrequency = FREQUENCY_TYPES.YEARLY
  }

  // Parse month range (e.g., "Jan-Dec", "1-12")
  const { startMonth, endMonth } = parseMonthRange(monthRange)

  // Create expense object
  const expense = {
    id: Date.now() + Math.random(), // Generate unique ID
    name: name.trim(),
    amount,
    frequency: parsedFrequency,
    startMonth,
    endMonth
  }

  // Validate and sanitize
  const validatedExpense = sanitizeExpense(expense)
  const validation = validateExpense(validatedExpense)

  if (!validation.valid) {
    throw new Error(validation.errors.join(', '))
  }

  return validatedExpense
}

/**
 * Parse month range string into start and end months
 * @param {string} rangeStr - Month range (e.g., "Jan-Dec", "1-12")
 * @returns {Object} Start and end month numbers
 */
function parseMonthRange(rangeStr) {
  const monthNames = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'maj': 5, 'may': 5,
    'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'okt': 10, 'oct': 10,
    'nov': 11, 'dec': 12
  }

  // Try to split by dash or hyphen
  const parts = rangeStr.split(/[-–—]/).map(p => p.trim().toLowerCase())

  if (parts.length !== 2) {
    // Single month or invalid format, default to full year
    return { startMonth: 1, endMonth: 12 }
  }

  // Try to parse as numbers first
  let startMonth = parseInt(parts[0])
  let endMonth = parseInt(parts[1])

  // If not numbers, try month names
  if (isNaN(startMonth)) {
    const monthKey = parts[0].substring(0, 3)
    startMonth = monthNames[monthKey] || 1
  }

  if (isNaN(endMonth)) {
    const monthKey = parts[1].substring(0, 3)
    endMonth = monthNames[monthKey] || 12
  }

  // Validate ranges
  startMonth = Math.max(1, Math.min(12, startMonth))
  endMonth = Math.max(1, Math.min(12, endMonth))

  // Ensure start <= end
  if (startMonth > endMonth) {
    [startMonth, endMonth] = [endMonth, startMonth]
  }

  return { startMonth, endMonth }
}

/**
 * Read CSV file from File object
 * @param {File} file - File object from input
 * @returns {Promise<string>} CSV content as string
 */
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Ingen fil valgt'))
      return
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Kun CSV filer er tilladt'))
      return
    }

    const reader = new FileReader()

    reader.onload = (event) => {
      resolve(event.target.result)
    }

    reader.onerror = () => {
      reject(new Error('Kunne ikke læse filen'))
    }

    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * Validate imported expenses before adding to system
 * @param {Array} expenses - Array of expense objects
 * @param {Array} existingExpenses - Current expenses in system
 * @returns {Object} Validation result
 */
export function validateImport(expenses, existingExpenses) {
  const duplicates = []
  const valid = []

  expenses.forEach(expense => {
    // Check for duplicates by name
    const isDuplicate = existingExpenses.some(
      existing => existing.name.toLowerCase() === expense.name.toLowerCase()
    )

    if (isDuplicate) {
      duplicates.push(expense.name)
    } else {
      valid.push(expense)
    }
  })

  return {
    valid,
    duplicates,
    hasDuplicates: duplicates.length > 0,
    validCount: valid.length,
    duplicateCount: duplicates.length
  }
}
