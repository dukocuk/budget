/**
 * Tests for year comparison utilities
 */

import { describe, it, expect } from 'vitest'
import {
  comparePeriods,
  compareMonthlyTotals,
  compareExpenses,
  calculateYearlyTrends,
  compareFrequencyDistribution,
  calculateGrowthRate,
  formatComparisonValue,
  calculateSavingsRate,
  generateComparisonSummary
} from './yearComparison'

describe('comparePeriods', () => {
  const mockPeriod1 = {
    year: 2024,
    monthlyPayment: 5700,
    previousBalance: 4831,
    expenses: [
      { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
    ]
  }

  const mockPeriod2 = {
    year: 2025,
    monthlyPayment: 6000,
    previousBalance: 5000,
    expenses: [
      { amount: 120, frequency: 'monthly', startMonth: 1, endMonth: 12 },
      { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
      { amount: 1200, frequency: 'yearly', startMonth: 1, endMonth: 12 }
    ]
  }

  it('compares two periods and calculates differences', () => {
    const result = comparePeriods(mockPeriod1, mockPeriod2)

    expect(result).not.toBeNull()
    expect(result.period1.year).toBe(2024)
    expect(result.period2.year).toBe(2025)
    expect(result.period1.expenseCount).toBe(2)
    expect(result.period2.expenseCount).toBe(3)
    expect(result.expenseCountChange).toBe(1)

    // Check structure
    expect(result.differences).toHaveProperty('totalAnnual')
    expect(result.differences).toHaveProperty('avgMonthly')
    expect(result.percentageChanges).toHaveProperty('totalAnnual')
    expect(result.percentageChanges).toHaveProperty('avgMonthly')
  })

  it('returns null for null period1', () => {
    const result = comparePeriods(null, mockPeriod2)
    expect(result).toBeNull()
  })

  it('returns null for null period2', () => {
    const result = comparePeriods(mockPeriod1, null)
    expect(result).toBeNull()
  })

  it('returns null for undefined periods', () => {
    expect(comparePeriods(undefined, mockPeriod2)).toBeNull()
    expect(comparePeriods(mockPeriod1, undefined)).toBeNull()
  })

  it('handles zero total annual in period1 (no expenses)', () => {
    const period1 = { ...mockPeriod1, expenses: [] }
    const result = comparePeriods(period1, mockPeriod2)

    expect(result.period1.summary.totalAnnual).toBe(0)
    expect(result.percentageChanges.totalAnnual).toBe(0) // Should not divide by zero
  })

  it('calculates percentage changes correctly', () => {
    const result = comparePeriods(mockPeriod1, mockPeriod2)

    // Period1: 100*12 + 400*4 = 2800
    // Period2: 120*12 + 400*4 + 1200 = 4240
    // Difference: 1440
    // Percentage: (1440 / 2800) * 100 = 51.43%

    expect(result.differences.totalAnnual).toBe(1440)
    expect(result.percentageChanges.totalAnnual).toBeCloseTo(51.43, 1)
  })

  it('handles monthlyPayments array correctly', () => {
    const period1 = {
      ...mockPeriod1,
      monthlyPayments: Array(12).fill(6000)
    }

    const result = comparePeriods(period1, mockPeriod2)

    expect(result).not.toBeNull()
    expect(result.period1.summary.avgMonthlyIncome).toBe(6000)
  })

  it('handles negative balances', () => {
    const period1 = {
      year: 2024,
      monthlyPayment: 100,
      previousBalance: 0,
      expenses: [{ amount: 500, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    }

    const period2 = {
      year: 2025,
      monthlyPayment: 200,
      previousBalance: 0,
      expenses: [{ amount: 500, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    }

    const result = comparePeriods(period1, period2)

    expect(result.period1.summary.monthlyBalance).toBeLessThan(0)
    expect(result.period2.summary.monthlyBalance).toBeLessThan(0)
    expect(result.percentageChanges.monthlyBalance).toBeDefined()
  })
})

describe('compareMonthlyTotals', () => {
  const expenses1 = [
    { amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
    { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
  ]

  const expenses2 = [
    { amount: 120, frequency: 'monthly', startMonth: 1, endMonth: 12 },
    { amount: 400, frequency: 'quarterly', startMonth: 1, endMonth: 12 }
  ]

  it('compares monthly totals between two periods', () => {
    const result = compareMonthlyTotals(expenses1, expenses2)

    expect(result).toHaveLength(12)

    // Check structure
    result.forEach(month => {
      expect(month).toHaveProperty('month')
      expect(month).toHaveProperty('period1')
      expect(month).toHaveProperty('period2')
      expect(month).toHaveProperty('difference')
      expect(month).toHaveProperty('percentageChange')
    })

    // January should have both monthly + quarterly
    expect(result[0].month).toBe('Jan')
    expect(result[0].period1).toBe(500) // 100 + 400
    expect(result[0].period2).toBe(520) // 120 + 400
    expect(result[0].difference).toBe(20)
  })

  it('returns correct Danish month names', () => {
    const result = compareMonthlyTotals([], [])

    expect(result[0].month).toBe('Jan')
    expect(result[4].month).toBe('Maj')
    expect(result[9].month).toBe('Okt')
  })

  it('calculates percentage changes correctly', () => {
    const result = compareMonthlyTotals(expenses1, expenses2)

    // February: 100 -> 120 = 20% increase
    expect(result[1].period1).toBe(100)
    expect(result[1].period2).toBe(120)
    expect(result[1].difference).toBe(20)
    expect(result[1].percentageChange).toBe(20)
  })

  it('handles zero values without division errors', () => {
    const expenses1 = []
    const expenses2 = [{ amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }]

    const result = compareMonthlyTotals(expenses1, expenses2)

    result.forEach(month => {
      expect(month.period1).toBe(0)
      expect(month.percentageChange).toBe(0) // Should not divide by zero
    })
  })

  it('handles empty expense arrays', () => {
    const result = compareMonthlyTotals([], [])

    expect(result).toHaveLength(12)
    result.forEach(month => {
      expect(month.period1).toBe(0)
      expect(month.period2).toBe(0)
      expect(month.difference).toBe(0)
    })
  })
})

describe('compareExpenses', () => {
  const expenses1 = [
    { name: 'Netflix', amount: 100, frequency: 'monthly' },
    { name: 'Spotify', amount: 50, frequency: 'monthly' },
    { name: 'Gym', amount: 200, frequency: 'monthly' }
  ]

  const expenses2 = [
    { name: 'Netflix', amount: 120, frequency: 'monthly' }, // Modified amount
    { name: 'Spotify', amount: 50, frequency: 'monthly' }, // Unchanged
    { name: 'Disney+', amount: 80, frequency: 'monthly' } // Added
    // Gym removed
  ]

  it('finds added expenses', () => {
    const result = compareExpenses(expenses1, expenses2)

    expect(result.added).toHaveLength(1)
    expect(result.added[0].name).toBe('Disney+')
    expect(result.addedCount).toBe(1)
  })

  it('finds removed expenses', () => {
    const result = compareExpenses(expenses1, expenses2)

    expect(result.removed).toHaveLength(1)
    expect(result.removed[0].name).toBe('Gym')
    expect(result.removedCount).toBe(1)
  })

  it('finds modified expenses by amount', () => {
    const result = compareExpenses(expenses1, expenses2)

    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].name).toBe('Netflix')
    expect(result.modified[0].oldAmount).toBe(100)
    expect(result.modified[0].newAmount).toBe(120)
    expect(result.modified[0].amountChange).toBe(20)
    expect(result.modified[0].percentageChange).toBe(20)
    expect(result.modifiedCount).toBe(1)
  })

  it('finds modified expenses by frequency', () => {
    const exp1 = [{ name: 'Test', amount: 100, frequency: 'monthly' }]
    const exp2 = [{ name: 'Test', amount: 100, frequency: 'quarterly' }]

    const result = compareExpenses(exp1, exp2)

    expect(result.modified).toHaveLength(1)
    expect(result.modified[0].oldFrequency).toBe('monthly')
    expect(result.modified[0].newFrequency).toBe('quarterly')
  })

  it('handles case-insensitive name matching', () => {
    const exp1 = [{ name: 'NETFLIX', amount: 100, frequency: 'monthly' }]
    const exp2 = [{ name: 'netflix', amount: 100, frequency: 'monthly' }]

    const result = compareExpenses(exp1, exp2)

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
  })

  it('handles empty expense lists', () => {
    const result = compareExpenses([], [])

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.modified).toHaveLength(0)
    expect(result.addedCount).toBe(0)
    expect(result.removedCount).toBe(0)
    expect(result.modifiedCount).toBe(0)
  })

  it('handles zero amount without division errors', () => {
    const exp1 = [{ name: 'Test', amount: 0, frequency: 'monthly' }]
    const exp2 = [{ name: 'Test', amount: 100, frequency: 'monthly' }]

    const result = compareExpenses(exp1, exp2)

    expect(result.modified[0].percentageChange).toBe(0) // Should not divide by zero
  })
})

describe('calculateYearlyTrends', () => {
  const periods = [
    {
      year: 2023,
      monthlyPayment: 5000,
      previousBalance: 1000,
      expenses: [{ amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    },
    {
      year: 2024,
      monthlyPayment: 5500,
      previousBalance: 2000,
      expenses: [{ amount: 120, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    },
    {
      year: 2025,
      monthlyPayment: 6000,
      previousBalance: 3000,
      expenses: [{ amount: 150, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
    }
  ]

  it('calculates trends for multiple periods', () => {
    const result = calculateYearlyTrends(periods)

    expect(result).toHaveLength(3)

    result.forEach(trend => {
      expect(trend).toHaveProperty('year')
      expect(trend).toHaveProperty('totalAnnual')
      expect(trend).toHaveProperty('avgMonthly')
      expect(trend).toHaveProperty('monthlyBalance')
      expect(trend).toHaveProperty('annualReserve')
      expect(trend).toHaveProperty('expenseCount')
      expect(trend).toHaveProperty('monthlyPayment')
    })
  })

  it('sorts periods by year ascending', () => {
    const unsorted = [periods[2], periods[0], periods[1]]
    const result = calculateYearlyTrends(unsorted)

    expect(result[0].year).toBe(2023)
    expect(result[1].year).toBe(2024)
    expect(result[2].year).toBe(2025)
  })

  it('handles empty periods array', () => {
    const result = calculateYearlyTrends([])
    expect(result).toHaveLength(0)
  })

  it('handles null or undefined input', () => {
    expect(calculateYearlyTrends(null)).toHaveLength(0)
    expect(calculateYearlyTrends(undefined)).toHaveLength(0)
  })

  it('calculates average monthly payment from array', () => {
    const periodsWithArray = [{
      year: 2024,
      monthlyPayments: [5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000],
      previousBalance: 0,
      expenses: []
    }]

    const result = calculateYearlyTrends(periodsWithArray)

    // Average of all months = 68100 / 12 = 5675
    expect(result[0].monthlyPayment).toBeCloseTo(5675, 0)
  })

  it('uses fixed monthlyPayment when no array provided', () => {
    const result = calculateYearlyTrends([periods[0]])

    expect(result[0].monthlyPayment).toBe(5000)
  })
})

describe('compareFrequencyDistribution', () => {
  const expenses1 = [
    { frequency: 'monthly' },
    { frequency: 'monthly' },
    { frequency: 'quarterly' },
    { frequency: 'yearly' }
  ]

  const expenses2 = [
    { frequency: 'monthly' },
    { frequency: 'monthly' },
    { frequency: 'monthly' },
    { frequency: 'quarterly' },
    { frequency: 'quarterly' },
    { frequency: 'yearly' }
  ]

  it('compares frequency distribution between periods', () => {
    const result = compareFrequencyDistribution(expenses1, expenses2)

    expect(result.period1).toEqual({ monthly: 2, quarterly: 1, yearly: 1 })
    expect(result.period2).toEqual({ monthly: 3, quarterly: 2, yearly: 1 })
    expect(result.differences).toEqual({ monthly: 1, quarterly: 1, yearly: 0 })
  })

  it('handles empty expense arrays', () => {
    const result = compareFrequencyDistribution([], [])

    expect(result.period1).toEqual({ monthly: 0, quarterly: 0, yearly: 0 })
    expect(result.period2).toEqual({ monthly: 0, quarterly: 0, yearly: 0 })
    expect(result.differences).toEqual({ monthly: 0, quarterly: 0, yearly: 0 })
  })

  it('ignores invalid frequency values', () => {
    const exp1 = [{ frequency: 'invalid' }, { frequency: 'monthly' }]
    const exp2 = [{ frequency: 'monthly' }]

    const result = compareFrequencyDistribution(exp1, exp2)

    expect(result.period1).toEqual({ monthly: 1, quarterly: 0, yearly: 0 })
    expect(result.period2).toEqual({ monthly: 1, quarterly: 0, yearly: 0 })
  })
})

describe('calculateGrowthRate', () => {
  it('calculates positive growth rate', () => {
    const rate = calculateGrowthRate(100, 150)
    expect(rate).toBe(50)
  })

  it('calculates negative growth rate', () => {
    const rate = calculateGrowthRate(150, 100)
    expect(rate).toBeCloseTo(-33.33, 2)
  })

  it('returns 0 for zero old value', () => {
    const rate = calculateGrowthRate(0, 100)
    expect(rate).toBe(0)
  })

  it('handles negative old value', () => {
    const rate = calculateGrowthRate(-100, -50)
    expect(rate).toBe(50) // Uses Math.abs for denominator
  })

  it('returns 0 for same values', () => {
    const rate = calculateGrowthRate(100, 100)
    expect(rate).toBe(0)
  })
})

describe('formatComparisonValue', () => {
  it('formats positive value with higherIsBetter=true', () => {
    const result = formatComparisonValue(25.5, true)

    expect(result.value).toBe(25.5)
    expect(result.formatted).toBe('+25.50')
    expect(result.color).toBe('success')
    expect(result.icon).toBe('📈')
    expect(result.isPositive).toBe(true)
  })

  it('formats negative value with higherIsBetter=true', () => {
    const result = formatComparisonValue(-15.75, true)

    expect(result.formatted).toBe('-15.75')
    expect(result.color).toBe('error')
    expect(result.icon).toBe('📉')
    expect(result.isPositive).toBe(false)
  })

  it('formats positive value with higherIsBetter=false', () => {
    const result = formatComparisonValue(10, false)

    expect(result.formatted).toBe('+10.00')
    expect(result.color).toBe('error')
    expect(result.icon).toBe('📉')
    expect(result.isPositive).toBe(false)
  })

  it('formats negative value with higherIsBetter=false', () => {
    const result = formatComparisonValue(-20, false)

    expect(result.formatted).toBe('-20.00')
    expect(result.color).toBe('success')
    expect(result.icon).toBe('📈')
    expect(result.isPositive).toBe(true)
  })

  it('handles zero value', () => {
    const result = formatComparisonValue(0, true)

    expect(result.formatted).toBe('0.00')
    expect(result.color).toBe('success')
    expect(result.isPositive).toBe(true)
  })

  it('defaults to higherIsBetter=true', () => {
    const result = formatComparisonValue(10)

    expect(result.color).toBe('success')
    expect(result.isPositive).toBe(true)
  })
})

describe('calculateSavingsRate', () => {
  it('calculates savings rate correctly', () => {
    const rate = calculateSavingsRate(1000, 5000)
    expect(rate).toBe(20)
  })

  it('handles 100% savings', () => {
    const rate = calculateSavingsRate(5000, 5000)
    expect(rate).toBe(100)
  })

  it('handles negative balance (overspending)', () => {
    const rate = calculateSavingsRate(-500, 5000)
    expect(rate).toBe(-10)
  })

  it('returns 0 for zero monthly payment', () => {
    const rate = calculateSavingsRate(1000, 0)
    expect(rate).toBe(0)
  })

  it('returns 0 for zero balance', () => {
    const rate = calculateSavingsRate(0, 5000)
    expect(rate).toBe(0)
  })
})

describe('generateComparisonSummary', () => {
  it('generates summary for increased expenses', () => {
    const comparison = {
      period1: { year: 2024 },
      period2: { year: 2025 },
      percentageChanges: { totalAnnual: 25.5 }
    }

    const summary = generateComparisonSummary(comparison)

    expect(summary).toContain('steget')
    expect(summary).toContain('25.5%')
    expect(summary).toContain('2024')
    expect(summary).toContain('2025')
  })

  it('generates summary for decreased expenses', () => {
    const comparison = {
      period1: { year: 2024 },
      period2: { year: 2025 },
      percentageChanges: { totalAnnual: -15.3 }
    }

    const summary = generateComparisonSummary(comparison)

    expect(summary).toContain('faldet')
    expect(summary).toContain('15.3%')
  })

  it('returns default message for null comparison', () => {
    const summary = generateComparisonSummary(null)

    expect(summary).toBe('Ingen sammenligning tilgængelig')
  })

  it('returns default message for undefined comparison', () => {
    const summary = generateComparisonSummary(undefined)

    expect(summary).toBe('Ingen sammenligning tilgængelig')
  })

  it('uses Danish language', () => {
    const comparison = {
      period1: { year: 2024 },
      period2: { year: 2025 },
      percentageChanges: { totalAnnual: 10 }
    }

    const summary = generateComparisonSummary(comparison)

    expect(summary).toContain('Dine årlige udgifter')
    expect(summary).toContain('fra')
    expect(summary).toContain('til')
  })
})
