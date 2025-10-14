/**
 * Tests for useExpenseFilters hook
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExpenseFilters } from './useExpenseFilters'

const mockExpenses = [
  { id: 1, name: 'Netflix', amount: 100, frequency: 'monthly', startMonth: 1, endMonth: 12 },
  { id: 2, name: 'Spotify', amount: 99, frequency: 'monthly', startMonth: 1, endMonth: 12 },
  { id: 3, name: 'Insurance', amount: 500, frequency: 'quarterly', startMonth: 1, endMonth: 12 },
  { id: 4, name: 'Domain', amount: 120, frequency: 'yearly', startMonth: 6, endMonth: 12 },
  { id: 5, name: 'Netflix Premium', amount: 150, frequency: 'monthly', startMonth: 3, endMonth: 8 },
]

describe('useExpenseFilters', () => {
  it('initializes with all expenses unfiltered', () => {
    const { result } = renderHook(() => useExpenseFilters(mockExpenses))

    expect(result.current.filteredExpenses).toHaveLength(5)
    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.filterCount).toBe(0)
  })

  it('handles empty expenses array', () => {
    const { result } = renderHook(() => useExpenseFilters([]))

    expect(result.current.filteredExpenses).toHaveLength(0)
    expect(result.current.filterCount).toBe(0)
  })

  it('handles null/undefined expenses', () => {
    const { result: result1 } = renderHook(() => useExpenseFilters(null))
    expect(result1.current.filteredExpenses).toHaveLength(0)

    const { result: result2 } = renderHook(() => useExpenseFilters(undefined))
    expect(result2.current.filteredExpenses).toHaveLength(0)
  })

  describe('Search Text Filter', () => {
    it('filters by search text (case-insensitive)', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
      expect(result.current.filteredExpenses[0].name).toBe('Netflix')
      expect(result.current.filteredExpenses[1].name).toBe('Netflix Premium')
    })

    it('handles partial matches', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('net')
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
    })

    it('returns empty array when no matches', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('nonexistent')
      })

      expect(result.current.filteredExpenses).toHaveLength(0)
    })

    it('marks search as active filter', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
      })

      expect(result.current.hasActiveFilters).toBeTruthy()
      expect(result.current.filterCount).toBe(3)
    })
  })

  describe('Frequency Filter', () => {
    it('filters by monthly frequency', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setFrequencyFilter('monthly')
      })

      expect(result.current.filteredExpenses).toHaveLength(3)
      expect(result.current.filteredExpenses.every(e => e.frequency === 'monthly')).toBe(true)
    })

    it('filters by quarterly frequency', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setFrequencyFilter('quarterly')
      })

      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].name).toBe('Insurance')
    })

    it('filters by yearly frequency', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setFrequencyFilter('yearly')
      })

      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].name).toBe('Domain')
    })

    it('marks frequency as active filter', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setFrequencyFilter('monthly')
      })

      expect(result.current.hasActiveFilters).toBe(true)
      expect(result.current.filterCount).toBe(2)
    })
  })

  describe('Month Filter', () => {
    it('filters by active month', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setMonthFilter('5') // May
      })

      // Should include: Netflix (1-12), Spotify (1-12), Insurance (1-12), Netflix Premium (3-8)
      // Should exclude: Domain (6-12)
      expect(result.current.filteredExpenses).toHaveLength(4)
    })

    it('filters by month at boundary', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setMonthFilter('6') // June
      })

      // All expenses should be included in June
      expect(result.current.filteredExpenses).toHaveLength(5)
    })

    it('filters by month outside expense range', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setMonthFilter('2') // February
      })

      // Should exclude Netflix Premium (starts in March) and Domain (starts in June)
      expect(result.current.filteredExpenses).toHaveLength(3)
    })

    it('marks month as active filter', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setMonthFilter('5')
      })

      expect(result.current.hasActiveFilters).toBe(true)
      expect(result.current.filterCount).toBe(1)
    })
  })

  describe('Combined Filters', () => {
    it('applies search + frequency filters together', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
        result.current.setFrequencyFilter('monthly')
      })

      expect(result.current.filteredExpenses).toHaveLength(2)
      expect(result.current.filteredExpenses.every(e =>
        e.name.toLowerCase().includes('netflix') && e.frequency === 'monthly'
      )).toBe(true)
    })

    it('applies search + month filters together', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
        result.current.setMonthFilter('2') // February
      })

      // Should only include Netflix (not Netflix Premium which starts in March)
      expect(result.current.filteredExpenses).toHaveLength(1)
      expect(result.current.filteredExpenses[0].name).toBe('Netflix')
    })

    it('applies frequency + month filters together', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setFrequencyFilter('monthly')
        result.current.setMonthFilter('2') // February
      })

      // Should include Netflix and Spotify (both monthly and active in Feb)
      expect(result.current.filteredExpenses).toHaveLength(2)
    })

    it('applies all three filters together', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
        result.current.setFrequencyFilter('monthly')
        result.current.setMonthFilter('5') // May
      })

      // Should include both Netflix expenses that are monthly and active in May
      expect(result.current.filteredExpenses).toHaveLength(2)
    })
  })

  describe('Clear Filters', () => {
    it('clears all filters', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      act(() => {
        result.current.setSearchText('netflix')
        result.current.setFrequencyFilter('monthly')
        result.current.setMonthFilter('5')
      })

      expect(result.current.hasActiveFilters).toBeTruthy()

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.searchText).toBe('')
      expect(result.current.frequencyFilter).toBe('all')
      expect(result.current.monthFilter).toBe('all')
      expect(result.current.hasActiveFilters).toBeFalsy()
      expect(result.current.filteredExpenses).toHaveLength(5)
    })
  })

  describe('Filter Count', () => {
    it('calculates correct filter count', () => {
      const { result } = renderHook(() => useExpenseFilters(mockExpenses))

      expect(result.current.filterCount).toBe(0)

      act(() => {
        result.current.setSearchText('netflix')
      })

      expect(result.current.filterCount).toBe(3) // 5 total - 2 filtered

      act(() => {
        result.current.clearFilters()
        result.current.setFrequencyFilter('yearly')
      })

      expect(result.current.filterCount).toBe(4) // 5 total - 1 filtered
    })
  })

  describe('Reactive Updates', () => {
    it('updates filtered expenses when expenses array changes', () => {
      const { result, rerender } = renderHook(
        ({ expenses }) => useExpenseFilters(expenses),
        { initialProps: { expenses: mockExpenses } }
      )

      expect(result.current.filteredExpenses).toHaveLength(5)

      const newExpenses = mockExpenses.slice(0, 3)
      rerender({ expenses: newExpenses })

      expect(result.current.filteredExpenses).toHaveLength(3)
    })

    it('maintains filters when expenses array changes', () => {
      const { result, rerender } = renderHook(
        ({ expenses }) => useExpenseFilters(expenses),
        { initialProps: { expenses: mockExpenses } }
      )

      act(() => {
        result.current.setSearchText('netflix')
      })

      expect(result.current.filteredExpenses).toHaveLength(2)

      const newExpenses = [...mockExpenses, { id: 6, name: 'Netflix Basic', amount: 80, frequency: 'monthly', startMonth: 1, endMonth: 12 }]
      rerender({ expenses: newExpenses })

      // Filter should still be active
      expect(result.current.searchText).toBe('netflix')
      expect(result.current.filteredExpenses).toHaveLength(3)
    })
  })
})
