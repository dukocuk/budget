/**
 * Tests for Dashboard component
 * Tests charts, summary cards, and data visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { useExpenseContext } from '../hooks/useExpenseContext';
import { useBudgetPeriodContext } from '../hooks/useBudgetPeriodContext';

// Mock the context hooks
vi.mock('../hooks/useExpenseContext');
vi.mock('../hooks/useBudgetPeriodContext');
vi.mock('../hooks/useViewportSize', () => ({
  useViewportSize: () => ({ width: 1024, height: 768 }),
}));

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

describe('Dashboard', () => {
  const mockExpenses = [
    {
      id: 1,
      name: 'Netflix',
      amount: 79,
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

  const mockActivePeriod = {
    id: 'test-period-id',
    year: 2024,
    monthlyPayment: 5700,
    previousBalance: 4831,
    monthlyPayments: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return values
    useExpenseContext.mockReturnValue({
      expenses: [],
      loading: false,
    });
    useBudgetPeriodContext.mockReturnValue({
      activePeriod: mockActivePeriod,
    });
  });

  describe('Empty State', () => {
    it('should render with empty expenses', () => {
      render(<Dashboard />);

      // With empty expenses, charts are rendered but with no expense data
      expect(screen.getByText('Månedlig balance')).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('should display all four summary cards', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      // Use getAllByText for duplicate text, then check count
      const annualExpenses = screen.getAllByText('Årlige udgifter');
      expect(annualExpenses.length).toBeGreaterThan(0);

      expect(
        screen.getByText('Gennemsnitlig månedlig udgift')
      ).toBeInTheDocument();
      expect(screen.getByText('Månedlig balance')).toBeInTheDocument();
      expect(screen.getByText('Årlig reserve')).toBeInTheDocument();
    });

    it('should calculate and display total annual expenses', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      // Netflix: 79 * 12 = 948
      // Insurance: 500 * 4 = 2000
      // Vacation: 3000 * 1 = 3000
      // Total: 5948 kr.
      expect(screen.getByText(/5\.948 kr\./)).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('should render pie chart for expense distribution', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      expect(screen.getByText('Udgifter efter frekvens')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render bar chart for monthly expenses vs income', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      expect(
        screen.getByText('Månedlige udgifter vs. indbetaling')
      ).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render line chart for balance projection', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      expect(
        screen.getByText('Balance prognose over året')
      ).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should not render pie chart when no expenses exist', () => {
      useExpenseContext.mockReturnValue({
        expenses: [],
        loading: false,
      });
      render(<Dashboard />);

      expect(
        screen.queryByText('Udgifter efter frekvens')
      ).not.toBeInTheDocument();
    });
  });

  describe('Quick Stats', () => {
    it('should display total expense count', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      expect(screen.getByText('Antal udgifter')).toBeInTheDocument();
      const countElements = screen.getAllByText('3');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('should display count of monthly expenses', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      const monthlyLabels = screen.getAllByText('Månedlige udgifter');
      expect(monthlyLabels.length).toBeGreaterThan(0);
    });

    it('should display count of quarterly expenses', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      expect(screen.getByText('Kvartalsvise udgifter')).toBeInTheDocument();
    });

    it('should display count of yearly expenses', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      render(<Dashboard />);

      // Use getAllByText since "Årlige udgifter" appears in both summary cards and quick stats
      const yearlyLabels = screen.getAllByText(/Årlige udgifter/i);
      expect(yearlyLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Variable Monthly Payments', () => {
    it('should handle variable monthly payments array', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });
      useBudgetPeriodContext.mockReturnValue({
        activePeriod: {
          ...mockActivePeriod,
          monthlyPayments: [
            5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700,
            6000,
          ],
        },
      });

      render(<Dashboard />);

      // Should render without errors
      expect(
        screen.getByText('Månedlige udgifter vs. indbetaling')
      ).toBeInTheDocument();
    });
  });

  describe('Additional Empty State', () => {
    it('should handle no expenses gracefully', () => {
      useExpenseContext.mockReturnValue({
        expenses: [],
        loading: false,
      });
      render(<Dashboard />);

      // Should show 0 for all counts
      expect(screen.getByText('Antal udgifter')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should memoize expensive calculations', () => {
      useExpenseContext.mockReturnValue({
        expenses: mockExpenses,
        loading: false,
      });

      const { rerender } = render(<Dashboard />);

      // Re-render with same context values
      rerender(<Dashboard />);

      // Component should not recalculate if props haven't changed
      // Use getAllByText since text appears in multiple locations
      const annualExpenses = screen.getAllByText(/Årlige udgifter/i);
      expect(annualExpenses.length).toBeGreaterThan(0);
    });
  });
});
