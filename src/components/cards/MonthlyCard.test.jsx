/**
 * Tests for MonthlyCard component
 *
 * Tests month name + total rendering, expand/collapse toggle,
 * frequency filtering logic, keyboard toggle, empty state, Danish locale amounts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthlyCard from './MonthlyCard';

describe('MonthlyCard', () => {
  const mockExpenses = [
    {
      id: 'exp-1',
      name: 'Netflix',
      amount: 79,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 'exp-2',
      name: 'Insurance',
      amount: 1200,
      frequency: 'quarterly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 'exp-3',
      name: 'Annual Sub',
      amount: 2400,
      frequency: 'yearly',
      startMonth: 3,
      endMonth: 3,
    },
  ];

  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      month: 'Januar',
      monthIndex: 0,
      expenses: mockExpenses,
      total: 1279,
      isExpanded: false,
      onToggle: vi.fn(),
    };
  });

  it('renders month name', () => {
    render(<MonthlyCard {...defaultProps} />);
    expect(screen.getByText('Januar')).toBeInTheDocument();
  });

  it('renders total amount in DKK format', () => {
    render(<MonthlyCard {...defaultProps} />);
    expect(screen.getByText(/1\.279/)).toBeInTheDocument();
  });

  it('shows expense count for active expenses in month', () => {
    // January (monthIndex 0): Netflix (monthly) + Insurance (quarterly, Jan is Q1)
    render(<MonthlyCard {...defaultProps} />);
    expect(screen.getByText(/2 udgifter/)).toBeInTheDocument();
  });

  it('shows singular udgift for single active expense', () => {
    // February (monthIndex 1): only Netflix (monthly)
    render(<MonthlyCard {...defaultProps} monthIndex={1} />);
    expect(screen.getByText(/1 udgift(?!er)/)).toBeInTheDocument();
  });

  it('does not show details when collapsed', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={false} />);
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('shows expense details when expanded', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('filters quarterly expenses to Jan/Apr/Jul/Oct only', () => {
    // February (monthIndex 1): Insurance (quarterly) should NOT appear
    render(<MonthlyCard {...defaultProps} monthIndex={1} isExpanded={true} />);
    expect(screen.queryByText('Insurance')).not.toBeInTheDocument();
  });

  it('shows quarterly expense in April', () => {
    // April (monthIndex 3): Insurance (quarterly) should appear
    render(<MonthlyCard {...defaultProps} monthIndex={3} isExpanded={true} />);
    expect(screen.getByText('Insurance')).toBeInTheDocument();
  });

  it('filters yearly expenses to startMonth only', () => {
    // January (monthIndex 0): Annual Sub (yearly, startMonth 3) should NOT appear
    render(<MonthlyCard {...defaultProps} monthIndex={0} isExpanded={true} />);
    expect(screen.queryByText('Annual Sub')).not.toBeInTheDocument();
  });

  it('shows yearly expense in its start month', () => {
    // March (monthIndex 2): Annual Sub (yearly, startMonth 3) should appear
    render(<MonthlyCard {...defaultProps} monthIndex={2} isExpanded={true} />);
    expect(screen.getByText('Annual Sub')).toBeInTheDocument();
  });

  it('filters expenses outside date range', () => {
    const expenses = [
      {
        id: 'exp-4',
        name: 'Summer Only',
        amount: 200,
        frequency: 'monthly',
        startMonth: 6,
        endMonth: 8,
      },
    ];
    // January (monthIndex 0): Summer Only should NOT appear
    render(
      <MonthlyCard
        {...defaultProps}
        expenses={expenses}
        monthIndex={0}
        isExpanded={true}
      />
    );
    expect(screen.queryByText('Summer Only')).not.toBeInTheDocument();
  });

  it('shows empty state when expanded with no active expenses', () => {
    render(<MonthlyCard {...defaultProps} expenses={[]} isExpanded={true} />);
    expect(screen.getByText('Ingen udgifter denne måned')).toBeInTheDocument();
  });

  it('calls onToggle when card is clicked', async () => {
    const user = userEvent.setup();
    render(<MonthlyCard {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('calls onToggle on Enter key', () => {
    render(<MonthlyCard {...defaultProps} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('calls onToggle on Space key', () => {
    render(<MonthlyCard {...defaultProps} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('has aria-expanded attribute', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows collapse indicator when expanded', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('shows expand indicator when collapsed', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={false} />);
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('has expanded CSS class when expanded', () => {
    render(<MonthlyCard {...defaultProps} isExpanded={true} />);
    const card = screen.getByRole('button');
    expect(card.className).toContain('expanded');
  });
});
