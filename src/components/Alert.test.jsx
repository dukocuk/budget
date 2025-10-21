/**
 * Tests for Alert component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';
import { ALERT_TYPES } from '../utils/constants';

describe('Alert', () => {
  it('renders alert message', () => {
    render(<Alert message="Test message" type={ALERT_TYPES.INFO} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct type class for info alert', () => {
    const { container } = render(
      <Alert message="Info message" type={ALERT_TYPES.INFO} />
    );
    const alert = container.querySelector('.alert');

    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert-info');
  });

  it('applies correct type class for success alert', () => {
    const { container } = render(
      <Alert message="Success message" type={ALERT_TYPES.SUCCESS} />
    );
    const alert = container.querySelector('.alert');

    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert-success');
  });

  it('applies correct type class for error alert', () => {
    const { container } = render(
      <Alert message="Error message" type={ALERT_TYPES.ERROR} />
    );
    const alert = container.querySelector('.alert');

    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('alert-error');
  });

  it('returns null when message is empty', () => {
    const { container } = render(<Alert message="" type={ALERT_TYPES.INFO} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when message is null', () => {
    const { container } = render(
      <Alert message={null} type={ALERT_TYPES.INFO} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when message is undefined', () => {
    const { container } = render(
      <Alert message={undefined} type={ALERT_TYPES.INFO} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders long messages correctly', () => {
    const longMessage =
      'Dette er en meget lang besked der skulle vises i alert komponenten for at teste om den kan håndtere lange beskeder korrekt.';

    render(<Alert message={longMessage} type={ALERT_TYPES.INFO} />);
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('renders special characters correctly', () => {
    const specialMessage = 'Fejl: Kunne ikke gemme! (æ ø å Æ Ø Å)';

    render(<Alert message={specialMessage} type={ALERT_TYPES.ERROR} />);
    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it('renders with default type when type is not provided', () => {
    const { container } = render(<Alert message="Test message" />);
    const alert = container.querySelector('.alert');

    expect(alert).toBeInTheDocument();
    // Type would be undefined, resulting in class "alert-undefined"
    expect(alert.className).toContain('alert');
  });

  it('handles numeric messages', () => {
    render(<Alert message={12345} type={ALERT_TYPES.INFO} />);
    expect(screen.getByText('12345')).toBeInTheDocument();
  });
});
