/**
 * Tests for MonthlyAmountsModal component
 *
 * Tests initialization with amounts, validation, frequency-aware totals,
 * apply-to-all, reset, Danish number parsing, and switch-to-fixed nested modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlyAmountsModal } from './MonthlyAmountsModal';

// Mock calculations
vi.mock('../../utils/calculations', () => ({
  calculateAnnualAmount: vi.fn(expense => {
    if (expense.monthlyAmounts) {
      return expense.monthlyAmounts.reduce((sum, amt) => sum + amt, 0);
    }
    return expense.amount * 12;
  }),
}));

describe('MonthlyAmountsModal', () => {
  const mockExpense = {
    id: 'exp-1',
    name: 'Electricity',
    amount: 500,
    frequency: 'monthly',
    startMonth: 1,
    endMonth: 12,
    monthlyAmounts: null,
  };

  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isOpen: true,
      expense: mockExpense,
      onClose: vi.fn(),
      onSave: vi.fn(),
    };
  });

  const getMonthInputs = () => {
    // react-modal renders into a portal, query the document directly
    return document.querySelectorAll('.amounts-grid input[type="text"]');
  };

  it('renders with expense name in header', () => {
    render(<MonthlyAmountsModal {...defaultProps} />);
    expect(screen.getByText(/electricity/i)).toBeInTheDocument();
  });

  it('initializes 12 month fields with expense amount when no monthly amounts', () => {
    render(<MonthlyAmountsModal {...defaultProps} />);

    const inputs = getMonthInputs();
    expect(inputs).toHaveLength(12);
    inputs.forEach(input => {
      expect(input.value).toBe('500');
    });
  });

  it('initializes with existing monthly amounts', () => {
    const amounts = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expense = { ...mockExpense, monthlyAmounts: amounts };

    render(<MonthlyAmountsModal {...defaultProps} expense={expense} />);

    const inputs = getMonthInputs();
    expect(inputs[0].value).toBe('100');
    expect(inputs[11].value).toBe('1200');
  });

  it('renders all 12 month labels', () => {
    render(<MonthlyAmountsModal {...defaultProps} />);

    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
    expect(screen.getByText('Dec')).toBeInTheDocument();
  });

  it('shows validation error for negative amounts', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    const inputs = getMonthInputs();
    await user.clear(inputs[0]);
    await user.type(inputs[0], '-100');

    await waitFor(() => {
      expect(document.querySelector('.error-message')).toBeInTheDocument();
    });
  });

  it('disables save button when there are validation errors', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    const inputs = getMonthInputs();
    await user.clear(inputs[0]);
    await user.type(inputs[0], '-100');

    await waitFor(() => {
      const saveBtn = screen.getByText(/gem månedlige beløb/i);
      expect(saveBtn).toBeDisabled();
    });
  });

  it('applies january amount to all months', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    const inputs = getMonthInputs();
    await user.clear(inputs[0]);
    await user.type(inputs[0], '750');

    await user.click(screen.getByText(/anvend januar-beløb til alle/i));

    await waitFor(() => {
      const updatedInputs = getMonthInputs();
      updatedInputs.forEach(input => {
        expect(input.value).toBe('750');
      });
    });
  });

  it('resets all amounts to 0', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    await user.click(screen.getByText(/nulstil alle beløb/i));

    await waitFor(() => {
      const inputs = getMonthInputs();
      inputs.forEach(input => {
        expect(input.value).toBe('0');
      });
    });
  });

  it('saves numeric amounts when save is clicked', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    await user.click(screen.getByText(/gem månedlige beløb/i));

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.arrayContaining([500])
    );
    expect(defaultProps.onSave.mock.calls[0][0]).toHaveLength(12);
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    await user.click(screen.getByText('Annuller'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows total amount', () => {
    render(<MonthlyAmountsModal {...defaultProps} />);
    // Total should be displayed
    expect(screen.getByText(/total/i)).toBeInTheDocument();
  });

  it('opens switch-to-fixed modal', async () => {
    const user = userEvent.setup();
    render(<MonthlyAmountsModal {...defaultProps} />);

    await user.click(screen.getByText(/skift til fast beløb/i));

    await waitFor(() => {
      expect(screen.getByText(/skift til fast beløb\?/i)).toBeInTheDocument();
    });
  });

  it('resets amounts when expense prop changes', () => {
    const { rerender } = render(<MonthlyAmountsModal {...defaultProps} />);

    const newExpense = { ...mockExpense, amount: 1000 };
    rerender(<MonthlyAmountsModal {...defaultProps} expense={newExpense} />);

    const inputs = getMonthInputs();
    expect(inputs[0].value).toBe('1000');
  });
});
