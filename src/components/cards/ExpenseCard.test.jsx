/**
 * Tests for ExpenseCard component
 *
 * Tests render expense details, checkbox selection, edit/delete/clone actions,
 * kebab menu opens BottomSheet, variable badge, month range formatting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpenseCard from './ExpenseCard';

// Mock BottomSheet to avoid useViewportSize dependency
vi.mock('../common/BottomSheet', () => ({
  default: ({ isOpen, onClose, title, children }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}));

describe('ExpenseCard', () => {
  const mockExpense = {
    id: 'exp-1',
    name: 'Netflix',
    amount: 79,
    frequency: 'monthly',
    startMonth: 1,
    endMonth: 12,
  };

  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      expense: mockExpense,
      isSelected: false,
      onSelect: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onClone: vi.fn(),
    };
  });

  it('renders expense name', () => {
    render(<ExpenseCard {...defaultProps} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders formatted amount in DKK', () => {
    render(<ExpenseCard {...defaultProps} />);
    // Danish locale format for currency
    expect(screen.getByText(/79/)).toBeInTheDocument();
  });

  it('renders frequency label in Danish', () => {
    render(<ExpenseCard {...defaultProps} />);
    expect(screen.getByText('Månedlig')).toBeInTheDocument();
  });

  it('renders quarterly frequency label', () => {
    const expense = { ...mockExpense, frequency: 'quarterly' };
    render(<ExpenseCard {...defaultProps} expense={expense} />);
    expect(screen.getByText('Kvartalsvis')).toBeInTheDocument();
  });

  it('renders yearly frequency label', () => {
    const expense = { ...mockExpense, frequency: 'yearly' };
    render(<ExpenseCard {...defaultProps} expense={expense} />);
    expect(screen.getByText('Årlig')).toBeInTheDocument();
  });

  it('renders month range for full year', () => {
    render(<ExpenseCard {...defaultProps} />);
    expect(screen.getByText('Jan - Dec')).toBeInTheDocument();
  });

  it('renders single month when start equals end', () => {
    const expense = { ...mockExpense, startMonth: 3, endMonth: 3 };
    render(<ExpenseCard {...defaultProps} expense={expense} />);
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('renders partial month range', () => {
    const expense = { ...mockExpense, startMonth: 4, endMonth: 9 };
    render(<ExpenseCard {...defaultProps} expense={expense} />);
    expect(screen.getByText('Apr - Sep')).toBeInTheDocument();
  });

  it('shows variable badge when expense has monthlyAmounts', () => {
    const expense = { ...mockExpense, monthlyAmounts: Array(12).fill(100) };
    render(<ExpenseCard {...defaultProps} expense={expense} />);
    expect(screen.getByText(/variabel/i)).toBeInTheDocument();
  });

  it('does not show variable badge for fixed expenses', () => {
    render(<ExpenseCard {...defaultProps} />);
    expect(screen.queryByText(/variabel/i)).not.toBeInTheDocument();
  });

  it('renders checkbox for selection', () => {
    render(<ExpenseCard {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('checkbox is checked when isSelected is true', () => {
    render(<ExpenseCard {...defaultProps} isSelected={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onSelect when checkbox is changed', async () => {
    const user = userEvent.setup();
    render(<ExpenseCard {...defaultProps} />);

    await user.click(screen.getByRole('checkbox'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('exp-1');
  });

  it('has selected CSS class when selected', () => {
    render(<ExpenseCard {...defaultProps} isSelected={true} />);
    const card = screen.getByRole('article');
    expect(card.className).toContain('selected');
  });

  it('opens bottom sheet menu when kebab button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpenseCard {...defaultProps} />);

    await user.click(screen.getByLabelText('Handlinger'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('calls onEdit from bottom sheet menu', async () => {
    const user = userEvent.setup();
    render(<ExpenseCard {...defaultProps} />);

    await user.click(screen.getByLabelText('Handlinger'));

    await waitFor(() => {
      expect(screen.getByText('Rediger')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Rediger'));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockExpense);
  });

  it('calls onClone from bottom sheet menu', async () => {
    const user = userEvent.setup();
    render(<ExpenseCard {...defaultProps} />);

    await user.click(screen.getByLabelText('Handlinger'));

    await waitFor(() => {
      expect(screen.getByText('Duplikér')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Duplikér'));
    expect(defaultProps.onClone).toHaveBeenCalledWith(mockExpense);
  });

  it('calls onDelete from bottom sheet menu', async () => {
    const user = userEvent.setup();
    render(<ExpenseCard {...defaultProps} />);

    await user.click(screen.getByLabelText('Handlinger'));

    await waitFor(() => {
      expect(screen.getByText('Slet')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Slet'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith('exp-1');
  });

  it('has correct aria-selected attribute', () => {
    render(<ExpenseCard {...defaultProps} isSelected={true} />);
    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('renders checkbox with accessible label', () => {
    render(<ExpenseCard {...defaultProps} />);
    expect(screen.getByLabelText('Vælg Netflix')).toBeInTheDocument();
  });
});
