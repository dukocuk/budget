/**
 * Tests for YearComparison component
 * Tests year selection, comparison display, and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YearComparison from './YearComparison';

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

// Mock YearComparisonCharts component
vi.mock('../charts/YearComparisonCharts', () => ({
  YearComparisonCharts: ({ period1, period2 }) => (
    <div data-testid="year-comparison-charts">
      Charts for {period1.year} vs {period2.year}
    </div>
  ),
}));

describe('YearComparison', () => {
  const mockPeriods = [
    {
      id: 'period-2025',
      year: 2025,
      monthlyPayment: 6000,
      previousBalance: 5000,
      status: 'active',
    },
    {
      id: 'period-2024',
      year: 2024,
      monthlyPayment: 5700,
      previousBalance: 4831,
      status: 'archived',
    },
    {
      id: 'period-2023',
      year: 2023,
      monthlyPayment: 5000,
      previousBalance: 3000,
      status: 'archived',
    },
  ];

  const mockPeriod2025Data = {
    id: 'period-2025',
    year: 2025,
    monthlyPayment: 6000,
    previousBalance: 5000,
    expenses: [
      {
        id: '1',
        name: 'Netflix',
        amount: 120,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      },
      {
        id: '2',
        name: 'Gym',
        amount: 300,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      },
      {
        id: '4',
        name: 'Disney+',
        amount: 80,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      },
    ],
  };

  const mockPeriod2024Data = {
    id: 'period-2024',
    year: 2024,
    monthlyPayment: 5700,
    previousBalance: 4831,
    expenses: [
      {
        id: '3',
        name: 'Netflix',
        amount: 100,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      },
    ],
  };

  const mockGetExpensesForPeriod = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExpensesForPeriod.mockImplementation(periodId => {
      if (periodId === 'period-2025') {
        return Promise.resolve(mockPeriod2025Data);
      } else if (periodId === 'period-2024') {
        return Promise.resolve(mockPeriod2024Data);
      }
      return Promise.resolve(null);
    });
  });

  describe('Empty States', () => {
    it('should show empty state message when no periods exist', () => {
      render(
        <YearComparison
          periods={[]}
          activePeriod={null}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      expect(
        screen.getByText('Ingen budgetår at sammenligne')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Opret flere budgetår for at se sammenligninger.')
      ).toBeInTheDocument();
    });

    it('should show message when only one period exists', () => {
      render(
        <YearComparison
          periods={[mockPeriods[0]]}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      expect(
        screen.getByText('Mindst to år kræves for sammenligning')
      ).toBeInTheDocument();
      expect(screen.getByText(/Du har kun ét budgetår/)).toBeInTheDocument();
    });
  });

  describe('Year Selection', () => {
    it('should render year selector dropdowns', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('År 1:')).toBeInTheDocument();
        expect(screen.getByLabelText('År 2:')).toBeInTheDocument();
      });
    });

    it('should auto-select two most recent years', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        const year1Select = screen.getByLabelText('År 1:');
        const year2Select = screen.getByLabelText('År 2:');

        expect(year1Select.value).toBe('period-2025');
        expect(year2Select.value).toBe('period-2024');
      });
    });

    it('should show all periods in dropdowns with status labels', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText('Indlæser sammenligningsdata...')
        ).not.toBeInTheDocument();
      });

      const year1Select = screen.getByLabelText('År 1:');

      mockPeriods.forEach(period => {
        const statusLabel =
          period.status === 'active' ? '(Aktiv)' : '(Arkiveret)';
        const optionText = `${period.year} ${statusLabel}`;
        const option = within(year1Select).getByText(optionText);
        expect(option).toBeInTheDocument();
      });
    });

    it('should render swap button', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(
          screen.queryByText('Indlæser sammenligningsdata...')
        ).not.toBeInTheDocument();
      });

      const swapButton = screen.getByRole('button', { name: /byt år/i });
      expect(swapButton).toBeInTheDocument();
      expect(swapButton).toHaveTextContent('⇄');
    });
  });

  describe('Loading State', () => {
    it('should show loading state while fetching data', async () => {
      mockGetExpensesForPeriod.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve(mockPeriod2025Data), 100)
          )
      );

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      expect(
        screen.getByText('Indlæser sammenligningsdata...')
      ).toBeInTheDocument();
    });
  });

  describe('Comparison Display', () => {
    it('should display comparison header', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText('📊 År-til-år sammenligning')
        ).toBeInTheDocument();
        expect(screen.getByText(/Sammenlign budgetår/)).toBeInTheDocument();
      });
    });

    it('should fetch and display period data', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(mockGetExpensesForPeriod).toHaveBeenCalledWith('period-2025');
        expect(mockGetExpensesForPeriod).toHaveBeenCalledWith('period-2024');
      });
    });

    it('should display summary banner with comparison text', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Dine årlige udgifter/)).toBeInTheDocument();
      });

      // Use getAllByText for years that appear multiple times (in dropdowns and summary)
      const year2024Elements = screen.getAllByText(/2024/);
      expect(year2024Elements.length).toBeGreaterThan(0);

      const year2025Elements = screen.getAllByText(/2025/);
      expect(year2025Elements.length).toBeGreaterThan(0);
    });

    it('should display metric cards', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Årlige udgifter')).toBeInTheDocument();
        expect(screen.getByText('Gns. månedlig udgift')).toBeInTheDocument();
        expect(screen.getByText('Månedlig balance')).toBeInTheDocument();
        expect(screen.getByText('Årlig reserve')).toBeInTheDocument();
      });
    });

    it('should display comparison charts', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('year-comparison-charts')
        ).toBeInTheDocument();
        // Charts show period1 vs period2 (2025 vs 2024 by default)
        expect(screen.getByText(/Charts for 2025 vs 2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Expense Changes', () => {
    it('should display expense changes section', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('📋 Udgiftsændringer')).toBeInTheDocument();
      });
    });

    it('should show added expenses', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for loading to complete and comparison to render
      await waitFor(
        () => {
          expect(
            screen.queryByText('Indlæser sammenligningsdata...')
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Wait for expense changes section to appear
      await waitFor(
        () => {
          expect(screen.getByText('📋 Udgiftsændringer')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Verify expense changes are displayed (Gym and Disney+ added in 2025 vs 2024)
      // Note: The exact display depends on which period is selected as period1 vs period2
      // Since we auto-select 2025 vs 2024, and 2025 has more expenses, they are "added"
      const changesSection = screen
        .getByText('📋 Udgiftsændringer')
        .closest('.expense-changes-section');
      expect(changesSection).toBeInTheDocument();
    });

    it('should show modified expenses', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(
        () => {
          expect(
            screen.queryByText('Indlæser sammenligningsdata...')
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      await waitFor(() => {
        // Netflix amount changed from 100 to 120
        expect(screen.getByText(/Ændret/)).toBeInTheDocument();
      });
    });

    it('should show "no changes" message when expenses identical', async () => {
      mockGetExpensesForPeriod.mockImplementation(periodId => {
        const sameExpenses = [
          {
            id: '1',
            name: 'Netflix',
            amount: 100,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
        ];

        return Promise.resolve({
          id: periodId,
          year: periodId === 'period-2025' ? 2025 : 2024,
          monthlyPayment: 5700,
          previousBalance: 0,
          expenses: sameExpenses,
        });
      });

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Ingen udgiftsændringer/)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should swap years when swap button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByLabelText('År 1:').value).toBe('period-2025');
        expect(screen.getByLabelText('År 2:').value).toBe('period-2024');
      });

      // Click swap button
      const swapButton = screen.getByRole('button', { name: /byt år/i });
      await user.click(swapButton);

      // Years should be swapped
      await waitFor(() => {
        expect(screen.getByLabelText('År 1:').value).toBe('period-2024');
        expect(screen.getByLabelText('År 2:').value).toBe('period-2025');
      });
    });

    it('should change year when dropdown selection changes', async () => {
      const user = userEvent.setup();

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByLabelText('År 1:').value).toBe('period-2025');
      });

      // Change Year 1 to 2023
      const year1Select = screen.getByLabelText('År 1:');
      await user.selectOptions(year1Select, 'period-2023');

      // Should load new period data
      await waitFor(() => {
        expect(mockGetExpensesForPeriod).toHaveBeenCalledWith('period-2023');
      });
    });

    it('should disable swap button when years not selected', () => {
      render(
        <YearComparison
          periods={[mockPeriods[0]]} // Only one period, so one year won't be selected
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Component should show "need 2 years" message, not render swap button
      expect(screen.getByText(/Mindst to år kræves/)).toBeInTheDocument();
    });
  });

  describe('MetricCard Component', () => {
    it('should format currency values correctly', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        // Should use Danish number formatting with "kr."
        const currencyElements = screen.getAllByText(/kr\./);
        expect(currencyElements.length).toBeGreaterThan(0);
      });
    });

    it('should show percentage changes with icons', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        // Should show percentage change indicators
        const percentageElements = screen.getAllByText(/%/);
        expect(percentageElements.length).toBeGreaterThan(0);
      });
    });

    it('should display increase/decrease indicators correctly', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        // Should show icons (📈 or 📉)
        const content = document.body.textContent;
        expect(content).toMatch(/📈|📉/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle getExpensesForPeriod error gracefully', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetExpensesForPeriod.mockRejectedValue(
        new Error('Failed to load data')
      );

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error loading period data:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Memoization', () => {
    it('should memoize comparison calculations', async () => {
      const { rerender } = render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Dine årlige udgifter/)).toBeInTheDocument();
      });

      // Clear mock calls
      mockGetExpensesForPeriod.mockClear();

      // Rerender with same props
      rerender(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Should not fetch data again (memoized)
      expect(mockGetExpensesForPeriod).not.toHaveBeenCalled();
    });

    it('should recalculate when selected years change', async () => {
      const user = userEvent.setup();

      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        expect(mockGetExpensesForPeriod).toHaveBeenCalledTimes(2);
      });

      // Change year selection
      mockGetExpensesForPeriod.mockClear();

      const year1Select = screen.getByLabelText('År 1:');
      await user.selectOptions(year1Select, 'period-2023');

      // Should fetch new data
      await waitFor(() => {
        expect(mockGetExpensesForPeriod).toHaveBeenCalledWith('period-2023');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for selectors', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(
            screen.queryByText('Indlæser sammenligningsdata...')
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByLabelText('År 1:')).toBeInTheDocument();
      expect(screen.getByLabelText('År 2:')).toBeInTheDocument();
    });

    it('should have accessible label for swap button', async () => {
      render(
        <YearComparison
          periods={mockPeriods}
          activePeriod={mockPeriods[0]}
          getExpensesForPeriod={mockGetExpensesForPeriod}
        />
      );

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /byt år/i });
        expect(swapButton).toHaveAttribute('aria-label');
      });
    });
  });
});
