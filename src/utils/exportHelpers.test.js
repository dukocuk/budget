/**
 * Tests for CSV export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCSV, downloadCSV } from './exportHelpers'

describe('generateCSV', () => {
  describe('Basic CSV Generation', () => {
    it('should generate CSV with UTF-8 BOM', () => {
      const expenses = []
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv.charCodeAt(0)).toBe(0xFEFF) // UTF-8 BOM
    })

    it('should include expense summary section', () => {
      const expenses = [
        { id: 1, name: 'Test Expense', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total')
      expect(csv).toContain('Test Expense')
    })

    it('should handle empty expenses array', () => {
      const csv = generateCSV([], 5700, 4831)

      expect(csv).toContain('Udgift,Beløb,Frekvens')
      expect(csv).toContain('Månedlig Oversigt')
      expect(csv).toContain('Opsummering')
    })
  })

  describe('Fixed Monthly Payment', () => {
    it('should format fixed monthly payment correctly', () => {
      const expenses = [
        { id: 1, name: 'Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('Månedlig indbetaling,5700')
      expect(csv).not.toContain('Variabel')
    })

    it('should calculate annual totals for monthly expenses', () => {
      const expenses = [
        { id: 1, name: 'Monthly', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('1200') // 100 * 12 months
    })

    it('should calculate annual totals for quarterly expenses', () => {
      const expenses = [
        { id: 1, name: 'Quarterly', amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('1600') // 400 * 4 quarters
    })

    it('should calculate annual totals for yearly expenses', () => {
      const expenses = [
        { id: 1, name: 'Yearly', amount: 1000, frequency: 'yearly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('1000') // 1000 * 1
    })
  })

  describe('Variable Monthly Payments', () => {
    it('should format variable monthly payments correctly', () => {
      const expenses = [
        { id: 1, name: 'Rent', amount: 5000, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const variablePayments = [5700, 5700, 5700, 6000, 6000, 6000, 5700, 5700, 5700, 5700, 5700, 5700]
      const csv = generateCSV(expenses, variablePayments, 4831)

      expect(csv).toContain('Månedlige Indbetalinger')
      expect(csv).toContain('Variabel (se oversigt ovenfor)')
      expect(csv).toContain('Gennemsnitlig månedlig indbetaling')
    })

    it('should include monthly payments section for variable payments', () => {
      const expenses = []
      const variablePayments = [5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100]
      const csv = generateCSV(expenses, variablePayments, 0)

      expect(csv).toContain('Månedlige Indbetalinger')
      expect(csv).toContain('Jan,Feb,Mar,Apr,Maj,Jun,Jul,Aug,Sep,Okt,Nov,Dec,Total')
    })

    it('should calculate total annual income for variable payments', () => {
      const expenses = []
      const variablePayments = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
      const csv = generateCSV(expenses, variablePayments, 0)

      expect(csv).toContain('12000') // Sum of all payments
    })

    it('should handle zero values in variable payments', () => {
      const expenses = []
      const variablePayments = [1000, 0, 1000, 0, 1000, 0, 1000, 0, 1000, 0, 1000, 0]
      const csv = generateCSV(expenses, variablePayments, 0)

      expect(csv).toContain('6000') // Sum of non-zero payments
    })
  })

  describe('Monthly Breakdown Section', () => {
    it('should include all 12 month columns', () => {
      const expenses = [
        { id: 1, name: 'Test', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      expect(csv).toContain('Jan,Feb,Mar,Apr,Maj,Jun,Jul,Aug,Sep,Okt,Nov,Dec,Total')
    })

    it('should show correct monthly amounts for partial year expenses', () => {
      const expenses = [
        { id: 1, name: 'Summer', amount: 500, frequency: 'monthly', startMonth: 6, endMonth: 8 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      const lines = csv.split('\n')
      const summerLine = lines.find(line => line.includes('Summer'))

      expect(summerLine).toBeTruthy()
      // Should have zeros for Jan-May, 500 for Jun-Aug, zeros for Sep-Dec
      const values = summerLine.split(',').slice(1, 13).map(v => parseInt(v))
      expect(values[0]).toBe(0) // Jan
      expect(values[5]).toBe(500) // Jun
      expect(values[7]).toBe(500) // Aug
      expect(values[8]).toBe(0) // Sep
    })

    it('should calculate totals row correctly', () => {
      const expenses = [
        { id: 1, name: 'Expense1', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
        { id: 2, name: 'Expense2', amount: 200, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      expect(csv).toContain('TOTAL')
      expect(csv).toContain('3600') // (100 + 200) * 12
    })
  })

  describe('Summary Section', () => {
    it('should include all summary fields', () => {
      const expenses = [
        { id: 1, name: 'Test', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 4831)

      expect(csv).toContain('Opsummering')
      expect(csv).toContain('Årlige udgifter')
      expect(csv).toContain('Månedlig indbetaling')
      expect(csv).toContain('Overført fra sidste år,4831')
    })

    it('should show average monthly income for variable payments', () => {
      const expenses = []
      const variablePayments = [6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000]
      const csv = generateCSV(expenses, variablePayments, 0)

      expect(csv).toContain('Gennemsnitlig månedlig indbetaling,6000')
    })
  })

  describe('Special Characters and Quoting', () => {
    it('should quote expense names with special characters', () => {
      const expenses = [
        { id: 1, name: 'Expense, with comma', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      expect(csv).toContain('"Expense, with comma"')
    })

    it('should handle Danish characters correctly', () => {
      const expenses = [
        { id: 1, name: 'Forsikring æøå ÆØÅ', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      expect(csv).toContain('Forsikring æøå ÆØÅ')
    })
  })

  describe('Multiple Expenses', () => {
    it('should handle multiple expenses of different frequencies', () => {
      const expenses = [
        { id: 1, name: 'Monthly', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
        { id: 2, name: 'Quarterly', amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
        { id: 3, name: 'Yearly', amount: 1000, frequency: 'yearly', startMonth: 1, endMonth: 12 }
      ]
      const csv = generateCSV(expenses, 5700, 0)

      expect(csv).toContain('Monthly')
      expect(csv).toContain('Quarterly')
      expect(csv).toContain('Yearly')
      expect(csv).toContain('3800') // 1200 + 1600 + 1000
    })
  })
})

describe('downloadCSV', () => {
  let createElementSpy
  let clickSpy
  let createObjectURLSpy
  let revokeObjectURLSpy

  beforeEach(() => {
    // Mock DOM APIs
    clickSpy = vi.fn()
    createObjectURLSpy = vi.fn(() => 'blob:mock-url')
    revokeObjectURLSpy = vi.fn()

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      href: '',
      download: ''
    })

    global.URL.createObjectURL = createObjectURLSpy
    global.URL.revokeObjectURL = revokeObjectURLSpy
    global.Blob = vi.fn(function(content, options) {
      this.content = content
      this.options = options
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a download link', () => {
    const csvContent = 'test,csv,content'
    downloadCSV(csvContent)

    expect(createElementSpy).toHaveBeenCalledWith('a')
  })

  it('should trigger download with click', () => {
    const csvContent = 'test,csv,content'
    downloadCSV(csvContent)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('should use default filename format when no filename provided', () => {
    const csvContent = 'test,csv,content'
    const link = { click: clickSpy, href: '', download: '' }
    createElementSpy.mockReturnValue(link)

    downloadCSV(csvContent)

    expect(link.download).toMatch(/^budget_\d{4}-\d{2}-\d{2}\.csv$/)
  })

  it('should use custom filename when provided', () => {
    const csvContent = 'test,csv,content'
    const customFilename = 'my-budget-2024.csv'
    const link = { click: clickSpy, href: '', download: '' }
    createElementSpy.mockReturnValue(link)

    downloadCSV(csvContent, customFilename)

    expect(link.download).toBe(customFilename)
  })

  it('should create blob with correct content type', () => {
    const csvContent = 'test,csv,content'
    downloadCSV(csvContent)

    expect(global.Blob).toHaveBeenCalledWith(
      [csvContent],
      { type: 'text/csv;charset=utf-8;' }
    )
  })

  it('should create and revoke object URL', () => {
    const csvContent = 'test,csv,content'
    downloadCSV(csvContent)

    expect(createObjectURLSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })
})
