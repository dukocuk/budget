/**
 * Tests for StatusBadge component
 *
 * Tests 5 status variants render correct class/icon/text,
 * custom text override.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  describe('status variants', () => {
    it('renders synced status', () => {
      const { container } = render(<StatusBadge status="synced" />);
      expect(screen.getByText('Synkroniseret')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(
        container.querySelector('.status-badge--synced')
      ).toBeInTheDocument();
    });

    it('renders syncing status', () => {
      const { container } = render(<StatusBadge status="syncing" />);
      expect(screen.getByText('Synkroniserer...')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(
        container.querySelector('.status-badge--syncing')
      ).toBeInTheDocument();
    });

    it('renders error status', () => {
      const { container } = render(<StatusBadge status="error" />);
      expect(screen.getByText('Fejl')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(
        container.querySelector('.status-badge--error')
      ).toBeInTheDocument();
    });

    it('renders offline status', () => {
      const { container } = render(<StatusBadge status="offline" />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('📴')).toBeInTheDocument();
      expect(
        container.querySelector('.status-badge--offline')
      ).toBeInTheDocument();
    });

    it('renders idle status', () => {
      const { container } = render(<StatusBadge status="idle" />);
      expect(screen.getByText('Klar')).toBeInTheDocument();
      expect(
        container.querySelector('.status-badge--idle')
      ).toBeInTheDocument();
    });

    it('defaults to idle for unknown status', () => {
      render(<StatusBadge status="unknown" />);
      expect(screen.getByText('Klar')).toBeInTheDocument();
    });
  });

  describe('custom overrides', () => {
    it('uses custom text', () => {
      render(<StatusBadge status="synced" customText="Done!" />);
      expect(screen.getByText('Done!')).toBeInTheDocument();
      expect(screen.queryByText('Synkroniseret')).not.toBeInTheDocument();
    });

    it('uses custom icon', () => {
      render(<StatusBadge status="synced" customIcon="🎉" />);
      expect(screen.getByText('🎉')).toBeInTheDocument();
    });
  });

  describe('size variants', () => {
    it('applies small size class', () => {
      const { container } = render(<StatusBadge status="idle" size="small" />);
      expect(
        container.querySelector('.status-badge--small')
      ).toBeInTheDocument();
    });

    it('applies medium size class by default', () => {
      const { container } = render(<StatusBadge status="idle" />);
      expect(
        container.querySelector('.status-badge--medium')
      ).toBeInTheDocument();
    });

    it('applies large size class', () => {
      const { container } = render(<StatusBadge status="idle" size="large" />);
      expect(
        container.querySelector('.status-badge--large')
      ).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('applies animated class for syncing status', () => {
      const { container } = render(<StatusBadge status="syncing" />);
      expect(
        container.querySelector('.status-badge--animated')
      ).toBeInTheDocument();
    });

    it('does not apply animated class for non-syncing status', () => {
      const { container } = render(<StatusBadge status="synced" />);
      expect(
        container.querySelector('.status-badge--animated')
      ).not.toBeInTheDocument();
    });

    it('does not apply animated class when animated is false', () => {
      const { container } = render(
        <StatusBadge status="syncing" animated={false} />
      );
      expect(
        container.querySelector('.status-badge--animated')
      ).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has status role', () => {
      render(<StatusBadge status="idle" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-atomic attribute', () => {
      render(<StatusBadge status="idle" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    });

    it('uses polite aria-live for non-error statuses', () => {
      render(<StatusBadge status="synced" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('uses assertive aria-live for error status', () => {
      render(<StatusBadge status="error" />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-live',
        'assertive'
      );
    });

    it('hides icon from screen readers', () => {
      render(<StatusBadge status="synced" />);
      const icon = document.querySelector('.status-badge-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StatusBadge status="idle" className="my-custom" />
      );
      expect(container.querySelector('.my-custom')).toBeInTheDocument();
    });
  });
});
