/**
 * Tests for MonthlyOverview component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlyOverview } from './MonthlyOverview';
import * as useViewportSizeModule from '../../hooks/useViewportSize';

// Mock the useViewportSize hook
vi.mock('../../hooks/useViewportSize');

// Mock MonthlyCard component
vi.mock('../cards/MonthlyCard', () => ({
  default: ({ month, total, isExpanded, onToggle }) => (
    <div data-testid={`monthly-card-${month}`}>
      <div>{month}</div>
      <div>{total}</div>
      <button onClick={onToggle}>{isExpanded ? 'Collapse' : 'Expand'}</button>
    </div>
  ),
}));

describe('MonthlyOverview', () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Desktop View', () => {
    beforeEach(() => {
      vi.spyOn(useViewportSizeModule, 'useViewportSize').mockReturnValue({
        isMobile: false,
        width: 1024,
        height: 768,
      });
    });

    it('renders desktop table view', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('📅 Månedlig oversigt')).toBeInTheDocument();
    });

    it('renders all month columns', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

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

    it('renders expense names', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Insurance')).toBeInTheDocument();
    });

    it('renders total row', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });

    it('displays annual total', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      // Total appears in the total column
      expect(screen.getByText('3.948')).toBeInTheDocument();
    });

    it('renders sortable headers', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      const headers = screen.getAllByRole('columnheader');
      const udgiftHeader = headers[0];
      const totalHeader = headers[headers.length - 1];

      expect(udgiftHeader).toHaveClass('sortable');
      expect(totalHeader).toHaveClass('sortable');
    });

    it('sorts expenses by name when name header is clicked', async () => {
      const user = userEvent.setup();
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      const nameHeader = screen.getByText(/Udgift/);
      await user.click(nameHeader);

      // Check for sort indicator
      expect(screen.getByText(/Udgift ↑/)).toBeInTheDocument();

      await user.click(nameHeader);
      expect(screen.getByText(/Udgift ↓/)).toBeInTheDocument();
    });

    it('sorts expenses by total when total header is clicked', async () => {
      const user = userEvent.setup();
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      const totalHeader = screen.getByText(/Total$/);
      await user.click(totalHeader);

      // Check for sort indicator
      expect(screen.getByText(/Total ↑/)).toBeInTheDocument();
    });

    it('renders dash for zero amounts', () => {
      const expenseWithZero = [
        {
          id: 1,
          name: 'Test',
          amount: 100,
          frequency: 'yearly',
          startMonth: 1,
          endMonth: 1,
        },
      ];

      render(<MonthlyOverview expenses={expenseWithZero} totalAnnual={100} />);

      // Should have dashes for months without expenses
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('handles empty expenses array', () => {
      render(<MonthlyOverview expenses={[]} totalAnnual={0} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    beforeEach(() => {
      vi.spyOn(useViewportSizeModule, 'useViewportSize').mockReturnValue({
        isMobile: true,
        width: 375,
        height: 667,
      });
    });

    it('renders mobile card view', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByTestId('monthly-card-Jan')).toBeInTheDocument();
    });

    it('renders cards for all 12 months', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

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
        expect(screen.getByTestId(`monthly-card-${month}`)).toBeInTheDocument();
      });
    });

    it('renders annual total card', () => {
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      expect(screen.getByText('Årlig total')).toBeInTheDocument();
      expect(screen.getByText('3.948 kr.')).toBeInTheDocument();
    });

    it('toggles month expansion when card is toggled', async () => {
      const user = userEvent.setup();
      render(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);

      const expandButton = screen.getAllByText('Expand')[0];
      await user.click(expandButton);

      expect(screen.getByText('Collapse')).toBeInTheDocument();
    });

    it('handles empty expenses array in mobile view', () => {
      render(<MonthlyOverview expenses={[]} totalAnnual={0} />);

      expect(screen.getByTestId('monthly-card-Jan')).toBeInTheDocument();
      expect(screen.getByText('Årlig total')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('switches from desktop to mobile view on resize', () => {
      const { rerender } = render(
        <MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />
      );

      // Start with desktop
      vi.spyOn(useViewportSizeModule, 'useViewportSize').mockReturnValue({
        isMobile: false,
        width: 1024,
        height: 768,
      });

      rerender(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Switch to mobile
      vi.spyOn(useViewportSizeModule, 'useViewportSize').mockReturnValue({
        isMobile: true,
        width: 375,
        height: 667,
      });

      rerender(<MonthlyOverview expenses={mockExpenses} totalAnnual={3948} />);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByTestId('monthly-card-Jan')).toBeInTheDocument();
    });
  });
});
