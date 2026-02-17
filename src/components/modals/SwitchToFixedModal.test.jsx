/**
 * Tests for SwitchToFixedModal component
 *
 * Tests show/hide, input validation, empty amount error,
 * Enter/Escape keys, Danish number parsing, onConfirm with parsed value.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwitchToFixedModal } from './SwitchToFixedModal';

describe('SwitchToFixedModal', () => {
  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isOpen: true,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
  });

  it('returns null when not open', () => {
    const { container } = render(
      <SwitchToFixedModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal content when open', () => {
    render(<SwitchToFixedModal {...defaultProps} />);
    expect(screen.getByText(/skift til fast beløb\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fast månedligt beløb/i)).toBeInTheDocument();
  });

  it('shows warning about variable amounts being reset', () => {
    render(<SwitchToFixedModal {...defaultProps} />);
    expect(
      screen.getByText(/variable beløb vil blive nulstillet/i)
    ).toBeInTheDocument();
  });

  it('shows error when confirming with empty amount', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    // Button should be disabled when input is empty
    const confirmBtn = screen.getByText('Bekræft');
    expect(confirmBtn).toBeDisabled();
  });

  it('validates negative amounts', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    await user.type(input, '-100');

    await waitFor(() => {
      expect(screen.getByText(/mindst 0 kr/i)).toBeInTheDocument();
    });
  });

  it('calls onConfirm with parsed number value', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    await user.type(input, '500');

    await user.click(screen.getByText('Bekræft'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(500);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    await user.click(screen.getByText('Annuller'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('confirms on Enter key', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    await user.type(input, '500');
    await user.keyboard('{Enter}');

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(500);
  });

  it('cancels on Escape key', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    await user.click(input);
    await user.keyboard('{Escape}');

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('cancels when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const overlay = document.querySelector('.switch-modal-overlay');
    await user.click(overlay);
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('does not cancel when modal content is clicked', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const content = document.querySelector('.switch-to-fixed-modal');
    await user.click(content);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('resets state on cancel', async () => {
    const user = userEvent.setup();
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    await user.type(input, '500');
    await user.click(screen.getByText('Annuller'));

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('has required and aria attributes on input', () => {
    render(<SwitchToFixedModal {...defaultProps} />);

    const input = screen.getByLabelText(/fast månedligt beløb/i);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });
});
