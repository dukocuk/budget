/**
 * Tests for CSV import functionality
 */

import { describe, it, expect, vi } from 'vitest'
import { parseCSV, readCSVFile, validateImport } from './importHelpers'
import { FREQUENCY_TYPES } from './constants'

describe('parseCSV', () => {
  describe('Basic Parsing', () => {
    it('should parse valid CSV with expenses', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total
Rent,5000,monthly,Jan,Dec,60000`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(1)
      expect(result.expenses[0].name).toBe('Rent')
      expect(result.expenses[0].amount).toBe(5000)
      expect(result.expenses[0].frequency).toBe(FREQUENCY_TYPES.MONTHLY)
    })

    it('should handle UTF-8 BOM', () => {
      const csvContent = '\ufeffUdgift,Beløb,Frekvens,Start Måned,Slut Måned\nTest,100,monthly,1,12'

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(1)
    })

    it('should return error for empty CSV', () => {
      const csvContent = ''

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('CSV filen er tom eller ugyldig')
      expect(result.expenses).toHaveLength(0)
    })

    it('should return error for CSV without expense header', () => {
      const csvContent = 'Some,Other,Headers\n1,2,3'

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Kunne ikke finde udgiftsdata i CSV filen')
    })
  })

  describe('Expense Parsing', () => {
    it('should parse monthly frequency', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].frequency).toBe(FREQUENCY_TYPES.MONTHLY)
    })

    it('should parse quarterly frequency', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,quarterly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].frequency).toBe(FREQUENCY_TYPES.QUARTERLY)
    })

    it('should parse yearly frequency', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,yearly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].frequency).toBe(FREQUENCY_TYPES.YEARLY)
    })

    it('should parse Danish frequency terms', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total
Test1,100,månedlig,1-12,ignored,1200
Test2,200,kvartal,1-12,ignored,800
Test3,300,årlig,1-12,ignored,300`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].frequency).toBe(FREQUENCY_TYPES.MONTHLY)
      expect(result.expenses[1].frequency).toBe(FREQUENCY_TYPES.QUARTERLY)
      expect(result.expenses[2].frequency).toBe(FREQUENCY_TYPES.YEARLY)
    })

    it('should handle quoted expense names', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total
"Expense, with comma",100,monthly,1-12,ignored,1200`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].name).toBe('Expense, with comma')
    })

    it('should trim whitespace from expense names', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
  Test Expense  ,100,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].name).toBe('Test Expense')
    })
  })

  describe('Amount Parsing', () => {
    it('should parse integer amounts', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,5000,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].amount).toBe(5000)
    })

    it('should parse decimal amounts', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,1234.56,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].amount).toBe(1234.56)
    })

    it('should handle amounts with currency symbols', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,kr 1000,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].amount).toBe(1000)
    })

    it('should reject negative amounts', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,-100,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject invalid amounts', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,invalid,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Month Range Parsing', () => {
    it('should parse numeric month ranges', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,1-12,ignored`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].startMonth).toBe(1)
      expect(result.expenses[0].endMonth).toBe(12)
    })

    it('should parse month name ranges (English)', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,Jan-Dec,ignored`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].startMonth).toBe(1)
      expect(result.expenses[0].endMonth).toBe(12)
    })

    it('should parse month name ranges (Danish)', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,Jan-Dec,ignored`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].startMonth).toBe(1)
      expect(result.expenses[0].endMonth).toBe(12)
    })

    it('should parse partial year ranges', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,Jun-Aug,ignored`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].startMonth).toBe(6)
      expect(result.expenses[0].endMonth).toBe(8)
    })

    it('should handle reversed month ranges', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,Dec-Jan,ignored`

      const result = parseCSV(csvContent)

      // Should swap to correct order
      expect(result.expenses[0].startMonth).toBe(1)
      expect(result.expenses[0].endMonth).toBe(12)
    })

    it('should default to full year for invalid ranges', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Test,100,monthly,invalid,ignored`

      const result = parseCSV(csvContent)

      expect(result.expenses[0].startMonth).toBe(1)
      expect(result.expenses[0].endMonth).toBe(12)
    })
  })

  describe('Multiple Expenses', () => {
    it('should parse multiple expense rows', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Rent,5000,monthly,1,12
Insurance,1200,yearly,1,12
Subscription,99,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(3)
      expect(result.count).toBe(3)
    })

    it('should stop at summary section', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Rent,5000,monthly,1,12

Månedlig Oversigt
Some other data`

      const result = parseCSV(csvContent)

      expect(result.expenses).toHaveLength(1)
    })

    it('should stop at totals row', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Rent,5000,monthly,1,12
TOTAL,60000`

      const result = parseCSV(csvContent)

      expect(result.expenses).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should collect errors for invalid rows', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Valid,100,monthly,1,12
Invalid,bad_amount,monthly,1,12
,100,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.expenses).toHaveLength(1) // Only the valid one
    })

    it('should report missing required fields', () => {
      const csvContent = `Udgift,Beløb,Frekvens
Test,100`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.includes('Mangler påkrævede felter'))).toBe(true)
    })

    it('should report missing expense name', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
,100,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(false)
      expect(result.errors.some(err => err.includes('Udgiftsnavn er påkrævet'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle Windows line endings (CRLF)', () => {
      const csvContent = "Udgift,Beløb,Frekvens,Start Måned,Slut Måned\r\nRent,5000,monthly,1,12"

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(1)
    })

    it('should handle Unix line endings (LF)', () => {
      const csvContent = "Udgift,Beløb,Frekvens,Start Måned,Slut Måned\nRent,5000,monthly,1,12"

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(1)
    })

    it('should handle empty lines', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned

Rent,5000,monthly,1,12

Insurance,1200,yearly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses).toHaveLength(2)
    })

    it('should handle Danish special characters', () => {
      const csvContent = `Udgift,Beløb,Frekvens,Start Måned,Slut Måned
Forsikring æøå,1000,monthly,1,12`

      const result = parseCSV(csvContent)

      expect(result.success).toBe(true)
      expect(result.expenses[0].name).toBe('Forsikring æøå')
    })
  })
})

describe('readCSVFile', () => {
  it('should reject null file', async () => {
    await expect(readCSVFile(null)).rejects.toThrow('Ingen fil valgt')
  })

  it('should reject non-CSV files', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' })

    await expect(readCSVFile(file)).rejects.toThrow('Kun CSV filer er tilladt')
  })

  it('should accept CSV files', () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' })
    const promise = readCSVFile(file)

    expect(promise).toBeInstanceOf(Promise)
  })

  it('should handle file read errors', async () => {
    const file = new File(['content'], 'test.csv', { type: 'text/csv' })

    // Mock FileReader error
    const originalFileReader = global.FileReader
    global.FileReader = vi.fn(function() {
      this.readAsText = function() {
        setTimeout(() => {
          this.onerror?.()
        }, 0)
      }
    })

    await expect(readCSVFile(file)).rejects.toThrow('Kunne ikke læse filen')

    global.FileReader = originalFileReader
  })

  it('should read file content successfully', async () => {
    const csvContent = 'test,csv,content'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

    // Mock FileReader success
    const originalFileReader = global.FileReader
    global.FileReader = vi.fn(function() {
      this.readAsText = function() {
        setTimeout(() => {
          this.onload?.({ target: { result: csvContent } })
        }, 0)
      }
    })

    const result = await readCSVFile(file)
    expect(result).toBe(csvContent)

    global.FileReader = originalFileReader
  })
})

describe('validateImport', () => {
  const existingExpenses = [
    { id: 1, name: 'Existing Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 },
    { id: 2, name: 'Existing Insurance', amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
  ]

  it('should identify no duplicates for unique expenses', () => {
    const newExpenses = [
      { name: 'New Expense', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, existingExpenses)

    expect(result.hasDuplicates).toBe(false)
    expect(result.valid).toHaveLength(1)
    expect(result.duplicates).toHaveLength(0)
    expect(result.validCount).toBe(1)
    expect(result.duplicateCount).toBe(0)
  })

  it('should identify exact name duplicates (case insensitive)', () => {
    const newExpenses = [
      { name: 'Existing Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, existingExpenses)

    expect(result.hasDuplicates).toBe(true)
    expect(result.valid).toHaveLength(0)
    expect(result.duplicates).toHaveLength(1)
    expect(result.duplicates).toContain('Existing Rent')
  })

  it('should be case insensitive for duplicate detection', () => {
    const newExpenses = [
      { name: 'EXISTING RENT', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, existingExpenses)

    expect(result.hasDuplicates).toBe(true)
    expect(result.duplicates).toContain('EXISTING RENT')
  })

  it('should handle mixed valid and duplicate expenses', () => {
    const newExpenses = [
      { name: 'New Expense', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { name: 'Existing Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { name: 'Another New', amount: 200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, existingExpenses)

    expect(result.hasDuplicates).toBe(true)
    expect(result.validCount).toBe(2)
    expect(result.duplicateCount).toBe(1)
    expect(result.valid.map(e => e.name)).toEqual(['New Expense', 'Another New'])
    expect(result.duplicates).toEqual(['Existing Rent'])
  })

  it('should handle empty existing expenses', () => {
    const newExpenses = [
      { name: 'New Expense', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, [])

    expect(result.hasDuplicates).toBe(false)
    expect(result.validCount).toBe(1)
    expect(result.duplicateCount).toBe(0)
  })

  it('should handle empty new expenses', () => {
    const result = validateImport([], existingExpenses)

    expect(result.hasDuplicates).toBe(false)
    expect(result.validCount).toBe(0)
    expect(result.duplicateCount).toBe(0)
  })

  it('should handle multiple duplicates', () => {
    const newExpenses = [
      { name: 'Existing Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { name: 'Existing Insurance', amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]

    const result = validateImport(newExpenses, existingExpenses)

    expect(result.hasDuplicates).toBe(true)
    expect(result.duplicateCount).toBe(2)
    expect(result.validCount).toBe(0)
  })
})
