/**
 * Tests for SettingsCard component
 *
 * Tests collapsible toggle, Enter/Space keyboard handling,
 * status class variants, content show/hide.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsCard } from './SettingsCard';

describe('SettingsCard', () => {
  const defaultProps = {
    title: 'Test Card',
    children: <div>Card content</div>,
  };

  it('renders title', () => {
    render(<SettingsCard {...defaultProps} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<SettingsCard {...defaultProps} />);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<SettingsCard {...defaultProps} icon="⚙️" />);
    expect(screen.getByText('⚙️')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<SettingsCard {...defaultProps} description="Card description" />);
    expect(screen.getByText('Card description')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<SettingsCard {...defaultProps} required={true} />);
    expect(screen.getByLabelText('required')).toBeInTheDocument();
  });

  it('does not show required indicator by default', () => {
    render(<SettingsCard {...defaultProps} />);
    expect(screen.queryByLabelText('required')).not.toBeInTheDocument();
  });

  describe('collapsible behavior', () => {
    it('shows content when expanded by default', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('hides content when collapsed by default', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={false}
        />
      );
      expect(screen.queryByText('Card content')).not.toBeInTheDocument();
    });

    it('toggles content on click', async () => {
      const user = userEvent.setup();
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );

      const header = screen.getByRole('button');
      await user.click(header);

      expect(screen.queryByText('Card content')).not.toBeInTheDocument();
    });

    it('expands content on click when collapsed', async () => {
      const user = userEvent.setup();
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={false}
        />
      );

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('toggles on Enter key', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(screen.queryByText('Card content')).not.toBeInTheDocument();
    });

    it('toggles on Space key', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );

      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
      expect(screen.queryByText('Card content')).not.toBeInTheDocument();
    });

    it('has aria-expanded attribute', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('shows toggle indicator', () => {
      render(
        <SettingsCard
          {...defaultProps}
          collapsible={true}
          defaultExpanded={true}
        />
      );
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('does not respond to clicks when not collapsible', async () => {
      const user = userEvent.setup();
      render(<SettingsCard {...defaultProps} collapsible={false} />);

      // No button role when not collapsible
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      // Content always visible
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });
  });

  describe('status variants', () => {
    it('applies success status class', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} status="success" />
      );
      expect(
        container.querySelector('.settings-card--success')
      ).toBeInTheDocument();
    });

    it('applies warning status class', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} status="warning" />
      );
      expect(
        container.querySelector('.settings-card--warning')
      ).toBeInTheDocument();
    });

    it('applies error status class', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} status="error" />
      );
      expect(
        container.querySelector('.settings-card--error')
      ).toBeInTheDocument();
    });

    it('applies info status class', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} status="info" />
      );
      expect(
        container.querySelector('.settings-card--info')
      ).toBeInTheDocument();
    });
  });

  describe('styling variants', () => {
    it('applies highlighted class', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} highlight={true} />
      );
      expect(
        container.querySelector('.settings-card--highlighted')
      ).toBeInTheDocument();
    });

    it('applies interactive class and role', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} interactive={true} />
      );
      expect(
        container.querySelector('.settings-card--interactive')
      ).toBeInTheDocument();
      expect(container.querySelector('[role="button"]')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <SettingsCard {...defaultProps} className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('uses custom aria-label', () => {
      render(<SettingsCard {...defaultProps} aria-label="Custom label" />);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });
  });
});
