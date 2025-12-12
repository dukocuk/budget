/**
 * Tests for MonthlyView component
 * Tests 12-month breakdown display and totals calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useExpenseContext } from '../hooks/useExpenseContext';
import MonthlyView from './MonthlyView';

// Mock the hook
vi.mock('../hooks/useExpenseContext');

describe('MonthlyView', () => {
  const mockExpenses = [
    {
      id: 1,
      name: 'Netflix',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 2,
      name: 'Insurance',
      amount: 500,
      frequency: 'quarterly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 3,
      name: 'Vacation',
      amount: 3000,
      frequency: 'yearly',
      startMonth: 7,
      endMonth: 7,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render monthly overview table', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      render(<MonthlyView />);

      expect(screen.getByText('📅 Månedlig oversigt')).toBeInTheDocument();
    });

    it('should render all 12 month columns', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      render(<MonthlyView />);

      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Maj',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Okt',
        'Nov',
        'Dec',
      ];
      months.forEach(month => {
        expect(screen.getByText(month)).toBeInTheDocument();
      });
    });

    it('should render all expense rows', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      render(<MonthlyView />);

      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Insurance')).toBeInTheDocument();
      expect(screen.getByText('Vacation')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading message when expenses are loading', () => {
      useExpenseContext.mockReturnValue({
        expenses: [],
        loading: true,
      });

      render(<MonthlyView />);

      expect(
        screen.getByText('Indlæser månedsoversigt...')
      ).toBeInTheDocument();
    });
  });

  describe('Monthly Amounts', () => {
    it('should display monthly expense amount for all 12 months', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Netflix',
            amount: 100,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
        loading: false,
      });

      render(<MonthlyView />);

      // Netflix should show 100 kr for all 12 months
      const amountCells = screen.getAllByText('100');
      expect(amountCells.length).toBeGreaterThan(0);
    });

    it('should display quarterly amounts only in quarter months', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Insurance',
            amount: 500,
            frequency: 'quarterly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
        loading: false,
      });

      const { container } = render(<MonthlyView />);

      // Should appear in Jan (1), Apr (4), Jul (7), Oct (10)
      // Count only in expense row cells, not in totals
      const amountCells = container.querySelectorAll(
        'tbody tr:not(.total-row) .amount-cell'
      );
      const cellsWith500 = Array.from(amountCells).filter(
        cell => cell.textContent === '500'
      );
      expect(cellsWith500.length).toBe(4);
    });

    it('should display yearly amount only in specified month', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Vacation',
            amount: 3000,
            frequency: 'yearly',
            startMonth: 7,
            endMonth: 7,
          },
        ],
        loading: false,
      });

      const { container } = render(<MonthlyView />);

      // Should appear only once in July (in expense row, not total row)
      const amountCells = container.querySelectorAll(
        'tbody tr:not(.total-row) .amount-cell'
      );
      const cellsWith3000 = Array.from(amountCells).filter(
        cell => cell.textContent === '3.000'
      );
      expect(cellsWith3000.length).toBe(1);
    });

    it('should show dash for months outside expense range', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Summer Only',
            amount: 100,
            frequency: 'monthly',
            startMonth: 6,
            endMonth: 8,
          },
        ],
        loading: false,
      });

      render(<MonthlyView />);

      // Should show dashes for Jan-May and Sep-Dec
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe('Totals Row', () => {
    it('should display monthly totals for each month', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      render(<MonthlyView />);

      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should calculate correct monthly total', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Expense 1',
            amount: 100,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
          {
            id: 2,
            name: 'Expense 2',
            amount: 200,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
        loading: false,
      });

      render(<MonthlyView />);

      // January total should be 300 (100 + 200)
      const totals = screen.getAllByText('300');
      expect(totals.length).toBeGreaterThan(0);
    });
  });

  describe('Row Totals', () => {
    it('should display annual total for each expense', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Monthly Expense',
            amount: 100,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
        loading: false,
      });

      const { container } = render(<MonthlyView />);

      // Annual total should be 1200 (100 * 12 months)
      // Check in .total-cell within expense row
      const totalCells = container.querySelectorAll(
        'tbody tr:not(.total-row) .total-cell'
      );
      const hasCorrectTotal = Array.from(totalCells).some(
        cell => cell.textContent === '1.200'
      );
      expect(hasCorrectTotal).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('should handle empty expenses array', () => {
      useExpenseContext.mockReturnValue({
        expenses: [],
        loading: false,
      });

      render(<MonthlyView />);

      expect(screen.getByText(/Ingen udgifter/)).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should format amounts with Danish locale', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Large Expense',
            amount: 10000,
            frequency: 'yearly',
            startMonth: 1,
            endMonth: 1,
          },
        ],
        loading: false,
      });

      const { container } = render(<MonthlyView />);

      // Danish format uses . as thousand separator
      const allCells = container.querySelectorAll('.amount-cell, .total-cell');
      const hasFormattedNumber = Array.from(allCells).some(
        cell => cell.textContent === '10.000'
      );
      expect(hasFormattedNumber).toBe(true);
    });
  });

  describe('Frequency Display', () => {
    it('should show expense names without frequency badges', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      render(<MonthlyView />);

      // MonthlyView shows expense names in simple table format
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Insurance')).toBeInTheDocument();
      expect(screen.getByText('Vacation')).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle partial year expenses correctly', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Part Year',
            amount: 100,
            frequency: 'monthly',
            startMonth: 3,
            endMonth: 8,
          },
        ],
        loading: false,
      });

      const { container } = render(<MonthlyView />);

      // Should show amounts for Mar-Aug (6 months) = 600 kr total
      const totalCells = container.querySelectorAll('.total-cell');
      const has600Total = Array.from(totalCells).some(
        cell => cell.textContent === '600'
      );
      expect(has600Total).toBe(true);
    });

    it('should handle multiple expenses in same month', () => {
      useExpenseContext.mockReturnValue({
        expenses: [
          {
            id: 1,
            name: 'Expense 1',
            amount: 100,
            frequency: 'quarterly',
            startMonth: 1,
            endMonth: 12,
          },
          {
            id: 2,
            name: 'Expense 2',
            amount: 200,
            frequency: 'quarterly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
        loading: false,
      });

      render(<MonthlyView />);

      // January should show sum of both quarterly expenses (300)
      const januaryTotal = screen.getAllByText('300');
      expect(januaryTotal.length).toBeGreaterThan(0);
    });
  });
});
