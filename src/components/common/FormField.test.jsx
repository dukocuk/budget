/**
 * Tests for FormField component
 *
 * Tests renders label/input/hint/error, ARIA attributes,
 * disabled state, required indicator.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  const defaultProps = {
    id: 'test-field',
    value: '',
    onChange: vi.fn(),
  };

  it('renders input element', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<FormField {...defaultProps} label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<FormField {...defaultProps} />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FormField {...defaultProps} label="Field" required={true} />);
    expect(screen.getByLabelText('obligatorisk')).toBeInTheDocument();
  });

  it('does not show required indicator by default', () => {
    render(<FormField {...defaultProps} label="Field" />);
    expect(screen.queryByLabelText('obligatorisk')).not.toBeInTheDocument();
  });

  it('renders hint text', () => {
    render(<FormField {...defaultProps} hint="Helpful hint" />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<FormField {...defaultProps} error="Invalid input" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid input');
  });

  it('hides hint when error is shown', () => {
    render(
      <FormField {...defaultProps} hint="Helpful hint" error="Invalid input" />
    );
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
  });

  it('sets aria-invalid to true when error exists', () => {
    render(<FormField {...defaultProps} error="Error" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid to false when no error', () => {
    render(<FormField {...defaultProps} />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'aria-invalid',
      'false'
    );
  });

  it('sets aria-describedby for hint', () => {
    render(<FormField {...defaultProps} hint="Hint text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'aria-describedby',
      'test-field-hint'
    );
  });

  it('sets aria-describedby for error', () => {
    render(<FormField {...defaultProps} error="Error text" />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'aria-describedby',
      'test-field-error'
    );
  });

  it('renders disabled input', () => {
    render(<FormField {...defaultProps} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders readonly input', () => {
    render(<FormField {...defaultProps} readOnly={true} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('renders icon prefix', () => {
    render(<FormField {...defaultProps} icon="💰" />);
    expect(screen.getByText('💰')).toBeInTheDocument();
  });

  it('renders suffix', () => {
    render(<FormField {...defaultProps} suffix="kr./måned" />);
    expect(screen.getByText('kr./måned')).toBeInTheDocument();
  });

  it('applies error class', () => {
    const { container } = render(<FormField {...defaultProps} error="Error" />);
    expect(container.querySelector('.form-field--error')).toBeInTheDocument();
  });

  it('applies disabled class', () => {
    const { container } = render(
      <FormField {...defaultProps} disabled={true} />
    );
    expect(
      container.querySelector('.form-field--disabled')
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormField {...defaultProps} className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('sets placeholder', () => {
    render(<FormField {...defaultProps} placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('uses label as aria-label', () => {
    render(<FormField {...defaultProps} label="Amount" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Amount');
  });

  it('uses custom aria-label over label', () => {
    render(<FormField {...defaultProps} label="Amount" aria-label="Custom" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Custom');
  });
});
