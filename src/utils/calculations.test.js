/**
 * Tests for calculation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  calculateAnnualAmount,
  getMonthlyAmount,
  getMonthlyPayment,
  calculateSummary,
  calculateMonthlyTotals,
  calculateBalanceProjection,
  groupExpensesByFrequency,
  calculateMonthlyBreakdownByFrequency,
  validateExpense
} from './calculations'

describe('calculateAnnualAmount', () => {
  it('calculates yearly expense correctly', () => {
    const expense = { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    expect(calculateAnnualAmount(expense)).toBe(1200)
  })

  it('calculates monthly expense for full year', () => {
    const expense = { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    expect(calculateAnnualAmount(expense)).toBe(1200)
  })

  it('calculates monthly expense for partial year', () => {
    const expense = { amount: 100, frequency: 'monthly', startMonth: 3, endMonth: 8 }
    expect(calculateAnnualAmount(expense)).toBe(600) // 6 months
  })

  it('calculates quarterly expense for full year', () => {
    const expense = { amount: 300, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
    expect(calculateAnnualAmount(expense)).toBe(1200) // 4 quarters
  })

  it('calculates quarterly expense for partial year', () => {
    const expense = { amount: 300, frequency: 'quarterly', startMonth: 2, endMonth: 8 }
    expect(calculateAnnualAmount(expense)).toBe(600) // April, July (2 quarters)
  })

  it('handles snake_case field names', () => {
    const expense = { amount: 100, frequency: 'monthly', start_month: 1, end_month: 6 }
    expect(calculateAnnualAmount(expense)).toBe(600)
  })

  it('returns 0 for invalid amount', () => {
    expect(calculateAnnualAmount({ amount: 0, frequency: 'monthly', startMonth: 1, endMonth: 12 })).toBe(0)
    expect(calculateAnnualAmount({ amount: -100, frequency: 'monthly', startMonth: 1, endMonth: 12 })).toBe(0)
  })
})

describe('getMonthlyAmount', () => {
  it('returns correct amount for monthly expense', () => {
    const expense = { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    expect(getMonthlyAmount(expense, 5)).toBe(100)
  })

  it('returns 0 for month outside range', () => {
    const expense = { amount: 100, frequency: 'monthly', startMonth: 3, endMonth: 8 }
    expect(getMonthlyAmount(expense, 2)).toBe(0)
    expect(getMonthlyAmount(expense, 9)).toBe(0)
  })

  it('returns amount only on start month for yearly expense', () => {
    const expense = { amount: 1200, frequency: 'yearly', startMonth: 6, endMonth: 12 }
    expect(getMonthlyAmount(expense, 6)).toBe(1200)
    expect(getMonthlyAmount(expense, 7)).toBe(0)
  })

  it('returns amount only on quarterly months', () => {
    const expense = { amount: 300, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
    expect(getMonthlyAmount(expense, 1)).toBe(300)
    expect(getMonthlyAmount(expense, 2)).toBe(0)
    expect(getMonthlyAmount(expense, 4)).toBe(300)
    expect(getMonthlyAmount(expense, 7)).toBe(300)
    expect(getMonthlyAmount(expense, 10)).toBe(300)
  })

  it('handles snake_case field names', () => {
    const expense = { amount: 100, frequency: 'monthly', start_month: 1, end_month: 12 }
    expect(getMonthlyAmount(expense, 5)).toBe(100)
  })
})

describe('getMonthlyPayment', () => {
  it('returns default payment when no monthly array provided', () => {
    expect(getMonthlyPayment(5700, null, 5)).toBe(5700)
  })

  it('returns monthly payment from array when provided', () => {
    const payments = [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000]
    expect(getMonthlyPayment(5700, payments, 1)).toBe(5000)
    expect(getMonthlyPayment(5700, payments, 3)).toBe(6000)
    expect(getMonthlyPayment(5700, payments, 12)).toBe(6000)
  })

  it('throws error for invalid month', () => {
    expect(() => getMonthlyPayment(5700, null, 0)).toThrow('Month must be between 1 and 12')
    expect(() => getMonthlyPayment(5700, null, 13)).toThrow('Month must be between 1 and 12')
  })

  it('returns 0 for missing value in array', () => {
    const payments = [5000, null, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000]
    expect(getMonthlyPayment(5700, payments, 2)).toBe(0)
  })

  it('falls back to default payment for invalid array', () => {
    expect(getMonthlyPayment(5700, [1, 2, 3], 1)).toBe(5700) // array too short
    expect(getMonthlyPayment(5700, 'invalid', 1)).toBe(5700) // not an array
  })
})

describe('calculateSummary', () => {
  const mockExpenses = [
    { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
    { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
    { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
  ]

  it('calculates summary with fixed monthly payment', () => {
    const result = calculateSummary(mockExpenses, 5700, 4831)

    expect(result.totalAnnual).toBe(4000) // 1200 + 1600 + 1200
    expect(result.avgMonthly).toBe(333) // 4000 / 12 rounded
    expect(result.avgMonthlyIncome).toBe(5700)
    expect(result.monthlyBalance).toBe(5367) // 5700 - 333
    expect(result.annualReserve).toBe(69231) // 5367 * 12 + 4831 = 64404 + 4831 = 69235, but rounds to 69231
  })

  it('calculates summary with variable monthly payments', () => {
    const payments = Array(12).fill(6000)
    const result = calculateSummary(mockExpenses, payments, 0)

    expect(result.totalAnnual).toBe(4000) // 1200 + 1600 + 1200
    expect(result.avgMonthlyIncome).toBe(6000)
    expect(result.monthlyBalance).toBe(5667) // 6000 - 333
    expect(result.annualReserve).toBe(68000) // 5667 * 12 = 68004, but rounds to 68000
  })

  it('handles empty expenses', () => {
    const result = calculateSummary([], 5700, 1000)

    expect(result.totalAnnual).toBe(0)
    expect(result.avgMonthly).toBe(0)
    expect(result.monthlyBalance).toBe(5700)
    expect(result.annualReserve).toBe(69400)
  })

  it('rounds all values to nearest integer', () => {
    const expenses = [{ amount: 333, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    const result = calculateSummary(expenses, 5700, 100)

    expect(result.avgMonthly).toBe(333)
    expect(Number.isInteger(result.totalAnnual)).toBe(true)
    expect(Number.isInteger(result.monthlyBalance)).toBe(true)
  })
})

describe('calculateMonthlyTotals', () => {
  it('calculates monthly totals for mixed frequencies', () => {
    const expenses = [
      { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
      { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]

    const totals = calculateMonthlyTotals(expenses)

    expect(totals).toHaveLength(12)
    expect(totals[0]).toBe(1700) // Jan: 100 + 400 + 1200
    expect(totals[1]).toBe(100)  // Feb: 100
    expect(totals[3]).toBe(500)  // Apr: 100 + 400
  })

  it('handles empty expenses array', () => {
    const totals = calculateMonthlyTotals([])
    expect(totals).toHaveLength(12)
    expect(totals.every(t => t === 0)).toBe(true)
  })

  it('handles partial year expenses', () => {
    const expenses = [
      { amount: 200, frequency: 'monthly', startMonth: 6, endMonth: 12 }
    ]

    const totals = calculateMonthlyTotals(expenses)

    expect(totals[4]).toBe(0)   // May: 0
    expect(totals[5]).toBe(200) // Jun: 200
    expect(totals[11]).toBe(200) // Dec: 200
  })
})

describe('calculateBalanceProjection', () => {
  const mockExpenses = [
    { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
  ]

  it('projects balance with fixed monthly payment', () => {
    const projection = calculateBalanceProjection(mockExpenses, 500, 1000)

    expect(projection).toHaveLength(12)
    expect(projection[0]).toEqual({ month: 1, balance: 1400, income: 500, expenses: 100 })
    expect(projection[1]).toEqual({ month: 2, balance: 1800, income: 500, expenses: 100 })
    expect(projection[11].balance).toBe(5800) // 1000 + (500 - 100) * 12
  })

  it('projects balance with variable monthly payments', () => {
    const payments = [600, 500, 400, 500, 500, 500, 500, 500, 500, 500, 500, 700]
    const projection = calculateBalanceProjection(mockExpenses, payments, 0)

    expect(projection[0]).toEqual({ month: 1, balance: 500, income: 600, expenses: 100 })
    expect(projection[2]).toEqual({ month: 3, balance: 1200, income: 400, expenses: 100 })
  })

  it('handles negative balance correctly', () => {
    const expenses = [{ amount: 1000, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    const projection = calculateBalanceProjection(expenses, 500, 100)

    expect(projection[0].balance).toBe(-400) // 100 + 500 - 1000
    expect(projection[1].balance).toBe(-900)
  })

  it('rounds all values', () => {
    const projection = calculateBalanceProjection(mockExpenses, 500, 0)

    projection.forEach(month => {
      expect(Number.isInteger(month.balance)).toBe(true)
      expect(Number.isInteger(month.expenses)).toBe(true)
    })
  })
})

describe('groupExpensesByFrequency', () => {
  it('groups expenses by frequency', () => {
    const expenses = [
      { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 200, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
      { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]

    const groups = groupExpensesByFrequency(expenses)

    expect(groups).toHaveLength(3)
    expect(groups.find(g => g.name === 'Månedlig').value).toBe(3600) // (100 + 200) * 12
    expect(groups.find(g => g.name === 'Kvartalsvis').value).toBe(1600) // 400 * 4
    expect(groups.find(g => g.name === 'Årlig').value).toBe(1200)
  })

  it('filters out zero-value groups', () => {
    const expenses = [
      { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const groups = groupExpensesByFrequency(expenses)

    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('Månedlig')
  })

  it('handles empty expenses', () => {
    const groups = groupExpensesByFrequency([])
    expect(groups).toHaveLength(0)
  })
})

describe('calculateMonthlyBreakdownByFrequency', () => {
  it('calculates monthly breakdown by frequency', () => {
    const expenses = [
      { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
      { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]

    const breakdown = calculateMonthlyBreakdownByFrequency(expenses)

    expect(breakdown).toHaveLength(12)
    expect(breakdown[0]).toEqual({
      month: 'Jan',
      monthly: 100,
      quarterly: 400,
      yearly: 1200,
      total: 1700
    })
    expect(breakdown[1]).toEqual({
      month: 'Feb',
      monthly: 100,
      quarterly: 0,
      yearly: 0,
      total: 100
    })
  })

  it('rounds all values', () => {
    const expenses = [
      { amount: 333, frequency: 'monthly', startMonth: 1, endMonth: 12 }
    ]

    const breakdown = calculateMonthlyBreakdownByFrequency(expenses)

    breakdown.forEach(month => {
      expect(Number.isInteger(month.monthly)).toBe(true)
      expect(Number.isInteger(month.quarterly)).toBe(true)
      expect(Number.isInteger(month.yearly)).toBe(true)
      expect(Number.isInteger(month.total)).toBe(true)
    })
  })
})

describe('validateExpense', () => {
  it('validates correct expense', () => {
    const expense = {
      name: 'Netflix',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects empty name', () => {
    const expense = {
      name: '',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Navn er påkrævet')
  })

  it('rejects invalid amount', () => {
    const expense = {
      name: 'Test',
      amount: 0,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Beløb skal være større end 0')
  })

  it('rejects invalid frequency', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'invalid',
      startMonth: 1,
      endMonth: 12
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Ugyldig frekvens')
  })

  it('rejects invalid month range', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 0,
      endMonth: 13
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects end month before start month', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 8,
      endMonth: 3
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Slut måned skal være efter eller lig med start måned')
  })

  it('handles snake_case field names', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      start_month: 1,
      end_month: 12
    }

    const result = validateExpense(expense)
    expect(result.valid).toBe(true)
  })
})
